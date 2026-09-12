extends Node3D
class_name Level
## Builds the 3D level from an ASCII map (see levels/deck1.txt for the legend).
## One cell = CELL x CELL metres, walls are WALL_H metres tall.
## Wall geometry is merged into one mesh per texture; only faces next to
## walkable cells are generated, so the Pi has very little to draw.

const CELL := 2.0
const WALL_H := 2.0

const PlayerScene := preload("res://scenes/player.tscn")
const EnemyScene := preload("res://scenes/enemy.tscn")
const DoorScene := preload("res://scenes/door.tscn")
const PickupScene := preload("res://scenes/pickup.tscn")

## Map character -> texture name (assets/<name>.png) for solid wall cells.
const WALL_TEX := {
	"#": "wall_panel",
	"V": "wall_vent",
	"L": "wall_light",
	"S": "wall_screen",
	"H": "wall_hazard",
	"X": "wall_exit",
	"B": "wall_blood",
	"1": "wall_h11",
}
const WALKABLE := ".PDKehak"
const FACING_ROT := {"north": 0.0, "west": PI / 2.0, "south": PI, "east": -PI / 2.0}

@export var level_path: String = "res://levels/deck1.txt"

var grid: PackedStringArray = []
var width := 0
var height := 0
var facing := "east"
var astar := AStarGrid2D.new()
var player: CharacterBody3D
var doors := {}  # Vector2i -> Door
var light_material: ShaderMaterial

var _materials := {}


func _ready() -> void:
	_parse(level_path)
	_build_walls()
	_build_floor_ceiling()
	_build_astar()
	_spawn_entities()


# --- map queries -----------------------------------------------------------

func cell_at(x: int, y: int) -> String:
	if x < 0 or y < 0 or x >= width or y >= height:
		return "#"
	return grid[y][x]


func is_solid(x: int, y: int) -> bool:
	return not (cell_at(x, y) in WALKABLE)


func is_wall(x: int, y: int) -> bool:
	return WALL_TEX.has(cell_at(x, y))


func to_world(x: int, y: int) -> Vector3:
	return Vector3((x + 0.5) * CELL, 0.0, (y + 0.5) * CELL)


func to_cell(p: Vector3) -> Vector2i:
	return Vector2i(int(floor(p.x / CELL)), int(floor(p.z / CELL)))


func door_at(cell: Vector2i) -> Door:
	return doors.get(cell)


# --- parsing ---------------------------------------------------------------

func _parse(path: String) -> void:
	var text := FileAccess.get_file_as_string(path)
	assert(text != "", "Level file not found: " + path)
	var in_map := false
	for raw_line in text.split("\n"):
		var line := raw_line.strip_edges(false, true)
		if in_map:
			if line.is_empty():
				continue
			grid.append(line)
		elif line.begins_with("#") or line.is_empty():
			continue
		elif line.begins_with("facing="):
			facing = line.substr(7).strip_edges()
		elif line == "map:":
			in_map = true
	height = grid.size()
	width = grid[0].length() if height > 0 else 0
	for row in grid:
		assert(row.length() == width, "All map rows must have the same length")


# --- geometry --------------------------------------------------------------

## Shared depth-shaded material per texture. FOG_DENSITY is the single knob
## for how far you can see; sprites use the same value (see depth_shade()).
const FOG_DENSITY := 0.085
const DEPTH_SHADER: Shader = preload("res://shaders/depth_shade.gdshader")


func material_for(tex_name: String) -> ShaderMaterial:
	if _materials.has(tex_name):
		return _materials[tex_name]
	var mat := ShaderMaterial.new()
	mat.shader = DEPTH_SHADER
	mat.set_shader_parameter("albedo_tex", load("res://assets/%s.png" % tex_name))
	mat.set_shader_parameter("fog_density", FOG_DENSITY)
	_materials[tex_name] = mat
	return mat


## Brightness multiplier for a billboard sprite at world position `p`, matching
## the wall shader's distance darkening so sprites sink into the dark too.
func depth_shade(p: Vector3) -> float:
	if player == null:
		return 1.0
	return exp(-p.distance_to(player.global_position) * FOG_DENSITY)


