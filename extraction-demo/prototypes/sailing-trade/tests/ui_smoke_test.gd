extends SceneTree

const MainScene = preload("res://scenes/main.tscn")
const TradeState = preload("res://scripts/trade_state.gd")

var _checks: int = 0
var _failures: int = 0


func _init() -> void:
	_run.call_deferred()


func _run() -> void:
	root.gui_embed_subwindows = true
	root.size = Vector2i(1280, 880)
	var main = MainScene.instantiate()
	root.add_child(main)
	main.set_process(false)
	await _settle_layout()
	_measure_layout(main, Vector2i(main.get_viewport_rect().size))
	root.size = Vector2i(1100, 760)
	await _settle_layout()
	_measure_layout(main, Vector2i(main.get_viewport_rect().size))
	root.size = Vector2i(1280, 880)
	await _settle_layout()
	_test_initial_ui(main)
	_test_three_port_trade(main)
	await _test_restart_dialog(main)
	_test_single_supply_escape(main)
	_test_restart_during_voyage(main)
	main.queue_free()
	await process_frame
	if _failures == 0:
		print("PASS: sailing trade UI smoke test (%d checks)" % _checks)
	else:
		push_error("FAIL: %d of %d UI checks failed" % [_failures, _checks])
	quit(0 if _failures == 0 else 1)


func _settle_layout() -> void:
	for frame: int in range(3):
		await process_frame


func _test_initial_ui(main) -> void:
	_check(main.port_name.text == "曙光港", "initial port heading")
	_check(main.stats["coins"].text == "220" and main.stats["cargo"].text == "0 / 10", "initial wallet and hold")
	_check(main.stats["supplies"].text == "8 / 14" and main.stats["day"].text == "第 1 天", "initial supply and date")
	_check(main.selected_port == "pine" and main.destination_picker.selected == 1, "initial route selection")
	_check(main.destination_picker.is_item_disabled(0), "cannot choose the current port in picker")
	_check(main.upgrade_button.disabled and not main.rescue_button.visible, "initial upgrade and rescue availability")
	_check_market(main, "dawn")
	for good: String in TradeState.GOODS:
		_check(main.market_rows[good]["sell_all"].disabled, "empty cargo cannot be sold: " + good)
	main.sea_map.port_selected.emit("sand")
	_check(main.selected_port == "sand" and main.destination_picker.selected == 2, "map selection updates picker")
	_check(main.route_title.text.contains("赤砂埠") and main.route_detail.text.contains("航程 4 天"), "map selection updates route text")
	_check(main.price_comparison.text.contains("茶叶 +13"), "selected route updates trading margin")
	main.destination_picker.item_selected.emit(1)
	_check(main.selected_port == "pine" and main.sea_map._selected == "pine", "picker selection updates map")
	_check(main.price_comparison.text.contains("茶叶 +9"), "picker selection updates trading margin")


