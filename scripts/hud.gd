extends CanvasLayer
## Status bar, weapon, crosshair, messages, damage flash and end screens.
## Everything is built in code so the layout lives in one place; the logical
## screen is 320x240 (scaled 2x to the PocketTerm's 640x480).

const SCREEN := Vector2(640, 480)
const BAR_H := 64
const FONT_SMALL := 16
const FONT_BIG := 32
const MESSAGE_TIME := 2.6

const WEAPON_IDLE: Texture2D = preload("res://assets/weapon_0.png")
const WEAPON_FIRE: Texture2D = preload("res://assets/weapon_1.png")
const CROSSHAIR: Texture2D = preload("res://assets/crosshair.png")
## The status bar is a painted texture now: the accent line, the HEALTH / AMMO /
## MUTANTS / KEY captions and the H11 // DECK 1 nameplate are all in the PNG.
## Code draws only the numbers and the key icon.
const BAR_TEX: Texture2D = preload("res://assets/hud_bar.png")
const KEYCARD: Texture2D = preload("res://assets/hud_keycard.png")

var _weapon: TextureRect
var _flash: ColorRect
var _message: Label
var _fps: Label
var _health: Label
var _ammo: Label
var _kills: Label
var _key_icon: TextureRect
var _overlay: ColorRect
var _overlay_title: Label
var _overlay_sub: Label

var _message_timer := 0.0
var _weapon_timer := 0.0
var _flash_alpha := 0.0
var _time := 0.0
var _show_fps := false


func _ready() -> void:
	layer = 10
	_build()
	Game.stats_changed.connect(_refresh_stats)
	Game.message.connect(_show_message)
	Game.player_damaged.connect(_on_damaged)
	Game.level_finished.connect(_on_finished)
	Game.player_died.connect(_on_died)
	if Game.player != null:
		Game.player.fired.connect(_on_fired)
	_refresh_stats()


func _build() -> void:
	# damage / low-health vignette
	_flash = ColorRect.new()
	_flash.color = Color(0.7, 0.0, 0.0, 0.0)
	_flash.size = SCREEN
	_flash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_flash)

	# weapon, 192x144 drawn 1:1, sitting on top of the status bar
	_weapon = TextureRect.new()
	_weapon.texture = WEAPON_IDLE
	_weapon.position = Vector2(260, SCREEN.y - BAR_H - 144)
	_weapon.size = Vector2(192, 144)
	add_child(_weapon)

	var cross := TextureRect.new()
	cross.texture = CROSSHAIR
	cross.position = Vector2(312, 232)
	cross.modulate = Color(1, 1, 1, 0.7)
	add_child(cross)

	# status bar: one painted texture, never scaled
	var bar := TextureRect.new()
	bar.texture = BAR_TEX
	bar.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	bar.position = Vector2(0, SCREEN.y - BAR_H)
	bar.size = Vector2(SCREEN.x, BAR_H)
	add_child(bar)

	# only the numbers, into the windows painted in the bar
	_health = _window(Vector2(14, 442), Vector2(128, 26), "100", Color(0.9, 0.2, 0.2))
	_ammo = _window(Vector2(162, 442), Vector2(112, 26), "24", Color(0.85, 0.6, 0.2))
	_kills = _window(Vector2(294, 442), Vector2(128, 26), "0/0", Color(0.75, 0.75, 0.78))
	# the socket painted into hud_bar.png is 36x36 at (456, 436); the icon is
	# 32x32 and sits two pixels inside it. Nothing is scaled.
	_key_icon = TextureRect.new()
	_key_icon.texture = KEYCARD
	_key_icon.position = Vector2(458, 438)
	_key_icon.size = Vector2(32, 32)
	_key_icon.visible = false
	add_child(_key_icon)

	# message line and fps
	_message = _label(Vector2(0, 12), "", Color(0.9, 0.85, 0.7), FONT_SMALL + 2)
	_message.size = Vector2(SCREEN.x, 24)
	_message.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_fps = _label(Vector2(SCREEN.x - 80, 8), "", Color(0.5, 0.9, 0.5))
	_fps.visible = false

	# end-of-level / death overlay
	_overlay = ColorRect.new()
	_overlay.color = Color(0, 0, 0, 0.65)
	_overlay.size = SCREEN
	_overlay.visible = false
	add_child(_overlay)
	_overlay_title = _label(Vector2(0, 184), "", Color(0.9, 0.2, 0.2), FONT_BIG)
	_overlay_title.size = Vector2(SCREEN.x, 48)
	_overlay_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_overlay_title.visible = false
	_overlay_sub = _label(Vector2(0, 244), "", Color(0.8, 0.8, 0.8), FONT_SMALL + 2)
	_overlay_sub.size = Vector2(SCREEN.x, 24)
	_overlay_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_overlay_sub.visible = false


## A number sitting in one of the windows painted into hud_bar.png: centred both
## ways inside the given rect, so the digits never drift as the value changes.
func _window(pos: Vector2, size: Vector2, text: String, color: Color) -> Label:
	var l := _label(pos, text, color, FONT_SMALL + 4)
	l.size = size
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l


func _label(pos: Vector2, text: String, color: Color, font_size: int = FONT_SMALL) -> Label:
	var l := Label.new()
	l.position = pos
	l.text = text
	l.add_theme_font_size_override("font_size", font_size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	add_child(l)
	return l


func _process(delta: float) -> void:
	_time += delta
	if _message_timer > 0.0:
		_message_timer -= delta
		if _message_timer <= 0.0:
			_message.text = ""
	if _weapon_timer > 0.0:
		_weapon_timer -= delta
		if _weapon_timer <= 0.0:
			_weapon.texture = WEAPON_IDLE
	# damage flash decays; low health keeps a slow red pulse going
	_flash_alpha = maxf(0.0, _flash_alpha - delta * 1.8)
	var pulse := 0.0
	if Game.health <= 30 and not Game.dead:
		pulse = 0.10 + 0.08 * sin(_time * 5.0)
	_flash.color.a = maxf(_flash_alpha, pulse)
	if _show_fps:
		_fps.text = "%d fps" % Engine.get_frames_per_second()
	if Input.is_action_just_pressed("toggle_fps"):
		_show_fps = not _show_fps
		_fps.visible = _show_fps


func _refresh_stats() -> void:
	_health.text = str(Game.health)
	_ammo.text = str(Game.ammo)
	_kills.text = "%d/%d" % [Game.kills, Game.enemies_total]
	_key_icon.visible = Game.has_keycard


func _show_message(text: String) -> void:
	_message.text = text
	_message_timer = MESSAGE_TIME


func _on_fired() -> void:
	_weapon.texture = WEAPON_FIRE
	_weapon_timer = 0.09


func _on_damaged() -> void:
	_flash_alpha = 0.4


func _on_finished() -> void:
	_show_overlay("DECK 1 CLEARED", "MUTANTS %d/%d   -   PRESS R TO RESTART" % [Game.kills, Game.enemies_total])


func _on_died() -> void:
	_flash_alpha = 0.9
	_show_overlay("YOU DIED", "THE ALGORITHM CONTINUES   -   PRESS R TO RESTART")


func _show_overlay(title: String, sub: String) -> void:
	_overlay.visible = true
	_overlay_title.text = title
	_overlay_title.visible = true
	_overlay_sub.text = sub
	_overlay_sub.visible = true
