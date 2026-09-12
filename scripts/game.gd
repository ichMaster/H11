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

## Keyboard layout. Physical keycodes, so it works with any keyboard language.
## First list entry is the "main" key, the rest are alternatives.
const KEYMAP := {
	"move_forward": [KEY_W, KEY_UP],
	"move_back": [KEY_S, KEY_DOWN],
	"turn_left": [KEY_A, KEY_LEFT],
	"turn_right": [KEY_D, KEY_RIGHT],
	"strafe_left": [KEY_Q, KEY_Z],
	"strafe_right": [KEY_E, KEY_X],
	"fire": [KEY_SPACE, KEY_CTRL],
	"use": [KEY_F, KEY_ENTER],
	"run": [KEY_SHIFT],
	"toggle_fps": [KEY_F3],
	"restart": [KEY_R],
	"quit": [KEY_ESCAPE],
}

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

var _streams := {}
var _players: Array[AudioStreamPlayer] = []
var _next_player := 0
var _ambient: AudioStreamPlayer


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_input()
	_setup_audio()
	# Device profile: the PocketTerm build carries the custom "pocketterm" feature tag
	# (see export_presets.cfg); any Linux ARM machine is treated the same way.
	on_device = OS.has_feature("pocketterm") or (OS.get_name() == "Linux" and (OS.has_feature("arm64") or OS.has_feature("arm")))
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
	for action in KEYMAP:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for key in KEYMAP[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = key
			InputMap.action_add_event(action, ev)


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
