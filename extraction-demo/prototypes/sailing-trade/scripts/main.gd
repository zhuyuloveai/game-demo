extends Control

const TradeState = preload("res://scripts/trade_state.gd")
const SeaMap = preload("res://scripts/sea_map.gd")
const INK = Color("e5ede5")
const MUTED = Color("9db5b7")
const GOLD = Color("edbf75")
const GREEN = Color("80cbb3")
const PANEL = Color("102830")
const EDGE = Color("27434a")
const PORT_ORDER: Array[String] = ["dawn", "pine", "sand"]

var state = TradeState.new()
var selected_port: String = "pine"
var sea_map: Control
var stats: Dictionary = {}
var market_rows: Dictionary = {}
var destination_picker: OptionButton
var port_name: Label
var port_description: Label
var route_title: Label
var route_detail: Label
var price_comparison: Label
var route_progress: ProgressBar
var sail_button: Button
var supply_one_button: Button
var supply_full_button: Button
var supply_label: Label
var upgrade_button: Button
var upgrade_detail: Label
var rescue_button: Button
var goal_label: Label
var journal_label: Label
var feedback_label: Label
var completion_dialog: AcceptDialog
var restart_dialog: ConfirmationDialog
var log_lines: Array[String] = []
var voyage_elapsed: float = 0.0
var voyage_duration: float = 0.0
var voyage_days: int = 0
var voyage_start_day: int = 1
var completion_shown: bool = false


func _ready() -> void:
	_build_theme()
	_build_interface()
	_log("一艘小船，220 金币。先在曙光港装货，再点选海图上的港口。")
	_refresh()


func _build_theme() -> void:
	var interface_theme := Theme.new()
	var interface_font := SystemFont.new()
	interface_font.font_names = PackedStringArray(["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Noto Sans", "sans-serif"])
	interface_theme.default_font = interface_font
	interface_theme.default_font_size = 15
	interface_theme.set_color("font_color", "Label", INK)
	for type_name in ["Button", "OptionButton"]:
		interface_theme.set_stylebox("normal", type_name, _box(Color("1c3b43"), EDGE, 8, 6))
		interface_theme.set_stylebox("hover", type_name, _box(Color("2b5058"), GREEN, 8, 6))
		interface_theme.set_stylebox("pressed", type_name, _box(Color("345c61"), GOLD, 8, 6))
		interface_theme.set_stylebox("disabled", type_name, _box(Color("11272e"), Color("20383d"), 8, 6))
		interface_theme.set_stylebox("focus", type_name, _box(Color(0, 0, 0, 0), GOLD, 8, 6))
		interface_theme.set_color("font_color", type_name, INK)
		interface_theme.set_color("font_disabled_color", type_name, Color("607b81"))
	interface_theme.set_stylebox("background", "ProgressBar", _box(Color("0a1c24"), Color("0a1c24"), 3, 0))
	interface_theme.set_stylebox("fill", "ProgressBar", _box(GREEN, GREEN, 3, 0))
	theme = interface_theme


func _box(fill: Color, border: Color, radius: int, padding: int) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = padding
	style.content_margin_right = padding
	style.content_margin_top = padding
	style.content_margin_bottom = padding
	return style


func _label(text: String, size_px: int = 15, color: Color = INK) -> Label:
	var result := Label.new()
	result.text = text
	result.add_theme_font_size_override("font_size", size_px)
	result.add_theme_color_override("font_color", color)
	return result


func _wrapped(text: String, size_px: int = 14, color: Color = MUTED) -> Label:
	var result := _label(text, size_px, color)
	result.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return result


func _button(text: String, action: Callable, min_width: float = 0) -> Button:
	var result := Button.new()
	result.text = text
	result.custom_minimum_size = Vector2(min_width, 34)
	result.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	result.pressed.connect(action)
	return result


func _vbox(spacing: int = 8) -> VBoxContainer:
	var result := VBoxContainer.new()
	result.add_theme_constant_override("separation", spacing)
	return result


func _hbox(spacing: int = 8) -> HBoxContainer:
	var result := HBoxContainer.new()
	result.add_theme_constant_override("separation", spacing)
	return result


func _card(content: Control, padding: int = 16) -> PanelContainer:
	var result := PanelContainer.new()
	result.add_theme_stylebox_override("panel", _box(PANEL, EDGE, 12, padding))
	result.add_child(content)
	return result


