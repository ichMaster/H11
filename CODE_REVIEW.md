# Code Review — H11 // Deck 1

**Date:** 2026-09-12 · **Scope:** entire repository at `ffbca97` — GDScript gameplay and rendering, shaders, scenes, shell/Python/Node tooling, project and export configuration, docs and map data.

**Method:** six parallel dimension reviewers plus a completeness critic produced 39 candidate findings; every finding was then independently challenged by two adversarial verifiers (one hunting for misread code, one for mitigations elsewhere and severity inflation). **All 39 survived both challenges as confirmed.** Severity grades below are the post-verification consensus, not the reviewers' first guesses.

| Severity | Count |
|---|---|
| High | 5 |
| Medium | 9 |
| Low | 25 |
| **Total** | **39** |

Recommendations are ordered by severity; within a severity, by file. Fix the High section first — every entry there is visible to a player in normal play.

> **Status (v0.8, released as 0.8.0):** every **High** and **Medium** finding below is
> fixed — see [specification/implementation/v0.8-execution-report.md](specification/implementation/v0.8-execution-report.md)
> for the commit per finding. The **Low** findings remain open and are re-filed against the
> version that next touches their file.

## High

Every entry here is player-visible in normal play.

### 1. Door slab BoxMesh shows a 1/6 crop of the door texture on every face

**Where:** `scenes/door.tscn:6` · **Category:** correctness

The door slab is a BoxMesh (scenes/door.tscn:6-7) textured via the shared depth_shade material (scripts/door.gd:38: `slab.material_override = level.material_for(MAT_LOCKED_PATH if locked else MAT_DOOR_PATH)`), which samples `texture(albedo_tex, UV * uv_scale)` with the default uv_scale of (1,1). Godot 4's BoxMesh lays its UVs out as a 3x2 per-face atlas (each face maps to one 1/3-by-1/2 cell of the texture; the documented way to show the full texture on every face is a UV scale of (3,2), which works here because the sampler is repeat_enable). door.png / door_locked.png are authored in tools/h11_art.js (doorBase, lines 1061-1102) as a single full-face door filling the whole 128x128 canvas: hydraulic jambs at both edges, two portholes, centre seam with status strip, OPEN/LOCK control panel. Nothing ever sets uv_scale on the door materials (grep confirms only floor/ceiling get uv_scale writes in level.gd:248).

**Failure:** Open the game and look at any of the six doors on deck1: instead of the authored door face, the visible side of the slab renders one magnified 1/3-by-1/2 crop of the texture stretched over the 2x2 m face (front and back get different crops, the 0.24 m edge faces get yet others). The seam, second porthole, and the OPEN/LOCK panel — including the keycard lock block that visually distinguishes door_locked — never appear, so a locked door is only distinguishable by whichever accent pixels happen to fall inside the crop.

**Fix:** Give the door materials the documented BoxMesh atlas correction: after fetching the material in door.gd setup (or as a special case in level.gd material_for for "door"/"door_locked"), call set_shader_parameter("uv_scale", Vector2(3, 2)); with repeat_enable each face then shows the complete texture. Alternatively replace the BoxMesh with two QuadMesh leaves whose UVs are authored explicitly.

### 2. Killed mutants stay permanently red: hit-flash never decays after death

**Where:** `scripts/enemy.gd:123` · **Category:** correctness

hit() sets _flash = 0.12 (line 123) before calling _die() on the killing blow. Once state == State.DEAD, _physics_process calls _apply_depth_shade() (line 64) and returns at line 67, so the _flash -= delta decay at lines 77-78 is never reached again; nothing else clears _flash. _apply_depth_shade (lines 239-246) therefore takes the flash branch forever and renders the corpse as Color(1.0, v*0.3, v*0.3).

**Failure:** Shoot any mutant three times. The third hit sets _flash = 0.12 and immediately calls _die(). The die/settle animation and the final mutant_dead corpse are drawn in the bright red hit-flash tint for the rest of the level, and because the red channel is a constant 1.0 the corpse also ignores distance darkening — it glows red through the fog on every kill, in every playthrough.

**Fix:** Clear the flash on death: add _flash = 0.0 in _die() (or decrement _flash in the State.DEAD branch of _physics_process before returning).

### 3. Ammo and keycard pickups render with the medkit sprite (setup after _ready)

**Where:** `scripts/pickup.gd:17` · **Category:** correctness

setup() only records kind (pickup.gd:16-17); the texture is applied once in _ready() (line 21) from the default kind := "medkit" (line 12). level.gd _spawn_entities calls add_child(p) before p.setup(...) (level.gd:296-300), and add_child fires the pickup's _ready synchronously because Level is already inside the tree. So every pickup's sprite is stamped with the medkit texture before setup changes kind, and nothing re-applies TEXTURES[kind]. Door avoids this exact trap by applying its material inside setup(); pickup does not.

**Failure:** Start the level. All 'a' (ammo) and 'k' (keycard) cells display assets/medkit.png while behaving as ammo/keycard. The player is told "FIND THE RED KEYCARD" but the keycard item on the floor looks like a medkit; touching one of the three identical-looking medkit sprites unexpectedly prints "RED KEYCARD ACQUIRED" or "AMMO +8". The --smoke test checks only behavior (Game.has_keycard), so it passes and hides the regression.

**Fix:** Apply the texture in setup() (e.g. move sprite.texture = TEXTURES[kind] there, guarded for onready, or set the texture in setup via get_node), or call p.setup(...) before add_child(p) in level.gd and read kind in _ready as now.

### 4. Floor/ceiling fog is evaluated at only the 4 corners of the level-wide plane

**Where:** `shaders/depth_shade_mip.gdshader:20` · **Category:** correctness

