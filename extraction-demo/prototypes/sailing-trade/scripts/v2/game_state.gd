extends RefCounted

const HOME: String = "dawn"
const GOODS: Array[String] = ["tea", "ceramic", "spice", "cloth", "fish", "wood"]
const GOOD_NAMES: Dictionary = {"tea": "茶叶", "ceramic": "陶器", "spice": "香料", "cloth": "棉布", "fish": "鱼干", "wood": "木材"}
const PORTS: Dictionary = {
	"dawn": {
		"name": "曙光港", "subtitle": "茶香与白帆的海湾", "description": "茶园和织坊环绕着石砌码头，渔船趁着晨光卸货。",
		"color": Color("e5c889"), "position": Vector2(900, 2600), "specialty": "盛产茶叶、棉布与鱼干；远方的陶器和香料颇受欢迎。",
		"base_prices": {"tea": 12, "ceramic": 30, "spice": 44, "cloth": 18, "fish": 10, "wood": 24},
	},
	"pine": {
		"name": "雾松湾", "subtitle": "松林深处的陶港", "description": "雾气沿山脊流入海湾，窑炉与木工作坊的灯火映在水面。",
		"color": Color("94b6ac"), "position": Vector2(2400, 850), "specialty": "盛产陶器与木材；茶叶、棉布和鱼干售价较高。",
		"base_prices": {"tea": 27, "ceramic": 14, "spice": 36, "cloth": 33, "fish": 23, "wood": 10},
	},
	"sand": {
		"name": "赤砂埠", "subtitle": "沙岸上的香料集市", "description": "赭红色海崖下停着远洋商船，棚市间飘散着辛香与热风。",
		"color": Color("dba47d"), "position": Vector2(4300, 2300), "specialty": "盛产香料；收购茶叶、陶器、木材与鱼干。",
		"base_prices": {"tea": 34, "ceramic": 34, "spice": 17, "cloth": 32, "fish": 27, "wood": 27},
	},
}
const SHIPS: Dictionary = {
	"sloop": {"name": "轻帆船", "price": 0, "capacity": 20, "max_hull": 100, "speed": 95.0, "description": "轻快灵活的小船，适合近海试航与小宗买卖。"},
	"coaster": {"name": "沿岸商船", "price": 1400, "capacity": 38, "max_hull": 140, "speed": 85.0, "description": "舱容与航速兼顾，适合往返各港的常规贸易。"},
	"merchant": {"name": "远洋商船", "price": 3600, "capacity": 64, "max_hull": 190, "speed": 70.0, "description": "宽阔而坚固，能运送大批货物，但转运航程更久。"},
}
const SUPPLY_PRICE: int = 3
const UPGRADE_COST: int = 400
const UPGRADE_CAPACITY_BONUS: int = 10
const SECONDS_PER_DAY: float = 12.0
const DOCK_DISTANCE: float = 150.0
const DOCK_MAX_SPEED: float = 30.0
const SAVE_VERSION: int = 1
const DEFAULT_SAVE_PATH: String = "user://voyage_v2.json"

var coins: int = 800
var day: int = 1
var ship_id: String = "sloop"
var ship_name: String = "逐风号"
var cargo: Dictionary = {}
var cost_basis: Dictionary = {}
var supplies: int = 18
var max_supplies: int = 30
var capacity: int = 20
var hull: int = 100
var max_hull: int = 100
var current_port: String = HOME
var last_port: String = HOME
var at_sea: bool = false
var ship_position: Vector2 = PORTS[HOME]["position"]
var heading: float = -0.7
var speed: float = 0.0
var sail_level: int = 1
var autopilot_target: String = ""
var visited: Dictionary = {HOME: true}
var lifetime_profit: int = 0
var supply_spent: int = 0
var events: Array[String] = []
var cargo_upgraded: bool = false
var stocks: Dictionary = {}
var day_elapsed: float = 0.0
var _sailing_days: int = 0
var _purchase_lots: Dictionary = {}


func _init() -> void:
	reset_game()


