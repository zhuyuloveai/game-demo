extends SceneTree

const GameState = preload("res://scripts/v2/game_state.gd")
const SAVE_PATH: String = "user://v2_state_test.json"
const BAD_PATH: String = "user://v2_state_test_invalid.json"

var _checks: int = 0
var _failures: int = 0


func _init() -> void:
	_test_trade_loop()
	_test_trade_guards()
	_test_navigation_and_time()
	_test_market_and_fifo()
	_test_shipyard()
	_test_rescue()
	_test_save_load()
	_test_reset_and_isolation()
	for path: String in [SAVE_PATH, BAD_PATH, SAVE_PATH + ".tmp"]:
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	if _failures == 0:
		print("PASS: v2 sailing state (%d checks)" % _checks)
	else:
		push_error("FAIL: %d of %d v2 state checks failed" % [_failures, _checks])
	quit(0 if _failures == 0 else 1)


func _test_trade_loop() -> void:
	var state = GameState.new()
	_check(state.coins == 800 and state.day == 1 and state.capacity == 20, "initial funds and ship")
	_check(state.max_buy("tea") == 20, "maximum purchase respects cargo capacity")
	_check(state.buy("tea", 20).is_empty(), "load Dawn tea")
	_sail_to(state, "pine", 24.0)
	_check(state.sell("tea", 20).is_empty(), "sell tea in Pine")
	_check(state.buy("ceramic", 20).is_empty(), "load Pine ceramics")
	_sail_to(state, "sand", 36.0)
	_check(state.sell("ceramic", 20).is_empty(), "sell ceramics in Sand")
	_check(state.buy("spice", 20).is_empty(), "load Sand spice")
	_check(state.resupply(4).is_empty(), "buy provisions in Sand")
	_sail_to(state, "dawn", 36.0)
	_check(state.sell("spice", 20).is_empty(), "sell spice in Dawn")
	_check(state.visited.size() == 3 and state.current_port == "dawn" and not state.at_sea, "three-port loop records arrival")
	_check(state.cargo_used() == 0 and state.lifetime_profit > 600, "trade route earns meaningful realized profit")
	_check(state.coins == 800 + state.lifetime_profit - state.supply_spent, "cash reconciles with profit and provisions")
	_check(state.day == 9 and state.supplies == 14 and state.supply_spent == 12, "eight sailing days consume provisions")
	_check(state.hull == 98 and state.events.size() == 6, "wear and bounded log survive loop")
	_check(state.upgrade_cargo().is_empty() and state.capacity == 30, "profits can expand cargo hold")


func _test_trade_guards() -> void:
	var state = GameState.new()
	for quantity: int in [0, -1, -100]:
		_rejected(state, func() -> String: return state.buy("tea", quantity), "nonpositive purchase")
		_rejected(state, func() -> String: return state.sell("tea", quantity), "nonpositive sale")
		_rejected(state, func() -> String: return state.resupply(quantity), "nonpositive supplies")
	_rejected(state, func() -> String: return state.buy("gold", 1), "unknown good")
	_rejected(state, func() -> String: return state.sell("tea", 1), "absent cargo")
	_rejected(state, func() -> String: return state.buy("tea", 21), "cargo overflow")
	_rejected(state, func() -> String: return state.buy("spice", 20), "unaffordable purchase")
	_rejected(state, func() -> String: return state.resupply(13), "supply overflow")
	_check(state.price("gold") == 0 and state.stock("gold") == 0 and state.max_buy("gold") == 0 and state.avg_cost("gold") == 0.0, "unknown good queries are safe")
	_check(state.price("tea", false, "missing") == 0 and state.stock("tea", "missing") == 0, "unknown port queries are safe")
	state.coins = 2
	_rejected(state, func() -> String: return state.resupply(1), "insufficient supply money")
	_rejected(state, func() -> String: return state.rest(), "insufficient inn money")
	state.coins = 800
	_check(state.buy("tea", 20).is_empty(), "fill hold")
	_check(state.max_buy("fish") == 0, "full hold disables further purchase")
	_rejected(state, func() -> String: return state.buy("fish", 1), "full hold rejects purchase")
	_rejected(state, func() -> String: return state.sell("tea", 21), "oversale")
	_check(state.depart().is_empty(), "depart for sea trade guards")
	_rejected(state, func() -> String: return state.buy("tea", 1), "sea purchase")
	_rejected(state, func() -> String: return state.sell("tea", 1), "sea sale")
	_rejected(state, func() -> String: return state.resupply(1), "sea resupply")
	_rejected(state, func() -> String: return state.rest(), "sea rest")
	_rejected(state, func() -> String: return state.repair(), "sea repair")
	_rejected(state, func() -> String: return state.upgrade_cargo(), "sea upgrade")
	_rejected(state, func() -> String: return state.buy_ship("coaster"), "sea ship purchase")
	_check(state.max_buy("tea") == 0 and state.price("tea") == 0, "no active market at sea")
	_check(state.price("tea", false, "dawn") > 0, "explicit harbor quote available at sea")


