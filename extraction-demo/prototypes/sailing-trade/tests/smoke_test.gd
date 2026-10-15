extends SceneTree

const TradeState = preload("res://scripts/trade_state.gd")

var _checks: int = 0
var _failures: int = 0


func _init() -> void:
	_test_round_trip()
	_test_invalid_actions()
	_test_travel_guards()
	_test_cost_accounting()
	_test_upgrade_guards()
	_test_empty_trip_requires_trade()
	_test_rescue()
	_test_restart_and_isolation()
	if _failures == 0:
		print("PASS: sailing trade smoke test (%d checks)" % _checks)
	else:
		push_error("FAIL: %d of %d sailing trade checks failed" % [_failures, _checks])
	quit(0 if _failures == 0 else 1)


func _test_round_trip() -> void:
	var state = TradeState.new()
	_check(state.buy("tea", 10).is_empty(), "fill the hold with tea")
	_check(state.depart("pine").is_empty(), "depart for Pine")
	_check(state.current_port == "dawn" and state.pending_destination == "pine", "departure waits for arrival")
	_check(state.supplies == 5 and state.day == 4 and state.voyages == 0, "departure consumes time and supplies once")
	_check(state.arrive().is_empty(), "arrive in Pine")
	_check(state.sell("tea", 10).is_empty(), "sell tea at profit")
	_check(state.buy("ceramic", 10).is_empty(), "buy local ceramics")
	_check(state.depart("sand").is_empty(), "depart for Sand")
	_check(state.arrive().is_empty(), "arrive in Sand")
	_check(state.sell("ceramic", 10).is_empty(), "sell ceramics at profit")
	_check(state.buy("spice", 10).is_empty(), "buy local spice")
	_check(state.resupply(2).is_empty(), "buy enough supplies to return")
	_check(state.depart("dawn").is_empty(), "return home")
	_check(not state.round_trip_complete, "return must finish before loop completion")
	_check(state.arrive().is_empty(), "complete return")
	_check(state.sell("spice", 10).is_empty(), "sell spice at home")
	_check(state.coins == 562 and state.trade_profit == 350, "full trading loop produces expected cash and gross profit")
	_check(state.total_purchases == 440 and state.total_sales == 790, "purchase and sales totals reconcile")
	_check(state.supply_spent == 8 and state.supplies == 0, "supply cost is tracked separately from gross profit")
	_check(state.day == 11 and state.voyages == 3 and state.visited.size() == 3, "three-port itinerary is recorded")
	_check(state.round_trip_complete and state.used_capacity() == 0, "loop is complete with empty hold")
	_check(state.upgrade().is_empty(), "upgrade after successful round trip")
	_check(state.capacity == 16 and state.upgraded and state.coins == 362, "upgrade gives useful capacity and charges once")
	_expect_rejected(state, func() -> String: return state.upgrade(), "second upgrade")


func _test_invalid_actions() -> void:
	var state = TradeState.new()
	for quantity: int in [0, -1, -100]:
		_expect_rejected(state, func() -> String: return state.buy("tea", quantity), "nonpositive buy")
		_expect_rejected(state, func() -> String: return state.sell("tea", quantity), "nonpositive sale")
		_expect_rejected(state, func() -> String: return state.resupply(quantity), "nonpositive resupply")
	_expect_rejected(state, func() -> String: return state.buy("gold", 1), "unknown goods purchase")
	_expect_rejected(state, func() -> String: return state.sell("gold", 1), "unknown goods sale")
	_expect_rejected(state, func() -> String: return state.buy("tea", 11), "hold overflow")
	_expect_rejected(state, func() -> String: return state.buy("spice", 10), "unaffordable purchase")
	_expect_rejected(state, func() -> String: return state.sell("tea", 1), "selling absent stock")
	_expect_rejected(state, func() -> String: return state.resupply(7), "supply capacity overflow")
	_check(state.buy("tea", 3).is_empty(), "buy stock for oversale check")
	_expect_rejected(state, func() -> String: return state.sell("tea", 4), "selling more than stock")
	state.coins = 3
	_expect_rejected(state, func() -> String: return state.resupply(1), "unaffordable resupply")


