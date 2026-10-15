extends Control

signal state_updated()
signal port_nearby(port_id: String)

const WORLD_MIN := Vector2(100.0, 100.0)
const WORLD_MAX := Vector2(5100.0, 3500.0)
const PROJECTION_Y: float = 0.72
const PORT_IDS: Array[String] = ["dawn", "pine", "sand"]
const PORT_POINTS := {
	"dawn": Vector2(900.0, 2600.0),
	"pine": Vector2(2400.0, 850.0),
	"sand": Vector2(4300.0, 2300.0),
}
const PORT_NAMES := {"dawn": "曙光港", "pine": "雾松湾", "sand": "赤砂埠"}
const HARBORS := {
	"dawn": Vector2(758.0, 2570.0),
	"pine": Vector2(2380.0, 710.0),
	"sand": Vector2(4460.0, 2320.0),
}
const SEA_DARK := Color("16475b")
const SEA_LIGHT := Color("226f81")
const PAPER := Color("f0e4c7")
const GOLD := Color("c6aa70")
const WIND_HEADING: float = -0.62

var state: RefCounted
var sailing_controls_enabled: bool = true
var _camera: Vector2 = Vector2(900.0, 2600.0)
var _zoom: float = 0.62
var _turn_velocity: float = 0.0
var _clock: float = 0.0
var _notify_elapsed: float = 0.0
var _wake_elapsed: float = 0.0
var _coast_cooldown: float = 0.0
var _free_target: Vector2 = Vector2.ZERO
var _has_free_target: bool = false
var _last_nearby: String = ""
var _notice: String = ""
var _notice_remaining: float = 0.0
var _ship_catalog: Dictionary = {}
var _font: SystemFont = SystemFont.new()
var _wake: Array[Vector2] = []
var _trees: Array[Vector2] = []
var _decorative_ships: Array[Vector3] = [
	Vector3(1410.0, 2310.0, -0.7), Vector3(2950.0, 1190.0, 0.8),
	Vector3(3650.0, 2410.0, 2.8), Vector3(2010.0, 1710.0, -1.0),
	Vector3(3840.0, 1080.0, 2.2), Vector3(1330.0, 3090.0, 0.1),
]
var _islands: Array[PackedVector2Array] = [
	PackedVector2Array([
		Vector2(110.0, 2200.0), Vector2(290.0, 2090.0), Vector2(470.0, 2140.0),
		Vector2(600.0, 2210.0), Vector2(690.0, 2340.0), Vector2(792.0, 2410.0),
		Vector2(810.0, 2510.0), Vector2(758.0, 2570.0), Vector2(805.0, 2660.0),
		Vector2(712.0, 2760.0), Vector2(758.0, 2890.0), Vector2(665.0, 3070.0),
		Vector2(485.0, 3190.0), Vector2(306.0, 3215.0), Vector2(130.0, 3100.0),
		Vector2(102.0, 2790.0), Vector2(170.0, 2590.0), Vector2(110.0, 2420.0),
	]),
	PackedVector2Array([
		Vector2(1830.0, 150.0), Vector2(2040.0, 105.0), Vector2(2240.0, 155.0),
		Vector2(2480.0, 110.0), Vector2(2690.0, 205.0), Vector2(2820.0, 380.0),
		Vector2(2730.0, 540.0), Vector2(2550.0, 568.0), Vector2(2470.0, 666.0),
		Vector2(2380.0, 710.0), Vector2(2260.0, 680.0), Vector2(2120.0, 733.0),
		Vector2(1970.0, 628.0), Vector2(1900.0, 492.0), Vector2(1770.0, 440.0),
		Vector2(1800.0, 300.0),
	]),
	PackedVector2Array([
		Vector2(4750.0, 1780.0), Vector2(4960.0, 1830.0), Vector2(5070.0, 1980.0),
		Vector2(5090.0, 2240.0), Vector2(5010.0, 2420.0), Vector2(5070.0, 2660.0),
		Vector2(4940.0, 2870.0), Vector2(4730.0, 2930.0), Vector2(4620.0, 2740.0),
		Vector2(4530.0, 2630.0), Vector2(4525.0, 2450.0), Vector2(4460.0, 2320.0),
		Vector2(4500.0, 2205.0), Vector2(4420.0, 2090.0), Vector2(4510.0, 1905.0),
	]),
	PackedVector2Array([
		Vector2(880.0, 800.0), Vector2(1090.0, 704.0), Vector2(1200.0, 770.0),
		Vector2(1260.0, 940.0), Vector2(1160.0, 1100.0), Vector2(990.0, 1130.0),
		Vector2(838.0, 985.0),
	]),
	PackedVector2Array([
		Vector2(1900.0, 3050.0), Vector2(2050.0, 3020.0), Vector2(2170.0, 3150.0),
		Vector2(2110.0, 3320.0), Vector2(1920.0, 3370.0), Vector2(1810.0, 3230.0),
	]),
	PackedVector2Array([
		Vector2(3460.0, 375.0), Vector2(3580.0, 335.0), Vector2(3650.0, 450.0),
		Vector2(3605.0, 565.0), Vector2(3500.0, 600.0), Vector2(3410.0, 492.0),
	]),
]


