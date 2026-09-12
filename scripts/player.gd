extends CharacterBody3D
## First-person player: keyboard-only Wolf3D controls (turn with A/D or arrows,
## strafe with Q/E), hitscan weapon, "use" for doors and the exit panel.

signal fired

const SPEED := 4.2
const RUN_MULT := 1.6
const TURN_SPEED := 2.3  # radians per second
const FIRE_COOLDOWN := 0.32
const FIRE_RANGE := 40.0
const USE_RANGE := 2.6
const LAYER_WORLD := 1
const LAYER_ENEMY := 4

@onready var camera: Camera3D = $Camera3D

var _fire_timer := 0.0
var _bob := 0.0


func _physics_process(delta: float) -> void:
	if Game.dead or Game.finished:
		velocity = Vector3.ZERO
		return

	var turn := Input.get_axis("turn_right", "turn_left")
	rotate_y(turn * TURN_SPEED * delta)

	var forward := Input.get_axis("move_back", "move_forward")
	var strafe := Input.get_axis("strafe_left", "strafe_right")
	var dir := transform.basis * Vector3(strafe, 0.0, -forward)
	if dir.length() > 1.0:
		dir = dir.normalized()
	var speed := SPEED * (RUN_MULT if Input.is_action_pressed("run") else 1.0)
	velocity = dir * speed
	move_and_slide()
	position.y = 0.0

	# subtle head bob while walking
	if dir.length() > 0.1:
		_bob += delta * speed * 2.2
	camera.position.y = 1.0 + sin(_bob) * 0.03

	_fire_timer -= delta
	if Input.is_action_pressed("fire") and _fire_timer <= 0.0:
		_fire()
	if Input.is_action_just_pressed("use"):
		_use()


func _fire() -> void:
	_fire_timer = FIRE_COOLDOWN
	if not Game.use_ammo():
		Game.say("NO AMMO")
		Game.play("locked", -8.0)
		return
	Game.play("shotgun")
	fired.emit()
	var hit := _ray(FIRE_RANGE, LAYER_WORLD | LAYER_ENEMY)
	if not hit.is_empty() and hit.collider.has_method("hit"):
		hit.collider.hit(1)


func _use() -> void:
	var hit := _ray(USE_RANGE, LAYER_WORLD)
	if not hit.is_empty() and hit.collider.has_method("interact"):
		hit.collider.interact(self)


func _ray(length: float, mask: int) -> Dictionary:
	var from := camera.global_position
	var to := from - camera.global_transform.basis.z * length
	var query := PhysicsRayQueryParameters3D.create(from, to, mask, [get_rid()])
	return get_world_3d().direct_space_state.intersect_ray(query)