func price(good: String, selling: bool = false, port_id: String = "") -> int:
	var port: String = current_port if port_id.is_empty() else port_id
	if not GOODS.has(good) or not PORTS.has(port):
		return 0
	var target: int = _stock_target(port, good)
	var pressure: float = clampf(float(target - stock(good, port)) / float(target) * 0.12, -0.10, 0.12)
	var phase: int = (day + GOODS.find(good) + Array(PORTS.keys()).find(port) * 2) % 7
	var cycle: float = float(phase - 3) * 0.01
	var amount: float = float(PORTS[port]["base_prices"][good]) * (1.0 + pressure + cycle)
	if selling:
		amount *= 0.78
	return maxi(1, int(round(amount)))


func stock(good: String, port_id: String = "") -> int:
	var port: String = current_port if port_id.is_empty() else port_id
	if not GOODS.has(good) or not stocks.has(port):
		return 0
	return int(stocks[port][good])


func cargo_used() -> int:
	var count: int = 0
	for good: String in GOODS:
		count += int(cargo[good])
	return count


func max_buy(good: String) -> int:
	if at_sea or not GOODS.has(good) or not PORTS.has(current_port):
		return 0
	return maxi(0, mini(mini(capacity - cargo_used(), stock(good)), int(coins / price(good))))


func avg_cost(good: String) -> float:
	if not GOODS.has(good) or int(cargo[good]) == 0:
		return 0.0
	return float(cost_basis[good]) / float(cargo[good])


func buy(good: String, quantity: int) -> String:
	var error: String = _trade_error(good, quantity)
	if not error.is_empty():
		return error
	if quantity > capacity - cargo_used():
		return "货舱空间不足。"
	if quantity > stock(good):
		return "市场没有这么多现货，明天会重新补货。"
	var unit_cost: int = price(good)
	var cost: int = unit_cost * quantity
	if coins < cost:
		return "金币不足，无法购买这些货物。"
	coins -= cost
	cargo[good] = int(cargo[good]) + quantity
	cost_basis[good] = int(cost_basis[good]) + cost
	_purchase_lots[good].append({"quantity": quantity, "unit_cost": unit_cost})
	stocks[current_port][good] = stock(good) - quantity
	_record("购入 %d 箱%s，花费 %d 金币。" % [quantity, GOOD_NAMES[good], cost])
	return ""


func sell(good: String, quantity: int) -> String:
	var error: String = _trade_error(good, quantity)
	if not error.is_empty():
		return error
	if quantity > int(cargo[good]):
		return "船上没有这么多货物。"
	var revenue: int = price(good, true) * quantity
	var sold_cost: int = _consume_lots(good, quantity)
	cargo[good] = int(cargo[good]) - quantity
	cost_basis[good] = int(cost_basis[good]) - sold_cost
	coins += revenue
	lifetime_profit += revenue - sold_cost
	stocks[current_port][good] = stock(good) + quantity
	_record("售出 %d 箱%s，收入 %d 金币，交易盈亏 %+d。" % [quantity, GOOD_NAMES[good], revenue, revenue - sold_cost])
	return ""


func resupply(quantity: int) -> String:
	if at_sea:
		return "请靠港后购买补给。"
	if quantity <= 0:
		return "补给数量必须大于零。"
	if quantity > max_supplies - supplies:
		return "补给舱空间不足。"
	var cost: int = quantity * SUPPLY_PRICE
	if coins < cost:
		return "金币不足，无法购买补给。"
	coins -= cost
	supplies += quantity
	supply_spent += cost
	_record("补充 %d 份水粮，花费 %d 金币。" % [quantity, cost])
	return ""


func repair() -> String:
	if at_sea:
		return "请靠港后修理船只。"
	var cost: int = max_hull - hull
	if cost <= 0:
		return "船体完好，无需修理。"
	if coins < cost:
		return "金币不足，修复船体需要 %d 金币。" % cost
	coins -= cost
	hull = max_hull
	_record("修复船体，花费 %d 金币。" % cost)
	return ""


func upgrade_cargo() -> String:
	if at_sea:
		return "请靠港后扩建货舱。"
	if cargo_upgraded:
		return "货舱已经扩建过了。"
	if coins < UPGRADE_COST:
		return "扩建货舱需要 400 金币。"
	coins -= UPGRADE_COST
	capacity += UPGRADE_CAPACITY_BONUS
	cargo_upgraded = true
	_record("货舱扩建完成，容量增加 10 箱。")
	return ""