func _test_three_port_trade(main) -> void:
	_press(main.market_rows["tea"]["buy_max"], "buy a full hold of tea")
	_check(main.state.cargo["tea"] == 10 and main.stats["coins"].text == "100", "tea purchase reaches the wallet")
	_check(main.stats["cargo"].text == "10 / 10" and main.market_rows["tea"]["amount"].text == "船上 10 箱", "tea purchase reaches cargo display")
	_check(main.market_rows["ceramic"]["buy_one"].disabled, "full hold disables other purchases")
	_sail(main, "pine", false)
	_check_market(main, "pine")
	_check(main.selected_port == "sand" and main.destination_picker.selected == 2, "Pine arrival advances suggested route")
	_check(not main.market_rows["tea"]["sell_all"].disabled, "arrival reenables stock sale")
	_press(main.market_rows["tea"]["sell_all"], "sell imported tea")
	_check(main.stats["coins"].text == "310" and main.state.trade_profit == 90, "tea sale credits correct price and profit")
	_press(main.market_rows["ceramic"]["buy_max"], "buy local ceramics")
	_check(main.state.cargo["ceramic"] == 10 and main.stats["coins"].text == "170", "ceramic button binds to correct goods")
	_sail(main, "sand", true)
	_check_market(main, "sand")
	_check(main.selected_port == "dawn" and main.destination_picker.selected == 0, "Sand arrival suggests returning home")
	_press(main.market_rows["ceramic"]["sell_all"], "sell imported ceramics")
	_press(main.market_rows["spice"]["buy_max"], "buy local spice")
	_check(main.state.cargo["spice"] == 10 and main.stats["coins"].text == "250", "spice button binds to correct goods")
	_check(main.sail_button.disabled and main.sail_button.text.contains("还需 2 份"), "return route explains insufficient supplies")
	_press(main.supply_one_button, "buy first return supply")
	_check(main.stats["supplies"].text == "3 / 14" and main.stats["coins"].text == "246", "single supply updates stock and wallet")
	_check(main.sail_button.disabled and main.sail_button.text.contains("还需 1 份"), "one remaining missing supply is displayed")
	_press(main.supply_one_button, "buy second return supply")
	_check(main.stats["supplies"].text == "4 / 14" and main.stats["coins"].text == "242", "second supply updates stock and wallet")
	_check(not main.sail_button.disabled and main.state.supply_spent == 8, "sufficient supplies enable sailing")
	_sail(main, "dawn", false)
	_check_market(main, "dawn")
	_check(main.state.round_trip_complete and main.goal_label.text.contains("已返回曙光港"), "return updates the round-trip goal")
	_press(main.market_rows["spice"]["sell_all"], "sell imported spice")
	_check(main.stats["coins"].text == "562" and main.stats["cargo"].text == "0 / 10", "completed loop wallet and hold")
	_check(main.goal_label.text.contains("毛利润 350 金") and main.goal_label.text.contains("补给支出 8 金"), "goal line reports realized economics")
	_check(not main.upgrade_button.disabled, "completed loop unlocks affordable upgrade")
	_press(main.upgrade_button, "expand the hold")
	_check(main.state.upgraded and main.stats["coins"].text == "362", "upgrade deducts gold")
	_check(main.stats["cargo"].text == "0 / 16" and main.upgrade_button.disabled, "upgrade updates capacity and disables repeat purchase")
	_check(main.completion_shown and main.completion_dialog.visible, "first expansion displays completion dialog")
	_check(main.completion_dialog.dialog_text.contains("3 趟") and main.completion_dialog.dialog_text.contains("350 金币"), "completion dialog summarizes this voyage")
	_press(main.completion_dialog.get_ok_button(), "dismiss completion dialog")
	_check(not main.completion_dialog.visible and main.state.upgraded, "continue keeps the completed game")


func _test_restart_dialog(main) -> void:
	var restart: Button = _find_button(main, "重新开始")
	_check(restart != null, "restart control exists")
	if restart == null:
		return
	_press(restart, "open restart confirmation")
	_check(main.restart_dialog.visible and main.state.upgraded, "opening restart does not erase progress")
	_press(main.restart_dialog.get_cancel_button(), "cancel restart")
	await process_frame
	_check(not main.restart_dialog.visible and main.state.coins == 362, "cancel restart keeps current game")
	_press(restart, "open restart confirmation again")
	_press(main.restart_dialog.get_ok_button(), "confirm restart")
	_check(not main.restart_dialog.visible and not main.completion_shown, "restart clears dialog completion state")
	_check(main.stats["coins"].text == "220" and main.stats["cargo"].text == "0 / 10", "restart refreshes wallet and capacity")
	_check(main.stats["day"].text == "第 1 天" and main.stats["supplies"].text == "8 / 14", "restart refreshes date and supplies")
	_check(main.state.visited.size() == 1 and main.state.trade_profit == 0 and main.state.supply_spent == 0, "restart clears itinerary and accounts")
	_check(main.selected_port == "pine" and main.sea_map._current == "dawn", "restart restores map and destination")
	_check(main.upgrade_button.disabled and not main.rescue_button.visible, "restart restores available actions")
	_check_market(main, "dawn")


