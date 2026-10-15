extends Control

var ship_title: String = "逐风号"
var large_hull: bool = false
var _font := SystemFont.new()


func _ready() -> void:
	_font.font_names = PackedStringArray(["Heiti SC", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"])
	resized.connect(queue_redraw)


func _draw() -> void:
	var center := size * Vector2(0.5, 0.43)
	var scale_factor: float = minf(size.x / 410.0, size.y / 280.0)
	draw_set_transform(center, 0.0, Vector2.ONE * scale_factor)
	for row in range(6):
		var y: float = 48.0 + row * 13.0
		draw_line(Vector2(-170 + row * 4, y), Vector2(178 - row * 4, y), Color(0.25, 0.47, 0.50, 0.22), 1.0)
	draw_colored_polygon(PackedVector2Array([Vector2(-149, 21), Vector2(-132, 63), Vector2(-89, 83), Vector2(101, 78), Vector2(151, 51), Vector2(171, 16), Vector2(97, 36), Vector2(-63, 36)]), Color("553b2b"))
	draw_colored_polygon(PackedVector2Array([Vector2(-149, 21), Vector2(-135, 44), Vector2(-94, 64), Vector2(100, 61), Vector2(151, 39), Vector2(171, 16), Vector2(97, 30), Vector2(-63, 30)]), Color("aa7849"))
	for line in range(3):
		draw_line(Vector2(-125, 44 + line * 8), Vector2(121, 43 + line * 6), Color("725037"), 1.5)
	draw_line(Vector2(-154, 18), Vector2(169, 15), Color("e5bb79"), 4.0)
	for mast_x in [-54.0, 57.0]:
		draw_line(Vector2(mast_x, 31), Vector2(mast_x, -116), Color("d4a66b"), 4.0)
		draw_line(Vector2(mast_x - 44, -88), Vector2(mast_x + 42, -88), Color("b58c5b"), 3.0)
		draw_line(Vector2(mast_x, -108), Vector2(mast_x - 72, 26), Color(0.85, 0.76, 0.55, 0.55), 1.0)
		draw_line(Vector2(mast_x, -108), Vector2(mast_x + 68, 24), Color(0.85, 0.76, 0.55, 0.55), 1.0)
		draw_colored_polygon(PackedVector2Array([Vector2(mast_x - 39, -88), Vector2(mast_x + 36, -88), Vector2(mast_x + 44, -45), Vector2(mast_x + 28, -25), Vector2(mast_x - 42, -33), Vector2(mast_x - 31, -55)]), Color("eee2bd"))
		draw_line(Vector2(mast_x - 25, -84), Vector2(mast_x - 24, -36), Color("c8b78e"), 1.0)
		draw_line(Vector2(mast_x + 20, -84), Vector2(mast_x + 26, -33), Color("c8b78e"), 1.0)
		draw_colored_polygon(PackedVector2Array([Vector2(mast_x, -116), Vector2(mast_x + 29, -111), Vector2(mast_x + 18, -103), Vector2(mast_x, -107)]), Color("aa6550"))
	if large_hull:
		draw_rect(Rect2(-142, -4, 39, 25), Color("bf9b68"))
		draw_rect(Rect2(-135, 1, 7, 10), Color("274853"))
		draw_rect(Rect2(-120, 1, 7, 10), Color("274853"))
	draw_set_transform(Vector2.ZERO)
	var labels: Array[String] = ["船员舱", "货物仓", "补给仓"]
	var width: float = (size.x - 32.0) / 3.0
	for index in range(3):
		var rectangle := Rect2(12 + index * width, size.y - 41, width - 7, 30)
		draw_rect(rectangle, Color("16383f"))
		draw_rect(rectangle, Color("52716a"), false, 1.0)
		var text_width: float = _font.get_string_size(labels[index], HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
		draw_string(_font, Vector2(rectangle.get_center().x - text_width / 2.0, rectangle.position.y + 20), labels[index], HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color("dcdac3"))