func _ready() -> void:
	_font.font_names = PackedStringArray(["Heiti SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"])
	mouse_filter = Control.MOUSE_FILTER_STOP
	clip_contents = true
	resized.connect(queue_redraw)
	_build_tree_positions()
	queue_redraw()


func bind_state(value: RefCounted) -> void:
	state = value
	_ship_catalog = {}
	if state != null:
		_camera = _ship_position()
		var state_script: Script = state.get_script() as Script
		if state_script != null:
			var constants: Dictionary = state_script.get_script_constant_map()
			var catalog: Variant = constants.get("SHIPS", {})
			if catalog is Dictionary:
				_ship_catalog = catalog
	_wake.clear()
	_turn_velocity = 0.0
	_has_free_target = false
	_last_nearby = ""
	queue_redraw()


func set_destination(port_id: String) -> void:
	if state == null or not PORT_POINTS.has(port_id):
		return
	if float(state.get("hull")) <= 0.0:
		_show_notice("船体已无法航行，请呼叫救援", 4.0)
		return
	state.set("autopilot_target", port_id)
	state.set("sail_level", 2)
	_has_free_target = false
	_show_notice("航向 %s · A / D 可接管船舵" % String(PORT_NAMES[port_id]), 3.0)
	queue_redraw()


func nearest_port() -> String:
	if state == null:
		return ""
	var ship_point: Vector2 = _ship_position()
	for port_id: String in PORT_IDS:
		var port_point: Vector2 = PORT_POINTS[port_id]
		if ship_point.distance_to(port_point) < 150.0:
			return port_id
	return ""


func zoom_in() -> void:
	_zoom = minf(_zoom + 0.10, 0.96)
	queue_redraw()


func zoom_out() -> void:
	_zoom = maxf(_zoom - 0.10, 0.36)
	queue_redraw()


func _ship_position() -> Vector2:
	var result: Vector2 = state.get("ship_position")
	return result


func _at_sea() -> bool:
	return state != null and bool(state.get("at_sea"))


func _text_has_focus() -> bool:
	var focused: Control = get_viewport().gui_get_focus_owner()
	return focused is LineEdit or focused is TextEdit or focused is SpinBox


func _can_control() -> bool:
	return _at_sea() and sailing_controls_enabled and float(state.get("hull")) > 0.0 and not _text_has_focus()


func _process(delta: float) -> void:
	if state == null:
		return
	var step: float = minf(delta, 0.05)
	if _at_sea() and sailing_controls_enabled:
		_clock += step
		_coast_cooldown = maxf(0.0, _coast_cooldown - step)
		_notice_remaining = maxf(0.0, _notice_remaining - step)
		_simulate(step)
		if state.has_method("advance_time"):
			state.call("advance_time", step)
		_camera = _camera.lerp(_ship_position(), 1.0 - exp(-5.0 * step))
		_wake_elapsed += step
		if _wake_elapsed >= 0.10:
			_wake_elapsed = 0.0
			if float(state.get("speed")) > 7.0:
				_wake.append(_ship_position())
			elif not _wake.is_empty():
				_wake.pop_front()
			while _wake.size() > 32:
				_wake.pop_front()
	var nearby: String = nearest_port()
	if nearby != _last_nearby:
		_last_nearby = nearby
		port_nearby.emit(nearby)
	_notify_elapsed += delta
	if _notify_elapsed >= 0.20:
		_notify_elapsed = 0.0
		state_updated.emit()
	if _at_sea():
		queue_redraw()


func _base_speed() -> float:
	var ship_id: String = String(state.get("ship_id"))
	var ship_data: Dictionary = _ship_catalog.get(ship_id, {})
	return maxf(1.0, float(ship_data.get("speed", 210.0)))


func _wind_factor(ship_heading: float) -> float:
	return clampf(0.925 + 0.20 * cos(ship_heading - WIND_HEADING) + 0.025 * sin(_clock * 0.2), 0.7, 1.15)


