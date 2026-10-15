extends Control

signal port_selected(port_id: String)

const SEA := Color("102c36")
const LAND := Color("a9b9a4")
const COAST := Color("d5d9bb")
const INK := Color("d8e7df")
const MUTED := Color("789a9d")
const ACCENT := Color("edaf70")
const PORT_IDS: Array[String] = ["dawn", "pine", "sand"]
const PORT_POSITIONS := {
	"dawn": Vector2(0.22, 0.72),
	"pine": Vector2(0.43, 0.23),
	"sand": Vector2(0.80, 0.57),
}
const PORT_NAMES := {"dawn": "曙光港", "pine": "雾松湾", "sand": "赤砂埠"}
var _islands: Array[PackedVector2Array] = [
	PackedVector2Array([
		Vector2(0.064, 0.55), Vector2(0.091, 0.50), Vector2(0.143, 0.51),
		Vector2(0.167, 0.56), Vector2(0.204, 0.575), Vector2(0.217, 0.62),
		Vector2(0.255, 0.638), Vector2(0.258, 0.682), Vector2(0.220, 0.72),
		Vector2(0.208, 0.765), Vector2(0.171, 0.79), Vector2(0.136, 0.767),
		Vector2(0.10, 0.805), Vector2(0.061, 0.756), Vector2(0.078, 0.702),
		Vector2(0.056, 0.655), Vector2(0.075, 0.61),
	]),
	PackedVector2Array([
		Vector2(0.345, 0.12), Vector2(0.385, 0.093), Vector2(0.414, 0.131),
		Vector2(0.454, 0.116), Vector2(0.474, 0.152), Vector2(0.505, 0.158),
		Vector2(0.518, 0.20), Vector2(0.479, 0.227), Vector2(0.43, 0.23),
		Vector2(0.412, 0.267), Vector2(0.373, 0.284), Vector2(0.345, 0.25),
		Vector2(0.31, 0.258), Vector2(0.295, 0.208), Vector2(0.32, 0.169),
	]),
	PackedVector2Array([
		Vector2(0.816, 0.393), Vector2(0.865, 0.408), Vector2(0.889, 0.462),
		Vector2(0.928, 0.476), Vector2(0.947, 0.534), Vector2(0.928, 0.577),
		Vector2(0.94, 0.632), Vector2(0.896, 0.675), Vector2(0.876, 0.636),
		Vector2(0.832, 0.65), Vector2(0.821, 0.609), Vector2(0.80, 0.57),
		Vector2(0.764, 0.55), Vector2(0.764, 0.505), Vector2(0.798, 0.469),
	]),
	PackedVector2Array([
		Vector2(0.59, 0.73), Vector2(0.613, 0.719), Vector2(0.63, 0.743),
		Vector2(0.622, 0.778), Vector2(0.599, 0.788), Vector2(0.58, 0.764),
	]),
	PackedVector2Array([
		Vector2(0.661, 0.317), Vector2(0.68, 0.305), Vector2(0.695, 0.333),
		Vector2(0.684, 0.36), Vector2(0.661, 0.351),
	]),
]

var _current: String = "dawn"
var _selected: String = ""
var _destination: String = ""
var _progress: float = 0.0
var _hovered: String = ""
var _font: SystemFont = SystemFont.new()


func _ready() -> void:
	_font.font_names = PackedStringArray(["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"])
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	resized.connect(queue_redraw)
	mouse_exited.connect(_clear_hover)
	queue_redraw()


func set_state(current: String, selected: String, destination: String = "", progress: float = 0.0) -> void:
	_current = current
	_selected = selected
	_destination = destination
	_progress = clampf(progress, 0.0, 1.0)
	if _is_sailing():
		_clear_hover()
	queue_redraw()


func _is_sailing() -> bool:
	return not _destination.is_empty() and PORT_POSITIONS.has(_current) and PORT_POSITIONS.has(_destination)


func _port_position(port_id: String) -> Vector2:
	var normalized: Vector2 = PORT_POSITIONS[port_id]
	return normalized * size


func _label_rect(port_id: String) -> Rect2:
	var position: Vector2 = _port_position(port_id)
	return Rect2(position + Vector2(14.0, -14.0), Vector2(74.0, 30.0))


func _hit_port(position: Vector2) -> String:
	for port_id: String in PORT_IDS:
		if position.distance_to(_port_position(port_id)) <= 19.0 or _label_rect(port_id).has_point(position):
			return port_id
	return ""


func _clear_hover() -> void:
	_hovered = ""
	tooltip_text = ""
	mouse_default_cursor_shape = Control.CURSOR_ARROW
	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if _is_sailing():
		return
	if event is InputEventMouseMotion:
		var motion: InputEventMouseMotion = event as InputEventMouseMotion
		var hovered: String = _hit_port(motion.position)
		if hovered != _hovered:
			_hovered = hovered
			tooltip_text = "" if hovered.is_empty() else "%s · 点选查看航线" % String(PORT_NAMES[hovered])
			mouse_default_cursor_shape = Control.CURSOR_ARROW if hovered.is_empty() else Control.CURSOR_POINTING_HAND
			queue_redraw()
	elif event is InputEventMouseButton:
		var click: InputEventMouseButton = event as InputEventMouseButton
		if click.button_index == MOUSE_BUTTON_LEFT and click.pressed:
			var port_id: String = _hit_port(click.position)
			if not port_id.is_empty():
				port_selected.emit(port_id)
				accept_event()