func trade_in_value() -> int:
	return int(int(SHIPS[ship_id]["price"]) / 2)


func buy_ship(id: String) -> String:
	if at_sea:
		return "请靠港后更换船只。"
	if not SHIPS.has(id):
		return "船坞没有这种船只。"
	if id == ship_id:
		return "你已经拥有这型船只。"
	var new_capacity: int = int(SHIPS[id]["capacity"]) + (UPGRADE_CAPACITY_BONUS if cargo_upgraded else 0)
	if cargo_used() > new_capacity:
		return "现有货物超过新船容量，请先出售一部分。"
	var cost: int = int(SHIPS[id]["price"]) - trade_in_value()
	if coins < cost:
		return "金币不足，换船还需要 %d 金币。" % cost
	coins -= cost
	ship_id = id
	capacity = new_capacity
	max_hull = int(SHIPS[id]["max_hull"])
	hull = max_hull
	_record("换乘%s，结算差价 %+d 金币。" % [SHIPS[id]["name"], cost])
	return ""


func rename_ship(new_name: String) -> String:
	var clean_name: String = new_name.strip_edges()
	if clean_name.is_empty() or clean_name.length() > 12:
		return "船名需要 1 至 12 个字。"
	ship_name = clean_name
	_record("船只更名为「%s」。" % ship_name)
	return ""


func depart() -> String:
	if at_sea:
		return "船只已经在海上。"
	if supplies < 1:
		return "至少准备 1 份补给才能出航。"
	if hull <= 0:
		return "船体无法航行，请先修理。"
	last_port = current_port
	current_port = ""
	at_sea = true
	sail_level = 1
	speed = 0.0
	autopilot_target = ""
	_record("离开%s，扬帆出海。" % PORTS[last_port]["name"])
	return ""


func dock(port_id: String) -> String:
	if not at_sea:
		return "船只已经停靠在港内。"
	if not PORTS.has(port_id):
		return "这里没有可停靠的港口。"
	if ship_position.distance_to(PORTS[port_id]["position"]) > DOCK_DISTANCE:
		return "距离港口太远，请驶入港口附近。"
	if speed > DOCK_MAX_SPEED:
		return "船速过快，请降帆减速至 30 以下。"
	current_port = port_id
	last_port = port_id
	at_sea = false
	ship_position = PORTS[port_id]["position"]
	speed = 0.0
	sail_level = 0
	autopilot_target = ""
	visited[port_id] = true
	_record("停靠%s，码头与市场已经开放。" % PORTS[port_id]["name"])
	return ""


func advance_time(delta: float) -> void:
	if not at_sea or not is_finite(delta) or delta <= 0.0:
		return
	day_elapsed += delta
	while day_elapsed >= SECONDS_PER_DAY:
		day_elapsed -= SECONDS_PER_DAY
		_next_day(true)


func rest() -> String:
	if at_sea:
		return "请靠港后休整。"
	if coins < 20:
		return "在港休整一天需要 20 金币。"
	coins -= 20
	hull = mini(max_hull, hull + 5)
	_next_day(false)
	_record("在港休整一天，船体恢复 5 点，市场已补货。")
	return ""


func rescue() -> String:
	if not at_sea:
		return "已在港内，无需海上拖救。"
	var cost: int = mini(coins, 80)
	coins -= cost
	_next_day(false)
	_next_day(false)
	hull = maxi(hull, 40)
	supplies = maxi(supplies, 6)
	current_port = last_port
	at_sea = false
	ship_position = PORTS[last_port]["position"]
	speed = 0.0
	sail_level = 0
	autopilot_target = ""
	_record("拖救船送你返回%s，耗时 2 天，收费 %d 金币。" % [PORTS[last_port]["name"], cost])
	return ""