func _build_interface() -> void:
	var background := ColorRect.new()
	background.color = Color("091b23")
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 18)
	add_child(margin)
	var root := _vbox(10)
	margin.add_child(root)
	var header := _hbox(20)
	root.add_child(header)
	var titles := _vbox(0)
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_child(_label("我的宇宙  /  玩法实验 01", 13, GREEN))
	titles.add_child(_label("潮汐之间", 30))
	header.add_child(titles)
	var tagline := _vbox(3)
	tagline.alignment = BoxContainer.ALIGNMENT_CENTER
	tagline.add_child(_label("航海与港口交易", 17, GOLD))
	tagline.add_child(_label("装上一船货，带回一段新的可能。", 13, MUTED))
	header.add_child(tagline)
	var restart_button := _button("重新开始", func(): restart_dialog.popup_centered(), 100)
	restart_button.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	header.add_child(restart_button)

	var status_row := _hbox(12)
	root.add_child(status_row)
	for entry in [["day", "航海历"], ["coins", "可用金币"], ["cargo", "货舱载重"], ["supplies", "船员补给"]]:
		var content := _hbox(12)
		content.add_child(_label(entry[1], 13, MUTED))
		var value := _label("", 23, GOLD if entry[0] == "coins" else INK)
		value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		content.add_child(value)
		stats[entry[0]] = value
		var status_card := _card(content, 10)
		status_card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		status_row.add_child(status_card)

	var columns := _hbox(14)
	columns.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(columns)
	var left := _vbox(12)
	left.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(left)
	sea_map = SeaMap.new()
	sea_map.custom_minimum_size = Vector2(480, 305)
	sea_map.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sea_map.port_selected.connect(_select_port)
	left.add_child(sea_map)
	_build_route(left)
	var journal := _vbox(6)
	journal.add_child(_label("航海日志", 14, GREEN))
	journal_label = _wrapped("", 13)
	journal_label.custom_minimum_size.y = 58
	journal.add_child(journal_label)
	left.add_child(_card(journal, 12))

	var right := _vbox(8)
	right.custom_minimum_size.x = 410
	columns.add_child(right)
	_build_market(right)
	_build_supplies(right)
	_build_upgrade(right)
	feedback_label = _wrapped("欢迎登船。茶叶是曙光港的便宜货，可以先买几箱试试。", 14, GOLD)
	feedback_label.custom_minimum_size.y = 36
	right.add_child(feedback_label)
	goal_label = _wrapped("", 13, MUTED)
	root.add_child(goal_label)

	restart_dialog = ConfirmationDialog.new()
	restart_dialog.title = "重新开始航程"
	restart_dialog.dialog_text = "本次航程会重置。重新从曙光港、220 金币和一艘小船开始？"
	restart_dialog.ok_button_text = "重新开始"
	restart_dialog.cancel_button_text = "继续航程"
	restart_dialog.confirmed.connect(_restart)
	add_child(restart_dialog)
	completion_dialog = AcceptDialog.new()
	completion_dialog.title = "第一条商路，已经属于你"
	completion_dialog.ok_button_text = "继续自由航行"
	add_child(completion_dialog)


func _build_route(parent: Control) -> void:
	var content := _vbox(7)
	var top := _hbox(10)
	route_title = _label("", 18)
	route_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(route_title)
	destination_picker = OptionButton.new()
	destination_picker.custom_minimum_size = Vector2(135, 34)
	for port_id in PORT_ORDER:
		destination_picker.add_item(TradeState.PORTS[port_id]["name"])
	destination_picker.item_selected.connect(func(index: int): _select_port(PORT_ORDER[index]))
	top.add_child(destination_picker)
	content.add_child(top)
	route_detail = _label("", 13, MUTED)
	content.add_child(route_detail)
	price_comparison = _wrapped("", 13, GREEN)
	content.add_child(price_comparison)
	route_progress = ProgressBar.new()
	route_progress.custom_minimum_size.y = 5
	route_progress.show_percentage = false
	content.add_child(route_progress)
	var actions := _hbox(8)
	sail_button = _button("启航", _depart)
	sail_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sail_button.add_theme_stylebox_override("normal", _box(Color("c49b61"), GOLD, 8, 9))
	sail_button.add_theme_stylebox_override("hover", _box(Color("dbb980"), GOLD, 8, 9))
	sail_button.add_theme_stylebox_override("pressed", _box(Color("b18a55"), GOLD, 8, 9))
	sail_button.add_theme_color_override("font_color", Color("122a31"))
	actions.add_child(sail_button)
	rescue_button = _button("请求港务救援", _rescue)
	rescue_button.tooltip_text = "无法筹齐最近航程的补给时可用。货物交给港务处，返回曙光港，补给恢复至 8 份、金币保底 80，耗时 2 天。"
	actions.add_child(rescue_button)
	content.add_child(actions)
	parent.add_child(_card(content, 12))


