extends SceneTree

const VoyageScene = preload("res://scenes/voyage.tscn")


func _initialize() -> void:
	_run.call_deferred()


func _run() -> void:
	if DisplayServer.get_name() == "headless":
		push_error("Preview capture requires a rendering window; omit --headless.")
		quit(1)
		return
	root.size = Vector2i(1280, 880)
	root.content_scale_size = Vector2i(1280, 880)
	var main = VoyageScene.instantiate()
	main.persist_enabled = false
	root.add_child(main)
	main.set_process(false)
	main.sea_view.set_process(false)
	DirAccess.make_dir_recursive_absolute("res://docs/previews")
	await _capture("port")
	main.open_facility("market")
	await _capture("market")
	main.open_facility("ship")
	await _capture("ship")
	main.close_facility()
	main.state.depart()
	main.state.ship_position = Vector2(1120, 2470)
	main.state.heading = -0.85
	main.state.sail_level = 2
	main.state.speed = 90
	main.sea_view.bind_state(main.state)
	main._refresh_scene()
	await _capture("sailing")
	main.queue_free()
	await process_frame
	print("PREVIEWS_OK: docs/previews/{port,market,ship,sailing}.png")
	quit()


func _capture(name: String) -> void:
	for frame in range(4):
		await process_frame
	await RenderingServer.frame_post_draw
	var error := root.get_texture().get_image().save_png("res://docs/previews/%s.png" % name)
	if error != OK:
		push_error("Could not write preview: " + name)
		quit(1)
