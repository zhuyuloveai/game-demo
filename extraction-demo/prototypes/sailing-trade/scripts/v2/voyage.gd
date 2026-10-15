extends Control

const GameState = preload("res://scripts/v2/game_state.gd")
const SeaView = preload("res://scripts/v2/sea_view.gd")
const ShipDiagram = preload("res://scripts/v2/ship_diagram.gd")
const INK := Color("e8e2cb")
const MUTED := Color("a9bbb4")
const GOLD := Color("e1bd77")
const PORT_IDS: Array[String] = ["dawn", "pine", "sand"]

var state = GameState.new()
var persist_enabled: bool = true
var save_blocked: bool = false
var sea_view: Control
var port_layer: Control
var sea_layer: Control
var port_art: TextureRect
var port_title: Label
var port_subtitle: Label
var port_description: Label
var hud: Dictionary = {}
var location_label: Label
var message_label: Label
var sea_status: Label
var dock_button: Button
var modal_layer: Control
var modal_content: VBoxContainer
var modal_title: Label
var modal_feedback: Label
var active_facility: String = ""
var market_quantities: Dictionary = {}
var market_buy_buttons: Dictionary = {}
var market_sell_buttons: Dictionary = {}
var market_target: String = "pine"
var sailing_target: String = "pine"
var departure_button: Button
var supplies_one_button: Button
var ship_purchase_buttons: Dictionary = {}
var rename_input: LineEdit
var confirmation: ConfirmationDialog
var pending_confirmation: Callable
var fade: ColorRect
var autosave_elapsed: float = 0.0
var _port_textures: Dictionary = {}


func _ready() -> void:
	if OS.get_cmdline_user_args().has("--test-mode"):
		persist_enabled = false
	var load_error := ""
	if persist_enabled and FileAccess.file_exists(GameState.DEFAULT_SAVE_PATH):
		load_error = state.load_game()
		if not load_error.is_empty():
			persist_enabled = false
			save_blocked = true
	_make_theme()
	_build_interface()
	get_tree().auto_accept_quit = false
	_refresh_scene()
	_notice("欢迎登上%s。先在港口装货、整备，再亲自驶向下一座城市。" % state.ship_name)
	if not load_error.is_empty():
		_notice(load_error + " 原文件已保留，本次暂停保存；点击重开可开始新的存档。")


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if persist_enabled:
			state.save_game()
		get_tree().quit()


func _process(delta: float) -> void:
	if persist_enabled:
		autosave_elapsed += delta
		if autosave_elapsed >= 15.0:
			autosave_elapsed = 0
			state.save_game()


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE and not active_facility.is_empty():
			close_facility()
			get_viewport().set_input_as_handled()
		elif event.keycode == KEY_M and not (get_viewport().gui_get_focus_owner() is LineEdit):
			open_facility("chart")
			get_viewport().set_input_as_handled()


func _style(color: Color, padding: int = 12, border: Color = Color("4e625b")) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.content_margin_left = padding
	style.content_margin_right = padding
	style.content_margin_top = padding
	style.content_margin_bottom = padding
	return style


func _make_theme() -> void:
	var skin := Theme.new()
	var font := SystemFont.new()
	font.font_names = PackedStringArray(["Heiti SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"])
	skin.default_font = font
	skin.default_font_size = 15
	skin.set_color("font_color", "Label", INK)
	for control_type in ["Button", "OptionButton"]:
		for mode in ["normal", "hover", "pressed", "disabled"]:
			var color: Color = {"normal": Color("23443f"), "hover": Color("3a5d50"), "pressed": Color("527459"), "disabled": Color("182c2d")}[mode]
			skin.set_stylebox(mode, control_type, _style(color, 7))
			skin.set_color("font_" + mode + "_color", control_type, INK if mode != "disabled" else Color("6e8278"))
		skin.set_color("font_color", control_type, INK)
		skin.set_stylebox("focus", control_type, _style(Color(0, 0, 0, 0), 7, GOLD))
	skin.set_stylebox("normal", "LineEdit", _style(Color("142b2d"), 6))
	skin.set_color("font_color", "LineEdit", INK)
	theme = skin