func _simulate(delta: float) -> void:
	if float(state.get("hull")) <= 0.0:
		state.set("speed", 0.0)
		state.set("sail_level", 0)
		state.set("autopilot_target", "")
		_has_free_target = false
		_turn_velocity = 0.0
		return
	var ship_heading: float = float(state.get("heading"))
	var ship_speed: float = float(state.get("speed"))
	var sails: int = clampi(int(state.get("sail_level")), 0, 2)
	var turn_input: float = 0.0
	if _can_control():
		if Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT):
			turn_input -= 1.0
		if Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT):
			turn_input += 1.0
	if not is_zero_approx(turn_input):
		state.set("autopilot_target", "")
		_has_free_target = false
	var automatic: String = String(state.get("autopilot_target"))
	var has_target: bool = PORT_POINTS.has(automatic) or _has_free_target
	var target_point: Vector2 = _free_target
	if PORT_POINTS.has(automatic):
		target_point = PORT_POINTS[automatic]
	var target_turn: float = turn_input * 1.22
	var steering_factor: float = 1.0
	if has_target and is_zero_approx(turn_input):
		var offset: Vector2 = target_point - _ship_position()
		var stopping_distance: float = 138.0 if not automatic.is_empty() else 64.0
		if offset.length() <= stopping_distance:
			state.set("sail_level", 0)
			sails = 0
			state.set("autopilot_target", "")
			_has_free_target = false
			target_turn = 0.0
			if not automatic.is_empty():
				_show_notice("已抵达 %s 外海 · 可以入港" % String(PORT_NAMES[automatic]), 5.0)
		else:
			var difference: float = angle_difference(ship_heading, offset.angle())
			target_turn = clampf(difference * 2.0, -1.05, 1.05)
			steering_factor = clampf(1.0 - absf(difference) / PI, 0.18, 1.0)
	_turn_velocity = move_toward(_turn_velocity, target_turn, 3.2 * delta)
	ship_heading = wrapf(ship_heading + _turn_velocity * delta, -PI, PI)
	var sail_factor: float = 0.0 if sails == 0 else (0.6 if sails == 1 else 1.0)
	var maximum: float = _base_speed()
	var desired_speed: float = maximum * sail_factor * _wind_factor(ship_heading) * steering_factor
	var acceleration: float = maximum * (1.8 if desired_speed < ship_speed else 0.58)
	ship_speed = move_toward(ship_speed, desired_speed, acceleration * delta)
	if ship_speed < 0.05:
		ship_speed = 0.0
	var start: Vector2 = _ship_position()
	var movement: Vector2 = Vector2.from_angle(ship_heading) * ship_speed * delta
	var steps: int = maxi(1, int(ceil(movement.length() / 18.0)))
	var next_point: Vector2 = start
	var blocked: bool = false
	for index: int in range(steps):
		var candidate: Vector2 = start + movement * float(index + 1) / float(steps)
		candidate = candidate.clamp(WORLD_MIN, WORLD_MAX)
		if _touches_land(candidate):
			blocked = true
			break
		next_point = candidate
	state.set("ship_position", next_point)
	state.set("heading", ship_heading)
	if blocked:
		ship_speed *= 0.18
		state.set("sail_level", 0)
		state.set("autopilot_target", "")
		_has_free_target = false
		if _coast_cooldown <= 0.0:
			_coast_cooldown = 4.0
			_show_notice("前方是浅滩，已收帆 · 转舵驶回深水区", 4.0)
	state.set("speed", ship_speed)


func _touches_land(world_point: Vector2) -> bool:
	for island: PackedVector2Array in _islands:
		if Geometry2D.is_point_in_polygon(world_point, island):
			return true
		for sample: Vector2 in [Vector2(22.0, 0.0), Vector2(-22.0, 0.0), Vector2(0.0, 22.0), Vector2(0.0, -22.0)]:
			if Geometry2D.is_point_in_polygon(world_point + sample, island):
				return true
	return false


func _show_notice(message: String, duration: float) -> void:
	_notice = message
	_notice_remaining = duration


func _unhandled_key_input(event: InputEvent) -> void:
	if not _can_control() or not event is InputEventKey:
		return
	var key_event: InputEventKey = event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return
	var code: Key = key_event.physical_keycode
	if code == KEY_NONE:
		code = key_event.keycode
	var sails: int = int(state.get("sail_level"))
	if code == KEY_W or code == KEY_UP:
		state.set("sail_level", mini(2, sails + 1))
	elif code == KEY_S or code == KEY_DOWN:
		state.set("sail_level", maxi(0, sails - 1))
	elif code == KEY_SPACE:
		state.set("sail_level", 0)
		state.set("autopilot_target", "")
		_has_free_target = false
		_show_notice("正在收帆抛锚", 2.0)
	else:
		return
	get_viewport().set_input_as_handled()


func _gui_input(event: InputEvent) -> void:
	if not _can_control() or not event is InputEventMouseButton:
		return
	var click: InputEventMouseButton = event as InputEventMouseButton
	if not click.pressed:
		return
	if click.button_index == MOUSE_BUTTON_WHEEL_UP:
		zoom_in()
		accept_event()
		return
	if click.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		zoom_out()
		accept_event()
		return
	if click.button_index != MOUSE_BUTTON_LEFT:
		return
	if _minimap_rect().has_point(click.position):
		for port_id: String in PORT_IDS:
			var port_point: Vector2 = PORT_POINTS[port_id]
			if _minimap_point(port_point).distance_to(click.position) < 20.0:
				set_destination(port_id)
				break
		accept_event()
		return
	var destination: Vector2 = _to_world(click.position).clamp(WORLD_MIN, WORLD_MAX)
	if _touches_land(destination):
		_show_notice("这里是陆地，请选择海面上的航向", 2.5)
	else:
		state.set("autopilot_target", "")
		state.set("sail_level", 2)
		_free_target = destination
		_has_free_target = true
		_show_notice("驶向指定海面 · A / D 可接管船舵", 2.0)
	accept_event()


func _screen_anchor() -> Vector2:
	return Vector2(size.x * 0.48, size.y * 0.57)


func _to_screen(world_point: Vector2) -> Vector2:
	var relative: Vector2 = (world_point - _camera) * _zoom
	return _screen_anchor() + Vector2(relative.x, relative.y * PROJECTION_Y)


