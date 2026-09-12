extends CharacterBody3D
## H11 mutant. Idles until it sees the player (or gets shot), then hunts along
## an A* path over the level grid, opening doors on the way, and lunges when
## in range with a line of sight. Hit chance falls with distance, Wolf3D style.

enum State { IDLE, CHASE, ATTACK, DEAD }

const SPEED := 2.6
const SIGHT_RANGE := 14.0
const ATTACK_RANGE := 5.5
const ATTACK_WINDUP := 0.45
const ATTACK_COOLDOWN := 1.7
const HP_MAX := 3
const LAYER_WORLD := 1

## The Chorus hangs in the air on a fringe of tubes, so these four frames are a
## drift cycle - vertical bob and tube sway, no contact pose. They run on an even
## timer whether the creature is moving or not; there is no footfall to sync to.
const TEX_WALK: Array[Texture2D] = [
	preload("res://assets/mutant_0.png"),
	preload("res://assets/mutant_1.png"),
	preload("res://assets/mutant_2.png"),
	preload("res://assets/mutant_3.png"),
]
const TEX_ATTACK: Texture2D = preload("res://assets/mutant_attack.png")
const TEX_DIE: Texture2D = preload("res://assets/mutant_die.png")
const TEX_DEAD: Texture2D = preload("res://assets/mutant_dead.png")

const FRAME_TIME := 1.0 / 6.0  # drift cycle, ~6 fps
const BOB_SPEED := 2.2
const BOB_HEIGHT := 0.12  # metres; the art bobs too, this moves it through space
const DIE_TIME := 0.2
const SFX_GROWL: AudioStream = preload("res://assets/sfx/growl.wav")
const SFX_STRIKE: AudioStream = preload("res://assets/sfx/drone_shot.wav")

@onready var sprite: Sprite3D = $Sprite3D
@onready var sfx: AudioStreamPlayer3D = $Sfx

var level: Level
var state := State.IDLE
var hp := HP_MAX

var _path: Array[Vector2i] = []
var _think_timer := 0.0
var _attack_timer := 0.0
var _anim_timer := 0.0
var _anim_frame := 0
var _flash := 0.0
var _stuck_timer := 0.0
var _bob := 0.0
var _base_y := 0.0
var _die_timer := 0.0
var _bob_at_death := 0.0


func _ready() -> void:
	sprite.texture = TEX_WALK[0]
	_base_y = sprite.position.y
	_bob = randf() * TAU  # so a group of them does not pulse in unison
	_think_timer = randf_range(0.0, 0.3)  # spread the thinking over frames


func _physics_process(delta: float) -> void:
	_apply_depth_shade()
	if state == State.DEAD:
		_settle(delta)
		return
	var player := Game.player
	if player == null or Game.dead or Game.finished:
		velocity = Vector3.ZERO
		return

	_float(delta)
	_animate(delta)
	_think_timer -= delta
	_attack_timer -= delta
	if _flash > 0.0:
		_flash -= delta

	var to_player := player.global_position - global_position
	to_player.y = 0.0
	var dist := to_player.length()

	match state:
		State.IDLE:
			if _think_timer <= 0.0:
				_think_timer = 0.3
				if dist < SIGHT_RANGE and _can_see(player):
					alert()
		State.CHASE:
			if _think_timer <= 0.0:
				_think_timer = 0.4
				_replan(player)
			if dist < ATTACK_RANGE and _attack_timer <= 0.0 and _can_see(player):
				state = State.ATTACK
				_attack_timer = ATTACK_WINDUP
				velocity = Vector3.ZERO
				sprite.texture = TEX_ATTACK
				return
			_follow_path(delta, player, dist)
		State.ATTACK:
			velocity = Vector3.ZERO
			if _attack_timer <= 0.0:
				_strike(player, dist)
				state = State.CHASE
				_attack_timer = ATTACK_COOLDOWN
				sprite.texture = TEX_WALK[_anim_frame]


func alert() -> void:
	if state != State.IDLE:
		return
	state = State.CHASE
	_think_timer = 0.0
	sfx.stream = SFX_GROWL
	sfx.play()


func hit(damage: int) -> void:
	if state == State.DEAD:
		return
	hp -= damage
	_flash = 0.12
	if hp <= 0:
		_die()
	else:
		Game.play("hit", -4.0)
		alert()


