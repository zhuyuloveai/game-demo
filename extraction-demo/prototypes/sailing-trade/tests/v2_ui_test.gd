extends SceneTree

const VoyageScene = preload("res://scenes/voyage.tscn")
const GameState = preload("res://scripts/v2/game_state.gd")

var _checks: int = 0
var _failures: int = 0


func _init() -> void:
	_run.call_deferred()


func _run() -> void:
	root.gui_embed_subwindows = true
	root.size = Vector2i(1280, 880)
	root.content_scale_size = Vector2i(1280, 880)
	var main = VoyageScene.instantiate()
	# This must precede _ready(), which otherwise loads the player's real save.
	main.persist_enabled = false
	root.add_child(main)
	main.set_process(false)
	main.sea_view.set_process(false)
	await _settle()
	_check(not main.persist_enabled, "UI fixture disables all save/load persistence")
	_check(main.get_viewport_rect().size == Vector2(1280, 880), "UI fixture uses a 1280x880 viewport")
	_measure_layout(main, "initial port")
	await _test_port_art(main)
	await _test_facility_layouts(main)
	await _test_market(main)
	await _test_shipyard(main)
	await _test_inn(main)
	await _test_sailing_and_docking(main)
	await _test_reset_confirmation(main)
	main.queue_free()
	await process_frame
	if _failures == 0:
		print("PASS: voyage v2 UI integration (%d checks)" % _checks)
	else:
		push_error("FAIL: %d of %d voyage v2 UI checks failed" % [_failures, _checks])
	quit(0 if _failures == 0 else 1)


func _settle() -> void:
	for frame: int in range(3):
		await process_frame


func _test_port_art(main) -> void:
	var fingerprints: Dictionary = {}
	for port_id: String in ["dawn", "pine", "sand"]:
		main.state.current_port = port_id
		main.state.ship_position = GameState.PORTS[port_id]["position"]
		main._refresh_scene()
		await _settle()
		var texture: Texture2D = main.port_art.texture
		_check(texture != null, port_id + " loads a port background")
		if texture == null:
			continue
		_check(texture.resource_path == "res://assets/ports/%s.png" % port_id, port_id + " displays its own background")
		var pixels: Image = texture.get_image()
		_check(pixels != null and not pixels.is_empty(), port_id + " has decodable image pixels")
		if pixels != null and not pixels.is_empty():
			fingerprints[hash(pixels.get_data())] = true
		_check(main.port_title.text == GameState.PORTS[port_id]["name"], port_id + " updates the port heading")
		_check(main.port_art.is_visible_in_tree() and not main.sea_layer.visible, port_id + " shows the port stage")
		_measure_layout(main, port_id + " port")
	_check(fingerprints.size() == 3, "all three port backgrounds contain different pixel data")
	main.state.current_port = "dawn"
	main.state.ship_position = GameState.PORTS["dawn"]["position"]
	main._refresh_scene()


func _test_facility_layouts(main) -> void:
	for facility: String in ["market", "ship", "harbor", "inn", "chart"]:
		main.open_facility(facility)
		await _settle()
		_check(main.active_facility == facility and main.modal_layer.visible, facility + " opens its modal")
		_check(not main.modal_title.text.is_empty(), facility + " has a readable title")
		_measure_layout(main, facility)
		var scroll: ScrollContainer = main.modal_content.get_parent()
		_check(scroll.horizontal_scroll_mode == ScrollContainer.SCROLL_MODE_DISABLED, facility + " needs no horizontal scrolling")
		var buttons: Array[Button] = []
		_collect_buttons(main.modal_content, buttons)
		for button: Button in buttons:
			scroll.ensure_control_visible(button)
			await _settle()
			var region: Rect2 = scroll.get_global_rect().grow(1.0)
			var button_rect: Rect2 = button.get_global_rect()
			_check(region.encloses(button_rect), "%s button remains fully reachable: %s" % [facility, button.text])
			_check(button.size.x + 1.0 >= button.get_combined_minimum_size().x, "%s button text fits: %s" % [facility, button.text])
		_press(_find_button(main.modal_layer, "返回  Esc"), facility + " return")
		_check(not main.modal_layer.visible and main.active_facility.is_empty(), facility + " closes via its return button")