func _label(text: String, font_size: int = 15, color: Color = INK, wrap: bool = false) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	if wrap:
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


func _row(gap: int = 8) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", gap)
	return row


func _column(gap: int = 8) -> VBoxContainer:
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", gap)
	return column


func _button(text: String, callback: Callable, width: float = 0) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(width, 35)
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.pressed.connect(callback)
	return button


func _panel(child: Control, padding: int = 14, color: Color = Color("17332f")) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _style(color, padding))
	panel.add_child(child)
	return panel


func _full_rect(control: Control) -> void:
	control.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _build_interface() -> void:
	var background := ColorRect.new()
	background.color = Color("0e2226")
	_full_rect(background)
	add_child(background)
	var margin := MarginContainer.new()
	_full_rect(margin)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 16)
	add_child(margin)
	var root := _column(10)
	margin.add_child(root)
	var header := _row(9)
	var brand := _column(0)
	brand.size_flags_horizontal = SIZE_EXPAND_FILL
	brand.add_child(_label("我的宇宙  /  航海篇", 12, GOLD))
	location_label = _label("青屿航记", 25)
	brand.add_child(location_label)
	header.add_child(brand)
	for entry in [["航海图  M", "chart"], ["我的船", "ship"]]:
		var button := _button(entry[0], func(): open_facility(entry[1]), 100)
		button.size_flags_vertical = SIZE_SHRINK_CENTER
		header.add_child(button)
	var save_button := _button("保存航程", _manual_save, 96)
	save_button.size_flags_vertical = SIZE_SHRINK_CENTER
	header.add_child(save_button)
	var reset_button := _button("重新开始", func(): _ask("开启新航程", "当前航程和存档将重置，从曙光港重新出发。", _reset), 96)
	reset_button.size_flags_vertical = SIZE_SHRINK_CENTER
	header.add_child(reset_button)
	root.add_child(header)
	var status_row := _row(9)
	for entry in [["day", "航海历"], ["coins", "金币"], ["cargo", "货物"], ["supplies", "补给"], ["hull", "船况"]]:
		var contents := _row()
		contents.add_child(_label(entry[1], 12, MUTED))
		var value := _label("", 20, GOLD if entry[0] == "coins" else INK)
		value.size_flags_horizontal = SIZE_EXPAND_FILL
		value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		contents.add_child(value)
		hud[entry[0]] = value
		var card := _panel(contents, 9)
		card.size_flags_horizontal = SIZE_EXPAND_FILL
		status_row.add_child(card)
	root.add_child(status_row)
	var stage := Control.new()
	stage.size_flags_vertical = SIZE_EXPAND_FILL
	stage.custom_minimum_size = Vector2(1000, 560)
	root.add_child(stage)
	_build_port(stage)
	_build_sea(stage)
	message_label = _label("", 13, GOLD)
	message_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	root.add_child(message_label)
	_build_modal()
	confirmation = ConfirmationDialog.new()
	confirmation.ok_button_text = "确定"
	confirmation.cancel_button_text = "取消"
	confirmation.confirmed.connect(func():
		if pending_confirmation.is_valid():
			pending_confirmation.call()
		call_deferred("_update_input_state"))
	confirmation.canceled.connect(func(): call_deferred("_update_input_state"))
	add_child(confirmation)
	fade = ColorRect.new()
	_full_rect(fade)
	fade.color = Color(0.02, 0.07, 0.08, 0)
	fade.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(fade)