func _test_single_supply_escape(main) -> void:
	# Fixture: the captain can afford exactly the one missing supply, not a larger bundle.
	main.state.coins = 4
	main.state.supplies = 2
	main.sea_map.port_selected.emit("pine")
	_check(main.sail_button.disabled and not main.rescue_button.visible, "one-supply shortfall does not incorrectly offer rescue")
	_check(not main.supply_one_button.disabled and main.supply_full_button.disabled, "exactly four gold still permits a single supply")
	_press(main.supply_one_button, "buy the only affordable supply")
	_check(main.stats["coins"].text == "0" and main.stats["supplies"].text == "3 / 14", "small resupply spends exactly the remaining four gold")
	_check(not main.sail_button.disabled and main.supply_one_button.disabled, "small resupply opens an escape route")
	_sail(main, "pine", true)
	_check(main.rescue_button.visible and main.sail_button.disabled, "truly stranded arrival offers rescue")
	_press(main.rescue_button, "request port rescue")
	_check(main.port_name.text == "曙光港" and main.stats["coins"].text == "80", "rescue refreshes location and wallet")
	_check(main.stats["supplies"].text == "8 / 14" and not main.rescue_button.visible, "rescue restores supplies and hides rescue")
	_check(not main.sail_button.disabled and main.selected_port == "pine", "rescue restores a playable route")


func _test_restart_during_voyage(main) -> void:
	_press(main.sail_button, "start a voyage before resetting")
	main._process(main.voyage_duration * 0.5)
	var restart: Button = _find_button(main, "重新开始")
	if restart == null:
		_check(false, "restart button remains present during voyage")
		return
	_press(restart, "open restart during voyage")
	_press(main.restart_dialog.get_ok_button(), "confirm restart during voyage")
	main._process(1000.0)
	_check(main.state.current_port == "dawn" and main.state.pending_destination.is_empty(), "old voyage cannot arrive after restart")
	_check(main.stats["day"].text == "第 1 天" and main.state.voyages == 0, "restart discards in-flight time and voyage count")
	_check(main.route_progress.value == 0.0 and main.sea_map._destination.is_empty(), "restart clears sailing indicators")
	_check(not main.destination_picker.disabled and not main.market_rows["tea"]["buy_one"].disabled, "restart restores port controls")


func _sail(main, target: String, use_picker: bool) -> void:
	if use_picker:
		main.destination_picker.item_selected.emit(main.PORT_ORDER.find(target))
	else:
		main.sea_map.port_selected.emit(target)
	var origin: String = main.state.current_port
	var previous_day: int = main.state.day
	var duration_days: int = main.state.travel_days(target)
	_check(main.selected_port == target, "select destination " + target)
	_press(main.sail_button, "sail to " + target)
	_check(main.state.current_port == origin and main.state.pending_destination == target, "departure keeps origin until arrival")
	_check(main.sail_button.disabled and main.destination_picker.disabled, "voyage disables departure and destination picker")
	_check(main.supply_one_button.disabled and main.supply_full_button.disabled and main.upgrade_button.disabled, "voyage disables supplies and upgrade")
	_check(main.port_name.text.contains("已离港") and main.route_title.text.contains("正在驶向"), "voyage status is visible")
	for good: String in TradeState.GOODS:
		for action: String in ["buy_one", "buy_max", "sell_one", "sell_all"]:
			_check(main.market_rows[good][action].disabled, "voyage blocks %s %s" % [good, action])
	main.sea_map.port_selected.emit(origin)
	_check(main.selected_port == target, "map signal cannot reroute an active voyage")
	main._process(main.voyage_duration * 0.5)
	_check(is_equal_approx(main.route_progress.value, 50.0) and is_equal_approx(main.sea_map._progress, 0.5), "map and progress bar advance together")
	_check(main.stats["day"].text == "第 %d 天" % (previous_day + floori(duration_days * 0.5)), "mid-voyage calendar follows progress")
	main._process(1000.0)
	_check(main.state.current_port == target and main.state.pending_destination.is_empty(), "arrival reaches selected port")
	_check(main.stats["day"].text == "第 %d 天" % (previous_day + duration_days), "arrival calendar shows elapsed days")
	_check(main.sea_map._current == target and main.sea_map._destination.is_empty(), "arrival updates map markers")
	_check(not main.destination_picker.disabled and main.route_progress.value == 0.0, "arrival restores route planning")
	_check(main.destination_picker.is_item_disabled(main.PORT_ORDER.find(target)), "new current port is disabled in picker")
	_check(main.journal_label.text.contains("抵达" + String(TradeState.PORTS[target]["name"])), "arrival is recorded in visible log")