func _build_market(parent: Control) -> void:
	var content := _vbox(6)
	var port_row := _hbox()
	port_name = _label("", 23)
	port_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	port_row.add_child(port_name)
	port_row.add_child(_label("本港商会", 12, GREEN))
	content.add_child(port_row)
	port_description = _wrapped("", 13)
	port_description.custom_minimum_size.y = 18
	content.add_child(port_description)
	content.add_child(_label("固定行情  ·  每箱占 1 格货舱", 12, MUTED))
	for good in TradeState.GOODS:
		var row := _vbox(3)
		var heading := _hbox()
		heading.add_child(_label(TradeState.GOOD_NAMES[good], 17, GOLD))
		var amount := _label("", 13)
		amount.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		amount.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		heading.add_child(amount)
		row.add_child(heading)
		var prices := _label("", 13, MUTED)
		row.add_child(prices)
		var actions := _hbox(5)
		var buy_one := _button("买 1", func(): _buy(good, 1))
		var buy_max := _button("买满", func(): _buy(good, _max_buy(good)))
		var sell_one := _button("卖 1", func(): _sell(good, 1))
		var sell_all := _button("全卖", func(): _sell(good, int(state.cargo[good])))
		for button in [buy_one, buy_max, sell_one, sell_all]:
			button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			button.add_theme_font_size_override("font_size", 13)
			actions.add_child(button)
		row.add_child(actions)
		market_rows[good] = {"amount": amount, "prices": prices, "buy_one": buy_one, "buy_max": buy_max, "sell_one": sell_one, "sell_all": sell_all}
		content.add_child(row)
	parent.add_child(_card(content, 12))


func _build_supplies(parent: Control) -> void:
	var content := _vbox(7)
	var heading := _hbox()
	heading.add_child(_label("出航补给", 16))
	supply_label = _label("", 12, MUTED)
	supply_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	supply_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	heading.add_child(supply_label)
	content.add_child(heading)
	var buttons := _hbox()
	supply_one_button = _button("补充 1 份 · 4 金", func(): _resupply(1))
	supply_full_button = _button("补满", func(): _resupply(state.max_supplies - state.supplies))
	for button in [supply_one_button, supply_full_button]:
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.add_theme_font_size_override("font_size", 13)
		buttons.add_child(button)
	content.add_child(buttons)
	content.add_child(_label("每天消耗 1 份，使用独立储物空间。", 12, MUTED))
	parent.add_child(_card(content, 12))


func _build_upgrade(parent: Control) -> void:
	var content := _vbox(6)
	content.add_child(_label("让下一趟装得更多", 16, GOLD))
	upgrade_detail = _wrapped("", 12)
	content.add_child(upgrade_detail)
	upgrade_button = _button("扩建货舱 +6 格 · 200 金", _upgrade)
	content.add_child(upgrade_button)
	parent.add_child(_card(content, 12))


func _select_port(port_id: String) -> void:
	if not state.pending_destination.is_empty():
		return
	if port_id == state.current_port:
		_feedback("你已经在这里了。请选择另一个港口。")
		return
	selected_port = port_id
	_refresh()


func _max_buy(good: String) -> int:
	var price: int = TradeState.PORTS[state.current_port]["buy"][good]
	return mini(state.capacity - state.used_capacity(), floori(float(state.coins) / price))


func _buy(good: String, quantity: int) -> void:
	var error: String = state.buy(good, quantity)
	if not error.is_empty():
		_feedback(error)
		return
	_feedback("已装船：%s × %d。离港前记得检查补给。" % [TradeState.GOOD_NAMES[good], quantity], false)
	_refresh()