depth_fade is computed in vertex() (`depth_fade = exp(-length(view_pos.xyz) * fog_density)`, depth_shade_mip.gdshader:18-21) and interpolated as a varying. That is fine for walls, whose faces are 2x2 m quads, but _build_floor_ceiling (scripts/level.gd:241-252) applies this shader to two un-subdivided PlaneMesh instances spanning the entire level (deck1: 32x22 cells = 64x44 m). A default PlaneMesh has exactly 4 vertices, so the exponential falloff is sampled only at the four level corners and linearly interpolated across two giant triangles: every floor/ceiling fragment's brightness is a blend of the camera's distances to the level corners, not the distance to that fragment.

**Failure:** Stand near the middle of the deck: all four plane corners are ~39 m from the camera, so depth_fade is ~exp(-39*0.025) = 0.38 across the entire floor and ceiling — including directly underfoot, where the wall bases 1-2 m away render at ~exp(-0.05) = 0.95. The floor reads ~2.5x darker than the walls it touches, the mismatch shifts as the player walks (floor brightness tracks distance-to-corners, not local distance), and there is a gradient kink along the plane's diagonal where the two triangles meet.

**Fix:** For the two plane shaders, compute the fade per fragment: pass `varying vec3 view_pos;` from vertex() and do `float depth_fade = exp(-length(view_pos) * fog_density);` inside fragment() (this shader is used only by the two planes, so the extra per-pixel exp is confined to them). Alternatively set subdivide_width/subdivide_depth on the PlaneMesh to one quad per cell so per-vertex evaluation matches the walls' granularity.

### 5. ambient.wav loop seam has a hard discontinuity; audible click every 6 s in game

**Where:** `tools/gen_sounds.py:196` · **Category:** correctness

ambient() is documented as 'Looped in-game' (line 187) and the game loops it forward over the whole file (assets/sfx/ambient.wav.import: edit/loop_mode=1, loop_end=-1; scripts/game.gd:102-106 plays it continuously). But the 48.7 Hz detune component on line 196 completes 48.7 * 6.0 = 292.2 cycles over the 6.0 s buffer — a non-integer count — and the noise low-pass `lp` starts from 0.0 at sample 0 while ending with accumulated state. Measured on the shipped file: the last sample is +3241 and the first is -139, a step of 0.103 full-scale, which is 24% of the file's peak amplitude (0.428). The 48 Hz (288 cycles) and 96 Hz (576 cycles) components and the `pulse` term are loop-clean; 48.7 Hz and the lp state are not.

**Failure:** Player starts the game; Game.start_ambient() begins the looped ambient bed. Every 6.0 seconds the waveform jumps from +3241 to -139, producing a clearly audible tick/click on every loop iteration for the entire session.

**Fix:** Pick a detune whose cycle count over dur is an integer (e.g. 48.5 Hz = exactly 291 cycles in 6 s keeps the beat effect), and make the noise bed loop-clean: either pre-roll the lp filter (run it for ~1 s before recording sample 0) and crossfade the last ~50 ms into the first ~50 ms, or generate the noise bed cyclically. Verify by comparing the first and last samples of the written file.

## Medium

Real defects on edge or failure paths — they bite when something else goes wrong.

### 6. Remote-deploy cleanup script can never kill the running game

**Where:** `export_presets.cfg:42` · **Category:** correctness

The preset's run_script (line 40) launches the game as "{temp_dir}/{exe_name}" --display-driver wayland {cmd_args}, but the cleanup_script (line 42) is Godot's stock `kill $(pgrep -x -f "{temp_dir}/{exe_name}")`. With -x combined with -f, pgrep requires the FULL command line to exactly equal the pattern; the customized run_script guarantees the command line always carries at least `--display-driver wayland`, so the pattern never matches and `kill` runs with no arguments (errors swallowed by 2>/dev/null). The script then `rm -rf`s the temp dir while the game keeps running.

**Failure:** User enables ssh_remote_deploy (README line 39 advertises exactly this) and uses Remote Deploy from the editor. On stop/redeploy the old instance is never killed: the device keeps the previous build running fullscreen, and a redeploy starts a second instance fighting for the screen and input. The only remedy is a manual ssh + pkill.

**Fix:** Match the process the way tools/deploy_to_term35.sh already does: replace the cleanup kill with `pkill -x "{exe_name}"` (process-name exact match, no -f), or drop -x so `pgrep -f "{temp_dir}/{exe_name}"` does a substring match.

### 7. Smoke test hangs forever instead of exiting 1 when its map assumptions break

**Where:** `scripts/debug_drive.gd:181` · **Category:** test-infrastructure

_run_smoke() dereferences `door` without a null guard at lines 181, 192, 193 (and `player` via _place at 158-161). `door` comes from `level.door_at(Vector2i(18,15))` which returns null the moment the K cell moves. When the coroutine hits `door.locked` on null, the script error kills the coroutine, so the `get_tree().quit(1 if _failures > 0 else 0)` at line 232 never runs and the headless process runs forever. This defeats the tool's documented exit-0/1 contract (lines 9-10, CLAUDE.md) in exactly the scenario it exists to catch — CLAUDE.md explicitly warns 'Editing the map breaks the smoke test'. Empirically confirmed: moving K one cell east in a scratch copy printed '[smoke] FAIL: locked door exists', then 'SCRIPT ERROR: Invalid access to property or key locked on a base object of type Nil at debug_drive.gd:181', and the process was still alive minutes later until killed (SIGTERM, exit 143).

**Failure:** A developer moves or removes the locked door in levels/deck1.txt and runs `godot --headless --path . -- --smoke` (or wires it into a script/CI). The run prints two FAILs, a script error, and then never exits — a pipeline blocks until its own timeout with no failing exit code; the PASS/FAIL summary line is never printed.

