extends SceneTree

const GameState = preload("res://scripts/v2/game_state.gd")
const SeaView = preload("res://scripts/v2/sea_view.gd")

var failures: Array[String] = []


func _initialize() -> void:
	_run.call_deferred()


func _check(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
		push_error(message)


func _run() -> void:
	var sea: Control = SeaView.new()
	sea.size = Vector2(1000.0, 610.0)
	root.add_child(sea)
	sea.set_process(false)
	await process_frame
	var world: RefCounted = GameState.new()
	var routes_checked: int = 0
	for origin: String in ["dawn", "pine", "sand"]:
		for destination: String in ["dawn", "pine", "sand"]:
			if origin == destination:
				continue
			for start_heading: float in [-PI, -PI / 2.0, 0.0, PI / 2.0]:
				world.set("at_sea", true)
				world.set("current_port", "")
				world.set("ship_position", GameState.PORTS[origin]["position"])
				world.set("heading", start_heading)
				world.set("speed", 0.0)
				sea.call("bind_state", world)
				sea.call("set_destination", destination)
				var reached: bool = false
				for step_index: int in range(9000):
					sea.call("_simulate", 1.0 / 60.0)
					if float(world.get("speed")) < 0.1 and String(world.get("autopilot_target")).is_empty():
						reached = sea.call("nearest_port") == destination
						break
				_check(reached, "Autopilot failed: %s -> %s heading %.2f at %s" % [origin, destination, start_heading, world.get("ship_position")])
				_check(bool(world.get("at_sea")), "Autopilot must wait offshore for an explicit dock action")
				routes_checked += 1
	world.set("ship_position", Vector2(890.0, 2480.0))
	world.set("heading", PI)
	world.set("sail_level", 2)
	world.set("speed", 90.0)
	world.set("autopilot_target", "")
	var hull_before: int = int(world.get("hull"))
	for step_index: int in range(120):
		sea.call("_simulate", 1.0 / 60.0)
	_check(not bool(sea.call("_touches_land", world.get("ship_position"))), "A ship must stop before entering land")
	_check(int(world.get("hull")) == hull_before, "Touching the coast must not damage the hull")
	_check(int(world.get("sail_level")) == 0, "Touching the coast must lower sails")
	sea.set("sailing_controls_enabled", false)
	var pause_point: Vector2 = world.get("ship_position")
	var day_elapsed: float = float(world.get("day_elapsed"))
	sea.call("_process", 0.05)
	_check(world.get("ship_position") == pause_point, "A modal must pause movement")
	_check(float(world.get("day_elapsed")) == day_elapsed, "A modal must pause voyage time")
	sea.set("sailing_controls_enabled", true)
	world.set("ship_position", Vector2(1600.0, 1700.0))
	world.set("hull", 0)
	world.set("speed", 50.0)
	world.set("sail_level", 2)
	world.set("autopilot_target", "pine")
	sea.call("_simulate", 1.0 / 60.0)
	var disabled_point: Vector2 = world.get("ship_position")
	_check(float(world.get("speed")) == 0.0 and int(world.get("sail_level")) == 0, "Zero hull must stop propulsion")
	_check(String(world.get("autopilot_target")).is_empty(), "Zero hull must cancel autopilot")
	var raise_sail := InputEventKey.new()
	raise_sail.pressed = true
	raise_sail.physical_keycode = KEY_W
	sea.call("_unhandled_key_input", raise_sail)
	_check(int(world.get("sail_level")) == 0, "W must not restart a disabled ship")
	sea.call("set_destination", "sand")
	sea.call("_simulate", 1.0 / 60.0)
	_check(float(world.get("speed")) == 0.0 and String(world.get("autopilot_target")).is_empty(), "Autopilot must not restart a disabled ship")
	_check(world.get("ship_position") == disabled_point, "A disabled ship must not move")
	world.set("hull", hull_before)
	sea.call("zoom_in")
	sea.call("zoom_out")
	sea.queue_redraw()
	await process_frame
	if failures.is_empty():
		print("SEA_V2_CHECK_OK: %d routes/headings, safe coast stop, modal pause, zero-hull lock, render and zoom" % routes_checked)
	else:
		print("SEA_V2_CHECK_FAILED: %d failures" % failures.size())
	sea.queue_free()
	quit(0 if failures.is_empty() else 1)