func _build_port(stage: Control) -> void:
	port_layer = Control.new()
	_full_rect(port_layer)
	stage.add_child(port_layer)
	port_art = TextureRect.new()
	_full_rect(port_art)
	port_art.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	port_art.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	port_layer.add_child(port_art)
	var tint := ColorRect.new()
	_full_rect(tint)
	tint.color = Color(0.02, 0.06, 0.05, 0.10)
	tint.mouse_filter = MOUSE_FILTER_IGNORE
	port_layer.add_child(tint)
	var description := _column(4)
	port_title = _label("", 32, INK)
	port_subtitle = _label("", 14, GOLD)
	port_description = _label("", 13, MUTED, true)
	description.add_child(port_title)
	description.add_child(port_subtitle)
	description.add_child(port_description)
	var card := _panel(description, 16, Color(0.04, 0.13, 0.13, 0.92))
	card.position = Vector2(22, 22)
	card.custom_minimum_size = Vector2(450, 118)
	port_layer.add_child(card)
	var facilities: Array = [
		["交易所", "market", Vector2(0.20, 0.48)],
		["造船所", "ship", Vector2(0.72, 0.56)],
		["旅舍", "inn", Vector2(0.43, 0.36)]
	]
	for entry in facilities:
		var hotspot := _button("◇  " + entry[0], func(): open_facility(entry[1]), 108)
		hotspot.anchor_left = entry[2].x
		hotspot.anchor_top = entry[2].y
		hotspot.offset_left = -54
		port_layer.add_child(hotspot)
	var dock := _row(10)
	dock.alignment = BoxContainer.ALIGNMENT_CENTER
	for entry in [["交易所 · 买卖货物", "market"], ["船坞 · 整备换船", "ship"], ["旅舍 · 休整一日", "inn"], ["码头 · 补给出航", "harbor"]]:
		dock.add_child(_button(entry[0], func(): open_facility(entry[1]), 205))
	var dock_panel := _panel(dock, 14, Color(0.03, 0.11, 0.12, 0.92))
	dock_panel.anchor_top = 1
	dock_panel.anchor_right = 1
	dock_panel.anchor_bottom = 1
	dock_panel.offset_left = 20
	dock_panel.offset_right = -20
	dock_panel.offset_top = -82
	dock_panel.offset_bottom = -16
	port_layer.add_child(dock_panel)


func _build_sea(stage: Control) -> void:
	sea_layer = Control.new()
	_full_rect(sea_layer)
	stage.add_child(sea_layer)
	sea_view = SeaView.new()
	_full_rect(sea_view)
	sea_layer.add_child(sea_view)
	sea_view.bind_state(state)
	sea_view.state_updated.connect(_refresh_hud)
	var commands := _column(7)
	commands.add_child(_label("掌舵航行", 18, GOLD))
	commands.add_child(_label("A / D 转向 · W / S 收放帆\n空格停帆 · 点击海面驶向该处", 13, MUTED))
	var sails := _row(6)
	for entry in [["停帆", 0], ["半帆", 1], ["满帆", 2]]:
		sails.add_child(_button(entry[0], func():
			state.sail_level = entry[1]
			if entry[1] == 0:
				state.autopilot_target = ""
			_refresh_hud(), 66))
	commands.add_child(sails)
	commands.add_child(_button("选择目的港 / 查看航海图", func(): open_facility("chart")))
	var command_panel := _panel(commands, 12, Color(0.035, 0.105, 0.12, 0.92))
	command_panel.position = Vector2(16, 16)
	sea_layer.add_child(command_panel)
	var bottom := _row(10)
	sea_status = _label("", 14, INK)
	sea_status.size_flags_horizontal = SIZE_EXPAND_FILL
	bottom.add_child(sea_status)
	dock_button = _button("接近港口后入港", _dock, 185)
	bottom.add_child(dock_button)
	bottom.add_child(_button("紧急拖航", func(): _ask("请求拖航", "港务船将拖你返回上一座港口。最多支付 80 金币，耗时 2 天。", _rescue), 96))
	var status_panel := _panel(bottom, 12, Color(0.025, 0.085, 0.11, 0.94))
	status_panel.anchor_top = 1
	status_panel.anchor_right = 1
	status_panel.anchor_bottom = 1
	status_panel.offset_left = 16
	status_panel.offset_right = -16
	status_panel.offset_top = -67
	status_panel.offset_bottom = -12
	sea_layer.add_child(status_panel)