func _to_world(screen_point: Vector2) -> Vector2:
	var relative: Vector2 = (screen_point - _screen_anchor()) / _zoom
	return _camera + Vector2(relative.x, relative.y / PROJECTION_Y)


func _world_view_rect() -> Rect2:
	var upper: Vector2 = _to_world(Vector2.ZERO)
	var lower: Vector2 = _to_world(size)
	return Rect2(upper, lower - upper)


func _project_polygon(points: PackedVector2Array, offset: Vector2 = Vector2.ZERO) -> PackedVector2Array:
	var result := PackedVector2Array()
	for world_point: Vector2 in points:
		result.append(_to_screen(world_point + offset))
	return result


func _draw() -> void:
	if size.x < 1.0 or size.y < 1.0:
		return
	_draw_water()
	_draw_coasts()
	_draw_trees()
	for port_id: String in PORT_IDS:
		_draw_harbor(port_id)
	_draw_background_ships()
	_draw_wake()
	_draw_navigation_target()
	if state != null:
		_draw_ship(_to_screen(_ship_position()), float(state.get("heading")), 1.0, true)
	_draw_sea_mist()
	_draw_compass()
	_draw_minimap()
	_draw_notice()


func _draw_water() -> void:
	for band: int in range(12):
		var fraction: float = float(band) / 11.0
		draw_rect(Rect2(0.0, size.y * float(band) / 12.0, size.x, size.y / 12.0 + 1.0), SEA_DARK.lerp(SEA_LIGHT, fraction * 0.62))
	var area: Rect2 = _world_view_rect().grow(160.0)
	var min_x: int = int(floor(area.position.x / 105.0))
	var max_x: int = int(ceil(area.end.x / 105.0))
	var min_y: int = int(floor(area.position.y / 102.0))
	var max_y: int = int(ceil(area.end.y / 102.0))
	for row: int in range(min_y, max_y + 1):
		for column: int in range(min_x, max_x + 1):
			var seed_value: float = sin(float(column * 19 + row * 31))
			var world_point := Vector2(float(column) * 105.0 + seed_value * 25.0, float(row) * 102.0 + sin(_clock * 0.65 + float(column)) * 9.0)
			var screen_point: Vector2 = _to_screen(world_point)
			var span: float = (12.0 + seed_value * 5.0) * _zoom
			var wave_color := Color(0.53, 0.82, 0.84, 0.11 + (seed_value + 1.0) * 0.035)
			var wave := PackedVector2Array([screen_point + Vector2(-span, 1.0), screen_point + Vector2(-span * 0.3, -1.0), screen_point + Vector2(span * 0.3, -1.0), screen_point + Vector2(span, 1.0)])
			draw_polyline(wave, wave_color, 1.0, true)
			if (column + row) % 3 == 0:
				draw_line(screen_point + Vector2(-span * 0.5, 6.0), screen_point + Vector2(span * 0.5, 6.0), Color(0.66, 0.87, 0.87, 0.09), 1.0, true)


func _draw_coasts() -> void:
	var area: Rect2 = _world_view_rect().grow(160.0)
	for island_index: int in range(_islands.size()):
		var island: PackedVector2Array = _islands[island_index]
		if not _polygon_bounds(island).intersects(area):
			continue
		var coast: PackedVector2Array = _project_polygon(island)
		var closed: PackedVector2Array = coast.duplicate()
		closed.append(closed[0])
		draw_polyline(closed, Color(0.15, 0.48, 0.52, 0.34), 64.0 * _zoom, true)
		draw_polyline(closed, Color(0.25, 0.63, 0.61, 0.43), 32.0 * _zoom, true)
		var cliff: PackedVector2Array = _project_polygon(island, Vector2(0.0, 17.0))
		draw_colored_polygon(cliff, Color("5b6150"))
		var land_color: Color = Color("91a77c") if island_index != 2 else Color("b6a67b")
		draw_colored_polygon(coast, land_color)
		draw_polyline(closed, Color("d4c69d"), 7.0 * _zoom, true)
		draw_polyline(closed, Color(0.89, 0.92, 0.76, 0.75), 1.7, true)
		var center := Vector2.ZERO
		for world_point: Vector2 in island:
			center += world_point
		center /= float(island.size())
		var inner := PackedVector2Array()
		for world_point: Vector2 in island:
			inner.append(_to_screen(center.lerp(world_point, 0.72)))
		draw_colored_polygon(inner, Color(0.27, 0.41, 0.26, 0.13))
		for edge: int in range(island.size()):
			var first: Vector2 = island[edge]
			var second: Vector2 = island[(edge + 1) % island.size()]
			var midway: Vector2 = first.lerp(second, 0.43)
			var outward: Vector2 = (midway - center).normalized()
			var foam_a: Vector2 = _to_screen(first.lerp(second, 0.19) + outward * (20.0 + sin(_clock + float(edge)) * 3.0))
			var foam_b: Vector2 = _to_screen(first.lerp(second, 0.73) + outward * (20.0 + sin(_clock + float(edge)) * 3.0))
			draw_line(foam_a, foam_b, Color(0.81, 0.92, 0.82, 0.27), 1.0, true)