func _test_market(main) -> void:
	main.open_facility("market")
	await _settle()
	var quantity: SpinBox = _market_quantity(main, "tea")
	_check(quantity != null, "market has a quantity input beside each trade button")
	if quantity == null:
		return
	_check(quantity.min_value == 1 and quantity.max_value == 99 and quantity.step == 1, "quantity input allows positive whole-box orders")
	quantity.value = -4
	_check(quantity.value == 1, "quantity input clamps negative quantities")
	quantity.value = 1000
	_check(quantity.value == 99, "quantity input clamps oversized input")
	quantity.value = 3
	var coins_before: int = main.state.coins
	var stock_before: int = main.state.stock("tea")
	var buy_price: int = main.state.price("tea")
	_press(main.market_buy_buttons["tea"], "buy three tea")
	await _settle()
	_check(main.state.cargo["tea"] == 3 and main.state.coins == coins_before - buy_price * 3, "buy button updates cargo and coins at the displayed unit price")
	_check(main.state.stock("tea") == stock_before - 3, "buy button updates market inventory")
	_check(main.modal_feedback.text.contains("购入 3 箱茶叶"), "buy button shows success feedback")
	_check(main.hud["coins"].text == str(main.state.coins), "buy button refreshes the wallet HUD")
	_check(_market_quantity(main, "tea").value == 3, "quantity survives market rebuilding after purchase")
	quantity = _market_quantity(main, "tea")
	quantity.value = 2
	coins_before = main.state.coins
	var sell_price: int = main.state.price("tea", true)
	_press(main.market_sell_buttons["tea"], "sell two tea")
	await _settle()
	_check(main.state.cargo["tea"] == 1 and main.state.coins == coins_before + sell_price * 2, "sell button settles only the requested cargo")
	_check(main.modal_feedback.text.contains("售出 2 箱茶叶"), "sell button shows success feedback")
	quantity = _market_quantity(main, "tea")
	quantity.value = 99
	coins_before = main.state.coins
	_press(main.market_sell_buttons["tea"], "reject overselling")
	_check(main.state.cargo["tea"] == 1 and main.state.coins == coins_before, "rejected sale preserves the cargo and wallet")
	_check(main.modal_feedback.text.contains("没有这么多"), "rejected sale gives actionable feedback")
	main.close_facility()


func _test_shipyard(main) -> void:
	main.state.coins = 10000
	main.state.hull = 60
	main.open_facility("ship")
	await _settle()
	main.rename_input.text = "远帆测试号"
	_press(_find_button(main.modal_content, "命名"), "rename ship")
	_check(main.state.ship_name == "远帆测试号" and main.modal_title.text.contains("远帆测试号"), "ship naming updates persistent identity and facility heading")
	_check(main.modal_feedback.text.contains("船名"), "ship naming shows feedback")
	main.rename_input.text = "   "
	_press(_find_button(main.modal_content, "命名"), "reject empty ship name")
	_check(main.state.ship_name == "远帆测试号" and main.modal_feedback.text.contains("1 至 12"), "invalid ship name keeps the previous identity and explains the limit")
	var capacity_before: int = main.state.capacity
	var coins_before: int = main.state.coins
	_press(_find_button(main.modal_content, "扩仓 +10 · 400 金"), "expand hold")
	_check(main.state.capacity == capacity_before + 10 and main.state.coins == coins_before - 400, "hold expansion updates capacity and wallet")
	_check(_find_button(main.modal_content, "扩仓 +10 · 400 金").disabled, "a completed hold upgrade cannot be purchased twice")
	_check(main.modal_feedback.text.contains("货舱扩建完成"), "hold expansion shows feedback")
	coins_before = main.state.coins
	_press(_find_button(main.modal_content, "修理 · 40 金"), "repair hull")
	_check(main.state.hull == 100 and main.state.coins == coins_before - 40, "repair button restores hull for the shown cost")
	for ship_id: String in ["coaster", "merchant"]:
		coins_before = main.state.coins
		var price: int = int(GameState.SHIPS[ship_id]["price"]) - main.state.trade_in_value()
		_press(main.ship_purchase_buttons[ship_id], "purchase " + ship_id)
		await _settle()
		_check(main.state.ship_id == ship_id and main.state.coins == coins_before - price, ship_id + " purchase applies the trade-in price")
		_check(main.state.capacity == int(GameState.SHIPS[ship_id]["capacity"]) + 10, ship_id + " retains the hold expansion")
		_check(main.state.ship_name == "远帆测试号" and main.state.cargo["tea"] == 1, ship_id + " retains the name and carried goods")
		_check(main.ship_purchase_buttons[ship_id].disabled and main.modal_feedback.text.contains("新船"), ship_id + " purchase refreshes the offer and feedback")
	main.close_facility()


