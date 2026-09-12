extends Area3D
## Floor item: medkit, ammo cell or keycard. Picked up on touch.

const TEXTURES := {
	"medkit": preload("res://assets/medkit.png"),
	"ammo": preload("res://assets/ammo.png"),
	"keycard": preload("res://assets/keycard.png"),
}

@onready var sprite: Sprite3D = $Sprite3D

var kind := "medkit"
var _time := randf() * TAU


## Called by the level builder after add_child, which means _ready has already run and
## already stamped the sprite from the default kind. Apply the texture here too, the
## way door.gd applies its material in setup() - otherwise every ammo cell and keycard
## on the floor wears the medkit sprite while behaving correctly.
func setup(p_kind: String) -> void:
	kind = p_kind
	if sprite != null:
		sprite.texture = TEXTURES[kind]


func _ready() -> void:
	sprite.texture = TEXTURES[kind]
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	# gentle hover so items read as "pick me up"
	_time += delta * 2.0
	sprite.position.y = 1.0 + sin(_time) * 0.04
	var level := get_parent() as Level
	if level != null:
		var v := level.depth_shade(global_position)
		sprite.modulate = Color(v, v, v)


func _on_body_entered(body: Node3D) -> void:
	if body != Game.player:
		return
	var taken := false
	match kind:
		"medkit":
			taken = Game.add_health(25)
			if taken:
				Game.say("MEDKIT +25")
		"ammo":
			taken = Game.add_ammo(8)
			if taken:
				Game.say("AMMO +8")
		"keycard":
			Game.take_keycard()
			Game.say("RED KEYCARD ACQUIRED")
			taken = true
	if taken:
		Game.play("pickup", -6.0)
		queue_free()
