extends RefCounted

const HOME = "dawn"
const GOODS: Array[String] = ["tea", "ceramic", "spice"]
const GOOD_NAMES: Dictionary = {"tea": "茶叶", "ceramic": "陶器", "spice": "香料"}
const SUPPLY_PRICE: int = 4
const UPGRADE_COST: int = 200
const UPGRADE_CAPACITY_BONUS: int = 6
const PORTS: Dictionary = {
	"dawn": {
		"name": "曙光港",
		"description": "茶香飘过码头，你的小船从这里出发。",
		"buy": {"tea": 12, "ceramic": 26, "spice": 38},
		"sell": {"tea": 9, "ceramic": 21, "spice": 32},
	},
	"pine": {
		"name": "雾松湾",
		"description": "窑炉日夜不熄，远方的茶叶在这里很受欢迎。",
		"buy": {"tea": 26, "ceramic": 14, "spice": 34},
		"sell": {"tea": 21, "ceramic": 11, "spice": 28},
	},
	"sand": {
		"name": "赤砂埠",
		"description": "商人卸下香料，也在寻找精巧的陶器。",
		"buy": {"tea": 30, "ceramic": 32, "spice": 18},
		"sell": {"tea": 25, "ceramic": 26, "spice": 14},
	},
}

var coins: int = 220
var supplies: int = 8
var max_supplies: int = 14
var capacity: int = 10
var cargo: Dictionary = {"tea": 0, "ceramic": 0, "spice": 0}
var current_port: String = HOME
var day: int = 1
var visited: Dictionary = {"dawn": true}
var voyages: int = 0
var trade_profit: int = 0
var supply_spent: int = 0
var upgraded: bool = false
var round_trip_complete: bool = false
var pending_destination: String = ""
var cost_basis: Dictionary = {"tea": 0, "ceramic": 0, "spice": 0}
var total_purchases: int = 0
var total_sales: int = 0

# Keep purchase lots so partial sales never lose cost through average rounding.
var _purchase_lots: Dictionary = {"tea": [], "ceramic": [], "spice": []}


func used_capacity() -> int:
	var total: int = 0
	for good: String in GOODS:
		total += int(cargo[good])
	return total


func travel_days(target: String) -> int:
	if not PORTS.has(target) or not PORTS.has(current_port):
		return -1
	if target == current_port:
		return 0
	if (current_port == HOME and target == "sand") or (current_port == "sand" and target == HOME):
		return 4
	return 3


func buy(good: String, quantity: int) -> String:
	var error: String = _validate_trade(good, quantity)
	if not error.is_empty():
		return error
	if quantity > capacity - used_capacity():
		return "货舱空间不足。"
	var price: int = int(PORTS[current_port]["buy"][good])
	var cost: int = price * quantity
	if coins < cost:
		return "金币不足，无法买下这些货物。"
	coins -= cost
	cargo[good] = int(cargo[good]) + quantity
	cost_basis[good] = int(cost_basis[good]) + cost
	_purchase_lots[good].append({"quantity": quantity, "unit_cost": price})
	total_purchases += cost
	return ""


func sell(good: String, quantity: int) -> String:
	var error: String = _validate_trade(good, quantity)
	if not error.is_empty():
		return error
	if quantity > int(cargo[good]):
		return "船上没有这么多货物。"
	var revenue: int = int(PORTS[current_port]["sell"][good]) * quantity
	var sold_cost: int = _consume_purchase_lots(good, quantity)
	cargo[good] = int(cargo[good]) - quantity
	cost_basis[good] = int(cost_basis[good]) - sold_cost
	coins += revenue
	total_sales += revenue
	trade_profit += revenue - sold_cost
	return ""


func resupply(quantity: int) -> String:
	if not pending_destination.is_empty():
		return "航行中无法购买补给，请先抵达港口。"
	if quantity <= 0:
		return "补给数量必须大于零。"
	if quantity > max_supplies - supplies:
		return "补给舱装不下这么多补给。"
	var cost: int = quantity * SUPPLY_PRICE
	if coins < cost:
		return "金币不足，无法购买补给。"
	coins -= cost
	supplies += quantity
	supply_spent += cost
	return ""


func depart(target: String) -> String:
	if not pending_destination.is_empty():
		return "小船已在航行中。"
	var duration: int = travel_days(target)
	if duration < 0:
		return "没有通往这个港口的航线。"
	if duration == 0:
		return "你已经在这个港口。"
	if supplies < duration:
		return "补给不足，无法完成这段航程。"
	supplies -= duration
	day += duration
	pending_destination = target
	return ""


func arrive() -> String:
	if pending_destination.is_empty():
		return "小船尚未出航。"
	current_port = pending_destination
	pending_destination = ""
	visited[current_port] = true
	voyages += 1
	if current_port == HOME and visited.has("pine") and visited.has("sand"):
		round_trip_complete = true
	return ""


func upgrade() -> String:
	if not pending_destination.is_empty():
		return "航行中无法升级货舱。"
	if current_port != HOME:
		return "请回到曙光港的船坞升级。"
	if upgraded:
		return "货舱已经升级过了。"
	if not round_trip_complete:
		return "先访问雾松湾和赤砂埠，再返回曙光港。"
	if trade_profit <= supply_spent:
		return "先让卖货利润覆盖购入补给的开支，再扩建货舱。"
	if coins < UPGRADE_COST:
		return "金币不足，升级货舱需要 200 金币。"
	coins -= UPGRADE_COST
	capacity += UPGRADE_CAPACITY_BONUS
	upgraded = true
	return ""


func can_rescue() -> bool:
	if not pending_destination.is_empty():
		return false
	var shortest: int = max_supplies + 1
	for port: String in PORTS:
		var duration: int = travel_days(port)
		if duration > 0:
			shortest = mini(shortest, duration)
	var missing: int = shortest - supplies
	return missing > 0 and coins < missing * SUPPLY_PRICE


func rescue() -> String:
	if not can_rescue():
		return "目前无需救援：可以继续航行或购买足够补给。"
	for good: String in GOODS:
		cargo[good] = 0
		cost_basis[good] = 0
		_purchase_lots[good].clear()
	current_port = HOME
	supplies = 8
	coins = maxi(coins, 80)
	day += 2
	return ""


func restart() -> void:
	coins = 220
	supplies = 8
	max_supplies = 14
	capacity = 10
	cargo = {"tea": 0, "ceramic": 0, "spice": 0}
	current_port = HOME
	day = 1
	visited = {"dawn": true}
	voyages = 0
	trade_profit = 0
	supply_spent = 0
	upgraded = false
	round_trip_complete = false
	pending_destination = ""
	cost_basis = {"tea": 0, "ceramic": 0, "spice": 0}
	total_purchases = 0
	total_sales = 0
	_purchase_lots = {"tea": [], "ceramic": [], "spice": []}


func _validate_trade(good: String, quantity: int) -> String:
	if not pending_destination.is_empty():
		return "航行中无法交易，请先抵达港口。"
	if not GOODS.has(good):
		return "港口不交易这种货物。"
	if quantity <= 0:
		return "交易数量必须大于零。"
	return ""


func _consume_purchase_lots(good: String, quantity: int) -> int:
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