func _die() -> void:
	state = State.DEAD
	velocity = Vector3.ZERO
	# mutant_die is the shell sinking - one horn snapped, carapace split, eyes
	# going out. mutant_dead that follows is a collapsed shell ON THE FLOOR, so
	# the billboard has to descend out of its float first or the corpse snaps
	# to the ground the instant the texture swaps.
	sprite.texture = TEX_DIE
	# The killing blow set _flash, and the DEAD branch returns before the decay ever
	# runs again - so without this the corpse keeps the hit tint forever, with a
	# constant red channel that also ignores distance darkening.
	_flash = 0.0
	_die_timer = DIE_TIME
	_bob_at_death = sprite.position.y - _base_y
	collision_layer = 0
	collision_mask = 0
	Game.play("explode", -2.0)
	Game.register_kill()


func _settle(delta: float) -> void:
	if _die_timer <= 0.0:
		return
	_die_timer -= delta
	var t: float = clampf(1.0 - _die_timer / DIE_TIME, 0.0, 1.0)
	sprite.position.y = _base_y + _bob_at_death * (1.0 - t)
	if _die_timer <= 0.0:
		sprite.position.y = _base_y
		sprite.texture = TEX_DEAD


func _can_see(player: Node3D) -> bool:
	var from := global_position + Vector3(0, 1.0, 0)
	var to := player.global_position + Vector3(0, 1.0, 0)
	var query := PhysicsRayQueryParameters3D.create(from, to, LAYER_WORLD, [get_rid()])
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	return hit.is_empty()


func _replan(player: Node3D) -> void:
	var from := level.to_cell(global_position)
	var to := level.to_cell(player.global_position)
	var ids := level.astar.get_id_path(from, to)
	_path.clear()
	for id in ids:
		_path.append(id)
	if not _path.is_empty() and _path[0] == from:
		_path.remove_at(0)


func _follow_path(delta: float, player: Node3D, dist: float) -> void:
	var target: Vector3
	if _path.is_empty():
		if dist < 1.6:
			velocity = Vector3.ZERO
			return
		target = player.global_position
	else:
		target = level.to_world(_path[0].x, _path[0].y)
		var door := level.door_at(_path[0])
		if door != null:
			door.try_open()
	var dir := target - global_position
	dir.y = 0.0
	if dir.length() < 0.25:
		if not _path.is_empty():
			_path.remove_at(0)
		return
	var before := global_position
	velocity = dir.normalized() * SPEED
	move_and_slide()
	position.y = 0.0
	# If something blocks us for a while, replan on the next think tick.
	if global_position.distance_to(before) < SPEED * delta * 0.3:
		_stuck_timer += delta
		if _stuck_timer > 0.5:
			_stuck_timer = 0.0
			_think_timer = 0.0
	else:
		_stuck_timer = 0.0


func _strike(player: Node3D, dist: float) -> void:
	sfx.stream = SFX_STRIKE
	sfx.play()
	if not _can_see(player):
		return
	var chance: float = clampf(1.0 - (dist / ATTACK_RANGE) * 0.65, 0.3, 0.95)
	if randf() < chance:
		Game.damage(randi_range(4, 11))


## Moves the billboard through space. The art bobs on its own, but without this
## the creature reads as standing on its tubes rather than hanging above them.
func _float(delta: float) -> void:
	_bob += delta
	sprite.position.y = _base_y + sin(_bob * BOB_SPEED) * BOB_HEIGHT


## Drift cycle. Runs on an even timer whether the creature is moving or not -
## it floats, so there is nothing to stand still for. The attack frame is a tell
## and must not be cycled away from.
func _animate(delta: float) -> void:
	if state == State.ATTACK:
		return
	_anim_timer += delta
	if _anim_timer > FRAME_TIME:
		_anim_timer = 0.0
		_anim_frame = (_anim_frame + 1) % TEX_WALK.size()
		sprite.texture = TEX_WALK[_anim_frame]


func _apply_depth_shade() -> void:
	if level == null:
		return
	var v := level.depth_shade(global_position)
	if _flash > 0.0:
		sprite.modulate = Color(1.0, v * 0.3, v * 0.3)
	else:
		sprite.modulate = Color(v, v, v)