func _sell(good: String, quantity: int) -> void:
	var before: int = state.coins
	var error: String = state.sell(good, quantity)
	if not error.is_empty():
		_feedback(error)
		return
	var message := "售出 %d 箱%s，收入 %d 金币。" % [quantity, TradeState.GOOD_NAMES[good], state.coins - before]
	_feedback(message, false)
	_log(message)
	_refresh()


func _resupply(quantity: int) -> void:
	var error: String = state.resupply(quantity)
	if not error.is_empty():
		_feedback(error)
		return
	_feedback("补给已上船：+%d 份。" % quantity, false)
	_refresh()


func _depart() -> void:
	voyage_days = state.travel_days(selected_port)
	voyage_start_day = state.day
	var error: String = state.depart(selected_port)
	if not error.is_empty():
		_feedback(error)
		return
	voyage_elapsed = 0.0
	voyage_duration = voyage_days * 1.6
	_log("驶向%s，航程 %d 天，消耗 %d 份补给。" % [TradeState.PORTS[selected_port]["name"], voyage_days, voyage_days], voyage_start_day)
	_feedback("顺风启航。船只将沿海图航线自动前进。", false)
	_refresh()


func _process(delta: float) -> void:
	if state.pending_destination.is_empty():
		return
	voyage_elapsed += delta
	var progress: float = minf(voyage_elapsed / voyage_duration, 1.0)
	route_progress.value = progress * 100.0
	sea_map.set_state(state.current_port, selected_port, state.pending_destination, progress)
	stats["day"].text = "第 %d 天" % (voyage_start_day + floori(progress * voyage_days))
	if progress >= 1.0:
		var error: String = state.arrive()
		if not error.is_empty():
			_feedback(error)
			return
		_log("抵达%s。货物完好，可以进港交易。" % TradeState.PORTS[state.current_port]["name"])
		selected_port = PORT_ORDER[(PORT_ORDER.find(state.current_port) + 1) % PORT_ORDER.size()]
		_feedback("已经靠港，商会开始营业。看看这一趟货物能卖多少钱。", false)
		if state.round_trip_complete and not state.upgraded and state.current_port == TradeState.HOME:
			_feedback("已走通三港商路！卖出货物后，可以在这里扩建货舱。", false)
		_refresh()


func _upgrade() -> void:
	var error: String = state.upgrade()
	if not error.is_empty():
		_feedback(error)
		return
	_log("货舱扩建完成，现在可以装载 16 箱货物。")
	_feedback("第一条商路已经走通。接下来可以用更大的货舱自由贸易。", false)
	_refresh()
	if not completion_shown:
		completion_shown = true
		completion_dialog.dialog_text = "你探访了三个港口，返回曙光港，并完成了第一次货舱扩建。\n\n航行：%d 趟 · 用时：%d 天\n已售货物毛利润：%d 金币\n购入补给花费：%d 金币\n\n这趟旅途中，哪个选择最让你想再跑一趟？\n继续航行，或者重新开始试试另一条商路。" % [state.voyages, state.day - 1, state.trade_profit, state.supply_spent]
		completion_dialog.popup_centered(Vector2i(500, 300))


func _rescue() -> void:
	var error: String = state.rescue()
	if not error.is_empty():
		_feedback(error)
		return
	selected_port = "pine"
	_log("港务处接走货物，护送船只返回曙光港，重新备好 8 份补给。")
	_feedback("救援完成，耗时 2 天。金币保底 80，可以重新安排航程。", false)
	_refresh()


func _restart() -> void:
	state.restart()
	selected_port = "pine"
	voyage_elapsed = 0.0
	voyage_duration = 0.0
	completion_shown = false
	log_lines.clear()
	_log("新的航程开始。三座港口，各有值得带走的货物。")
	_feedback("欢迎登船。茶叶是曙光港的便宜货，可以先买几箱试试。", false)
	_refresh()


func _feedback(message: String, is_error: bool = true) -> void:
	feedback_label.text = message
	feedback_label.add_theme_color_override("font_color", Color("eeac8b") if is_error else GOLD)


func _log(message: String, entry_day: int = -1) -> void:
	log_lines.append("第 %d 天  %s" % [state.day if entry_day < 0 else entry_day, message])
	while log_lines.size() > 3:
		log_lines.pop_front()
	journal_label.text = "\n".join(log_lines)