func _test_inn(main) -> void:
	main.state.hull = main.state.max_hull - 9
	main.open_facility("inn")
	await _settle()
	var coins_before: int = main.state.coins
	var day_before: int = main.state.day
	var hull_before: int = main.state.hull
	_press(_find_button(main.modal_content, "休整一日 · 20 金"), "rest at inn")
	_check(main.state.day == day_before + 1 and main.state.coins == coins_before - 20, "inn rest advances a day and charges the displayed fee")
	_check(main.state.hull == hull_before + 5, "inn rest recovers five hull points")
	_check(main.modal_feedback.text.contains("一夜过去") and main.hud["day"].text.contains(str(day_before + 1)), "inn rest updates feedback and date HUD")
	main.close_facility()


func _test_sailing_and_docking(main) -> void:
	main.state.supplies = 0
	main.open_facility("harbor")
	await _settle()
	_check(main.departure_button.disabled, "departure is disabled with no supplies")
	var coins_before: int = main.state.coins
	_press(main.supplies_one_button, "buy one supply")
	_check(main.state.supplies == 1 and main.state.coins == coins_before - 3, "one-supply purchase provides an affordable departure option")
	_check(not main.departure_button.disabled and main.modal_feedback.text.contains("一份补给"), "supply purchase enables departure and explains success")
	_press(_find_button(main.modal_content, "补充 5 份 · 15 金"), "buy five supplies")
	_check(main.state.supplies == 6 and main.state.coins == coins_before - 18, "five-supply purchase settles its displayed total")
	coins_before = main.state.coins
	var refill_cost: int = (main.state.max_supplies - main.state.supplies) * 3
	_press(_find_button(main.modal_content, "补满 · %d 金" % refill_cost), "fill supply hold")
	_check(main.state.supplies == main.state.max_supplies and main.state.coins == coins_before - refill_cost, "fill-supplies button purchases precisely the remaining capacity")
	_press(main.departure_button, "depart for free sailing")
	await _settle()
	_check(main.state.at_sea and main.sea_layer.visible and not main.port_layer.visible, "departure switches from port art to the sea stage")
	_check(main.active_facility.is_empty() and main.sea_view.sailing_controls_enabled, "departure closes the modal and permits steering")
	_measure_layout(main, "sailing stage")
	_press(_find_button(main.sea_layer, "满帆"), "set full sail")
	_check(main.state.sail_level == 2, "full-sail button changes the sailing state")
	main.open_facility("ship")
	await _settle()
	_check(not main.sea_view.sailing_controls_enabled, "ship modal locks sailing controls at sea")
	var position_before: Vector2 = main.state.ship_position
	var elapsed_before: float = main.state.day_elapsed
	main.sea_view._process(0.05)
	_check(main.state.ship_position == position_before and main.state.day_elapsed == elapsed_before, "an open modal pauses both movement and voyage time")
	_check(_find_button(main.modal_content, "扩仓 +10 · 400 金").disabled, "hold work is unavailable while sailing")
	_check(main.ship_purchase_buttons["coaster"].disabled, "ship purchases are unavailable while sailing")
	_press(_find_button(main.modal_layer, "返回  Esc"), "close ship modal at sea")
	_check(main.sea_view.sailing_controls_enabled, "closing the modal restores sailing controls")
	main.open_facility("market")
	_check(main.active_facility.is_empty() and not main.modal_layer.visible and main.message_label.text.contains("先靠岸"), "market entry is refused at sea with feedback")
	main.open_facility("chart")
	await _settle()
	_check(not main.sea_view.sailing_controls_enabled, "chart modal locks sailing controls")
	var destinations: Array[Button] = []
	_collect_buttons(main.modal_content, destinations)
	_check(destinations.size() == 3, "chart exposes all three port destinations")
	if destinations.size() == 3:
		_press(destinations[1], "chart destination pine")
		_check(main.state.autopilot_target == "pine" and main.state.sail_level == 2, "chart destination starts automatic sailing to the selected port")
		_check(not main.modal_layer.visible and main.sea_view.sailing_controls_enabled, "chart selection closes the modal and resumes steering")
	main.state.ship_position = Vector2(3200, 1700)
	main.state.speed = 0
	main.sea_view.state_updated.emit()
	_check(main.dock_button.disabled, "docking is unavailable offshore")
	main.state.ship_position = GameState.PORTS["pine"]["position"]
	main.state.speed = 31
	main.sea_view.state_updated.emit()
	_check(main.dock_button.disabled and main.dock_button.text.contains("减速"), "nearby port requires a safe docking speed")
	_press(_find_button(main.sea_layer, "停帆"), "stop sails before docking")
	_check(main.state.sail_level == 0 and main.state.autopilot_target.is_empty(), "stop-sail button clears automatic navigation")
	main.state.speed = 0
	main.sea_view.state_updated.emit()
	_check(not main.dock_button.disabled and main.dock_button.text.contains("雾松湾"), "nearby slow ship receives an enabled named dock button")
	_press(main.dock_button, "dock at pine")
	await _settle()
	_check(not main.state.at_sea and main.state.current_port == "pine", "dock button completes arrival at the selected port")
	_check(main.port_layer.visible and not main.sea_layer.visible and main.port_title.text == "雾松湾", "arrival restores the port facilities and correct title")
	_check(main.port_art.texture.resource_path.ends_with("pine.png"), "arrival displays the destination's port painting")
	main.open_facility("market")
	_check(main.modal_title.text.contains("雾松湾"), "destination market becomes available after docking")
	main.close_facility()