func _test_navigation_and_time() -> void:
	var state = GameState.new()
	var before: Dictionary = state._save_data()
	state.advance_time(120.0)
	_check(state._save_data() == before, "time does not pass while docked")
	_rejected(state, func() -> String: return state.dock("dawn"), "duplicate docking")
	state.supplies = 0
	_rejected(state, func() -> String: return state.depart(), "departure without supplies")
	state.supplies = 18
	state.hull = 0
	_rejected(state, func() -> String: return state.depart(), "departure without hull")
	state.hull = 100
	_check(state.depart().is_empty(), "departure opens free sailing")
	_check(state.current_port.is_empty() and state.last_port == "dawn" and state.at_sea, "departure retains last harbor")
	_rejected(state, func() -> String: return state.depart(), "duplicate departure")
	_rejected(state, func() -> String: return state.dock("unknown"), "unknown port docking")
	_rejected(state, func() -> String: return state.dock("pine"), "distant port docking")
	state.ship_position = GameState.PORTS["pine"]["position"] + Vector2(150.01, 0)
	_rejected(state, func() -> String: return state.dock("pine"), "just outside dock radius")
	state.ship_position = GameState.PORTS["pine"]["position"] + Vector2(150, 0)
	state.speed = 30.01
	_rejected(state, func() -> String: return state.dock("pine"), "too fast to dock")
	state.speed = 30.0
	state.autopilot_target = "pine"
	_check(state.dock("pine").is_empty(), "dock at inclusive distance and speed boundaries")
	_check(state.ship_position == GameState.PORTS["pine"]["position"] and state.speed == 0 and state.autopilot_target == "", "dock stops ship and autopilot")
	_check(state.depart().is_empty(), "start timed voyage")
	state.sail_level = 0
	state.advance_time(11.5)
	_check(state.day == 1 and state.supplies == 18 and state.day_elapsed == 11.5, "partial day does not prematurely consume supplies")
	state.advance_time(0.5)
	_check(state.day == 2 and state.supplies == 17, "anchored ship still consumes one daily provision")
	state.advance_time(24.0)
	_check(state.day == 4 and state.supplies == 15 and state.hull == 99, "multiple elapsed days and third-day wear")
	before = state._save_data()
	state.advance_time(-10.0)
	state.advance_time(NAN)
	state.advance_time(INF)
	_check(state._save_data() == before, "invalid elapsed times do not mutate state")
	state.supplies = 1
	state.advance_time(12.0)
	_check(state.supplies == 0 and state.hull == 99, "last ration covers its day")
	state.advance_time(24.0)
	_check(state.hull == 89 and state.supplies == 0, "two unfed days damage hull")
	state.hull = 3
	state.speed = 80
	state.sail_level = 2
	state.advance_time(12.0)
	_check(state.hull == 0 and state.speed == 0 and state.sail_level == 0, "hull never falls below zero and disabled ship stops")