func save_game(path: String = DEFAULT_SAVE_PATH) -> String:
	var data: Dictionary = _save_data()
	var error: String = _validate_save(data)
	if not error.is_empty():
		return "当前航海状态无法保存：" + error
	var temporary: String = path + ".tmp"
	var file: FileAccess = FileAccess.open(temporary, FileAccess.WRITE)
	if file == null:
		return "无法写入存档文件。"
	file.store_string(JSON.stringify(data))
	file.flush()
	var write_error: Error = file.get_error()
	file.close()
	if write_error != OK:
		return "存档写入失败，原存档未被修改。"
	if DirAccess.rename_absolute(ProjectSettings.globalize_path(temporary), ProjectSettings.globalize_path(path)) != OK:
		return "无法完成存档替换，原存档未被修改。"
	return ""


func load_game(path: String = DEFAULT_SAVE_PATH) -> String:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return "没有找到可读取的航海存档。"
	if file.get_length() > 2097152:
		file.close()
		return "存档文件过大。"
	var parser: JSON = JSON.new()
	var parse_error: Error = parser.parse(file.get_as_text())
	file.close()
	if parse_error != OK or not parser.data is Dictionary:
		return "存档格式损坏。"
	var data: Dictionary = parser.data
	var error: String = _validate_save(data)
	if not error.is_empty():
		return "存档无法读取：" + error
	_apply_save(data)
	return ""


func reset_game() -> void:
	coins = 800
	day = 1
	ship_id = "sloop"
	ship_name = "逐风号"
	cargo = {}
	cost_basis = {}
	_purchase_lots = {}
	for good: String in GOODS:
		cargo[good] = 0
		cost_basis[good] = 0
		_purchase_lots[good] = []
	supplies = 18
	max_supplies = 30
	capacity = 20
	hull = 100
	max_hull = 100
	current_port = HOME
	last_port = HOME
	at_sea = false
	ship_position = PORTS[HOME]["position"]
	heading = -0.7
	speed = 0.0
	sail_level = 1
	autopilot_target = ""
	visited = {HOME: true}
	lifetime_profit = 0
	supply_spent = 0
	cargo_upgraded = false
	day_elapsed = 0.0
	_sailing_days = 0
	events = []
	stocks = {}
	_restore_stocks()
	_record("逐风号已在曙光港备妥，第一段航程由你决定。")


func _stock_target(port: String, good: String) -> int:
	return 45 if int(PORTS[port]["base_prices"][good]) <= 18 else 20


func _restore_stocks() -> void:
	for port: String in PORTS:
		stocks[port] = {}
		for good: String in GOODS:
			stocks[port][good] = _stock_target(port, good)


func _next_day(sailing: bool) -> void:
	day += 1
	_restore_stocks()
	if not sailing:
		return
	if supplies > 0:
		supplies -= 1
		_sailing_days += 1
		if _sailing_days % 3 == 0:
			hull = maxi(0, hull - 1)
	else:
		hull = maxi(0, hull - 5)
		_record("水粮耗尽，船体损失 5 点耐久，请尽快靠港或请求拖救。")
	if hull == 0:
		speed = 0.0
		sail_level = 0
		autopilot_target = ""
	elif supplies <= 3:
		_record("海上第 %d 天：补给仅剩 %d 份。" % [day, supplies])


func _trade_error(good: String, quantity: int) -> String:
	if at_sea:
		return "请靠港后交易。"
	if not GOODS.has(good):
		return "市场不交易这种货物。"
	if quantity <= 0:
		return "交易数量必须大于零。"
	return ""


func _consume_lots(good: String, quantity: int) -> int:
	var remaining: int = quantity
	var sold_cost: int = 0
	var lots: Array = _purchase_lots[good]
	while remaining > 0:
		var lot: Dictionary = lots[0]
		var taken: int = mini(remaining, int(lot["quantity"]))
		sold_cost += taken * int(lot["unit_cost"])
		remaining -= taken
		lot["quantity"] = int(lot["quantity"]) - taken
		if int(lot["quantity"]) == 0:
			lots.pop_front()
	return sold_cost


func _record(message: String) -> void:
	events.append(message)
	while events.size() > 6:
		events.pop_front()