func _test_reset_confirmation(main) -> void:
	main.open_facility("harbor")
	_press(main.departure_button, "depart before reset confirmation")
	await _settle()
	var coins_before: int = main.state.coins
	var name_before: String = main.state.ship_name
	_press(_find_button(main, "重新开始"), "request reset")
	await _settle()
	_check(main.confirmation.visible and not main.sea_view.sailing_controls_enabled, "reset requests confirmation and pauses sailing")
	_press(main.confirmation.get_cancel_button(), "cancel reset")
	await _settle()
	_check(not main.confirmation.visible and main.state.at_sea and main.state.coins == coins_before and main.state.ship_name == name_before, "cancel preserves the ongoing voyage and player progress")
	_check(main.sea_view.sailing_controls_enabled, "canceling reset restores steering")
	_press(_find_button(main, "重新开始"), "request reset again")
	await _settle()
	_press(main.confirmation.get_ok_button(), "confirm reset")
	await _settle()
	_check(not main.confirmation.visible and not main.state.at_sea and main.state.current_port == "dawn", "confirmed reset returns to the initial port")
	_check(main.state.ship_name == "逐风号" and main.state.ship_id == "sloop" and main.state.coins == 800, "confirmed reset restores the initial ship and wallet")
	_check(main.state.cargo_used() == 0 and main.state.day == 1 and main.state.supplies == 18, "confirmed reset clears cargo and restores the starting date and supplies")
	_check(main.port_layer.visible and not main.modal_layer.visible and main.port_title.text == "曙光港", "confirmed reset restores the initial port interface")
	_measure_layout(main, "reset port")


func _market_quantity(main, good: String) -> SpinBox:
	var row: Node = main.market_buy_buttons[good].get_parent()
	for child: Node in row.get_children():
		if child is SpinBox:
			return child
	return null


func _press(button: Button, context: String) -> void:
	_check(button != null, context + " button exists")
	if button == null:
		return
	_check(button.is_visible_in_tree() and not button.disabled, context + " button is available")
	if button.is_visible_in_tree() and not button.disabled:
		button.pressed.emit()


func _find_button(node: Node, caption: String) -> Button:
	if node is Button and node.text == caption:
		return node
	for child: Node in node.get_children():
		var found: Button = _find_button(child, caption)
		if found != null:
			return found
	return null


func _collect_buttons(node: Node, buttons: Array[Button]) -> void:
	if node is Button:
		buttons.append(node)
	for child: Node in node.get_children():
		_collect_buttons(child, buttons)


func _measure_layout(main, context: String) -> void:
	var issues: Array[String] = []
	_collect_layout_issues(main, main.get_viewport_rect(), null, issues)
	_check(issues.is_empty(), "%s fits 1280x880 without clipped rows: %s" % [context, "; ".join(issues.slice(0, 6))])
	print("LAYOUT %s: %s" % [context, "PASS" if issues.is_empty() else "%d overflow(s)" % issues.size()])


func _collect_layout_issues(node: Node, viewport: Rect2, scroll: ScrollContainer, issues: Array[String]) -> void:
	if node is Window:
		return
	if node is Control:
		if not node.is_visible_in_tree():
			return
		var rect: Rect2 = node.get_global_rect()
		var bounds: Rect2 = viewport if scroll == null else scroll.get_global_rect()
		if rect.position.x < bounds.position.x - 1.0 or rect.end.x > bounds.end.x + 1.0:
			issues.append("horizontal %s: %s outside %s" % [node.get_path(), rect, bounds])
		# Vertical overflow inside a scroll area is expected and tested by scrolling to each button.
		if scroll == null and (rect.position.y < viewport.position.y - 1.0 or rect.end.y > viewport.end.y + 1.0):
			issues.append("vertical %s: %s" % [node.get_path(), rect])
		if node is ScrollContainer:
			scroll = node
	for child: Node in node.get_children():
		_collect_layout_issues(child, viewport, scroll, issues)


func _check(passed: bool, description: String) -> void:
	_checks += 1
	if not passed:
		_failures += 1
		push_error(description)
