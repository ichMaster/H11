# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Specification

Read these before planning work; they are the project's contract with itself.

- **[specification/VISION.md](specification/VISION.md)** — what H11 is, for whom, the principles, and
  the non-goals. A request that violates a non-goal is a conversation, not a task.
- **[specification/ARCHITECTURE.md](specification/ARCHITECTURE.md)** — components, the map language,
  contracts, collision layers, the failure modes this project has actually been bitten by, the device,
  and the acceptance gates.
- **[specification/ROADMAP.md](specification/ROADMAP.md)** — eight versions, each phase with Goal,
  Tasks, DoD and the checks that encode the DoD. Current state: **v0 shipped**, next is **v0.8**
  (hardening [CODE_REVIEW.md](CODE_REVIEW.md)).
- **[specification/SDLC.md](specification/SDLC.md)** — how a roadmap phase becomes shipped code: the
  ten skills in `.claude/skills/`, the four acceptance gates, and the `codegen/` instrumentation.

## What this is

H11 "Deck 1" — a Wolfenstein 3D–style demo level built in Godot 4.7 (GDScript, **GL Compatibility** renderer) targeting the Waveshare PocketTerm35 (Raspberry Pi 5, 640x480 screen). The game renders natively at 640x480 — one render pixel per panel pixel, no upscale — so Mac and device are pixel-identical. README.md is in Ukrainian; code and comments are in English.

Godot is not on PATH here — the user runs `godot` from an installed app (`brew install --cask godot`, Godot 4.7.2, non-.NET build). Commands below assume `godot` resolves.

## Commands

