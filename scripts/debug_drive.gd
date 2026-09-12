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
##
##   godot --path . -- --bench=15 --bench-res=640x480
##       Spins the player on the spot for N seconds and reports frame timings, so
##       the cost of a render resolution can be measured on the device instead of
##       guessed. --bench-res overrides the logical viewport (default: leave it).
##       The 60 fps cap is lifted during a bench, otherwise there is no headroom
##       to see.

var out_dir := ""
var smoke := false
var bench := 0.0
var bench_res := Vector2i.ZERO
var _bench_t := 0.0
var _bench_ms: PackedFloat32Array = PackedFloat32Array()
var _steps: Array = []
var _t := 0.0
var _shot := 0
var _last_message := ""
var _failures := 0
## Wall-clock ceiling on a smoke run. No await in this file may outlive it; if one
## does, the run is broken in a way no assertion anticipated and must still fail.
const SMOKE_TIMEOUT := 90.0
var _watchdog := 0.0
var _last_check := "(nothing yet)"


func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--drive="):
			out_dir = arg.substr(8)
		elif arg == "--smoke":
			smoke = true
		elif arg.begins_with("--bench="):
			bench = maxf(1.0, arg.substr(8).to_float())
		elif arg.begins_with("--bench-res="):
			var parts := arg.substr(12).split("x")
			if parts.size() == 2:
				bench_res = Vector2i(int(parts[0]), int(parts[1]))
	if out_dir == "" and not smoke and bench <= 0.0:
		queue_free()
		return
	if bench > 0.0:
		_start_bench()
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


func _start_bench() -> void:
	var win := get_window()
	if bench_res != Vector2i.ZERO:
		win.content_scale_size = bench_res
	# Uncapped and without vsync, or the result is the monitor's refresh rate
	# rather than what the hardware can actually do.
	Engine.max_fps = 0
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	print("[bench] render %dx%d, window %dx%d, %.0fs" % [
		win.content_scale_size.x, win.content_scale_size.y,
		win.size.x, win.size.y, bench])


func _run_bench(delta: float) -> void:
	_bench_t += delta
	# Turn on the spot so the whole level passes through the view, not one wall.
	if Game.player != null:
		Game.player.rotation.y += delta * TAU / bench
	if _bench_t > 2.0:  # warm-up: shader compiles and the first frames are noise
		_bench_ms.append(delta * 1000.0)
	if _bench_t < bench:
		return
	var ms := Array(_bench_ms)
	ms.sort()
	var total := 0.0
	for v in ms:
		total += v
	var n := ms.size()
	var avg: float = total / maxf(1.0, n)
	var p99: float = ms[int(n * 0.99)] if n > 0 else 0.0
	var worst: float = ms[n - 1] if n > 0 else 0.0
	var win := get_window()
	print("[bench] %dx%d  frames=%d  avg=%.2fms (%.0f fps)  1%%low=%.2fms (%.0f fps)  worst=%.2fms" % [
		win.content_scale_size.x, win.content_scale_size.y, n,
		avg, 1000.0 / maxf(0.01, avg), p99, 1000.0 / maxf(0.01, p99), worst])
	get_tree().quit()


func _process(delta: float) -> void:
	if smoke and _watchdog > 0.0:
		_watchdog -= delta
		if _watchdog <= 0.0:
			print("[smoke] TIMEOUT after %.0fs - last check reached: %s" % [SMOKE_TIMEOUT, _last_check])
			print("[smoke] FAILED (timeout)")
			get_tree().quit(1)
	if bench > 0.0:
		_run_bench(delta)
		return
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
	_last_check = name
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


## Structural checks: if one of these fails the deck did not build, and every later
## step would await something that never happens. Bail out with a non-zero exit
## instead of hanging - a suite that hangs is worse than one that fails, because CI
## waits forever and a person concludes the run is slow rather than broken.
func _bail(what: String) -> void:
	print("[smoke] ABORT: %s - the deck did not build, skipping the rest" % what)
	print("[smoke] FAILED (%d failures)" % maxi(1, _failures))
	get_tree().quit(1)


func _run_smoke() -> void:
	_watchdog = SMOKE_TIMEOUT
	var level: Level = get_parent().get_node("Level")
	await _frames(10)
	_check("level parsed 32x22", level.width == 32 and level.height == 22)
	if level.width == 0 or level.height == 0:
		_bail("level has no geometry")
		return
	_check("7 mutants spawned", Game.enemies_total == 7)
	_check("9 doors built", level.doors.size() == 9)
	var player: CharacterBody3D = Game.player
	_check("player spawned", player != null)
	if player == null:
		_bail("no player spawned")
		return

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