func _test_travel_guards() -> void:
	var state = TradeState.new()
	_check(state.travel_days("dawn") == 0 and state.travel_days("unknown") == -1, "same and unknown route lengths")
	_check(state.travel_days("pine") == 3 and state.travel_days("sand") == 4, "home route lengths")
	_expect_rejected(state, func() -> String: return state.depart("dawn"), "departing for current port")
	_expect_rejected(state, func() -> String: return state.depart("unknown"), "unknown destination")
	_expect_rejected(state, func() -> String: return state.arrive(), "arrival without departure")
	_check(state.buy("tea", 1).is_empty(), "stock for in-transit trade checks")
	_check(state.depart("pine").is_empty(), "start guarded voyage")
	_expect_rejected(state, func() -> String: return state.buy("tea", 1), "buy during voyage")
	_expect_rejected(state, func() -> String: return state.sell("tea", 1), "sell during voyage")
	_expect_rejected(state, func() -> String: return state.resupply(1), "resupply during voyage")
	_expect_rejected(state, func() -> String: return state.upgrade(), "upgrade during voyage")
	_expect_rejected(state, func() -> String: return state.depart("sand"), "second departure during voyage")
	_expect_rejected(state, func() -> String: return state.rescue(), "rescue during voyage")
	_check(state.arrive().is_empty(), "finish guarded voyage")
	_check(state.travel_days("sand") == 3 and state.travel_days("dawn") == 3, "Pine route lengths")
	_expect_rejected(state, func() -> String: return state.arrive(), "duplicate arrival")
	state.supplies = 2
	_expect_rejected(state, func() -> String: return state.depart("sand"), "insufficient voyage supplies")
	state.supplies = 3
	_check(state.depart("sand").is_empty(), "exactly enough supplies permits departure")
	_check(state.arrive().is_empty(), "arrive with zero supplies")
	_check(state.travel_days("pine") == 3 and state.travel_days("dawn") == 4, "Sand route lengths")


func _test_cost_accounting() -> void:
	var state = TradeState.new()
	_check(state.buy("tea", 3).is_empty(), "buy tea at first cost")
	_check(state.depart("pine").is_empty() and state.arrive().is_empty(), "move to second tea market")
	_check(state.buy("tea", 2).is_empty(), "buy same goods at a different cost")
	_check(state.cost_basis["tea"] == 88, "mixed purchase lots retain exact cost")
	_check(state.sell("tea", 4).is_empty(), "partial sale spanning two purchase lots")
	_check(state.trade_profit == 22 and state.cost_basis["tea"] == 26 and state.cargo["tea"] == 1, "FIFO partial-sale profit and remainder")
	_check(state.sell("tea", 1).is_empty(), "sell final lot at a loss")
	_check(state.trade_profit == 17 and state.cost_basis["tea"] == 0, "realized loss counts and no residual cost remains")
	_check(state.total_sales - state.total_purchases == state.trade_profit, "profit reconciles after all holdings sold")


func _test_upgrade_guards() -> void:
	var state = TradeState.new()
	_expect_rejected(state, func() -> String: return state.upgrade(), "upgrade before a round trip")
	_check(state.depart("pine").is_empty() and state.arrive().is_empty(), "visit first port")
	_expect_rejected(state, func() -> String: return state.upgrade(), "upgrade away from home")
	_check(state.depart("dawn").is_empty() and state.arrive().is_empty(), "return from only one port")
	_check(not state.round_trip_complete, "one-port return does not complete three-port loop")
	state.round_trip_complete = true
	state.trade_profit = state.supply_spent + 1
	state.coins = 199
	_expect_rejected(state, func() -> String: return state.upgrade(), "unaffordable upgrade")


func _test_empty_trip_requires_trade() -> void:
	var state = TradeState.new()
	_check(state.depart("pine").is_empty() and state.arrive().is_empty(), "visit Pine with an empty hold")
	_check(state.depart("sand").is_empty() and state.arrive().is_empty(), "visit Sand with an empty hold")
	_check(state.resupply(2).is_empty(), "resupply empty return voyage")
	_check(state.depart("dawn").is_empty() and state.arrive().is_empty(), "complete empty three-port voyage")
	_check(state.round_trip_complete and state.coins == 212 and state.used_capacity() == 0, "empty circuit reaches home with enough cash to upgrade")
	_check(state.trade_profit == 0 and state.supply_spent == 8, "empty circuit generates no trade income")
	_expect_rejected(state, func() -> String: return state.upgrade(), "empty circuit cannot skip trading to unlock upgrade")
	_check(state.resupply(6).is_empty(), "prepare a profitable return trip after empty circuit")
	_check(state.buy("tea", 10).is_empty(), "load goods after the empty circuit")
	_check(state.depart("pine").is_empty() and state.arrive().is_empty(), "deliver tea to Pine")
	_check(state.sell("tea", 10).is_empty(), "realize trade profit after the empty circuit")
	_check(state.depart("dawn").is_empty() and state.arrive().is_empty(), "bring earned trade income home")
	_check(state.trade_profit == 90 and state.supply_spent == 32 and state.coins == 278, "real trading covers supplies for both circuits")
	_check(state.upgrade().is_empty(), "profitable trade unlocks upgrade after previously rejected empty circuit")
	_check(state.upgraded and state.capacity == 16 and state.coins == 78, "earned upgrade charges once and expands hold")


