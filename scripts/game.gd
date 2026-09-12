extends Node
## Global game state, input map, device profile and one-shot sound playback.
## Registered as the "Game" autoload in project.godot.

signal stats_changed
signal message(text: String)
signal player_damaged
signal level_finished
signal player_died

const MAX_HEALTH := 100
const MAX_AMMO := 99

## The control scheme lives in data, not here. Two profiles - the development
## keyboard and the PocketTerm's own buttons - because they share physical keycodes
## and cannot both be live (see ARCHITECTURE.md section Input).
const INPUT_TABLE := "res://data/input.json"

const SFX := {
	"laser": "res://assets/sfx/laser.wav",
	"hit": "res://assets/sfx/hit.wav",
	"explode": "res://assets/sfx/explode.wav",
	"pickup": "res://assets/sfx/pickup.wav",
	"door": "res://assets/sfx/door.wav",
	"hurt": "res://assets/sfx/hurt.wav",
	"locked": "res://assets/sfx/locked.wav",
	"drone_shot": "res://assets/sfx/drone_shot.wav",
	"level_done": "res://assets/sfx/level_done.wav",
	"growl": "res://assets/sfx/growl.wav",
}

var health: int = MAX_HEALTH
var ammo: int = 24
var has_keycard: bool = false
var kills: int = 0
var enemies_total: int = 0
var finished: bool = false
var dead: bool = false
var player: Node3D = null
var on_device: bool = false
## Which profile _setup_input() applied. Read by the acceptance suite.
var input_profile: String = ""

var _streams := {}
var _players: Array[AudioStreamPlayer] = []
var _next_player := 0
var _ambient: AudioStreamPlayer


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	# Device profile: the PocketTerm build carries the custom "pocketterm" feature tag
	# (see export_presets.cfg); any Linux ARM machine is treated the same way.
	# Resolved BEFORE _setup_input(), which picks its profile from it - the other order
	# hands the device the desktop scheme, silently, and only hands find it.
	on_device = OS.has_feature("pocketterm") or (OS.get_name() == "Linux" and (OS.has_feature("arm64") or OS.has_feature("arm")))
	_setup_input()
	_setup_audio()
	if on_device:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	Input.mouse_mode = Input.MOUSE_MODE_HIDDEN
	Engine.max_fps = 60


func reset() -> void:
	health = MAX_HEALTH
	ammo = 24
	has_keycard = false
	kills = 0
	enemies_total = 0
	finished = false
	dead = false
	player = null


func _setup_input() -> void:
	var text := FileAccess.get_file_as_string(INPUT_TABLE)
	if text == "":
		_input_failed("table not found at " + INPUT_TABLE)
		return
	var table: Variant = JSON.parse_string(text)
	if typeof(table) != TYPE_DICTIONARY:
		_input_failed("table is not a JSON object")
		return
	var name := "device" if on_device else "desktop"
	var problem := _validate_input(table, name)
	if problem != "":
		_input_failed(problem)
		return
	var profile: Dictionary = table["profiles"][name]["bind"]
	for action: String in profile:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key_name: String in profile[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = OS.find_keycode_from_string(key_name)
			InputMap.action_add_event(action, ev)
	input_profile = name


## Checks the table before a single action is registered. Not asserts: those are
## stripped from release builds, and a half-applied InputMap on the device is the
## kind of failure that shows up as "the buttons do nothing" with no clue why.
## Returns "" when the profile is sound, or the first problem, named.
func _validate_input(table: Dictionary, profile_name: String) -> String:
	var actions: Variant = table.get("actions")
	if typeof(actions) != TYPE_DICTIONARY or actions.is_empty():
		return "table has no 'actions' block"
	var profiles: Variant = table.get("profiles")
	if typeof(profiles) != TYPE_DICTIONARY or not profiles.has(profile_name):
		return "table has no '%s' profile" % profile_name
	var bind: Variant = profiles[profile_name].get("bind")
	if typeof(bind) != TYPE_DICTIONARY or bind.is_empty():
		return "profile '%s' binds nothing" % profile_name

	var seen := {}  # keycode -> the action that claimed it
	for action: String in bind:
		if not actions.has(action):
			return "profile '%s' binds unknown action '%s'" % [profile_name, action]
		var keys: Variant = bind[action]
		if typeof(keys) != TYPE_ARRAY or keys.is_empty():
			return "action '%s' in profile '%s' is bound to nothing" % [action, profile_name]
		for key_name: String in keys:
			var code := OS.find_keycode_from_string(key_name)
			if code == KEY_NONE:
				return "action '%s' binds unknown key '%s'" % [action, key_name]
			# A key on two actions is a conflict, not last-writer-wins: both would
			# fire, and which one the player meant is unknowable.
			if seen.has(code):
				return "key '%s' is bound to both '%s' and '%s' in profile '%s'" % [
					key_name, seen[code], action, profile_name]
			seen[code] = action
	for action: String in actions:
		if not bind.has(action):
			return "action '%s' is declared but profile '%s' never binds it" % [action, profile_name]
	return ""


func _input_failed(why: String) -> void:
	push_error("Invalid input table: " + why)
	# The message needs a listener, and nothing is connected this early - so defer it
	# to the frame the HUD exists in.
	call_deferred("say", "BAD INPUT TABLE: " + why.to_upper())


func _setup_audio() -> void:
	for id in SFX:
		_streams[id] = load(SFX[id])
	for i in 6:
		var p := AudioStreamPlayer.new()
		p.bus = "Master"
		add_child(p)
		_players.append(p)
	_ambient = AudioStreamPlayer.new()
	# ambient.wav is imported with edit/loop_mode=1 (forward loop), see ambient.wav.import
	_ambient.stream = load("res://assets/sfx/ambient.wav")
	_ambient.volume_db = -14.0
	add_child(_ambient)


func play(id: String, volume_db: float = 0.0) -> void:
	if not _streams.has(id):
		return
	var p := _players[_next_player]
	_next_player = (_next_player + 1) % _players.size()
	p.stream = _streams[id]
	p.volume_db = volume_db
	p.play()


func start_ambient() -> void:
	if not _ambient.playing:
		_ambient.play()


func say(text: String) -> void:
	message.emit(text)


func damage(amount: int) -> void:
	if dead or finished:
		return
	health = max(0, health - amount)
	play("hurt")
	stats_changed.emit()
	player_damaged.emit()
	if health == 0:
		dead = true
		player_died.emit()


func add_health(amount: int) -> bool:
	if health >= MAX_HEALTH:
		return false
	health = min(MAX_HEALTH, health + amount)
	stats_changed.emit()
	return true


func add_ammo(amount: int) -> bool:
	if ammo >= MAX_AMMO:
		return false
	ammo = min(MAX_AMMO, ammo + amount)
	stats_changed.emit()
	return true


func use_ammo() -> bool:
	if ammo <= 0:
		return false
	ammo -= 1
	stats_changed.emit()
	return true


func take_keycard() -> void:
	has_keycard = true
	stats_changed.emit()


func register_kill() -> void:
	kills += 1
	stats_changed.emit()


func finish_level() -> void:
	if finished or dead:
		return
	finished = true
	play("level_done")
	level_finished.emit()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("quit"):
		get_tree().quit()
	elif event.is_action_pressed("restart") and (dead or finished):
		reset()
		get_tree().reload_current_scene()