func _polygon_bounds(points: PackedVector2Array) -> Rect2:
	var bounds := Rect2(points[0], Vector2.ZERO)
	for world_point: Vector2 in points:
		bounds = bounds.expand(world_point)
	return bounds


func _build_tree_positions() -> void:
	_trees.clear()
	for island: PackedVector2Array in _islands:
		var bounds: Rect2 = _polygon_bounds(island)
		var columns: int = int(bounds.size.x / 80.0)
		var rows: int = int(bounds.size.y / 92.0)
		for row: int in range(1, rows):
			for column: int in range(1, columns):
				var variation: float = sin(float(column * 9 + row * 7))
				if variation > 0.78:
					continue
				var world_point: Vector2 = bounds.position + Vector2(float(column) * 80.0 + variation * 28.0, float(row) * 92.0 + cos(float(column * 17 + row * 3)) * 31.0)
				if not Geometry2D.is_point_in_polygon(world_point, island):
					continue
				var near_harbor: bool = false
				for port_id: String in PORT_IDS:
					var harbor_point: Vector2 = HARBORS[port_id]
					if world_point.distance_to(harbor_point) < 220.0:
						near_harbor = true
				if not near_harbor:
					_trees.append(world_point)


func _draw_trees() -> void:
	var viewport_area := Rect2(Vector2.ZERO, size).grow(50.0)
	for world_point: Vector2 in _trees:
		var screen_point: Vector2 = _to_screen(world_point)
		if not viewport_area.has_point(screen_point):
			continue
		var tree_size: float = (15.0 + sin(world_point.x * 0.13) * 3.0) * _zoom
		draw_set_transform(screen_point + Vector2(4.0, 3.0), 0.0, Vector2(1.5, 0.55))
		draw_circle(Vector2.ZERO, tree_size * 0.52, Color(0.11, 0.22, 0.17, 0.17))
		draw_set_transform(Vector2.ZERO)
		draw_line(screen_point, screen_point + Vector2(0.0, -tree_size * 0.85), Color("6b6544"), maxf(1.0, 2.0 * _zoom), true)
		var crown := PackedVector2Array([screen_point + Vector2(0.0, -tree_size * 1.65), screen_point + Vector2(-tree_size * 0.67, -tree_size * 0.35), screen_point + Vector2(tree_size * 0.67, -tree_size * 0.35)])
		draw_colored_polygon(crown, Color("486e52"))
		var highlight := PackedVector2Array([screen_point + Vector2(0.0, -tree_size * 1.65), screen_point + Vector2(-tree_size * 0.67, -tree_size * 0.35), screen_point + Vector2(-tree_size * 0.03, -tree_size * 0.50)])
		draw_colored_polygon(highlight, Color("668359"))


func _draw_harbor(port_id: String) -> void:
	var harbor_point: Vector2 = HARBORS[port_id]
	var port_point: Vector2 = PORT_POINTS[port_id]
	var screen_point: Vector2 = _to_screen(harbor_point)
	if not Rect2(Vector2.ZERO, size).grow(220.0).has_point(screen_point):
		return
	var toward_sea: Vector2 = (port_point - harbor_point).normalized()
	var along_shore: Vector2 = toward_sea.orthogonal()
	for pier_index: int in range(-1, 2):
		var root_point: Vector2 = harbor_point + along_shore * float(pier_index) * 39.0 - toward_sea * 10.0
		var end_point: Vector2 = root_point + toward_sea * (74.0 if pier_index == 0 else 57.0)
		draw_line(_to_screen(root_point + Vector2(4.0, 6.0)), _to_screen(end_point + Vector2(4.0, 6.0)), Color(0.05, 0.18, 0.21, 0.35), 13.0 * _zoom, true)
		draw_line(_to_screen(root_point), _to_screen(end_point), Color("8f7653"), 11.0 * _zoom, true)
		for plank: int in range(7):
			var plank_point: Vector2 = root_point.lerp(end_point, float(plank) / 6.0)
			draw_line(_to_screen(plank_point - along_shore * 6.0), _to_screen(plank_point + along_shore * 6.0), Color("c0aa7a"), 1.0, true)
	for building_index: int in range(8):
		var lateral: float = float(building_index % 4 - 2) * 45.0
		var depth: float = 45.0 + floorf(float(building_index) / 4.0) * 59.0
		var building_point: Vector2 = harbor_point + along_shore * lateral - toward_sea * depth
		_draw_building(_to_screen(building_point), (0.8 + float(building_index % 3) * 0.13) * _zoom, port_id == "sand")
	_draw_lighthouse(_to_screen(harbor_point - toward_sea * 30.0 + along_shore * 103.0))
	var port_screen: Vector2 = _to_screen(port_point)
	var nearby: bool = state != null and nearest_port() == port_id
	draw_arc(port_screen, 12.0, 0.0, TAU, 32, Color(0.94, 0.83, 0.57, 0.85 if nearby else 0.36), 1.2, true)
	draw_circle(port_screen, 3.0, GOLD)
	var label_point: Vector2 = port_screen + Vector2(16.0, 44.0)
	draw_string_outline(_font, label_point, String(PORT_NAMES[port_id]), HORIZONTAL_ALIGNMENT_LEFT, -1.0, 16, 5, Color("163846"))
	draw_string(_font, label_point, String(PORT_NAMES[port_id]), HORIZONTAL_ALIGNMENT_LEFT, -1.0, 16, PAPER)