func _build_modal() -> void:
	modal_layer = Control.new()
	_full_rect(modal_layer)
	modal_layer.visible = false
	add_child(modal_layer)
	var shade := ColorRect.new()
	_full_rect(shade)
	shade.color = Color(0.02, 0.06, 0.07, 0.72)
	modal_layer.add_child(shade)
	var margin := MarginContainer.new()
	_full_rect(margin)
	margin.add_theme_constant_override("margin_left", 55)
	margin.add_theme_constant_override("margin_right", 55)
	margin.add_theme_constant_override("margin_top", 96)
	margin.add_theme_constant_override("margin_bottom", 66)
	modal_layer.add_child(margin)
	var content := _column(12)
	margin.add_child(_panel(content, 22, Color("152f2e")))
	var heading := _row()
	modal_title = _label("", 24, GOLD)
	modal_title.size_flags_horizontal = SIZE_EXPAND_FILL
	heading.add_child(modal_title)
	heading.add_child(_button("返回  Esc", close_facility, 100))
	content.add_child(heading)
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	content.add_child(scroll)
	modal_content = _column(12)
	modal_content.size_flags_horizontal = SIZE_EXPAND_FILL
	scroll.add_child(modal_content)
	modal_feedback = _label("", 14, GOLD, true)
	modal_feedback.custom_minimum_size.y = 37
	content.add_child(modal_feedback)


func open_facility(facility: String) -> void:
	if state.at_sea and facility in ["market", "harbor", "inn"]:
		_notice("先靠岸入港，再使用港口设施。")
		return
	active_facility = facility
	modal_layer.visible = true
	modal_feedback.text = ""
	_update_input_state()
	_rebuild_facility()


func close_facility() -> void:
	active_facility = ""
	modal_layer.visible = false
	_update_input_state()


func _update_input_state() -> void:
	if is_instance_valid(sea_view):
		sea_view.sailing_controls_enabled = active_facility.is_empty() and not confirmation.visible


func _rebuild_facility() -> void:
	for child in modal_content.get_children():
		modal_content.remove_child(child)
		child.queue_free()
	match active_facility:
		"market": _build_market()
		"ship": _build_shipyard()
		"harbor": _build_harbor()
		"inn": _build_inn()
		"chart": _build_chart()