func _check_market(main, port_id: String) -> void:
	_check(main.port_name.text == TradeState.PORTS[port_id]["name"], "market heading for " + port_id)
	for good: String in TradeState.GOODS:
		var prices: String = main.market_rows[good]["prices"].text
		_check(prices.contains("买入 %d 金" % TradeState.PORTS[port_id]["buy"][good]), "updated buy price for " + good)
		_check(prices.contains("卖出 %d 金" % TradeState.PORTS[port_id]["sell"][good]), "updated sell price for " + good)


func _press(button: Button, label: String) -> void:
	_check(button.is_visible_in_tree() and not button.disabled, label + " is available")
	if button.is_visible_in_tree() and not button.disabled:
		button.pressed.emit()


func _find_button(node: Node, text: String) -> Button:
	if node is Button and node.text == text:
		return node
	for child: Node in node.get_children():
		var found: Button = _find_button(child, text)
		if found != null:
			return found
	return null


func _measure_layout(main, viewport_size: Vector2i) -> void:
	var left: Control = main.sea_map.get_parent()
	var right: Control = main.port_name.get_parent().get_parent().get_parent().get_parent()
	var bounds: Vector2 = _maximum_visible_extent(main)
	print("LAYOUT %s: root size=%s minimum=%s; left size=%s minimum=%s bottom=%.1f; right size=%s minimum=%s bottom=%.1f; maximum right=%.1f bottom=%.1f" % [viewport_size, main.size, main.get_combined_minimum_size(), left.size, left.get_combined_minimum_size(), left.get_global_rect().end.y, right.size, right.get_combined_minimum_size(), right.get_global_rect().end.y, bounds.x, bounds.y])
	if bounds.y > viewport_size.y + 1.0:
		print("OVERFLOW: goal bottom=%.1f; journal bottom=%.1f; outer margin minimum=%s; content minimum=%s" % [main.goal_label.get_global_rect().end.y, main.journal_label.get_global_rect().end.y, main.get_child(1).get_combined_minimum_size(), main.get_child(1).get_child(0).get_combined_minimum_size()])
		for child: Node in main.get_child(1).get_child(0).get_children():
			if child is Control:
				print("ROOT CHILD %s: size=%s minimum=%s position=%s bottom=%.1f" % [child.get_path(), child.size, child.get_combined_minimum_size(), child.global_position, child.get_global_rect().end.y])
		_print_extreme_controls(main, bounds.y)
	print("WINDOW: physical=%s; scale size=%s; scale mode=%d; viewport=%s" % [root.size, root.content_scale_size, root.content_scale_mode, main.get_viewport_rect().size])
	_check(bounds.x <= viewport_size.x + 1.0, "all initial controls fit viewport width " + str(viewport_size))
	_check(bounds.y <= viewport_size.y + 1.0, "all initial controls fit viewport height " + str(viewport_size))


func _print_extreme_controls(node: Node, maximum_bottom: float) -> void:
	if node is Window:
		return
	if node is Control and node.is_visible_in_tree() and node.get_global_rect().end.y >= maximum_bottom - 1.0:
		var text: String = node.text if node is Label else ""
		print("MAX BOTTOM %s: text=%s size=%s position=%s bottom=%.1f" % [node.get_path(), text, node.size, node.global_position, node.get_global_rect().end.y])
	for child: Node in node.get_children():
		_print_extreme_controls(child, maximum_bottom)


func _maximum_visible_extent(node: Node) -> Vector2:
	if node is Window:
		return Vector2.ZERO
	var result := Vector2.ZERO
	if node is Control and node.is_visible_in_tree():
		result = node.get_global_rect().end
	for child: Node in node.get_children():
		var extent: Vector2 = _maximum_visible_extent(child)
		result.x = maxf(result.x, extent.x)
		result.y = maxf(result.y, extent.y)
	return result


func _check(passed: bool, label: String) -> void:
	_checks += 1
	if not passed:
		_failures += 1
		push_error(label)