func _test_market_and_fifo() -> void:
	var state = GameState.new()
	var initial_stock: int = state.stock("tea")
	var first_cost: int = state.price("tea")
	_check(state.buy("tea", 3).is_empty(), "first tea lot")
	_check(state.stock("tea") == initial_stock - 3, "purchase reduces local stock")
	_sail_to(state, "pine", 12.0)
	var second_cost: int = state.price("tea")
	_check(second_cost > first_cost, "same cargo has a different cost in another port")
	_check(state.buy("tea", 2).is_empty(), "second tea lot")
	_check(state.cost_basis["tea"] == first_cost * 3 + second_cost * 2, "mixed lots preserve exact basis")
	_check(is_equal_approx(state.avg_cost("tea"), float(first_cost * 3 + second_cost * 2) / 5.0), "average cost reflects held lots")
	var sale_quote: int = state.price("tea", true)
	_check(state.sell("tea", 4).is_empty(), "sale spans two lots")
	_check(state.cost_basis["tea"] == second_cost and state.cargo["tea"] == 1, "FIFO keeps final higher-cost unit")
	_check(state.lifetime_profit == sale_quote * 4 - first_cost * 3 - second_cost, "FIFO realized profit exact")
	_check(state.sell("tea", 1).is_empty(), "sell last FIFO unit")
	_check(state.cost_basis["tea"] == 0 and state.avg_cost("tea") == 0 and state._purchase_lots["tea"].is_empty(), "no residual basis after full sale")
	state.reset_game()
	state.coins = 10000
	var quote_before: int = state.price("spice")
	_check(state.buy("spice", 20).is_empty(), "deplete a finite imported stock")
	_check(state.stock("spice") == 0 and state.price("spice") > quote_before, "shortage changes displayed market price")
	_check(state.upgrade_cargo().is_empty(), "make room for stock rejection check")
	_rejected(state, func() -> String: return state.buy("spice", 1), "stock exhaustion")
	var before_rest: int = state.coins
	state.hull = 90
	_check(state.rest().is_empty(), "rest refreshes market")
	_check(state.day == 2 and state.hull == 95 and state.coins == before_rest - 20, "rest charges and heals once")
	_check(state.stock("spice") == 20, "daily shipment restores stock target")
	var prices: Dictionary = {}
	for ignored: int in range(7):
		prices[state.price("spice")] = true
		state.rest()
	_check(prices.size() > 1, "predictable day cycle changes prices")
	for port: String in GameState.PORTS:
		for good: String in GameState.GOODS:
			state.reset_game()
			state.coins = 10000
			if port != "dawn":
				_sail_to(state, port, 0.0)
			var old_coins: int = state.coins
			_check(state.buy(good, 20).is_empty() and state.sell(good, 20).is_empty(), "round-trip quote test for %s/%s" % [port, good])
			_check(state.coins <= old_coins, "same-port immediate sale cannot exploit stock repricing")


func _test_shipyard() -> void:
	var state = GameState.new()
	_rejected(state, func() -> String: return state.repair(), "repair intact hull")
	_rejected(state, func() -> String: return state.buy_ship("unknown"), "unknown ship")
	_rejected(state, func() -> String: return state.buy_ship("sloop"), "buy current ship")
	_rejected(state, func() -> String: return state.buy_ship("coaster"), "unaffordable ship")
	state.hull = 70
	state.coins = 29
	_rejected(state, func() -> String: return state.repair(), "unaffordable repair")
	state.coins = 30
	_check(state.repair().is_empty() and state.coins == 0 and state.hull == 100, "repair charges one gold per hull point")
	_rejected(state, func() -> String: return state.upgrade_cargo(), "unaffordable expansion")
	state.coins = 10000
	_check(state.upgrade_cargo().is_empty() and state.capacity == 30 and state.coins == 9600, "one-time cargo expansion")
	_rejected(state, func() -> String: return state.upgrade_cargo(), "duplicate expansion")
	_check(state.rename_ship("  白鹭号  ").is_empty() and state.ship_name == "白鹭号", "ship rename trims whitespace")
	_rejected(state, func() -> String: return state.rename_ship(" \n "), "empty ship name")
	_rejected(state, func() -> String: return state.rename_ship("1234567890123"), "overlong ship name")
	_check(state.buy("tea", 30).is_empty(), "existing cargo before ship purchase")
	var old_coins: int = state.coins
	state.hull = 50
	_check(state.buy_ship("coaster").is_empty(), "buy coastal ship")
	_check(state.coins == old_coins - 1400 and state.trade_in_value() == 700, "ship price and resale value")
	_check(state.capacity == 48 and state.cargo_used() == 30 and state.ship_name == "白鹭号", "upgrade cargo and name survive ship replacement")
	_check(state.hull == 140 and state.max_hull == 140, "new ship starts fully repaired")
	_check(state.buy("fish", 1).is_empty(), "cargo above upgraded sloop capacity")
	_rejected(state, func() -> String: return state.buy_ship("sloop"), "cannot downgrade into overfull hold")
	old_coins = state.coins
	_check(state.buy_ship("merchant").is_empty(), "upgrade to merchant")
	_check(state.coins == old_coins - 2900 and state.capacity == 74 and state.trade_in_value() == 1800, "old ship credit and expansion carry into merchant")
	_check(state.sell("fish", 1).is_empty(), "reduce cargo before smaller ship")
	old_coins = state.coins
	_check(state.buy_ship("sloop").is_empty() and state.coins == old_coins + 1800, "downsizing credits net trade-in value")
	_check(state.capacity == 30 and state.cargo_used() == 30, "exact-capacity downgrade allowed")


