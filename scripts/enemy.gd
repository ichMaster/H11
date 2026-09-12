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

const TEX_WALK: Array[Texture2D] = [
	preload("res://assets/mutant_0.png"),
	preload("res://assets/mutant_1.png"),
]
const TEX_ATTACK: Texture2D = preload("res://assets/mutant_attack.png")
const TEX_DEAD: Texture2D = preload("res://assets/mutant_dead.png")
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


func _ready() -> void:
	sprite.texture = TEX_WALK[0]
	_think_timer = randf_range(0.0, 0.3)  # spread the thinking over frames


func _physics_process(delta: float) -> void:
	_apply_depth_shade()
	if state == State.DEAD:
		return
	var player := Game.player
	if player == null or Game.dead or Game.finished:
		velocity = Vector3.ZERO
		return

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
			_animate(delta)
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
	sprite.texture = TEX_DEAD
	collision_layer = 0
	collision_mask = 0
	Game.play("explode", -2.0)
	Game.register_kill()


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


func _animate(delta: float) -> void:
	if velocity.length() < 0.1:
		return
	_anim_timer += delta
	if _anim_timer > 0.28:
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
