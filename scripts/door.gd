extends StaticBody3D
class_name Door
## Wolf3D-style sliding door. The body stays put; the visible slab and its
## collision shape slide sideways into the wall. A sensor keeps the door from
## closing on anyone standing in the doorway. Locked doors need the keycard.

enum DoorState { CLOSED, OPENING, OPEN, CLOSING }

const SLIDE := 1.9
const OPEN_TIME := 0.7
const HOLD_TIME := 3.5

const MAT_DOOR_PATH := "door"
const MAT_LOCKED_PATH := "door_locked"

@onready var slab: MeshInstance3D = $Slab
@onready var slab_shape: CollisionShape3D = $SlabShape
@onready var sensor: Area3D = $Sensor
@onready var sfx: AudioStreamPlayer3D = $Sfx

var locked := false
var cell: Vector2i
var level: Level

var _state := DoorState.CLOSED
var _amount := 0.0  # 0 = closed, 1 = fully open
var _hold := 0.0


func setup(p_level: Level, p_cell: Vector2i, horizontal: bool, p_locked: bool) -> void:
	level = p_level
	cell = p_cell
	locked = p_locked
	# The slab is modelled along X (thin in Z). For a doorway in a north-south
	# corridor the door must lie along Z instead, so rotate the whole body.
	if not horizontal:
		rotation.y = PI / 2.0
	slab.material_override = level.material_for(MAT_LOCKED_PATH if locked else MAT_DOOR_PATH)


## Called by the player (use key).
func interact(_player: Node3D) -> void:
	if _state == DoorState.CLOSED or _state == DoorState.CLOSING:
		if locked:
			if not Game.has_keycard:
				Game.say("LOCKED - KEYCARD REQUIRED")
				Game.play("locked")
				return
			locked = false
			level.astar.set_point_solid(cell, false)
			slab.material_override = level.material_for(MAT_DOOR_PATH)
			Game.say("KEYCARD ACCEPTED")
		_open()
	elif _state == DoorState.OPEN:
		_hold = 0.0  # close it early if the doorway is clear


## Called by enemies walking through.
func try_open() -> void:
	if not locked and _state == DoorState.CLOSED:
		_open()


func is_open() -> bool:
	return _state == DoorState.OPEN


func _open() -> void:
	_state = DoorState.OPENING
	sfx.play()


func _process(delta: float) -> void:
	match _state:
		DoorState.OPENING:
			_amount = minf(1.0, _amount + delta / OPEN_TIME)
			if _amount >= 1.0:
				_state = DoorState.OPEN
				_hold = HOLD_TIME
		DoorState.OPEN:
			_hold -= delta
			if _hold <= 0.0 and not sensor.has_overlapping_bodies():
				_state = DoorState.CLOSING
				sfx.play()
		DoorState.CLOSING:
			if sensor.has_overlapping_bodies():
				_state = DoorState.OPENING  # never crush anyone
			else:
				_amount = maxf(0.0, _amount - delta / OPEN_TIME)
				if _amount <= 0.0:
					_state = DoorState.CLOSED
		_:
			return
	var offset := Vector3(SLIDE * _amount, 0.0, 0.0)
	slab.position = Vector3(0, 1.0, 0) + offset
	slab_shape.position = Vector3(0, 1.0, 0) + offset
