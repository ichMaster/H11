# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

H11 "Deck 1" — a Wolfenstein 3D–style demo level built in Godot 4.7 (GDScript, **GL Compatibility** renderer) targeting the Waveshare PocketTerm35 (Raspberry Pi 5, 640x480 screen). The game renders at a logical 320x240 and is integer-scaled 2x, so Mac and device are pixel-identical. README.md is in Ukrainian; code and comments are in English.

Godot is not on PATH here — the user runs `godot` from an installed app (`brew install --cask godot`, Godot 4.7.2, non-.NET build). Commands below assume `godot` resolves.

## Commands

```bash
# Headless gameplay smoke test — exits 0/1, prints [smoke] PASS/FAIL lines
godot --headless --path . -- --smoke

# Scripted playthrough with screenshots (needs a renderer)
godot --path . -- --drive=/tmp/shots

# Run interactively (or F5 in the editor)
godot --path .

# Export the device build
godot --headless --path . --export-release "PocketTerm35 (Linux arm64)" build/h11.arm64
tools/deploy_to_pi.sh pi@pocketterm.local   # rsync to ~/h11, then ~/h11/run_on_pi.sh on device

# Regenerate procedural art / audio (needs Pillow; audio needs nothing)
python3 tools/gen_assets.py
python3 tools/gen_sounds.py
```

Note the `--` separator: [debug_drive.gd](scripts/debug_drive.gd) reads flags via `OS.get_cmdline_user_args()`, so `--smoke`/`--drive=` must come after `--`.

There is no test framework and no single-test runner. `--smoke` is the whole suite; it lives in `_run_smoke()` in [debug_drive.gd](scripts/debug_drive.gd) and is a sequence of `_check(name, ok)` assertions. Add cases there.

## Architecture

**Everything is built in code.** The scene tree is nearly empty — [main.tscn](scenes/main.tscn) is just `Main` + `Level` + `HUD` nodes with scripts attached. Level geometry, the environment, and the entire HUD layout are constructed at runtime. Don't look for prefabs or a level editor; look for the builder functions.

**Generation pipeline** — [level.gd](scripts/level.gd) `_ready()` runs in this order:
1. `_parse()` reads [levels/deck1.txt](levels/deck1.txt) — a commented ASCII grid with a `facing=` line and a `map:` marker. All rows must be the same length (asserted).
2. `_build_walls()` walks the grid and merges wall faces into **one mesh per texture** via `SurfaceTool`, emitting only faces adjacent to walkable cells. Per-face shade (N/S walls darker, Wolf3D-style) is baked into vertex `COLOR`. Collision is one `BoxShape3D` per wall cell on a single `StaticBody3D`; `X` (exit) cells go to a separate body running [exit.gd](scripts/exit.gd).
3. `_build_floor_ceiling()` — two `PlaneMesh` instances with `uv_scale` tiling.
4. `_build_astar()` — `AStarGrid2D` over the same grid; locked (`K`) cells start solid and are unmarked when the keycard opens them.
5. `_spawn_entities()` — instantiates player/enemy/door/pickup scenes per map character.

Two dictionaries in `level.gd` define the map language: `WALL_TEX` (char → `assets/<name>.png`) and `WALKABLE`. Adding a wall type = one line in `WALL_TEX` + a texture.

**Global state is the `Game` autoload** ([game.gd](scripts/game.gd), registered in [project.godot](project.godot)). It owns health/ammo/keycard/kills, the input map, the SFX pool, and the device profile. All cross-system communication goes through its signals (`stats_changed`, `message`, `player_damaged`, `level_finished`, `player_died`) — the HUD only listens, it never polls game objects. `Game.player` is the one global object reference.

**Input is built at runtime** from the `KEYMAP` dictionary in `game.gd` using *physical* keycodes (keyboard-language independent). There are no input actions in `project.godot`. Rebinding for the PocketTerm keyboard means editing that one dictionary.

**Lighting is faked in a shader.** [depth_shade.gdshader](shaders/depth_shade.gdshader) is `unshaded` with exponential distance darkening, because `Environment` fog is unreliable on the Compatibility renderer (see the comment in [main.gd](scripts/main.gd) `_setup_environment()`). Two things must stay in sync: walls/floors use the shader uniform, and billboard sprites (enemies, pickups) call `Level.depth_shade(pos)` which recomputes the *same* exponential in GDScript. `Level.FOG_DENSITY` is the single knob (0.06 far, 0.16 claustrophobic) — change it and the shader default together. Emergency-light flicker is `main.gd` `_process()` poking `tint` on the shared `wall_light` material.

**Collision layers** (set in the `.tscn` files, not documented in the editor UI):
`1` = world (walls, doors, exit panels) · `2` = player · `4` = enemy · `8` = pickup.
Player hitscan raycasts against `1|4`; "use" raycasts against `1` and calls `interact(player)` on whatever it hits (duck-typed — doors and the exit body both implement it). Enemies call `hit(damage)`, also duck-typed.

**Gravity is disabled** (`3d/default_gravity=0.0`) and both `CharacterBody3D`s force `position.y = 0.0` after `move_and_slide()`. This is a flat 2.5D world; don't add vertical movement without revisiting that.

## Working in this repo

- Tuning lives in `const` blocks at the top of each script: enemy difficulty in [enemy.gd](scripts/enemy.gd) (`SPEED`, `SIGHT_RANGE`, `ATTACK_RANGE`, `ATTACK_COOLDOWN`, `HP_MAX`), movement/weapon in [player.gd](scripts/player.gd), door timing in [door.gd](scripts/door.gd), HUD layout constants in [hud.gd](scripts/hud.gd).
- **Editing the map breaks the smoke test.** `_run_smoke()` hardcodes 32x22 dimensions, 7 mutants, 9 doors, and specific cell coordinates: the locked door `K` at `(18,15)` (approached from `(17,15)`), the keycard `k` at `(25,10)`, and the exit panel `X` at `(29,18)` (used from `(28,18)`). Update both together.
- The HUD is positioned in absolute 320x240 coordinates against `SCREEN`/`BAR_H` — anything hardcoded must respect that logical resolution, not the 640x480 window.
- Texture import settings matter: the `[importer_defaults]` block in `project.godot` forces uncompressed, no-mipmap imports and `default_texture_filter=0` (nearest), which is what keeps the pixel art crisp and the Pi happy. `ambient.wav.import` carries a loop flag the code relies on.
- Opening the project in the editor rewrites `project.godot`, dropping every line whose value equals an engine default (Godot only persists overrides). That is expected and harmless — don't "restore" the pruned lines. Re-run `--smoke` after any such rewrite if you want proof nothing shifted.
- Asset generators overwrite `assets/*.png` and `assets/sfx/*.wav` wholesale — hand-edited art in those paths will be lost on regeneration. Both scripts are seeded (`random.seed(11)` / `seed(3)`) so output is reproducible.
- `.gitignore` is a stock Python one; it does **not** exclude Godot's `.godot/` import cache. Don't commit that directory. The `.import` and `.uid` sidecar files next to assets and scripts *are* meant to be tracked.
- Device detection: `Game.on_device` is true when `OS.has_feature("pocketterm")` (a custom feature tag set by the export preset) or on any Linux ARM host — it switches to fullscreen. Test device-specific behavior by exporting, not by faking it on Mac.