func _build_market() -> void:
	modal_title.text = "%s · 交易所" % GameState.PORTS[state.current_port]["name"]
	modal_content.add_child(_label("行情会随库存与日期变化。每次成交按按钮显示时的当前单价结算；收购价已包含商会价差。", 14, MUTED, true))
	market_buy_buttons.clear()
	market_sell_buttons.clear()
	var header := _row(9)
	for entry in [["商品", 105], ["买入 / 卖出", 150], ["本港库存", 96], ["船上 / 成本", 153], ["数量", 85]]:
		var title := _label(entry[0], 13, MUTED)
		title.custom_minimum_size.x = entry[1]
		header.add_child(title)
	modal_content.add_child(header)
	for good in GameState.GOODS:
		var row := _row(9)
		var name_label := _label(GameState.GOOD_NAMES[good], 18, GOLD)
		name_label.custom_minimum_size.x = 105
		row.add_child(name_label)
		var price_label := _label("%d / %d 金" % [state.price(good), state.price(good, true)], 16)
		price_label.custom_minimum_size.x = 150
		row.add_child(price_label)
		var inventory := _label("%d 箱" % state.stock(good), 14, MUTED)
		inventory.custom_minimum_size.x = 96
		row.add_child(inventory)
		var cost := _label("%d 箱 / %.1f 金" % [state.cargo[good], state.avg_cost(good)], 14)
		cost.custom_minimum_size.x = 153
		row.add_child(cost)
		var quantity := SpinBox.new()
		quantity.min_value = 1
		quantity.max_value = 99
		quantity.value = market_quantities.get(good, 1)
		quantity.custom_minimum_size.x = 85
		quantity.value_changed.connect(func(value: float): market_quantities[good] = int(value))
		row.add_child(quantity)
		var buy_button := _button("买入", func(): _trade(good, int(quantity.value), false), 63)
		buy_button.disabled = state.max_buy(good) < 1
		market_buy_buttons[good] = buy_button
		row.add_child(buy_button)
		var sell_button := _button("卖出", func(): _trade(good, int(quantity.value), true), 63)
		sell_button.disabled = state.cargo[good] == 0
		market_sell_buttons[good] = sell_button
		row.add_child(sell_button)
		row.add_child(_button("买满", func(): _trade(good, state.max_buy(good), false), 63))
		row.add_child(_button("全卖", func(): _trade(good, int(state.cargo[good]), true), 63))
		modal_content.add_child(_panel(row, 10))
	var report := _row(16)
	report.add_child(_label("货舱 %d / %d   ·   金币 %d   ·   累计交易利润 %d" % [state.cargo_used(), state.capacity, state.coins, state.lifetime_profit], 15, GOLD))
	modal_content.add_child(report)
	var comparison := _row()
	comparison.add_child(_label("对照目的港收购行情", 14))
	var destination := OptionButton.new()
	for id in PORT_IDS:
		destination.add_item(GameState.PORTS[id]["name"])
	destination.select(PORT_IDS.find(market_target))
	destination.item_selected.connect(func(index: int):
		market_target = PORT_IDS[index]
		_rebuild_facility())
	comparison.add_child(destination)
	modal_content.add_child(comparison)
	var quotes: Array[String] = []
	for good in GameState.GOODS:
		quotes.append("%s %d 金" % [GameState.GOOD_NAMES[good], state.price(good, true, market_target)])
	modal_content.add_child(_label("  ·  ".join(quotes), 14, MUTED, true))
	modal_content.add_child(_label("这是今日行情，抵港时可能变化。货物占货舱，航行补给使用独立补给仓。", 13, MUTED, true))