func _test_rescue() -> void:
	var state = TradeState.new()
	_expect_rejected(state, func() -> String: return state.rescue(), "rescue when already seaworthy")
	_check(state.buy("tea", 5).is_empty(), "rescue cargo has tracked cost")
	_check(state.depart("sand").is_empty() and state.arrive().is_empty(), "become stranded away from home")
	state.supplies = 2
	state.coins = 4
	_check(not state.can_rescue(), "affording exactly the missing supplies prevents rescue")
	_expect_rejected(state, func() -> String: return state.rescue(), "rescue when resupply is affordable")
	state.coins = 3
	_check(state.can_rescue(), "stranded and unable to resupply can request rescue")
	var previous_day: int = state.day
	_check(state.rescue().is_empty(), "rescue stranded captain")
	_check(state.current_port == "dawn" and state.supplies == 8 and state.coins == 80, "rescue returns home with usable resources")
	_check(state.day == previous_day + 2 and state.voyages == 1, "rescue costs days and is not a trading voyage")
	_check(state.used_capacity() == 0 and state.cost_basis == {"tea": 0, "ceramic": 0, "spice": 0}, "rescue forfeits goods and their cost basis")
	_check(not state.round_trip_complete and not state.visited.has("pine"), "rescue grants no unvisited ports or completion")
	_check(not state.can_rescue(), "rescue cannot be repeated immediately")
	_check(state.buy("tea", 1).is_empty() and state.sell("tea", 1).is_empty(), "trading works after rescue")
	_check(state.trade_profit == -3 and state.cost_basis["tea"] == 0, "old lots are discarded by rescue")
	state.coins = 0
	state.supplies = 3
	_check(not state.can_rescue(), "no rescue when an affordable voyage still exists")


func _test_restart_and_isolation() -> void:
	var state = TradeState.new()
	var pristine: Dictionary = _snapshot(state)
	_check(state.buy("ceramic", 2).is_empty(), "change state before restart")
	_check(state.resupply(1).is_empty(), "spend on supplies before restart")
	_check(state.depart("pine").is_empty() and state.arrive().is_empty(), "change visits before restart")
	_check(state.sell("ceramic", 1).is_empty(), "change realized accounting before restart")
	state.capacity = 16
	state.upgraded = true
	state.round_trip_complete = true
	_check(state.depart("sand").is_empty(), "restart while in transit")
	state.restart()
	_check(_snapshot(state) == pristine, "restart restores all state including private lots")
	var other = TradeState.new()
	_check(state.buy("tea", 1).is_empty(), "mutate one independent session")
	_check(_snapshot(other) == pristine, "instances do not share mutable cargo or purchase lots")
	_check(state.sell("tea", 1).is_empty() and state.trade_profit == -3, "fresh purchases account correctly after restart")


func _expect_rejected(state, action: Callable, label: String) -> void:
	var before: Dictionary = _snapshot(state)
	var error: String = action.call()
	_check(not error.is_empty(), label + " returns an error")
	_check(_snapshot(state) == before, label + " leaves all state unchanged")


func _snapshot(state) -> Dictionary:
	return {
		"coins": state.coins,
		"supplies": state.supplies,
		"max_supplies": state.max_supplies,
		"capacity": state.capacity,
		"cargo": state.cargo.duplicate(true),
		"current_port": state.current_port,
		"day": state.day,
		"visited": state.visited.duplicate(true),
		"voyages": state.voyages,
		"trade_profit": state.trade_profit,
		"supply_spent": state.supply_spent,
		"upgraded": state.upgraded,
		"round_trip_complete": state.round_trip_complete,
		"pending_destination": state.pending_destination,
		"cost_basis": state.cost_basis.duplicate(true),
		"total_purchases": state.total_purchases,
		"total_sales": state.total_sales,
		"purchase_lots": state._purchase_lots.duplicate(true),
	}


func _check(passed: bool, label: String) -> void:
	_checks += 1
	if not passed:
		_failures += 1
		push_error(label)