```bash
# Headless gameplay smoke test — exits 0/1, prints [smoke] PASS/FAIL lines
godot --headless --path . -- --smoke

# Scripted playthrough with screenshots (needs a renderer)
godot --path . -- --drive=/tmp/shots

# Run interactively (F5 does NOT work on macOS - use the editor's play button)
godot --path .

# Export the device build
godot --headless --path . --export-release "PocketTerm35 (Linux arm64)" build/h11.arm64

# Deploy. deploy_to_term35.sh is the one to reach for: it reads host/user/password
# from the gitignored .term35-connect.txt, can export first, and starts the game.
tools/deploy_to_term35.sh --build        # export, copy, run (--no-run, --stop, --log)
tools/deploy_to_term35.sh --setup-key    # one-off: ssh key, so deploys need no password
tools/deploy_to_pi.sh pi@pocketterm.local  # older, rsync-based, host passed by hand

# Art: edit tools/h11_art.js, then regenerate. Never edit the PNGs.
node tools/gen_assets.mjs --stats          # all assets, with metrics
node tools/gen_assets.mjs --only wall_light  # one, while iterating
python3 tools/check_palette.py --stats     # palette / alpha / size conformance
python3 tools/gen_sounds.py                # audio (procedural, unchanged)
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

**Lighting is faked in a shader.** There are no lights at all: [depth_shade.gdshader](shaders/depth_shade.gdshader) is `unshaded` with exponential distance darkening, because `Environment` fog is unreliable on the Compatibility renderer (see the comment in [main.gd](scripts/main.gd) `_setup_environment()`). Two things must stay in sync: walls/floors use the shader uniform, and billboard sprites (enemies, pickups) call `Level.depth_shade(pos)` which recomputes the *same* exponential in GDScript. `Level.FOG_DENSITY` is the single knob, currently 0.025 (the art was authored against 0.085; lower = see further) — change it and **both** shader defaults together. Emergency-light flicker is `main.gd` `_process()` poking `tint` on the shared `wall_light` material.

**Collision layers** (set in the `.tscn` files, not documented in the editor UI):
`1` = world (walls, doors, exit panels) · `2` = player · `4` = enemy · `8` = pickup.
Player hitscan raycasts against `1|4`; "use" raycasts against `1` and calls `interact(player)` on whatever it hits (duck-typed — doors and the exit body both implement it). Enemies call `hit(damage)`, also duck-typed.

**Gravity is disabled** (`3d/default_gravity=0.0`) and both `CharacterBody3D`s force `position.y = 0.0` after `move_and_slide()`. This is a flat 2.5D world; don't add vertical movement without revisiting that.

## Art

Hand-authored pixel art in the Doom PLAYPAL gamut, drawn for a 640x480 render
target. `assets/*.png` are committed and are the shipping art; they are generated
from `tools/h11_art.js` by `node tools/gen_assets.mjs`. **Edit the drawing code,
never the PNGs** — a regeneration reproduces all 30 files pixel-for-pixel, so any
hand edit is silently lost.

Two rules, and they are the whole discipline:
1. Colours come from a ramp constant in `h11_art.js`, never a literal hex.
   `python3 tools/check_palette.py` enforces it against `tools/playpal-base.lmp`.
2. Gradients are ordered 4x4 Bayer dithers between two adjacent entries of one
   ramp. No smooth transitions, no per-pixel randomisation.

Sprite alpha must be 0 or 255 — `alpha_cut = 1` turns any partial-alpha pixel
into a jagged stump. `assets/alt/` holds eight finished sprites for creature
directions that were not adopted; the game must not load them, and they are
excluded from the export. `tools/gen_assets_legacy.py` is the retired procedural
generator — do not run it, it overwrites `assets/`.

## The device renders on the GPU, but only because of one line on the device

The PocketTerm is a Pi 5, which splits rendering from display: `card0` /
`renderD128` are **v3d** (the 3D GPU), `card1` is **vc4** (display only, cannot
render). Out of the box wlroots advertises `card1` to clients as the dmabuf main
device, so every GL client - Godot, `eglinfo`, `glxinfo` alike - fails to create
a screen on it and falls back **silently** to llvmpipe software rendering. The
only visible symptom is the frame time.

The fix lives in `~/.profile` on the device, next to the `sway` launch, and is
therefore **not in this repository**:

```sh
export WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128
```

Measured on the real device, three 15 s `--bench=15` runs each way:

| | llvmpipe (software) | V3D 7.1.7.0 (GPU) |
|---|---|---|
| mean frame | 11.1 ms (90 fps) | 2.86 ms (350 fps) |
| 1% low | 13.0 ms | 3.03 ms |
| worst frame | 16.27 ms | 3.05 ms |
| process CPU | ~110% | ~25% |

To confirm which one is live: `ls -l /proc/$(pgrep -x h11.arm64)/fd | grep dri`
must show `renderD128`. No fd there means software rendering is back - check
that the `~/.profile` line survived, and that `wayland-info | grep "main device"`
names `card0`/`renderD128` rather than `card1`.

## Working in this repo

- Tuning lives in `const` blocks at the top of each script: enemy difficulty in [enemy.gd](scripts/enemy.gd) (`SPEED`, `SIGHT_RANGE`, `ATTACK_RANGE`, `ATTACK_COOLDOWN`, `HP_MAX`), movement/weapon in [player.gd](scripts/player.gd), door timing in [door.gd](scripts/door.gd), HUD layout constants in [hud.gd](scripts/hud.gd).
- **Editing the map breaks the smoke test.** `_run_smoke()` hardcodes 32x22 dimensions, 7 mutants, 9 doors, and specific cell coordinates: the locked door `K` at `(18,15)` (approached from `(17,15)`), the keycard `k` at `(25,10)`, and the exit panel `X` at `(29,18)` (used from `(28,18)`). Update both together.
- The HUD is positioned in absolute 640x480 coordinates against `SCREEN`/`BAR_H`. The status bar is a painted texture (`hud_bar.png`): the captions, accent line and nameplate live in the PNG, and code draws only the numbers into the windows painted there.
- Texture import settings matter: `[importer_defaults]` in `project.godot` forces uncompressed, no-mipmap imports with `default_texture_filter=0` (nearest). **Two files override this**: `floor.png` and `ceiling.png` generate mipmaps and are drawn with [depth_shade_mip.gdshader](shaders/depth_shade_mip.gdshader), because they are level-wide planes tiled 32x22 and shimmer at distance otherwise. Walls and sprites stay unmipmapped and crisp. `ambient.wav.import` carries a loop flag the code relies on.
- Opening the project in the editor rewrites `project.godot`, dropping every line whose value equals an engine default (Godot only persists overrides). That is expected and harmless — don't "restore" the pruned lines. Re-run `--smoke` after any such rewrite if you want proof nothing shifted.
- `tools/gen_sounds.py` overwrites `assets/sfx/*.wav` wholesale and is seeded (`seed(3)`) so output is reproducible.
- The `.import` and `.uid` sidecar files next to assets and scripts are tracked on purpose. `.godot/` is ignored. `.term35-connect.txt` holds the device password and must never be committed.
- Device detection: `Game.on_device` is true when `OS.has_feature("pocketterm")` (a custom feature tag set by the export preset) or on any Linux ARM host — it switches to fullscreen. Test device-specific behavior by exporting, not by faking it on Mac.
