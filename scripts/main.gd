extends Node3D
## Scene root: sets up the dark environment, flickering emergency lights,
## ambient sound and the opening message.

@onready var level: Level = $Level

var _flicker_timer := 0.0
var _lights_on := true


func _ready() -> void:
	_setup_environment()
	Game.start_ambient()
	var drive := Node.new()
	drive.set_script(load("res://scripts/debug_drive.gd"))
	add_child(drive)
	Game.say("H11 // DECK 1 - CONTAINMENT BREACH")
	await get_tree().create_timer(3.0).timeout
	if not Game.dead and not Game.finished:
		Game.say("FIND THE RED KEYCARD. REACH THE EXIT.")


func _setup_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color.BLACK
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color.WHITE
	# Distance darkness is done in shaders/depth_shade.gdshader (see Level.FOG_DENSITY),
	# because Environment fog is not reliable on the Compatibility renderer.
	env.fog_enabled = false
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)


func _process(delta: float) -> void:
	# Emergency light strips flicker at random, all together.
	if level.light_material == null:
		return
	_flicker_timer -= delta
	if _flicker_timer <= 0.0:
		if _lights_on:
			_flicker_timer = randf_range(0.04, 0.16)
		else:
			_flicker_timer = randf_range(0.6, 3.5)
		_lights_on = not _lights_on
		var v := 1.0 if _lights_on else 0.45
		level.light_material.set_shader_parameter("tint", Color(v, v, v))