func _build_walls() -> void:
	var surfaces := {}  # tex_name -> SurfaceTool
	var body := StaticBody3D.new()
	body.name = "Walls"
	body.collision_layer = 1
	body.collision_mask = 0
	add_child(body)
	var exits := StaticBody3D.new()
	exits.name = "Exits"
	exits.collision_layer = 1
	exits.collision_mask = 0
	exits.set_script(load("res://scripts/exit.gd"))
	add_child(exits)

	for y in height:
		for x in width:
			var c := cell_at(x, y)
			if not WALL_TEX.has(c):
				continue
			# collision box for the whole cell
			var shape := CollisionShape3D.new()
			var box := BoxShape3D.new()
			box.size = Vector3(CELL, WALL_H, CELL)
			shape.shape = box
			shape.position = to_world(x, y) + Vector3(0, WALL_H / 2.0, 0)
			if c == "X":
				exits.add_child(shape)
			else:
				body.add_child(shape)
			# visible faces
			var tex: String = WALL_TEX[c]
			if not surfaces.has(tex):
				var st := SurfaceTool.new()
				st.begin(Mesh.PRIMITIVE_TRIANGLES)
				surfaces[tex] = st
			var st: SurfaceTool = surfaces[tex]
			# North/south faces are drawn a little darker, like Wolf3D, for depth.
			var center := to_world(x, y)
			if not is_wall(x, y - 1):
				_add_face(st, center, Vector3(0, 0, -1), 0.72)
			if not is_wall(x, y + 1):
				_add_face(st, center, Vector3(0, 0, 1), 0.72)
			if not is_wall(x - 1, y):
				_add_face(st, center, Vector3(-1, 0, 0), 1.0)
			if not is_wall(x + 1, y):
				_add_face(st, center, Vector3(1, 0, 0), 1.0)

	for tex in surfaces:
		var st: SurfaceTool = surfaces[tex]
		var mesh := st.commit()
		var mi := MeshInstance3D.new()
		mi.name = "Walls_" + tex
		mi.mesh = mesh
		mi.material_override = material_for(tex)
		add_child(mi)
	light_material = _materials.get("wall_light")


## Adds one vertical, WALL_H-tall face of the cell centred at `center`, on the
## side given by `normal`. Vertices go bottom-left, bottom-right, top-right,
## top-left as seen by someone standing in front of the face, which is
## counter-clockwise (Godot's front-face winding) and keeps texture text readable.
func _add_face(st: SurfaceTool, center: Vector3, normal: Vector3, shade: float) -> void:
	var right := (-normal).cross(Vector3.UP)
	var bottom := center + normal * (CELL / 2.0)
	var up := Vector3(0, WALL_H, 0)
	var a := bottom - right * (CELL / 2.0)
	var b := bottom + right * (CELL / 2.0)
	var c := b + up
	var d := a + up
	var col := Color(shade, shade, shade)
	st.set_normal(normal)
	st.set_color(col)
	st.set_uv(Vector2(0, 1)); st.add_vertex(a)
	st.set_uv(Vector2(1, 1)); st.add_vertex(b)
	st.set_uv(Vector2(1, 0)); st.add_vertex(c)
	st.set_uv(Vector2(0, 1)); st.add_vertex(a)
	st.set_uv(Vector2(1, 0)); st.add_vertex(c)
	st.set_uv(Vector2(0, 0)); st.add_vertex(d)


func _build_floor_ceiling() -> void:
	var size := Vector2(width * CELL, height * CELL)
	var center := Vector3(size.x / 2.0, 0.0, size.y / 2.0)
	for spec in [["floor", 0.0, 0.0], ["ceiling", WALL_H, PI]]:
		var plane := PlaneMesh.new()
		plane.size = size
		var mi := MeshInstance3D.new()
		mi.name = spec[0].capitalize()
		mi.mesh = plane
		var mat := material_for(spec[0])
		mat.set_shader_parameter("uv_scale", Vector2(width, height))
		mi.material_override = mat
		mi.position = center + Vector3(0, spec[1], 0)
		mi.rotation.x = spec[2]
		add_child(mi)


func _build_astar() -> void:
	astar.region = Rect2i(0, 0, width, height)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	astar.update()
	for y in height:
		for x in width:
			var c := cell_at(x, y)
			# Locked doors are solid until unlocked; normal doors are walkable
			# (enemies open them on the way).
			astar.set_point_solid(Vector2i(x, y), is_wall(x, y) or c == "K")


# --- entities --------------------------------------------------------------

func _spawn_entities() -> void:
	var enemies := 0
	for y in height:
		for x in width:
			var c := cell_at(x, y)
			var cell := Vector2i(x, y)
			match c:
				"P":
					player = PlayerScene.instantiate()
					player.position = to_world(x, y)
					player.rotation.y = FACING_ROT.get(facing, 0.0)
					add_child(player)
					Game.player = player
				"e":
					var e := EnemyScene.instantiate()
					e.position = to_world(x, y)
					e.level = self
					add_child(e)
					enemies += 1
				"D", "K":
					var door: Door = DoorScene.instantiate()
					door.position = to_world(x, y)
					var horizontal := is_wall(x - 1, y) and is_wall(x + 1, y)
					add_child(door)
					door.setup(self, cell, horizontal, c == "K")
					doors[cell] = door
				"h", "a", "k":
					var p := PickupScene.instantiate()
					p.position = to_world(x, y)
					add_child(p)
					p.setup({"h": "medkit", "a": "ammo", "k": "keycard"}[c])
	Game.enemies_total = enemies
	Game.stats_changed.emit()