func _test_rescue() -> void:
	var state = GameState.new()
	_rejected(state, func() -> String: return state.rescue(), "rescue while docked")
	_check(state.buy("tea", 4).is_empty(), "keep cargo through tow")
	_sail_to(state, "pine", 12.0)
	_check(state.depart().is_empty(), "depart last visited port")
	state.coins = 30
	state.hull = 1
	state.supplies = 0
	state.ship_position = Vector2(1000, 1000)
	state.speed = 15
	state.autopilot_target = "sand"
	var old_day: int = state.day
	var basis: Dictionary = state.cost_basis.duplicate(true)
	_check(state.rescue().is_empty(), "affordable emergency tow")
	_check(not state.at_sea and state.current_port == "pine" and state.ship_position == GameState.PORTS["pine"]["position"], "tow returns to last actual harbor")
	_check(state.coins == 0 and state.day == old_day + 2 and state.hull == 40 and state.supplies == 6, "tow fee and recovery guarantee")
	_check(state.cargo["tea"] == 4 and state.cost_basis == basis and state.lifetime_profit == 0, "tow preserves cargo and does not create trading profit")
	_check(state.autopilot_target == "" and state.speed == 0 and not state.visited.has("sand"), "tow clears route and grants no destination visit")
	_check(state.depart().is_empty() and state.rescue().is_empty(), "penniless captain still has a rescue path")
	_check(state.coins == 0, "free tow never makes money negative")