func _save_data() -> Dictionary:
	return {
		"version": SAVE_VERSION, "coins": coins, "day": day, "ship_id": ship_id, "ship_name": ship_name,
		"cargo": cargo.duplicate(true), "cost_basis": cost_basis.duplicate(true), "purchase_lots": _purchase_lots.duplicate(true),
		"supplies": supplies, "max_supplies": max_supplies, "capacity": capacity, "hull": hull, "max_hull": max_hull,
		"current_port": current_port, "last_port": last_port, "at_sea": at_sea,
		"ship_position": [ship_position.x, ship_position.y], "heading": heading, "speed": speed,
		"sail_level": sail_level, "autopilot_target": autopilot_target, "visited": visited.duplicate(true),
		"lifetime_profit": lifetime_profit, "supply_spent": supply_spent, "events": events.duplicate(),
		"cargo_upgraded": cargo_upgraded, "stocks": stocks.duplicate(true), "day_elapsed": day_elapsed, "sailing_days": _sailing_days,
	}


func _validate_save(data: Dictionary) -> String:
	var expected: Array = _save_data().keys()
	for field: String in expected:
		if not data.has(field):
			return "缺少字段 %s。" % field
	if not _whole(data["version"], 1, 1):
		return "不支持这个存档版本。"
	for field: String in ["coins", "supply_spent", "sailing_days"]:
		if not _whole(data[field], 0, 1000000000000):
			return "%s 数值无效。" % field
	if not _whole(data["day"], 1, 1000000000) or not _whole(data["lifetime_profit"], -1000000000000, 1000000000000):
		return "日期或利润无效。"
	if not data["ship_id"] is String or not SHIPS.has(data["ship_id"]):
		return "船型无效。"
	if not data["ship_name"] is String or data["ship_name"].strip_edges() != data["ship_name"] or data["ship_name"].is_empty() or data["ship_name"].length() > 12:
		return "船名无效。"
	if not data["cargo_upgraded"] is bool or not data["at_sea"] is bool:
		return "航行或扩舱标记无效。"
	var expected_capacity: int = int(SHIPS[data["ship_id"]]["capacity"]) + (UPGRADE_CAPACITY_BONUS if data["cargo_upgraded"] else 0)
	var expected_hull: int = int(SHIPS[data["ship_id"]]["max_hull"])
	if not _whole(data["capacity"], expected_capacity, expected_capacity) or not _whole(data["max_hull"], expected_hull, expected_hull):
		return "船型与船体参数不一致。"
	if not _whole(data["hull"], 0, expected_hull) or not _whole(data["max_supplies"], 30, 30) or not _whole(data["supplies"], 0, 30):
		return "船体或补给无效。"
	if not data["current_port"] is String or not data["last_port"] is String or not PORTS.has(data["last_port"]):
		return "停靠港口无效。"
	if (data["at_sea"] and data["current_port"] != "") or (not data["at_sea"] and data["current_port"] != data["last_port"]):
		return "航行状态与港口不一致。"
	if not data["autopilot_target"] is String or (data["autopilot_target"] != "" and not PORTS.has(data["autopilot_target"])):
		return "自动航行目标无效。"
	if not _number(data["heading"], -1000000.0, 1000000.0) or not _number(data["speed"], 0.0, 1000.0) or not _whole(data["sail_level"], 0, 2):
		return "船只航向或速度无效。"
	if not _number(data["day_elapsed"], 0.0, SECONDS_PER_DAY) or float(data["day_elapsed"]) >= SECONDS_PER_DAY:
		return "日内时间无效。"
	var position_data: Variant = data["ship_position"]
	if not position_data is Array or position_data.size() != 2 or not _number(position_data[0], -1000000.0, 1000000.0) or not _number(position_data[1], -1000000.0, 1000000.0):
		return "船只位置无效。"
	if not data["at_sea"]:
		var port_position: Vector2 = PORTS[data["last_port"]]["position"]
		if Vector2(float(position_data[0]), float(position_data[1])).distance_to(port_position) > 0.01 or float(data["speed"]) != 0.0 or data["autopilot_target"] != "":
			return "停港位置与航行状态不一致。"
	for field: String in ["cargo", "cost_basis", "purchase_lots"]:
		if not data[field] is Dictionary or data[field].size() != GOODS.size():
			return "货物数据无效。"
	var total_cargo: int = 0
	for good: String in GOODS:
		if not data["cargo"].has(good) or not data["cost_basis"].has(good) or not data["purchase_lots"].has(good):
			return "货物种类不完整。"
		if not _whole(data["cargo"][good], 0, expected_capacity) or not _whole(data["cost_basis"][good], 0, 1000000000000):
			return "货物数量或成本无效。"
		var lots: Variant = data["purchase_lots"][good]
		if not lots is Array or lots.size() > expected_capacity:
			return "货物批次无效。"
		var lot_quantity: int = 0
		var lot_cost: int = 0
		for lot: Variant in lots:
			if not lot is Dictionary or not lot.has("quantity") or not lot.has("unit_cost") or not _whole(lot["quantity"], 1, expected_capacity) or not _whole(lot["unit_cost"], 1, 1000000):
				return "货物批次无效。"
			lot_quantity += int(lot["quantity"])
			lot_cost += int(lot["quantity"]) * int(lot["unit_cost"])
		if lot_quantity != int(data["cargo"][good]) or lot_cost != int(data["cost_basis"][good]):
			return "货物批次与持仓成本不一致。"
		total_cargo += lot_quantity
	if total_cargo > expected_capacity:
		return "货物超过船舱容量。"
	if not data["stocks"] is Dictionary or data["stocks"].size() != PORTS.size():
		return "市场库存无效。"
	for port: String in PORTS:
		if not data["stocks"].has(port) or not data["stocks"][port] is Dictionary or data["stocks"][port].size() != GOODS.size():
			return "港口库存不完整。"
		for good: String in GOODS:
			if not data["stocks"][port].has(good) or not _whole(data["stocks"][port][good], 0, 1000000):
				return "市场库存数量无效。"
	if not data["visited"] is Dictionary or not data["visited"].has(data["last_port"]):
		return "访问记录无效。"
	for port: Variant in data["visited"]:
		if not port is String or not PORTS.has(port) or not data["visited"][port] is bool or not data["visited"][port]:
			return "访问记录无效。"
	if not data["events"] is Array or data["events"].size() > 6:
		return "航海日志无效。"
	for event: Variant in data["events"]:
		if not event is String or event.length() > 500:
			return "航海日志无效。"
	return ""