func _draw() -> void:
	if size.x < 1.0 or size.y < 1.0:
		return
	draw_rect(Rect2(Vector2.ZERO, size), SEA)
	_draw_grid()
	_draw_waves()
	for index: int in range(_islands.size()):
		_draw_island(_islands[index], index)
	_draw_terrain()
	_draw_routes()
	for port_id: String in PORT_IDS:
		_draw_port(port_id)
	if _is_sailing():
		var start: Vector2 = _port_position(_current)
		var finish: Vector2 = _port_position(_destination)
		_draw_ship(start.lerp(finish, _progress), (finish - start).angle())
	_draw_compass(Vector2(size.x - 47.0, 49.0))
	draw_string(_font, Vector2(23.0, 30.0), "青屿海域", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 16, INK)
	draw_line(Vector2(23.0, 41.0), Vector2(89.0, 41.0), Color("547c80"), 1.0, true)
	var legend: String = "点选港口 · 规划航线"
	var legend_width: float = _font.get_string_size(legend, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12).x
	draw_string(_font, Vector2(size.x - legend_width - 22.0, size.y - 19.0), legend, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, MUTED)


func _draw_grid() -> void:
	var grid_color := Color(0.39, 0.61, 0.64, 0.075)
	for column: int in range(1, 10):
		var x: float = size.x * float(column) / 10.0
		draw_line(Vector2(x, 0.0), Vector2(x, size.y), grid_color, 1.0)
	for row: int in range(1, 7):
		var y: float = size.y * float(row) / 7.0
		draw_line(Vector2(0.0, y), Vector2(size.x, y), grid_color, 1.0)


func _draw_waves() -> void:
	var positions := PackedVector2Array([
		Vector2(0.13, 0.32), Vector2(0.24, 0.38), Vector2(0.58, 0.13),
		Vector2(0.73, 0.19), Vector2(0.87, 0.27), Vector2(0.54, 0.48),
		Vector2(0.65, 0.58), Vector2(0.38, 0.84), Vector2(0.74, 0.85),
		Vector2(0.08, 0.89), Vector2(0.46, 0.64),
	])
	for normalized: Vector2 in positions:
		var center: Vector2 = normalized * size
		var points := PackedVector2Array()
		for step: int in range(13):
			var x: float = float(step) * 2.0 - 12.0
			points.append(center + Vector2(x, sin(float(step) * PI / 6.0) * 2.0))
		draw_polyline(points, Color(0.39, 0.64, 0.66, 0.26), 1.0, true)
		draw_line(center + Vector2(-5.0, 6.0), center + Vector2(5.0, 6.0), Color(0.39, 0.64, 0.66, 0.14), 1.0, true)


func _draw_island(normalized: PackedVector2Array, index: int) -> void:
	var points := PackedVector2Array()
	var center := Vector2.ZERO
	for point: Vector2 in normalized:
		var position: Vector2 = point * size
		points.append(position)
		center += position
	center /= float(points.size())
	for band: int in range(3, 0, -1):
		var contour := PackedVector2Array()
		for position: Vector2 in points:
			contour.append(position + (position - center).normalized() * float(band) * 7.0)
		contour.append(contour[0])
		draw_polyline(contour, Color(0.34, 0.59, 0.59, 0.21 - float(band) * 0.035), 1.0, true)
	var island_color: Color = LAND if index != 2 else Color("bfc0a0")
	draw_colored_polygon(points, island_color)
	var shoreline: PackedVector2Array = points.duplicate()
	shoreline.append(shoreline[0])
	draw_polyline(shoreline, COAST, 1.6, true)
	var inland := PackedVector2Array()
	for position: Vector2 in points:
		inland.append(center.lerp(position, 0.77))
	inland.append(inland[0])
	draw_polyline(inland, Color(0.34, 0.46, 0.40, 0.22), 1.0, true)


func _draw_terrain() -> void:
	var hill_centers := PackedVector2Array([Vector2(0.131, 0.614), Vector2(0.162, 0.675), Vector2(0.848, 0.496), Vector2(0.888, 0.568)])
	for normalized: Vector2 in hill_centers:
		var center: Vector2 = normalized * size
		var ridge := PackedVector2Array([center + Vector2(-9.0, 4.0), center + Vector2(-1.0, -6.0), center + Vector2(8.0, 4.0)])
		draw_polyline(ridge, Color(0.31, 0.43, 0.38, 0.48), 1.1, true)
		draw_line(center + Vector2(-1.0, -5.0), center + Vector2(1.0, 3.0), Color(0.31, 0.43, 0.38, 0.24), 1.0, true)
	var trees := PackedVector2Array([Vector2(0.356, 0.187), Vector2(0.382, 0.164), Vector2(0.404, 0.185), Vector2(0.439, 0.166)])
	for normalized: Vector2 in trees:
		var center: Vector2 = normalized * size
		draw_colored_polygon(PackedVector2Array([center + Vector2(0.0, -6.0), center + Vector2(-4.0, 3.0), center + Vector2(4.0, 3.0)]), Color(0.26, 0.41, 0.36, 0.65))
		draw_line(center + Vector2(0.0, 2.0), center + Vector2(0.0, 6.0), Color(0.26, 0.41, 0.36, 0.65), 1.0)