func _refresh() -> void:
	var sailing: bool = not state.pending_destination.is_empty()
	var port: Dictionary = TradeState.PORTS[state.current_port]
	stats["day"].text = "第 %d 天" % state.day
	stats["coins"].text = "%d" % state.coins
	stats["cargo"].text = "%d / %d" % [state.used_capacity(), state.capacity]
	stats["supplies"].text = "%d / %d" % [state.supplies, state.max_supplies]
	port_name.text = port["name"] + (" · 已离港" if sailing else "")
	port_description.text = "航行中，商会交易将在靠港后恢复。" if sailing else port["description"]
	for good in TradeState.GOODS:
		var row: Dictionary = market_rows[good]
		var quantity: int = state.cargo[good]
		row["amount"].text = "船上 %d 箱" % quantity
		row["prices"].text = "买入 %d 金 / 箱    ·    卖出 %d 金 / 箱" % [port["buy"][good], port["sell"][good]]
		row["buy_one"].disabled = sailing or _max_buy(good) < 1
		row["buy_max"].disabled = sailing or _max_buy(good) < 1
		row["buy_max"].tooltip_text = "按当前金币与剩余货舱最多买入 %d 箱；请另行预留补给费用。" % _max_buy(good)
		row["sell_one"].disabled = sailing or quantity == 0
		row["sell_all"].disabled = sailing or quantity == 0
	var fill_amount: int = state.max_supplies - state.supplies
	supply_label.text = "%d / %d 份 · 每份 4 金" % [state.supplies, state.max_supplies]
	supply_one_button.disabled = sailing or fill_amount < 1 or state.coins < 4
	supply_full_button.text = "补满 · %d 金" % (fill_amount * 4)
	supply_full_button.disabled = sailing or fill_amount <= 0 or state.coins < fill_amount * 4
	upgrade_button.disabled = sailing or state.upgraded or state.current_port != TradeState.HOME or not state.round_trip_complete or state.trade_profit <= state.supply_spent or state.coins < 200
	upgrade_button.text = "已扩建 · 16 格货舱" if state.upgraded else "扩建货舱 +6 格 · 200 金"
	upgrade_detail.text = "货舱已扩建。继续找一条你喜欢的商路。" if state.upgraded else "探访三港并带回交易收益，在曙光港扩建货舱。"
	rescue_button.visible = state.can_rescue()
	destination_picker.disabled = sailing
	for index in range(PORT_ORDER.size()):
		destination_picker.set_item_disabled(index, PORT_ORDER[index] == state.current_port)
	destination_picker.select(PORT_ORDER.find(selected_port))
	var days: int = state.travel_days(selected_port)
	route_title.text = ("正在驶向 " if sailing else "下一站 · ") + TradeState.PORTS[selected_port]["name"]
	if sailing:
		route_detail.text = "海上航行中 · 航程 %d 天 · 补给已装船" % voyage_days
	else:
		route_detail.text = "航程 %d 天 · 消耗 %d 份补给 · 折合 %d 金币" % [days, days, days * 4]
	var comparisons: Array[String] = []
	for good in TradeState.GOODS:
		var margin: int = TradeState.PORTS[selected_port]["sell"][good] - port["buy"][good]
		comparisons.append("%s %s%d" % [TradeState.GOOD_NAMES[good], "+" if margin >= 0 else "", margin])
	price_comparison.text = "本港买 → 目标港卖，每箱价差：" + "  /  ".join(comparisons) + " 金（未扣补给）"
	sail_button.disabled = sailing or days <= 0 or state.supplies < days
	if sailing:
		sail_button.text = "航行中…"
	elif state.supplies < days:
		sail_button.text = "补给不足 · 还需 %d 份" % (days - state.supplies)
	else:
		sail_button.text = "启航前往%s  →" % TradeState.PORTS[selected_port]["name"]
	if not sailing:
		route_progress.value = 0
	sea_map.set_state(state.current_port, selected_port, state.pending_destination, 0.0)
	goal_label.text = "本轮目标：探访三港 %d / 3  →  %s  →  %s     |     已售货物毛利润 %d 金 · 补给支出 %d 金" % [state.visited.size(), "已返回曙光港" if state.round_trip_complete else "返回曙光港", "货舱已扩建" if state.upgraded else "扩建一次货舱", state.trade_profit, state.supply_spent]