func _number(value: Variant, minimum: float, maximum: float) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) >= minimum and float(value) <= maximum


func _whole(value: Variant, minimum: int, maximum: int) -> bool:
	return _number(value, float(minimum), float(maximum)) and float(value) == floor(float(value))


func _apply_save(data: Dictionary) -> void:
	coins = int(data["coins"])
	day = int(data["day"])
	ship_id = data["ship_id"]
	ship_name = data["ship_name"]
	cargo = {}
	cost_basis = {}
	_purchase_lots = {}
	for good: String in GOODS:
		cargo[good] = int(data["cargo"][good])
		cost_basis[good] = int(data["cost_basis"][good])
		_purchase_lots[good] = []
		for lot: Dictionary in data["purchase_lots"][good]:
			_purchase_lots[good].append({"quantity": int(lot["quantity"]), "unit_cost": int(lot["unit_cost"])})
	supplies = int(data["supplies"])
	max_supplies = int(data["max_supplies"])
	capacity = int(data["capacity"])
	hull = int(data["hull"])
	max_hull = int(data["max_hull"])
	current_port = data["current_port"]
	last_port = data["last_port"]
	at_sea = data["at_sea"]
	ship_position = Vector2(float(data["ship_position"][0]), float(data["ship_position"][1]))
	heading = float(data["heading"])
	speed = float(data["speed"])
	sail_level = int(data["sail_level"])
	autopilot_target = data["autopilot_target"]
	visited = data["visited"].duplicate(true)
	lifetime_profit = int(data["lifetime_profit"])
	supply_spent = int(data["supply_spent"])
	events.assign(data["events"])
	cargo_upgraded = data["cargo_upgraded"]
	stocks = {}
	for port: String in PORTS:
		stocks[port] = {}
		for good: String in GOODS:
			stocks[port][good] = int(data["stocks"][port][good])
	day_elapsed = float(data["day_elapsed"])
	_sailing_days = int(data["sailing_days"])