func _draw_routes() -> void:
	for start_index: int in range(PORT_IDS.size()):
		for finish_index: int in range(start_index + 1, PORT_IDS.size()):
			draw_dashed_line(_port_position(PORT_IDS[start_index]), _port_position(PORT_IDS[finish_index]), Color(0.50, 0.70, 0.70, 0.23), 1.0, 5.0, true)
	var target: String = _destination if _is_sailing() else _selected
	if PORT_POSITIONS.has(_current) and PORT_POSITIONS.has(target) and target != _current:
		var start: Vector2 = _port_position(_current)
		var finish: Vector2 = _port_position(target)
		draw_dashed_line(start, finish, Color(0.93, 0.69, 0.44, 0.73), 1.8, 7.0, true)
		if _is_sailing():
			draw_line(start, start.lerp(finish, _progress), Color(0.93, 0.69, 0.44, 0.88), 2.0, true)


func _draw_port(port_id: String) -> void:
	var position: Vector2 = _port_position(port_id)
	var active: bool = port_id == _selected or port_id == _destination
	var present: bool = port_id == _current
	var hovered: bool = port_id == _hovered
	if active or hovered:
		draw_circle(position, 18.0 if hovered else 15.0, Color(0.93, 0.69, 0.44, 0.11))
		draw_arc(position, 13.0, 0.0, TAU, 40, ACCENT, 1.2, true)
	draw_circle(position, 8.0, SEA)
	draw_circle(position, 5.0, ACCENT if active else INK)
	if present:
		draw_circle(position, 2.4, SEA)
		draw_arc(position, 11.0, 0.0, TAU, 40, Color("c5ddd5"), 1.0, true)
	var label: String = String(PORT_NAMES[port_id])
	var text_position: Vector2 = position + Vector2(18.0, 5.0)
	draw_string_outline(_font, text_position, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, 4, SEA)
	draw_string(_font, text_position, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 14, ACCENT if active or hovered else INK)
	if present and not _is_sailing():
		draw_string_outline(_font, position + Vector2(18.0, 23.0), "当前停泊", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, 3, SEA)
		draw_string(_font, position + Vector2(18.0, 23.0), "当前停泊", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, MUTED)


func _draw_ship(position: Vector2, heading: float) -> void:
	draw_circle(position, 17.0, Color(0.02, 0.09, 0.13, 0.45))
	var hull := PackedVector2Array([Vector2(-11.0, -5.0), Vector2(5.0, -6.0), Vector2(14.0, 0.0), Vector2(5.0, 6.0), Vector2(-11.0, 5.0), Vector2(-8.0, 0.0)])
	var transformed := PackedVector2Array()
	for point: Vector2 in hull:
		transformed.append(position + point.rotated(heading))
	draw_colored_polygon(transformed, Color("f3eee0"))
	var sail := PackedVector2Array([Vector2(-5.0, -2.0), Vector2(7.0, -2.0), Vector2(-2.0, -15.0)])
	transformed.clear()
	for point: Vector2 in sail:
		transformed.append(position + point.rotated(heading))
	draw_colored_polygon(transformed, ACCENT)
	draw_line(position + Vector2(-2.0, 3.0).rotated(heading), position + Vector2(-2.0, -15.0).rotated(heading), Color("f3eee0"), 1.3, true)


func _draw_compass(center: Vector2) -> void:
	draw_arc(center, 20.0, 0.0, TAU, 48, Color(0.51, 0.70, 0.69, 0.28), 1.0, true)
	draw_line(center + Vector2(-26.0, 0.0), center + Vector2(26.0, 0.0), Color(0.51, 0.70, 0.69, 0.27), 1.0, true)
	draw_line(center + Vector2(0.0, -20.0), center + Vector2(0.0, 25.0), Color(0.51, 0.70, 0.69, 0.27), 1.0, true)
	draw_colored_polygon(PackedVector2Array([center + Vector2(0.0, -15.0), center + Vector2(-4.0, 3.0), center, center + Vector2(4.0, 3.0)]), ACCENT)
	draw_colored_polygon(PackedVector2Array([center + Vector2(0.0, 15.0), center + Vector2(-4.0, -3.0), center, center + Vector2(4.0, -3.0)]), Color("547c80"))
	draw_circle(center, 2.0, SEA)
	draw_string(_font, center + Vector2(-4.0, -26.0), "N", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, MUTED)