func _draw_building(screen_point: Vector2, factor: float, warm: bool) -> void:
	var wall_color: Color = Color("e2cfab") if warm else Color("dedbd0")
	var roof_color: Color = Color("a47151") if warm else Color("9d6654")
	var body := PackedVector2Array([Vector2(-15.0, -2.0), Vector2(4.0, 5.0), Vector2(18.0, -3.0), Vector2(18.0, -22.0), Vector2(4.0, -14.0), Vector2(-15.0, -21.0)])
	draw_colored_polygon(_local_polygon(body, screen_point, factor), wall_color)
	var side := PackedVector2Array([Vector2(4.0, 5.0), Vector2(18.0, -3.0), Vector2(18.0, -22.0), Vector2(4.0, -14.0)])
	draw_colored_polygon(_local_polygon(side, screen_point, factor), wall_color.darkened(0.22))
	var roof := PackedVector2Array([Vector2(-18.0, -22.0), Vector2(-2.0, -34.0), Vector2(20.0, -25.0), Vector2(5.0, -13.0)])
	draw_colored_polygon(_local_polygon(roof, screen_point, factor), roof_color)
	draw_line(screen_point + Vector2(-2.0, -34.0) * factor, screen_point + Vector2(20.0, -25.0) * factor, roof_color.lightened(0.20), 1.0, true)
	draw_line(screen_point + Vector2(-7.0, -9.0) * factor, screen_point + Vector2(-7.0, -16.0) * factor, Color("62685c"), maxf(1.0, 3.0 * factor))
	draw_line(screen_point + Vector2(10.0, -3.0) * factor, screen_point + Vector2(10.0, -12.0) * factor, Color("62685c"), maxf(1.0, 3.0 * factor))


func _draw_lighthouse(screen_point: Vector2) -> void:
	var tower := PackedVector2Array([Vector2(-7.0, 0.0), Vector2(7.0, 0.0), Vector2(5.0, -42.0), Vector2(-5.0, -42.0)])
	draw_colored_polygon(_local_polygon(tower, screen_point, _zoom), Color("e8e0c7"))
	draw_line(screen_point + Vector2(-5.0, -29.0) * _zoom, screen_point + Vector2(5.0, -29.0) * _zoom, Color("ad6951"), 4.0 * _zoom)
	draw_circle(screen_point + Vector2(0.0, -43.0) * _zoom, 7.0 * _zoom, Color("ad6951"))
	draw_circle(screen_point + Vector2(0.0, -43.0) * _zoom, 2.5 * _zoom, Color("ffedb5"))


func _local_polygon(points: PackedVector2Array, origin: Vector2, factor: float, angle: float = 0.0) -> PackedVector2Array:
	var result := PackedVector2Array()
	for local_point: Vector2 in points:
		result.append(origin + (local_point * factor).rotated(angle))
	return result


func _draw_background_ships() -> void:
	var area := Rect2(Vector2.ZERO, size).grow(80.0)
	for vessel: Vector3 in _decorative_ships:
		var world_point := Vector2(vessel.x, vessel.y) + Vector2.from_angle(vessel.z) * sin(_clock * 0.035) * 110.0
		var screen_point: Vector2 = _to_screen(world_point)
		if area.has_point(screen_point):
			_draw_ship(screen_point, vessel.z, 0.44, false)


func _draw_wake() -> void:
	if _wake.size() < 2:
		return
	for index: int in range(1, _wake.size()):
		var fraction: float = float(index) / float(_wake.size())
		var first: Vector2 = _to_screen(_wake[index - 1])
		var second: Vector2 = _to_screen(_wake[index])
		draw_line(first, second, Color(0.75, 0.91, 0.86, fraction * 0.18), 5.0 + (1.0 - fraction) * 16.0, true)
		draw_line(first, second, Color(0.85, 0.95, 0.89, fraction * 0.21), 1.2, true)