func _build_shipyard() -> void:
	modal_title.text = "我的船 · %s" % state.ship_name
	var columns := _row(20)
	var left := _column(9)
	left.custom_minimum_size.x = 390
	var diagram := ShipDiagram.new()
	diagram.custom_minimum_size = Vector2(390, 280)
	diagram.large_hull = state.ship_id != "sloop"
	left.add_child(diagram)
	var ship: Dictionary = GameState.SHIPS[state.ship_id]
	left.add_child(_label("%s  ·  货舱 %d 格" % [ship["name"], state.capacity], 21, GOLD))
	left.add_child(_label("船况 %d / %d   ·   基础航速 %.1f 节" % [state.hull, state.max_hull, float(ship["speed"]) / 10.0], 15))
	left.add_child(_label(ship["description"], 14, MUTED, true))
	var naming := _row()
	rename_input = LineEdit.new()
	rename_input.text = state.ship_name
	rename_input.max_length = 12
	rename_input.size_flags_horizontal = SIZE_EXPAND_FILL
	naming.add_child(rename_input)
	naming.add_child(_button("命名", func(): _apply(state.rename_ship(rename_input.text), "船名已经刻在船尾。")))
	left.add_child(naming)
	var repairs := _row()
	var repair_button := _button("修理 · %d 金" % (state.max_hull - state.hull), func(): _apply(state.repair(), "船匠已完成修理。"))
	repair_button.disabled = state.at_sea or state.hull >= state.max_hull
	repairs.add_child(repair_button)
	var upgrade := _button("扩仓 +10 · 400 金", func(): _apply(state.upgrade_cargo(), "货舱扩建完成，下一趟可以带更多货物。"))
	upgrade.disabled = state.at_sea or state.cargo_upgraded
	repairs.add_child(upgrade)
	left.add_child(repairs)
	columns.add_child(left)
	var right := _column(10)
	right.size_flags_horizontal = SIZE_EXPAND_FILL
	right.add_child(_label("船厂现货", 20, GOLD))
	right.add_child(_label("旧船可折价 %d 金币。换船保留船名、货物及货舱改装。" % state.trade_in_value(), 13, MUTED, true))
	ship_purchase_buttons.clear()
	for id in ["sloop", "coaster", "merchant"]:
		var offer: Dictionary = GameState.SHIPS[id]
		var card := _column(5)
		card.add_child(_label(offer["name"], 18, GOLD))
		card.add_child(_label("货舱 %d 格  ·  航速 %.1f 节  ·  耐久 %d" % [offer["capacity"], float(offer["speed"]) / 10.0, offer["max_hull"]], 14))
		card.add_child(_label(offer["description"], 13, MUTED, true))
		var price: int = int(offer["price"]) - state.trade_in_value()
		var offer_text := "更换此船 · 补 %d 金" % price if price >= 0 else "更换此船 · 返还 %d 金" % absi(price)
		var buy_button := _button("当前船型" if id == state.ship_id else offer_text, func(): _apply(state.buy_ship(id), "新船已经下水。"))
		buy_button.disabled = state.at_sea or id == state.ship_id
		ship_purchase_buttons[id] = buy_button
		card.add_child(buy_button)
		right.add_child(_panel(card, 12))
	columns.add_child(right)
	modal_content.add_child(columns)
	if state.at_sea:
		modal_content.add_child(_label("海上可查看船况和命名；修理、扩仓与换船需要靠港。", 14, GOLD))


func _build_harbor() -> void:
	modal_title.text = "%s · 出航码头" % GameState.PORTS[state.current_port]["name"]
	modal_content.add_child(_label("%s正在等待启航。选好货物与目的地，为这次航程留够补给。" % state.ship_name, 17, INK, true))
	var supplies := _column(10)
	supplies.add_child(_label("船员补给  %d / %d 份" % [state.supplies, state.max_supplies], 23, GOLD))
	supplies.add_child(_label("每日消耗 1 份，每份 3 金币。缺粮会损伤船况，长途航行前请做好准备。", 14, MUTED, true))
	var supply_actions := _row()
	supplies_one_button = _button("补充 1 份 · 3 金", func(): _apply(state.resupply(1), "一份补给已送上船。"))
	supply_actions.add_child(supplies_one_button)
	supply_actions.add_child(_button("补充 5 份 · 15 金", func(): _apply(state.resupply(5), "五份补给已送上船。")))
	supply_actions.add_child(_button("补满 · %d 金" % ((state.max_supplies - state.supplies) * 3), func(): _apply(state.resupply(state.max_supplies - state.supplies), "补给仓已装满。")))
	supplies.add_child(supply_actions)
	modal_content.add_child(_panel(supplies, 18))
	modal_content.add_child(_label("选择下一站", 20, GOLD))
	for id in PORT_IDS:
		if id == state.current_port:
			continue
		var port: Dictionary = GameState.PORTS[id]
		var distance: float = state.ship_position.distance_to(port["position"])
		var expected_days: int = maxi(1, ceili(distance / float(GameState.SHIPS[state.ship_id]["speed"]) / 12.0))
		var row := _row(12)
		var info := _column(4)
		info.size_flags_horizontal = SIZE_EXPAND_FILL
		info.add_child(_label(port["name"] + " · " + port["subtitle"], 18))
		info.add_child(_label("约 %d～%d 天 · %s" % [expected_days, expected_days + 2, port["specialty"]], 14, MUTED))
		row.add_child(info)
		var button := _button("出港并自动驶向此港", func(): _depart(id), 220)
		button.disabled = state.supplies < 1 or state.hull < 1
		row.add_child(button)
		modal_content.add_child(_panel(row, 14))
	departure_button = _button("出港 · 自由掌舵", func(): _depart(""))
	departure_button.disabled = state.supplies < 1 or state.hull < 1
	modal_content.add_child(departure_button)
	modal_content.add_child(_label("出海后可随时手动转向、停帆或更换目标。靠近港口并减速后，点击「入港」。", 14, MUTED, true))