func _test_save_load() -> void:
	var state = GameState.new()
	_check(state.buy("tea", 5).is_empty(), "save fixture cargo")
	_sail_to(state, "pine", 24.0)
	_check(state.buy("tea", 2).is_empty(), "save fixture second cost lot")
	_check(state.depart().is_empty(), "save at sea")
	state.ship_position = Vector2(2850.25, 1270.75)
	state.heading = 1.125
	state.speed = 47.25
	state.sail_level = 2
	state.autopilot_target = "sand"
	state.advance_time(5.75)
	var original: Dictionary = state._save_data()
	_check(state.save_game(SAVE_PATH).is_empty(), "write versioned save")
	_check(state._save_data() == original, "saving does not mutate gameplay state")
	var loaded = GameState.new()
	_check(loaded.load_game(SAVE_PATH).is_empty(), "load valid sea save")
	_check(loaded._save_data() == original, "save restores all navigation, market, cargo lots, and day fraction")
	state.advance_time(6.25)
	loaded.advance_time(6.25)
	_check(loaded._save_data() == state._save_data(), "restored partial day advances identically")
	state.ship_position = GameState.PORTS["sand"]["position"]
	loaded.ship_position = state.ship_position
	state.speed = 0
	loaded.speed = 0
	_check(state.dock("sand").is_empty() and loaded.dock("sand").is_empty(), "both sessions dock")
	_check(state.sell("tea", 6).is_empty() and loaded.sell("tea", 6).is_empty(), "sale after loaded FIFO position")
	_check(loaded._save_data() == state._save_data(), "loaded FIFO sale has identical profit and remaining cost")
	_check(state.save_game(SAVE_PATH).is_empty(), "replace an existing save atomically")
	var replacement = GameState.new()
	_check(replacement.load_game(SAVE_PATH).is_empty() and replacement._save_data() == state._save_data(), "replacement file is latest docked state")
	_rejected(loaded, func() -> String: return loaded.load_game("user://v2_deliberately_missing.json"), "missing save")
	_write_text(BAD_PATH, "{ broken JSON")
	_rejected(loaded, func() -> String: return loaded.load_game(BAD_PATH), "broken JSON")
	_write_text(BAD_PATH, "[]")
	_rejected(loaded, func() -> String: return loaded.load_game(BAD_PATH), "non-object save")
	var valid: Dictionary = state._save_data()
	var bad_values: Array[Dictionary] = [
		{"field": "version", "value": 2}, {"field": "coins", "value": -1},
		{"field": "coins", "value": "800"}, {"field": "day", "value": 1.5},
		{"field": "ship_id", "value": "pirate"}, {"field": "ship_name", "value": ""},
		{"field": "cargo_upgraded", "value": 1}, {"field": "capacity", "value": 999},
		{"field": "hull", "value": 101}, {"field": "supplies", "value": 31},
		{"field": "at_sea", "value": true}, {"field": "last_port", "value": "missing"},
		{"field": "ship_position", "value": [0, 0]}, {"field": "ship_position", "value": ["bad", 0]},
		{"field": "speed", "value": -1}, {"field": "sail_level", "value": 3},
		{"field": "autopilot_target", "value": "missing"}, {"field": "day_elapsed", "value": 12},
		{"field": "visited", "value": {"sand": false}}, {"field": "events", "value": [123]},
	]
	for mutation: Dictionary in bad_values:
		var corrupt: Dictionary = valid.duplicate(true)
		corrupt[mutation["field"]] = mutation["value"]
		_write_text(BAD_PATH, JSON.stringify(corrupt))
		_rejected(loaded, func() -> String: return loaded.load_game(BAD_PATH), "invalid save field %s" % mutation["field"])
	var corrupt: Dictionary = valid.duplicate(true)
	corrupt.erase("stocks")
	_invalid_save(loaded, corrupt, "missing required field")
	corrupt = valid.duplicate(true)
	corrupt["cargo"]["tea"] = 2
	_invalid_save(loaded, corrupt, "cargo and FIFO mismatch")
	corrupt = valid.duplicate(true)
	corrupt["cost_basis"]["tea"] = 0
	_invalid_save(loaded, corrupt, "cost and FIFO mismatch")
	corrupt = valid.duplicate(true)
	corrupt["purchase_lots"]["tea"] = [{"quantity": 0, "unit_cost": 12}]
	_invalid_save(loaded, corrupt, "empty or malformed FIFO lot")
	corrupt = valid.duplicate(true)
	corrupt["stocks"]["dawn"]["tea"] = -1
	_invalid_save(loaded, corrupt, "negative market stock")
	corrupt = valid.duplicate(true)
	corrupt["stocks"]["pine"].erase("fish")
	_invalid_save(loaded, corrupt, "incomplete market stock")
	_rejected(loaded, func() -> String: return loaded.save_game("user://v2_missing_directory/invalid.json"), "unwritable save location")


func _test_reset_and_isolation() -> void:
	var state = GameState.new()
	var original: Dictionary = state._save_data()
	var independent = GameState.new()
	state.buy("tea", 5)
	state.upgrade_cargo()
	state.depart()
	state.advance_time(37.5)
	state.ship_position += Vector2(150, 300)
	state.rename_ship("远行号")
	_check(independent._save_data() == original, "instances do not share stock, cargo lots, or logs")
	state.reset_game()
	_check(state._save_data() == original, "reset restores every persisted field")


func _sail_to(state, destination: String, seconds: float) -> void:
	_check(state.depart().is_empty(), "depart for " + destination)
	state.advance_time(seconds)
	state.ship_position = GameState.PORTS[destination]["position"]
	state.speed = 0.0
	_check(state.dock(destination).is_empty(), "dock at " + destination)


func _invalid_save(state, data: Dictionary, label: String) -> void:
	_write_text(BAD_PATH, JSON.stringify(data))
	_rejected(state, func() -> String: return state.load_game(BAD_PATH), label)


func _write_text(path: String, value: String) -> void:
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	_check(file != null, "create test save fixture")
	if file != null:
		file.store_string(value)
		file.close()


func _rejected(state, action: Callable, label: String) -> void:
	var before: Dictionary = state._save_data()
	_check(not String(action.call()).is_empty(), label + " returns error")
	_check(state._save_data() == before, label + " leaves full state unchanged")


func _check(passed: bool, label: String) -> void:
	_checks += 1
	if not passed:
		_failures += 1
		push_error(label)