func _draw_ship(screen_point: Vector2, ship_heading: float, factor: float, is_player: bool) -> void:
	var angle: float = Vector2(cos(ship_heading), sin(ship_heading) * PROJECTION_Y).angle()
	var bob: Vector2 = Vector2(0.0, sin(_clock * 2.1 + screen_point.x * 0.01) * 0.9 * factor)
	var center: Vector2 = screen_point + bob
	var hull := PackedVector2Array([Vector2(-32.0, -8.0), Vector2(-20.0, -14.0), Vector2(17.0, -13.0), Vector2(37.0, 0.0), Vector2(17.0, 13.0), Vector2(-20.0, 14.0), Vector2(-32.0, 8.0)])
	draw_colored_polygon(_local_polygon(hull, center + Vector2(3.0, 8.0) * factor, factor * 1.10, angle), Color(0.04, 0.16, 0.20, 0.32))
	draw_colored_polygon(_local_polygon(hull, center + Vector2(0.0, 4.0) * factor, factor, angle), Color("453d32"))
	draw_colored_polygon(_local_polygon(hull, center, factor, angle), Color("967351") if is_player else Color("8b795e"))
	var deck := PackedVector2Array([Vector2(-25.0, -7.0), Vector2(-17.0, -10.0), Vector2(14.0, -9.0), Vector2(28.0, 0.0), Vector2(14.0, 9.0), Vector2(-17.0, 10.0), Vector2(-25.0, 7.0)])
	draw_colored_polygon(_local_polygon(deck, center, factor, angle), Color("bc9c6b"))
	for plank: int in range(-4, 5):
		var local_x: float = float(plank) * 5.0
		draw_line(center + Vector2(local_x, -8.0).rotated(angle) * factor, center + Vector2(local_x, 8.0).rotated(angle) * factor, Color(0.37, 0.29, 0.19, 0.38), maxf(0.6, factor), true)
	var direction: Vector2 = Vector2.from_angle(angle)
	var bow: Vector2 = center + direction * 36.0 * factor
	var stern: Vector2 = center - direction * 29.0 * factor
	var furled: bool = is_player and state != null and int(state.get("sail_level")) == 0
	for mast_index: int in range(2):
		var mast_base: Vector2 = center + direction * (-10.0 if mast_index == 0 else 14.0) * factor
		var height: float = (39.0 if mast_index == 0 else 30.0) * factor
		var mast_top: Vector2 = mast_base + Vector2(0.0, -height)
		draw_line(stern, mast_top, Color(0.30, 0.29, 0.22, 0.72), maxf(0.7, factor * 0.9), true)
		draw_line(bow, mast_top, Color(0.30, 0.29, 0.22, 0.72), maxf(0.7, factor * 0.9), true)
		draw_line(mast_base, mast_top, Color("d0bc90"), maxf(1.0, 2.0 * factor), true)
		var spread: float = (6.0 if furled else 22.0) * factor
		if is_player and not furled and int(state.get("sail_level")) == 1:
			spread *= 0.72
		var sail := PackedVector2Array([mast_top + Vector2(1.0, 4.0) * factor, mast_top + Vector2(spread, 8.0 * factor), mast_base + Vector2(spread * 0.8, -8.0 * factor), mast_base + Vector2(1.0, -9.0) * factor])
		draw_colored_polygon(sail, Color("f2ecd7"))
		draw_line(sail[1], sail[2], Color("c2c7b5"), maxf(0.7, factor), true)
		draw_line(sail[0].lerp(sail[3], 0.5), sail[1].lerp(sail[2], 0.5), Color(0.64, 0.66, 0.57, 0.45), maxf(0.7, factor), true)
		if mast_index == 0:
			var flag := PackedVector2Array([mast_top, mast_top + Vector2(15.0, 3.0 + sin(_clock * 4.0)) * factor, mast_top + Vector2(0.0, 7.0) * factor])
			draw_colored_polygon(flag, Color("cf815b") if is_player else Color("829bae"))
	if is_player:
		draw_arc(screen_point + Vector2(0.0, 3.0), 43.0, 0.25, PI - 0.25, 28, Color(0.93, 0.84, 0.59, 0.19), 1.1, true)


func _draw_navigation_target() -> void:
	if state == null:
		return
	var automatic: String = String(state.get("autopilot_target"))
	if not PORT_POINTS.has(automatic) and not _has_free_target:
		return
	var target_point: Vector2 = _free_target
	if PORT_POINTS.has(automatic):
		target_point = PORT_POINTS[automatic]
	var screen_point: Vector2 = _to_screen(target_point)
	var pulse: float = 11.0 + sin(_clock * 3.0) * 2.0
	if Rect2(Vector2.ZERO, size).grow(30.0).has_point(screen_point):
		draw_arc(screen_point, pulse, 0.0, TAU, 32, Color(0.91, 0.80, 0.52, 0.65), 1.3, true)
		draw_line(screen_point - Vector2(5.0, 0.0), screen_point + Vector2(5.0, 0.0), GOLD, 1.0, true)
		draw_line(screen_point - Vector2(0.0, 5.0), screen_point + Vector2(0.0, 5.0), GOLD, 1.0, true)
	else:
		var origin: Vector2 = _to_screen(_ship_position())
		var direction: Vector2 = (screen_point - origin).normalized()
		var indicator: Vector2 = origin + direction * minf(size.x, size.y) * 0.29
		var arrow := PackedVector2Array([Vector2(7.0, 0.0), Vector2(-4.0, -4.0), Vector2(-4.0, 4.0)])
		draw_colored_polygon(_local_polygon(arrow, indicator, 1.0, direction.angle()), Color(0.92, 0.81, 0.53, 0.70))


func _draw_sea_mist() -> void:
	for band: int in range(8):
		var alpha: float = 0.045 * (1.0 - float(band) / 8.0)
		draw_rect(Rect2(0.0, float(band) * size.y * 0.027, size.x, size.y * 0.027 + 1.0), Color(0.75, 0.84, 0.77, alpha))


