extends Node
## Automated checks that need no keyboard. Two modes, picked by user args
## (everything after "--" on the command line):
##
##   godot --path . -- --drive=/tmp/shots
##       Walks through the first door, fires, saves screenshots (needs a renderer).
##
##   godot --headless --path . -- --smoke
##       Headless gameplay smoke test: locked door, keycard, unlocking, killing a
##       mutant, reaching the exit. Prints PASS/FAIL lines and exits 0/1.

var out_dir := ""
var smoke := false
var _steps: Array = []
var _t := 0.0
var _shot := 0
var _last_message := ""
var _failures := 0


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--drive="):
			out_dir = arg.substr(8)
		elif arg == "--smoke":
			smoke = true
	if out_dir == "" and not smoke:
		queue_free()
		return
	Game.message.connect(func(t: String) -> void: _last_message = t)
	if smoke:
		_run_smoke()
		return
	DirAccess.make_dir_recursive_absolute(out_dir)
	# [time, action, param]
	_steps = [
		[0.6, "shot", "start"],
		[0.7, "press", "move_forward"],
		[2.0, "release", "move_forward"],
		[2.1, "tap", "use"],
		[2.3, "shot", "door_opening"],
		[3.2, "press", "move_forward"],
		[4.6, "release", "move_forward"],
		[4.7, "shot", "hall"],
		[4.8, "press", "turn_right"],
		[5.4, "release", "turn_right"],
		[5.5, "tap", "fire"],
		[5.55, "shot", "fire"],
		[6.5, "shot", "after_fire"],
		[8.5, "shot", "late"],
		[8.6, "quit", ""],
	]
	print("[drive] writing screenshots to ", out_dir)


func _process(delta: float) -> void:
	if smoke:
		return
	_t += delta
	while not _steps.is_empty() and _steps[0][0] <= _t:
		var step: Array = _steps.pop_front()
		match step[1]:
			"press":
				Input.action_press(step[2])
			"release":
				Input.action_release(step[2])
			"tap":
				Input.action_press(step[2])
				await get_tree().process_frame
				Input.action_release(step[2])
			"shot":
				await RenderingServer.frame_post_draw
				var img := get_viewport().get_texture().get_image()
				var path := "%s/%02d_%s.png" % [out_dir, _shot, step[2]]
				img.save_png(path)
				_shot += 1
				print("[drive] saved ", path, "  health=", Game.health, " ammo=", Game.ammo, " kills=", Game.kills)
			"quit":
				print("[drive] done")
				get_tree().quit()


# --- headless smoke test ------------------------------------------------------

func _check(name: String, ok: bool) -> void:
	print("[smoke] %s: %s" % ["PASS" if ok else "FAIL", name])
	if not ok:
		_failures += 1


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _place(level: Level, cell: Vector2i, look_at_cell: Vector2i) -> void:
	var player: CharacterBody3D = Game.player
	player.global_position = level.to_world(cell.x, cell.y)
	player.look_at(level.to_world(look_at_cell.x, look_at_cell.y), Vector3.UP)
	await _frames(3)


func _run_smoke() -> void:
	var level: Level = get_parent().get_node("Level")
	await _frames(10)
	_check("level parsed 32x22", level.width == 32 and level.height == 22)
	_check("7 mutants spawned", Game.enemies_total == 7)
	_check("9 doors built", level.doors.size() == 9)
	var player: CharacterBody3D = Game.player
	_check("player spawned", player != null)

	# 1. locked door refuses without the keycard
	var locked_cell := Vector2i(18, 15)
	var door: Door = level.door_at(locked_cell)
	_check("locked door exists", door != null and door.locked)
	await _place(level, Vector2i(17, 15), locked_cell)
	player._use()
	await _frames(2)
	_check("locked door reports LOCKED", _last_message.begins_with("LOCKED"))
	_check("door stays locked", door.locked and not door.is_open())

	# 2. keycard pickup on touch
	await _place(level, Vector2i(25, 10), Vector2i(26, 10))
	await _frames(10)
	_check("keycard picked up", Game.has_keycard)

	# 3. keycard unlocks and opens the door, path becomes walkable
	await _place(level, Vector2i(17, 15), locked_cell)
	player._use()
	await _frames(70)
	_check("door unlocked", not door.locked)
	_check("door opened", door.is_open())
	_check("astar cell walkable", not level.astar.is_point_solid(locked_cell))

	# 4. shooting a mutant kills it after three hits
	# Pick the mutant nearest to the door (it may already be hunting us) and
	# stand two cells away from it on a walkable cell.
	var enemy: CharacterBody3D = null
	var best := INF
	for n in level.get_children():
		if n is CharacterBody3D and n != player and n.state != n.State.DEAD:
			var d: float = n.global_position.distance_to(player.global_position)
			if d < best:
				best = d
				enemy = n
	_check("a live mutant found", enemy != null)
	if enemy != null:
		var ecell := level.to_cell(enemy.global_position)
		var stand := ecell
		for off in [Vector2i(-2, 0), Vector2i(2, 0), Vector2i(0, -2), Vector2i(0, 2), Vector2i(-1, 0), Vector2i(1, 0)]:
			if not level.is_solid(ecell.x + off.x, ecell.y + off.y):
				stand = ecell + off
				break
		await _place(level, stand, ecell)
		var ammo_before := Game.ammo
		for i in 4:
			player.look_at(Vector3(enemy.global_position.x, 0.0, enemy.global_position.z), Vector3.UP)
			player._fire()
			await _frames(22)  # > FIRE_COOLDOWN
		_check("ammo consumed", Game.ammo < ammo_before)
		_check("mutant dead", enemy.state == enemy.State.DEAD)
		_check("kill counted", Game.kills == 1)

	# 5. exit panel finishes the level
	await _place(level, Vector2i(28, 18), Vector2i(29, 18))
	player._use()
	await _frames(2)
	_check("level finished at exit", Game.finished)

	print("[smoke] %s (%d failures)" % ["ALL PASSED" if _failures == 0 else "FAILED", _failures])
	get_tree().quit(1 if _failures > 0 else 0)