**Fix:** Bail out early on structural failures: after `_check("locked door exists", ...)` (and `_check("player spawned", ...)`), if the object is null, print the summary and `get_tree().quit(1)` immediately instead of continuing into unguarded dereferences. Alternatively guard every later `door.`/`player.` access the way the enemy block already guards `enemy != null`.

### 8. Ragged map rows are only caught by assert; a release build gets collision holes

**Where:** `scripts/level.gd:115` · **Category:** robustness

_parse validates row lengths with `assert(row.length() == width, ...)` (scripts/level.gd:114-115), and asserts are stripped from release exports — a hazard the file itself acknowledges for the missing-file case (lines 93-98) but not here. `width` is taken from grid[0] (line 113) and cell_at (lines 62-65) indexes `grid[y][x]` for any x < width, so a row shorter than the first one is read past its end; the resulting value is not a WALL_TEX key and not in WALKABLE, so _build_walls emits no mesh and no collision box for that cell while _build_astar (line 265) marks it walkable (is_wall false, not "K"). Note line 101 (`strip_edges(false, true)`) itself manufactures this case if a map row ends in whitespace, and many editors strip trailing whitespace on save. Conversely, if the first map row is the short one, every other row is silently truncated to its length, dropping walls and entities in the missing columns.

**Failure:** A map edit leaves one border row a character short (e.g. an editor trims a trailing space). In the editor the assert fires and the author fixes it; in the exported device build the assert is gone and the level builds with a cell on the perimeter that renders adjacent wall faces but has no collision box and is A*-walkable — the player walks through the apparent wall and off the grid into the void (outside the grid there are no collision bodies; cell_at's "#" is only a query fiction), and enemies path through the same gap.

**Fix:** Replace the assert with real validation in _parse, mirroring the missing-file handling: if a row's length differs from width, push_error with the row number and pad it with "#" (or refuse to build and Game.say a message), so a release build fails loudly or safely instead of silently.

### 9. Truncated or corrupt PNG crashes the whole check run instead of failing one file

**Where:** `tools/check_palette.py:112` · **Category:** robustness

check() wraps read_rgba() in `except ValueError` only, but the decoder raises other exception types on damaged input. Verified empirically against a copy of assets/wall_panel.png: truncated mid-IDAT -> zlib.error ('Error -5 while decompressing'); truncated inside IHDR -> struct.error ('unpack requires a buffer of 13 bytes'); a short final row would raise IndexError at line 64 (raw[pos]). None are caught, so the exception escapes main()'s loop (line 170): the run aborts with a traceback, the remaining files are never checked, and the summary/exit path at lines 177-179 never executes. The docstring's contract 'Exits 0 if every file passes, 1 otherwise' is replaced by a crash (Python's generic exit 1 with a traceback), and one bad file hides the status of every file sorted after it.

**Failure:** gen_assets.mjs is interrupted (Ctrl-C, disk full) mid-write, leaving assets/floor.png truncated. `python3 tools/check_palette.py` then dies with a zlib.error traceback at 'floor'; the ~20 files after it in sorted order are unreported, and a developer skimming for FAIL lines sees none.

**Fix:** Catch (ValueError, struct.error, zlib.error, IndexError, EOFError) at line 112 and report the message as a per-file FAIL — or wrap read_rgba's decode body so every decode error is re-raised as ValueError, matching its own docstring ('Raises on anything else').

### 10. Kill-then-overwrite-in-place deploy leaves device unplayable if the copy fails

**Where:** `tools/deploy_to_term35.sh:154` · **Category:** robustness

The deploy sequence is: kill the running game (line 154), then `scp` the new binary directly onto the live path `~/h11/h11.arm64` (line 155). scp truncates and streams into the destination file in place, so an interrupted transfer leaves a truncated, corrupt executable. With `set -euo pipefail` (line 18) the script aborts at that point with no cleanup: the old game is dead, the old binary is destroyed, and nothing restarts. If the binary copy succeeds but the run_on_pi.sh copy (line 156) fails, the script also exits before chmod (line 157), which on a first-ever deploy leaves the binary non-executable.

**Failure:** WiFi drops (or the user hits Ctrl-C) halfway through the scp of the ~50MB binary. The handheld is left with no game running and a truncated ~/h11/h11.arm64; pressing the device's launcher / running run_on_pi.sh executes a corrupt binary (exec format error or garbage) until someone redeploys from the dev machine.

**Fix:** Copy to a temporary name first and swap atomically: `scp "$BIN" "$TARGET:~/$REMOTE_DIR/$EXE.new"`, then in one ssh command `pkill -x '$EXE' || true; mv ~/$REMOTE_DIR/$EXE.new ~/$REMOTE_DIR/$EXE; chmod +x ...`. This also removes the window where the game is down during the transfer.

### 11. --only with an unknown name silently writes nothing and exits 0

**Where:** `tools/gen_assets.mjs:81` · **Category:** robustness

`names` is built by filtering Object.keys(H11.SIZES) against the --only list; names that match nothing are silently dropped and no error is raised. Verified: `node tools/gen_assets.mjs --only wall_pannel` prints '0/0 written' and exits 0 with no file produced. The same applies per-name in a list: `--only wall_screen,walllight` writes one file, reports '1/1 written', exit 0. Related: `arg()` (line 77) takes the token after the flag blindly, so `--out` followed by another flag (or nothing) misdirects output — `--out --stats` creates a directory literally named '--stats' and writes all 33 PNGs there, exit 0.

**Failure:** Developer regenerates one texture with `--only wall_pannel` (typo), sees a zero-error run and exit 0, and proceeds believing the asset was rebuilt; the stale PNG ships. In CI or a script chain, the && succeeds and nothing downstream notices.

**Fix:** After building `names`, compute the set difference between the --only list and matched names; if any requested name is unknown, print it with the list of valid names and exit 1. Have `arg()` reject a value that starts with '--' or is undefined.

### 12. Asset failing the alpha check is still written, overwriting good art in assets/

**Where:** `tools/gen_assets.mjs:91` · **Category:** robustness

In the main loop, a size mismatch does `bad++; continue` and skips writing (line 88), but the semi-transparent-alpha failure only does `bad++` (line 91) and falls through to `writeFileSync` (line 92). The defective PNG replaces the previously conforming file in assets/ (the default outDir). The summary line then prints `${names.length - bad}/${names.length} written` — claiming the bad file was not written when it was. The header comment promises alpha is 'hardened to 0 or 255 before writing', but when that guarantee is violated upstream the runner ships the violation anyway.

**Failure:** An edit to h11_art.js introduces one blended edge pixel in mutant_0. Running `node tools/gen_assets.mjs` prints '! mutant_0: 1 semi-transparent pixels' to stderr but still overwrites assets/mutant_0.png with the bad file. A developer who misses the stderr line (e.g. output scrolled past 33 filenames) now has defective art in the working tree; in game, Sprite3D alpha_cut = 1 renders the sprite with the jagged-stump artifact the check exists to prevent — and only check_palette.py, run separately, would catch it.

**Fix:** Add `continue` after the semi-transparent error (matching the size-mismatch path), or write to a temp name and only move into place when the asset passes. Make the summary count files actually written.

### 13. Frame mockup hardcodes fog 0.085 while claiming it is Level.FOG_DENSITY (0.025)

**Where:** `tools/h11_frame.js:61` · **Category:** correctness

The tool sells itself as 'a miniature of the engine's own renderer, so the mockup is produced the same way the game produces a frame' (header, lines 3-5), and line 61 annotates the default `FOG = 0.085` with '// Level.FOG_DENSITY'; the header (line 7) likewise states 'depth_shade.gdshader: exp(-distance * 0.085)'. The game actually ships scripts/level.gd:122 `const FOG_DENSITY := 0.025`, and both shaders/depth_shade.gdshader:10 and depth_shade_mip.gdshader:13 default fog_density to 0.025. (The 0.025 value itself is a deliberate owner choice; the defect is that the mockup tool labels the old 0.085 as the game's value.) At 8 m the mockup shades to exp(-0.68) = 0.51 while the game shows exp(-0.20) = 0.82 — a drastically darker, foggier image.

**Failure:** Someone evaluates texture readability, creep visibility, or a screenshot comparison using renderFrame() with defaults, trusting the 'produced the same way the game produces a frame' claim. Distant walls in the mockup are roughly 40% as bright as in the running game; art decisions made against the mockup (contrast, lamp placement) do not hold on the Pi.

**Fix:** Change the default on line 61 to 0.025 and the header comment on line 7 to match, or reword both to say the default is the art brief's authored density and that callers must pass o.fog = 0.025 to reproduce the shipped game.

### 14. Sway scale save/restore is not crash-safe; abnormal exit permanently loses the desktop scale

**Where:** `tools/run_on_pi.sh:31` · **Category:** robustness

OLD_SCALE is read from the live sway state at launch (lines 18-23) and restored via an EXIT/INT/TERM trap (lines 26-33). A trap cannot run on SIGKILL, so if the wrapper is killed with SIGKILL (Linux OOM killer, `pkill -9`, battery pull under systemd hard-stop) the desktop is left at scale 1. Worse, the failure is not self-healing: the next launch reads the live scale, records OLD_SCALE=1, the line-30 guard skips the trap entirely, and the original 1.25 is unrecoverable by this mechanism until sway restarts. Two overlapping launches have the same clobber: instance B reads the scale-1 state that instance A already set, then A's exit restores 1.25 while B's game is still running (resampled pixel art), and B never restores anything.

**Failure:** The game leaks memory on the 8GB Pi 5 and the OOM killer SIGKILLs the process group (wrapper included). The desktop stays at scale 1 (terminal text half-size at arm's length), and every subsequent game launch records scale 1 as the value to restore, so the 1.25 desktop scale is permanently lost until the user restarts sway or fixes it by hand.

**Fix:** Persist the pre-game scale to a state file: write ~/h11/.saved_scale only if it does not already exist (so a crashed previous run's value survives), restore from that file in the trap and also at the top of the next launch before reading the live scale, and delete it after a successful restore. Alternatively, since the device is fixed hardware, hardcode the restore value (e.g. SCALE_DESKTOP=1.25) instead of reading live state.

## Low

Hygiene, stale documentation and minor hazards. Cheap to fix, cheap to ignore for one more release.

### 15. .gitignore is a full Python-project template with hazardous patterns for a Godot repo

**Where:** `.gitignore:17` · **Category:** hygiene

Lines 1-218 are the stock GitHub Python template (Django, Flask, Scrapy, Celery, RabbitMQ, Marimo, Streamlit...), of which this repo uses almost nothing beyond __pycache__/. Several broad patterns are traps for a Godot project: `lib/` and `lib64/` (line 17-18) would silently untrack a future GDExtension directory, `*.so` (line 7) any native library, and `dist/`, `target/`, `var/`, `parts/` common asset/tool folder names. The deliberate entries (build/, .godot/, .DS_Store, .term35-connect.txt) all live in the clearly-commented sections from line 220 on and are correct.

**Fix:** Replace lines 1-218 with the two Python patterns actually needed (__pycache__/, *.pyc) and keep the existing commented Godot/macOS/credentials sections unchanged.

### 16. CLAUDE.md says regeneration reproduces "all 30 files"; the generator writes 33

**Where:** `CLAUDE.md:73` · **Category:** documentation

Line 73 states "a regeneration reproduces all 30 files pixel-for-pixel". tools/h11_art.js H11.SIZES now defines 33 assets (verified by executing it: wall_creep, wall_creep_low and wall_sac were added in commit c9e0dbb after the count was written), and tools/gen_assets.mjs writes all 33.

**Fix:** Change "all 30 files" to "all 33 files", or drop the hardcoded count ("reproduces every file in assets/ pixel-for-pixel") so the sentence cannot go stale again.

### 17. README tuning guidance for FOG_DENSITY describes a range the shipped value is far outside

**Where:** `README.md:26` · **Category:** documentation

README.md:26 tells contributors: "Єдина ручка FOG_DENSITY у level.gd: 0.06 бачиш далеко, 0.16 клаустрофобія" (0.06 = see far, 0.16 = claustrophobia). The shipped value in scripts/level.gd:122 is 0.025 — well outside the documented band, and CLAUDE.md:60 states 0.025 with "lower = see further", the opposite framing. This is a distinct doc surface from the already-reported shader-comment finding: it is the primary user-facing README's only tuning instruction for the game's single visibility knob.

**Fix:** Update README.md:26 to the real scale (shipped 0.025; state that the art was authored against 0.085 and that lower means seeing further), matching CLAUDE.md:60.

### 18. Editor Remote Deploy path skips the Sway scale-1 fix run_on_pi.sh declares necessary

**Where:** `export_presets.cfg:35` · **Category:** correctness

tools/run_on_pi.sh (lines 9-33) documents that the device desktop runs the panel at scale 1.25 and that "any non-unit scale resamples every pixel of hand-drawn pixel art", so it drops the output to scale 1 for the game's lifetime and restores it after. The preset's ssh_remote_deploy run_script (lines 35-40) — advertised in README.md line 39 as an equivalent alternative — launches the binary directly with no swaymsg scale handling.

**Fix:** Port the scale-1/restore logic into the preset's run_script and cleanup_script, or have the run_script invoke the shipped run_on_pi.sh logic instead of launching the binary directly.

### 19. Map legend omits 6 of the 14 wall characters actually used in the map

**Where:** `levels/deck1.txt:2` · **Category:** documentation

The header block (lines 2-8) presents itself as the legend ("# Legend:") and scripts/level.gd line 3 points editors here ("see levels/deck1.txt for the legend"). It documents #, V, L, S, H, X, B, 1, D, K, ., P, e, h, a, k — but the map body also uses T (wall_lab), C (wall_pipes), R (wall_breach), G (wall_creep), N (wall_creep_low), and Y (wall_sac), all defined only in WALL_TEX in scripts/level.gd lines 26-33. README.md advertises editing this file in any text editor as the level-authoring workflow.

**Fix:** Add one legend line for T, C, R, G, N and Y to the header of levels/deck1.txt, mirroring the comments already written in WALL_TEX in scripts/level.gd.

### 20. Bench durations at or below the 2s warm-up report garbage stats (0 or 1 samples)

**Where:** `scripts/debug_drive.gd:39` · **Category:** robustness

Line 39 clamps the bench duration only to `maxf(1.0, ...)`, but line 94 discards every frame until `_bench_t > 2.0` as warm-up. Any `--bench` value <= 2 therefore measures 0 or ~1 frames yet still prints an authoritative-looking report. Empirically confirmed: `--bench=1` prints `[bench] 640x480 frames=0 avg=0.00ms (100000 fps) 1%low=0.00ms (100000 fps) worst=0.00ms`; `--bench=2` prints stats derived from a single frame (`frames=1 avg=2.08ms (480 fps)`). Since this tool exists to make resolution-cost decisions for the Pi (CLAUDE.md's llvmpipe-vs-V3D table was produced with it), a short run silently yields meaningless numbers instead of an error. Note also the effective measurement window is bench-2 seconds while the banner prints the full requested duration.

**Fix:** Clamp bench to a minimum comfortably above the warm-up (e.g. `bench = maxf(5.0, ...)`) or subtract: treat the argument as measured seconds and run for `bench + 2.0`; additionally refuse to print stats when `_bench_ms` has fewer than some minimum sample count and exit non-zero with a clear message.

### 21. Drive mode's door 'use' step has ~43ms of timing margin against USE_RANGE

**Where:** `scripts/debug_drive.gd:60` · **Category:** robustness

The scripted walk (press move_forward at 0.7, release at 2.0, tap use at 2.1) gives 1.3s x 4.2 u/s = 5.46u of travel from the spawn at world x=7.0 (cell (3,2)). The door slab face for the K...D at (7,2) sits at x=14.88 (cell centre 15.0 minus half the 0.24 slab), and player.gd's USE_RANGE is 2.6, so the use-ray connects only if the player has walked >= 5.28u (>= 1.257s of the 1.3s window) — a 43ms (~2.5-frame) margin. The press/release times are quantised to render-frame boundaries in _process, and the synchronous `img.save_png` for the 146KB 00_start shot at t=0.6 (line 136) inflates exactly the frame delta that crosses the 0.7 press threshold. The drive asserts nothing, so a miss is silent.

**Fix:** Either extend the first walk (release at ~2.15 instead of 2.0 — the player still stops well short of the slab, whose face is 2.42u past the nominal stop) or replace the fixed-time 'use' with a distance condition (walk until within USE_RANGE of the door cell), and have the door_opening step log a warning when Game.message never reported the door opening.

### 22. Close-door-early interact branch is effectively unreachable

**Where:** `scripts/door.gd:55` · **Category:** robustness

interact()'s OPEN branch (door.gd:54-55, "close it early if the doorway is clear") requires the player's use ray (mask layer 1) to hit the Door body, whose only collision shape is SlabShape. When open, the 2 m slab is offset SLIDE = 1.9, spanning 0.9-2.9 door-local, while the adjacent wall cell it slides into carries its own full-cell 2x2x2 collision box (level.gd:170-178) spanning 1.0-3.0 — all but a 0.1 m sliver at the jamb is buried inside the wall's collision box, which intercepts the ray first. Every door in deck1.txt slides into a wall cell, so the sliver at the doorway edge is the only hittable surface.

**Fix:** Give the door body a thin static shape spanning the doorway top/frame that stays put (or check in Player._use for a Door at the ray's doorway cell via level.door_at), so an open door can be addressed; alternatively drop the branch and the comment if early-close is not wanted.

### 23. Exit says "DECK CLEARED" precisely when the deck is NOT cleared

**Where:** `scripts/exit.gd:9` · **Category:** correctness

interact() emits Game.say("DECK CLEARED - %d/%d MUTANTS") only inside the `if Game.kills < Game.enemies_total` branch (exit.gd:8-9), i.e. only when mutants remain. When the player actually clears all mutants, no message is shown at all. The message contradicts the state it is guarding on.

**Fix:** Invert the wording or the condition — e.g. say "MUTANTS REMAIN - %d/%d" in the kills < enemies_total branch (or emit "DECK CLEARED" only when kills == enemies_total). If the intent was to gate the exit on a full clear, add a return after the message instead.

### 24. Header comment claims a 320x240 logical screen scaled 2x; layout is native 640x480

**Where:** `scripts/hud.gd:4` · **Category:** hygiene

Lines 3-4 say 'the logical screen is 320x240 (scaled 2x to the PocketTerm's 640x480)', but SCREEN is Vector2(640, 480) (line 6), project.godot sets a 640x480 viewport with viewport/integer stretch, and CLAUDE.md states the game renders natively at 640x480 with no upscale. Every coordinate in _build() (bar at y=416, windows at y=442, key icon at (458,438)) is in real 640x480 device pixels — verified pixel-exact against the painted windows in hud_bar.png (art design space is 320x32 but the PNG is emitted at 2x, 640x64). The comment describes a scaling scheme that does not exist.

**Fix:** Correct the comment to state that all HUD coordinates are native 640x480 device pixels and that the HUD PNGs (hud_bar 640x64, hud_keycard 32x32, weapon 192x144) are emitted at device scale by tools/gen_assets.mjs, so nothing is scaled at draw time.

### 25. fired-signal hookup silently skipped when Game.player is null

**Where:** `scripts/hud.gd:48` · **Category:** robustness

`if Game.player != null: Game.player.fired.connect(_on_fired)` depends on an implicit guarantee: main.tscn lists Level before HUD, and Level._ready() spawns the player synchronously (level.gd _spawn_entities sets Game.player). That holds today, but if the guarantee ever breaks (HUD reordered above Level in main.tscn, player spawn made deferred, or _parse failing and _spawn_entities finding no P), the guard swallows the problem: the connection is simply never made, no error or warning is emitted, and the only symptom is that the weapon never shows its muzzle-flash frame (WEAPON_FIRE at line 177). Every other HUD hookup goes through the persistent Game autoload signals and is immune to this; this is the single connection made directly to a spawned instance.

**Fix:** Replace the silent guard with an explicit failure (`push_error("HUD ready before player spawn — fired signal not connected")`) or decouple: relay the shot through the Game autoload (e.g. a `Game.player_fired` signal emitted from player._fire), matching the architecture rule that the HUD only listens to Game signals.

### 26. Crosshair is drawn 1px right and below the actual aim point

**Where:** `scripts/hud.gd:70` · **Category:** correctness

hud.gd:70 places the crosshair TextureRect at Vector2(312, 232). The texture is 18x18 (verified: assets/crosshair.png IHDR is 18x18, generated from the 9x9 design in h11_art.js at SCALE=2), so it spans [312,330)x[232,250) with its centre at (321,241). The hitscan ray in player.gd:71-75 fires through the camera centre, which projects to the viewport centre (320,240) at the native 640x480 resolution. The project's own art spec calls this out explicitly: specification/ART_REDESIGN.md:202 says "crosshair.png 18x18 | centred; the hardcoded (156,116) becomes (311,231)" — the implementer instead mechanically doubled the old 320x240 coordinate (156,116)*2 = (312,232), which is the exact off-by-one the spec warned against. On a project whose stated bar (README.md:3, CLAUDE.md:7) is "one render pixel per panel pixel, pixel-identical", the sole aiming reference sits one pixel off the ray it represents.

**Fix:** Change hud.gd:70 to cross.position = Vector2(311, 231) as ART_REDESIGN.md 3.4 specifies (18x18 centred on the 640x480 viewport centre).

### 27. Unknown map characters silently become phantom cells with contradictory solidity

**Where:** `scripts/level.gd:265` · **Category:** robustness

_parse and the builders never verify that every map character is either a WALL_TEX key, in WALKABLE (".PDKehak"), or an entity char handled by _spawn_entities. A stray character (typo, or a space in the middle of a row, which line 101's trailing-only strip does not catch) produces a cell that: gets no geometry and no collision box (_build_walls line 167 skips non-WALL_TEX cells), is walkable for A* (line 265: is_wall false and not "K"), yet reports is_solid() == true (line 68-69, since it is not in WALKABLE). No assert or error fires in any build.

**Fix:** At the end of _parse, scan the grid and push_error (plus Game.say in-game) for any character not in WALL_TEX, WALKABLE, or the entity set — one pass, and every future map typo is caught in both debug and release.

### 28. FOG_DENSITY guidance range (0.06-0.16) contradicts the shipped 0.025 scale

**Where:** `shaders/depth_shade.gdshader:9` · **Category:** documentation

The comment directly above the uniform says "// 0.06 = you can see far down the corridor, 0.16 = only a few cells." while the default on the next line is 0.025 — outside and below the documented "see far" end. The identical stale range appears in shaders/depth_shade_mip.gdshader line 12 and README.md line 26 ("0.06 бачиш далеко, 0.16 клаустрофобія"). The current value 0.025 is the owner's deliberate choice; the three guidance texts describing a 0.06-0.16 spectrum predate that rescale and now mislead.

**Fix:** Update the range comment in both shaders and the README sentence to bracket the current value, e.g. "0.025 = shipped, see far; 0.08 = the art's authored density; 0.16 = a few cells".

### 29. Art brief's mandatory reference set specification/style-refs/freedoom/ is absent from the repo

**Where:** `specification/ART_REDESIGN.md:39` · **Category:** documentation

specification/ART_REDESIGN.md:38-39 states "The standard is Freedoom. A reference subset lives in specification/style-refs/freedoom/ (BSD 3-clause — see ATTRIBUTION.md there)", and the brief's acceptance criteria depend on it throughout (line 555: every artboard must show "the Freedoom reference for the same thing directly beside it — that side-by-side is the whole point"; line 605's sign-off checklist requires the side-by-side; lines 100/177/227 cite measurements over "the 51 Freedoom station textures" and "all 69 Freedoom monster frames"). Neither specification/style-refs/ nor any ATTRIBUTION.md exists anywhere in the repo (verified against the full file list and git history), so the brief's quality bar and its licensing pointer both dangle.

**Fix:** Either restore the style-refs subset with its ATTRIBUTION.md, or edit ART_REDESIGN.md to state the reference set was removed after the redesign landed (with a pointer to freedoom.github.io) and strike the now-unactionable side-by-side requirements.

### 30. deploy_to_pi.sh header promises it starts the game, but it never does, and it deploys under a running game

**Where:** `tools/deploy_to_pi.sh:2` · **Category:** correctness

Line 2 says "Copy the exported arm64 build to the PocketTerm and start it under Sway", but the script never starts anything — line 15 tells the user to run ~/h11/run_on_pi.sh themselves. It also never stops a running game before deploying: rsync's temp-and-rename (line 12) survives a busy binary, but the running game keeps executing the old inode, and a user who follows the printed instruction while the old instance is still up launches a second fullscreen instance (which also triggers the scale-clobber race in run_on_pi.sh). The default host `pi@pocketterm.local` (line 8) does not match the real device credentials the term35 flow uses (user `ich`, IP from .term35-connect.txt), so running it with no argument as the header suggests fails to reach the actual device.

**Fix:** Fix the header to say it only copies ("start it on the device with run_on_pi.sh"), add a `pkill -x h11.arm64 || true` before the rsync, and either drop the stale default host or point the header at deploy_to_term35.sh as the primary flow (as CLAUDE.md already does).

### 31. Reachability probe uses BSD-only `nc -G`, falsely reporting the device off on Linux hosts

**Where:** `tools/deploy_to_term35.sh:74` · **Category:** robustness

`nc -z -G 5 "$IP" 22` uses `-G` (connect timeout), which exists only in macOS/BSD netcat. GNU netcat, OpenBSD-netcat-on-Debian (uses -w), and nmap's ncat all reject `-G`, so `nc` exits non-zero regardless of whether the port is open. Because the `command -v nc` branch wins whenever any nc exists, the working `/dev/tcp` fallback on line 76 is never reached, and `reachable` returns false even for a live device.

**Fix:** Use the portable spelling `nc -z -w 5` (accepted by BSD, OpenBSD and GNU variants), or drop nc entirely and use the /dev/tcp probe (with a `timeout`/background guard) as the only implementation.

### 32. Device password is exposed in sshpass argv, visible to other local processes

**Where:** `tools/deploy_to_term35.sh:107` · **Category:** security

Lines 91, 107 and 108 pass the password as `sshpass -p "$DEV_PASS"`. The password becomes an argument of the sshpass process, and process arguments are readable by every other local process via `ps`/`/proc`. The comment on line 106 ("never printed, never in the argv of ssh") and the header claim on lines 13-14 are misleading: the password is not in ssh's argv, but it is in sshpass's argv, which is equally visible. The exposure window covers the whole connection for normal commands and the entire session for `--log` (line 130 `exec`s a long-running `tail -f` under sshpass) — sshpass masks the argument after startup on some platforms, but there is always a race window at spawn, and the masking is not guaranteed on macOS.

**Fix:** Use sshpass's environment mode instead of -p: `SSHPASS="$DEV_PASS" sshpass -e ssh ...` (environment of a process is not readable by other users' processes on macOS/Linux), or `sshpass -f <(printf %s "$DEV_PASS")`. Update the comments on lines 13-14 and 106 to match.

### 33. Launch step swallows ssh stderr, so a failed start aborts the script silently

**Where:** `tools/deploy_to_term35.sh:174` · **Category:** robustness

Line 174 redirects both stdout and stderr of the `ssh -f` launch to /dev/null. The nearby comment only justifies keeping stdout closed (so a surrounding pipeline can end); discarding stderr is collateral. If ssh itself fails here (connection dropped between the copy phase and the run phase, host key changed, port closed), it exits non-zero, `set -e` (line 18) terminates the script immediately, and every diagnostic was sent to /dev/null — the pgrep verification and log-tail fallback on lines 178-183 never run.

**Fix:** Keep `>/dev/null` for stdout but let stderr through (drop the `2>&1`), or capture the exit status explicitly: `if ! "${SSH[@]}" -f ... >/dev/null; then die "could not start the game (ssh failed)"; fi`.

### 34. Documented art regeneration dirties 32 of 33 committed PNGs with pixel-identical bytes

**Where:** `tools/gen_assets.mjs:92` · **Category:** hygiene

CLAUDE.md:33 documents `node tools/gen_assets.mjs --stats` as the standard art workflow and CLAUDE.md:72-74 promises regeneration "reproduces all files pixel-for-pixel". Verified empirically: running the generator on the current toolchain rewrites 32 of the 33 committed assets/*.png with different bytes (e.g. weapon_0.png 10132 -> 2043 bytes) while every decoded RGBA pixel is identical (I compared all 32 pairs pixel-by-pixel). Only assets/wall_screen.png matches byte-for-byte, so the committed set is internally inconsistent — one file was committed from the current encoder (gen_assets.mjs:56-72, filter-none + node:zlib deflate), the other 32 from some other/older encoder. gen_assets.mjs:92 writes unconditionally, so every regeneration produces this spurious churn.

**Fix:** Normalize once by regenerating and committing all assets so the tracked bytes match the in-repo encoder (as wall_screen.png already does), and/or make gen_assets.mjs skip the writeFileSync when the existing file's decoded pixels equal the freshly drawn buffer, so a no-op regeneration leaves the tree clean.

### 35. --stats luminance uses Rec.601 while check_palette's benchmark is defined in Rec.709

**Where:** `tools/gen_assets.mjs:98` · **Category:** correctness

gen_assets.mjs computes luminance with 0.299/0.587/0.114 (Rec.601) at line 98, while tools/check_palette.py line 141 uses 0.2126/0.7152/0.0722 (Rec.709) and its docstring (lines 18-20) pins the Freedoom benchmark (median 21%, p90 39%) explicitly to 'Rec.709 on the 8-bit values'. The percentile indexing also differs (js: floor(p*(len-1)) on sorted values; py: min(len-1, int(len*q))). For the TOXIC-green-heavy files (wall_creep, wall_sac, wall_screen) green is weighted 0.587 vs 0.7152, so the two tools print different median/p90 for identical pixels.

**Fix:** Use the Rec.709 coefficients and the same percentile rule in gen_assets.mjs (or state in its usage comment that its stats are approximate and check_palette.py --stats is the authoritative measurement).

### 36. Only laser() isolates its RNG; every other sound shares the global stream

**Where:** `tools/gen_sounds.py:85` · **Category:** robustness

laser()'s docstring (lines 48-50) establishes the discipline — 'consuming from that stream here would shift every sound generated after this one' — and uses random.Random(11). But hit (line 85), explode (96), door (120), hurt (133), drone_shot (155), growl (179) and ambient (194) all draw from the module-global `random` seeded once at line 15, so each sound's noise depends on exactly how many samples every earlier function consumed.

**Fix:** Give each function its own random.Random(<fixed seed>) as laser() already does, and drop the global random.seed(3).

### 37. Billboard comment states pixel_size 0.015625; game and header say 0.0078125

**Where:** `tools/h11_frame.js:130` · **Category:** hygiene

Line 130's comment reads 'pixel_size 0.015625 -> 2 m tall', contradicting the file's own header (line 9: 'pixel_size 0.0078125 (256 px = 2 m)') and the shipped scenes (scenes/enemy.tscn:22 and scenes/pickup.tscn:20 both set pixel_size = 0.0078125). 0.015625 is the 320x240-era value for 128 px sprites; with the current 256 px sprites it would make them 4 m tall. The rendering math itself is consistent with 2 m sprites, so only the comment is wrong.

**Fix:** Change the line 130 comment to 'pixel_size 0.0078125 -> 2 m tall (256 px)'.

### 38. Stale note claims check_palette.py has a hardcoded 320x240 size table

**Where:** `tools/h11_palette.json:2` · **Category:** hygiene

The note says 'Use `sizes` to update the hardcoded size table in tools/check_palette.py, which still carries the 320x240 values.' check_palette.py has no hardcoded table: main() loads spec["sizes"] from this very JSON (tools/check_palette.py lines 161, 169-170) and already validates the 640x480 values — the checker's output on the current assets confirms it checks 256x256/640x64 sizes.

**Fix:** Reword the note to say check_palette.py reads `sizes` from this file directly, so this table is the single source of truth.

### 39. Verbatim Doom PLAYPAL lump committed in an MIT-licensed public repo without attribution

**Where:** `tools/playpal-base.lmp:1` · **Category:** licensing

tools/playpal-base.lmp is a 768-byte palette lump whose leading entries (0,0,0 / 31,23,11 / 23,15,7 / 75,75,75 / 255,255,255 / 27,27,27 ...) are byte-identical to id Software's Doom PLAYPAL; CLAUDE.md line 71 calls the art "the Doom PLAYPAL gamut" and check_palette.py enforces against this file. The repo has a pushed remote and a blanket MIT LICENSE claiming rights over all contents. The lump is excluded from game exports (tools/* in the exclude_filter), so it never ships in builds, but it is distributed via the repository itself. Freedoom distributes identical palette bytes under BSD-3-Clause, which at minimum requires retaining its copyright notice on redistribution; no provenance or attribution exists anywhere in the repo.

**Fix:** Either regenerate the palette bytes from the Freedoom project and add its BSD-3-Clause notice next to the lump (e.g. tools/PLAYPAL-LICENSE), or replace the lump with a checked-in list of the ramp colors actually used (tools/h11_palette.json already exists) and drop the .lmp.

---

*Produced by a multi-agent review: 6 dimension reviewers + 1 completeness critic + 78 adversarial verification passes (2 per finding). No finding was refuted; severity was re-graded by consensus of reviewer + both verifiers.*