func _build_inn() -> void:
	modal_title.text = "%s · 旅舍" % GameState.PORTS[state.current_port]["name"]
	modal_content.add_child(_label("把船留在港湾，给自己和船员一个安稳的夜晚。", 23, GOLD, true))
	modal_content.add_child(_label("休整一日花费 20 金币，船况恢复 5 点。第二天港口会补充库存，行情随日期变化。", 16, MUTED, true))
	modal_content.add_child(_button("休整一日 · 20 金", func(): _apply(state.rest(), "一夜过去，码头开始迎接新一天的生意。"), 250))
	modal_content.add_child(_label("航海账簿", 21, GOLD))
	modal_content.add_child(_label("累计交易利润：%d 金币\n购入补给：%d 金币\n已到访港口：%d / 3\n当前船只：%s · %s" % [state.lifetime_profit, state.supply_spent, state.visited.size(), GameState.SHIPS[state.ship_id]["name"], state.ship_name], 17, INK))
	modal_content.add_child(_label("最近的航程", 18, GOLD))
	modal_content.add_child(_label("\n".join(state.events), 14, MUTED, true))


func _build_chart() -> void:
	modal_title.text = "青屿海域 · 航海图"
	modal_content.add_child(_label("三个港口，三种风土。选择目的港后自动驶向它，途中可随时接管掌舵。", 16, MUTED, true))
	for id in PORT_IDS:
		var port: Dictionary = GameState.PORTS[id]
		var row := _row(16)
		var icon := _label("◈", 42, port["color"])
		row.add_child(icon)
		var information := _column(5)
		information.size_flags_horizontal = SIZE_EXPAND_FILL
		information.add_child(_label(port["name"] + "  " + ("已到访" if state.visited.has(id) else "已知港口"), 22, GOLD))
		information.add_child(_label(port["description"], 14, INK, true))
		information.add_child(_label(port["specialty"], 14, MUTED, true))
		row.add_child(information)
		var button := _button("自动驶向此港" if state.at_sea else "前往码头准备", func():
			if state.at_sea:
				sea_view.set_destination(id)
				close_facility()
				_notice("已设定航向：%s。" % port["name"])
			else:
				open_facility("harbor"), 170)
		button.disabled = not state.at_sea and id == state.current_port
		row.add_child(button)
		modal_content.add_child(_panel(row, 16))
	modal_content.add_child(_label("海上操作：A/D 或左右键转向，W/S 或上下键收放帆，空格停帆。\n海图右上角的小地图显示船只位置；自动抵达附近后，减速入港。", 15, MUTED, true))


func _trade(good: String, quantity: int, selling: bool) -> void:
	var before: int = state.coins
	var error: String = state.sell(good, quantity) if selling else state.buy(good, quantity)
	var amount: int = absi(state.coins - before)
	_apply(error, "%s %d 箱%s，%s %d 金币。" % ["售出" if selling else "购入", quantity, GameState.GOOD_NAMES[good], "收入" if selling else "花费", amount])


func _apply(error: String, success: String) -> void:
	if error.is_empty():
		_notice(success)
		if persist_enabled:
			state.save_game()
		_refresh_hud()
		if not active_facility.is_empty():
			_rebuild_facility()
	else:
		_notice(error)
	modal_feedback.text = success if error.is_empty() else error
	modal_feedback.add_theme_color_override("font_color", GOLD if error.is_empty() else Color("efa18a"))