func _draw_compass() -> void:
	var map_panel: Rect2 = _minimap_rect()
	var wind_panel := Rect2(Vector2(map_panel.position.x, map_panel.end.y + 10.0), Vector2(map_panel.size.x, 78.0))
	draw_style_box(_panel_style(), wind_panel)
	var center: Vector2 = wind_panel.position + Vector2(37.0, 45.0)
	draw_circle(center, 28.0, Color(0.06, 0.16, 0.20, 0.70))
	draw_arc(center, 26.0, 0.0, TAU, 48, Color(0.78, 0.68, 0.45, 0.70), 1.0, true)
	for tick: int in range(8):
		var direction: Vector2 = Vector2.from_angle(float(tick) * TAU / 8.0)
		draw_line(center + direction * 20.0, center + direction * 24.0, Color(0.80, 0.77, 0.61, 0.65), 1.0, true)
	var needle := PackedVector2Array([center + Vector2(0.0, -16.0), center + Vector2(-4.0, 8.0), center, center + Vector2(4.0, 8.0)])
	draw_colored_polygon(needle, Color("d19d67"))
	draw_string(_font, center + Vector2(-4.0, -33.0), "N", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 11, PAPER)
	draw_string(_font, wind_panel.position + Vector2(78.0, 33.0), "西南风  ↗", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 13, PAPER)
	if state != null:
		var assistance: float = _wind_factor(float(state.get("heading")))
		var wind_status: String = "顺风" if assistance >= 1.02 else ("侧风" if assistance >= 0.85 else "迎风")
		draw_string(_font, wind_panel.position + Vector2(78.0, 55.0), wind_status, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 12, Color("b5c9c6"))


func _minimap_rect() -> Rect2:
	return Rect2(maxf(12.0, size.x - 196.0), 17.0, 180.0, 140.0)


func _minimap_inner() -> Rect2:
	var outer: Rect2 = _minimap_rect()
	return Rect2(outer.position + Vector2(10.0, 25.0), Vector2(160.0, 102.0))


func _minimap_point(world_point: Vector2) -> Vector2:
	var inner: Rect2 = _minimap_inner()
	var normalized: Vector2 = (world_point - WORLD_MIN) / (WORLD_MAX - WORLD_MIN)
	return inner.position + normalized * inner.size


func _draw_minimap() -> void:
	var outer: Rect2 = _minimap_rect()
	var inner: Rect2 = _minimap_inner()
	draw_style_box(_panel_style(), outer)
	draw_string(_font, outer.position + Vector2(11.0, 17.0), "青屿海图", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 11, PAPER)
	draw_string(_font, outer.position + Vector2(118.0, 17.0), "点选港口", HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, Color("a6b9b4"))
	for island: PackedVector2Array in _islands:
		var points := PackedVector2Array()
		for world_point: Vector2 in island:
			points.append(_minimap_point(world_point))
		draw_colored_polygon(points, Color("73866c"))
	var area: Rect2 = _world_view_rect()
	var view_box := Rect2(_minimap_point(area.position), _minimap_point(area.end) - _minimap_point(area.position))
	view_box = view_box.intersection(inner)
	if view_box.has_area():
		draw_rect(view_box, Color(0.76, 0.82, 0.69, 0.22), false, 1.0)
	for port_id: String in PORT_IDS:
		var world_point: Vector2 = PORT_POINTS[port_id]
		var map_point: Vector2 = _minimap_point(world_point)
		draw_circle(map_point, 3.0, GOLD)
		var label: String = String(PORT_NAMES[port_id])
		var label_point: Vector2 = map_point + Vector2(5.0, 4.0)
		if port_id == "sand":
			label_point = map_point + Vector2(-39.0, 15.0)
		draw_string_outline(_font, label_point, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, 3, Color("122e37"))
		draw_string(_font, label_point, label, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 10, PAPER)
	if state != null:
		var ship_point: Vector2 = _minimap_point(_ship_position())
		draw_circle(ship_point, 3.0, Color("f2f0d5"))
		draw_line(ship_point, ship_point + Vector2.from_angle(float(state.get("heading"))) * 8.0, Color("f2f0d5"), 1.5, true)


func _panel_style() -> StyleBoxFlat:
	var panel := StyleBoxFlat.new()
	panel.bg_color = Color(0.055, 0.14, 0.17, 0.90)
	panel.border_color = Color(0.69, 0.60, 0.41, 0.65)
	panel.set_border_width_all(1)
	panel.set_corner_radius_all(4)
	return panel


func _draw_notice() -> void:
	if _notice_remaining <= 0.0 or _notice.is_empty():
		return
	var text_size: Vector2 = _font.get_string_size(_notice, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 13)
	var box := Rect2(Vector2((size.x - text_size.x - 32.0) * 0.5, size.y - 112.0), Vector2(text_size.x + 32.0, 33.0))
	draw_style_box(_panel_style(), box)
	draw_string(_font, box.position + Vector2(16.0, 22.0), _notice, HORIZONTAL_ALIGNMENT_LEFT, -1.0, 13, PAPER)