func _depart(destination: String) -> void:
	var error: String = state.depart()
	if not error.is_empty():
		_apply(error, "")
		return
	close_facility()
	_refresh_scene()
	if not destination.is_empty():
		sea_view.set_destination(destination)
	_notice("%s离开码头。海风正好，可以扬帆了。" % state.ship_name)
	_transition()
	if persist_enabled:
		state.save_game()


func _dock() -> void:
	var port: String = sea_view.nearest_port()
	if port.is_empty():
		_notice("继续接近港口，再收帆减速。")
		return
	var error: String = state.dock(port)
	if not error.is_empty():
		_notice(error)
		return
	_refresh_scene()
	_notice("已抵达%s。码头、商会与船坞正在营业。" % GameState.PORTS[port]["name"])
	_transition()
	if persist_enabled:
		state.save_game()


func _rescue() -> void:
	var error: String = state.rescue()
	if not error.is_empty():
		_notice(error)
		return
	close_facility()
	_refresh_scene()
	_notice("港务船已将你带回港口。整备之后可以重新出发。")
	if persist_enabled:
		state.save_game()


func _ask(title: String, message: String, callback: Callable) -> void:
	confirmation.title = title
	confirmation.dialog_text = message
	pending_confirmation = callback
	confirmation.popup_centered(Vector2i(460, 170))
	sea_view.sailing_controls_enabled = false


func _reset() -> void:
	if save_blocked:
		persist_enabled = true
		save_blocked = false
	state.reset_game()
	market_quantities.clear()
	close_facility()
	sea_view.bind_state(state)
	_refresh_scene()
	_notice("新航程开始。逐风号已经准备好。")
	if persist_enabled:
		state.save_game()


func _manual_save() -> void:
	if not persist_enabled:
		if save_blocked:
			_notice("旧存档无法读取，已保留原文件。点击重开可开始新的存档。")
		return
	var error: String = state.save_game()
	_notice("航程已保存，下次打开会从这里继续。" if error.is_empty() else error)


func _notice(message: String) -> void:
	message_label.text = message


func _refresh_scene() -> void:
	port_layer.visible = not state.at_sea
	sea_layer.visible = state.at_sea
	if not state.at_sea:
		var port: Dictionary = GameState.PORTS[state.current_port]
		port_title.text = port["name"]
		port_subtitle.text = port["subtitle"]
		port_description.text = port["description"]
		var path := "res://assets/ports/%s.png" % state.current_port
		if ResourceLoader.exists(path):
			if not _port_textures.has(path):
				_port_textures[path] = load(path)
			port_art.texture = _port_textures[path]
	_refresh_hud()


func _refresh_hud() -> void:
	if hud.is_empty():
		return
	hud["day"].text = "第 %d 天" % state.day
	hud["coins"].text = "%d" % state.coins
	hud["cargo"].text = "%d / %d" % [state.cargo_used(), state.capacity]
	hud["supplies"].text = "%d / %d" % [state.supplies, state.max_supplies]
	hud["hull"].text = "%d / %d" % [state.hull, state.max_hull]
	location_label.text = "青屿航记 · " + (state.ship_name if state.at_sea else GameState.PORTS[state.current_port]["name"])
	if state.at_sea:
		var nearest: String = sea_view.nearest_port()
		var slow: bool = state.speed <= 30.0
		dock_button.disabled = nearest.is_empty() or not slow
		dock_button.text = "接近港口后入港" if nearest.is_empty() else ("入港 · " + GameState.PORTS[nearest]["name"] if slow else "收帆减速后入港")
		var target: String = "自由航行" if state.autopilot_target.is_empty() else "驶向" + GameState.PORTS[state.autopilot_target]["name"]
		sea_status.text = "%s   ·   %.1f 节   ·   %s" % [state.ship_name, state.speed / 10.0, target]


func _transition() -> void:
	fade.color.a = 0.8
	create_tween().tween_property(fade, "color:a", 0.0, 0.5)
