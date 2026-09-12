# Architecture — H11

## Overview

Three layers, and the boundary between them is the whole design. **Data** — ASCII maps, palettes,
entity tables — describes what a deck is. **Builders** — `Level` and the asset tools — turn that data
into geometry, textures and sounds at load time. **Runtime** — the `Game` autoload, the entity
scripts and the HUD — plays it. The scene tree stays nearly empty on purpose: [main.tscn](../scenes/main.tscn)
is three nodes with scripts, and everything you see is constructed in code from data.

That boundary is why the roadmap's endpoint is reachable. An algorithm that rewrites the station
(v7) only has to rewrite **data** and ask the builders to run again; it never has to author a scene.
Every version below is a widening of the data layer and a corresponding seam in the builders.

Two axes grow separately, as in the vision: **the world** (one deck → many decks, one creature → many
lines, static geometry → mutating geometry) and **the shell** (a single local process → a server with
clients). They are bound by the builders, which never learn which of the two they are serving.

## Components

- **`Game` autoload** ([scripts/game.gd](../scripts/game.gd)). The only global. Owns run state
  (health, ammo, keycard, kills), the input map, a six-voice SFX pool, and the device profile. Every
  cross-system message is one of its signals — `stats_changed`, `message`, `player_damaged`,
  `level_finished`, `player_died`. Nothing polls; the HUD only listens. `Game.player` is the single
  global object reference. From v2 it also owns deck progression; from v6 it becomes the client half
  of the server contract.
- **`Level` builder** ([scripts/level.gd](../scripts/level.gd)). Reads the deck file, then in order:
  parses the grid, merges wall faces into one mesh per texture, lays floor and ceiling, builds an
  `AStarGrid2D` over the same grid, and spawns entities per map character. It is the single place
  that knows the map language. From v1 it is split so that rebuilding a deck at runtime is possible
  without reloading the scene (the precondition for v7).
- **Entities** — `player`, `enemy`, `door`, `pickup`, `exit`. Thin `CharacterBody3D` / `StaticBody3D` /
  `Area3D` scripts, duck-typed against two contracts: `interact(player)` for anything the use key
  can touch, `hit(damage)` for anything a shot can. From v2 their tuning moves out of `const` blocks
  into data tables.
- **HUD** ([scripts/hud.gd](../scripts/hud.gd)). A `CanvasLayer` built entirely in code against
  absolute 640×480 coordinates. The status bar is a painted texture (`hud_bar.png`) — captions,
  accent line and nameplate live in the PNG; code draws only the numbers into the windows painted
  there. From v5 it hosts the automap surface.
- **Renderer**. There are no lights. [depth_shade.gdshader](../shaders/depth_shade.gdshader) is
  `unshaded` and multiplies the texture by `exp(-distance × FOG_DENSITY)`; north/south wall faces take
  a further ×0.72. [depth_shade_mip.gdshader](../shaders/depth_shade_mip.gdshader) is the same shader
  with mipmapped sampling, used **only** by the floor and ceiling planes, which tile 32×22 and crawl
  at distance otherwise. Billboard sprites call `Level.depth_shade(pos)` to recompute the identical
  exponential in GDScript so they sink into the dark with the walls.
- **Art pipeline** (`tools/h11_art.js` + `tools/gen_assets.mjs`). Every pixel of every texture is
  drawn by code in a 128-unit design space and rasterised at `SCALE = 2`. The committed PNGs are its
  output; regeneration reproduces all 33 pixel-for-pixel. `tools/check_palette.py` is the gate.
- **Audio pipeline** (`tools/gen_sounds.py`). Eleven procedural WAVs, stdlib only. The module seeds
  `random` once, so a generator that consumes from that stream shifts every sound after it — new
  sounds take a local `random.Random(seed)` (see `laser()`).
- **Device tooling** (`tools/deploy_to_term35.sh`, `tools/run_on_pi.sh`). Export, copy, launch, and
  the two device-specific corrections: the game runs at panel scale 1 (the desktop's 1.25 resamples
  pixel art) and the session must hand clients the v3d render node (see §The device).

## The map language (the core contract)

A deck is a text file: comment lines, a `facing=` line, a `map:` marker, then a rectangular grid of
single characters. Two dictionaries in `Level` define the language:

- **`WALL_TEX`** — character → texture name. Solid, drawn, collidable.
  `#` panel · `V` vent · `L` emergency light (flickers) · `S` screen · `H` hazard · `X` exit panel ·
  `B` blood · `1` H11 stencil · `T` lab · `C` pipes · `R` breach · `G` creep · `N` creep-low · `Y` sac
- **`WALKABLE`** — `.PDKehak`: floor, player start, door, locked door, enemy, medkit, ammo cell,
  keycard. Anything not in `WALKABLE` is solid; anything in `WALL_TEX` is a drawn wall.

Adding a wall type is one line in `WALL_TEX` plus a texture. Adding an **entity** type today means
editing `_spawn_entities`; **from v1.3 the entity characters come from a data table** so a deck can
declare creatures and items the builder has never heard of.

Invariants any generator or editor must preserve: every row the same length; exactly one `P`; the
grid rectangular; walkable cells reachable. From v1 these are validated at load in release builds,
not by `assert` (which is stripped) — see §Failure modes.

## Input

Twelve actions, bound at runtime. Until v0.9 they came from a `KEYMAP` dictionary in `game.gd` on
**physical** keycodes (so the scheme survives a keyboard-language change); from v0.9 they come from
`data/input.json`, and every input device binds to the same action ids so nothing downstream learns
which device produced an action.

### What the PocketTerm's buttons actually emit

Captured from `/dev/input/event0` on the device (v0.9, H11-015). **Every button is an ordinary
keyboard key — there is no `BTN_*` anywhere**, and the twelve gamepad codes the keyboard advertises
in its capability bitmap are never used. The system exposes no joystick device. So `physical_keycode`
binding reaches all eight, and the game needs no joypad path.

| Button | Code | Key |
|---|---|---|
| X | 45 | `KEY_X` |
| A | 30 | `KEY_A` |
| B | 48 | `KEY_B` |
| Y | 21 | `KEY_Y` |
| L | 38 | `KEY_L` |
| R | 19 | `KEY_R` |
| Select | 99 | `KEY_SYSRQ` |
| Start | 119 | `KEY_PAUSE` |

Each button sends the letter of its own label; Select and Start send SysRq and Pause. A/B/Y/L/R were
captured in one clean pass in press order; X was confirmed separately, twice, after the first pass
lost it to the capture script's startup latency.

### Two profiles, because the codes collide

The buttons are the same physical keycodes the development keyboard scheme already uses, so the two
schemes cannot both be active: `A` is `turn_left` on the Mac and `use` on the device, `X` is
`strafe_right` and `run`, `R` is `restart` and `strafe_right`. `data/input.json` therefore carries
**two profiles** and `Game.on_device` selects between them — the same flag that already switches to
fullscreen. A binding conflict *within* a profile is a load-time failure (v0.9, H11-017); a
difference *between* profiles is the point.

| | `desktop` (Mac, development) | `device` (PocketTerm) |
|---|---|---|
| move | W/S, ↑/↓ | D-pad |
| turn | A/D, ←/→ | D-pad |
| strafe | Q/E, Z/X | **L** / **R** |
| fire | Space, Ctrl | **B** |
| use | F, Enter | **A** |
| run | Shift | **X** |
| next weapon | — (v3.1) | **Y** |
| pause / restart | R | **Start** |
| automap / fps | F3 | **Select** |

## Geometry construction

`_build_walls` emits, per wall cell, only the faces adjacent to a walkable cell, merged into **one
mesh per texture** — a handful of draw calls for a whole deck. Per-face shade (north/south darker) is
baked into vertex `COLOR`. Collision is one `BoxShape3D` per wall cell on a single `StaticBody3D`;
`X` cells go to a separate body running `exit.gd`.

**Winding is clockwise.** Godot treats clockwise triangles as front-facing, the opposite of the
OpenGL default; emitting counter-clockwise makes every face back-facing and `cull_back` discards it.
That bug shipped in the initial commit and hid inside corridors (the far wall's own face fills the
hole) while rendering the entire level perimeter black. Any new surface generator inherits this rule.

Floor and ceiling are two level-wide `PlaneMesh` instances with `uv_scale = (width, height)`. This is
the oldest shortcut in the codebase and the one v1 removes: a four-vertex plane evaluates the fog
varying at four corners, and nothing per-cell can ever vary. **From v1.2 they are built per cell**,
like walls, which is what lets creep spread across a floor and what fixes the corner-interpolated
fog.

## Collision layers

Set in the `.tscn` files, nowhere documented in the editor:

| Layer | Who | Notes |
|---|---|---|
| 1 | world | walls, doors, exit panels |
| 2 | player | |
| 4 | enemy | |
| 8 | pickup | `Area3D`, masks player only |

The player's hitscan raycasts against `1｜4` and calls `hit(damage)` on whatever it finds; the use ray
casts against `1` and calls `interact(player)`. Both are duck-typed, which is what lets v3 add weapon
types and v7 add creature types without touching the player.

## Gravity and the movement model

`3d/default_gravity = 0.0`, and both `CharacterBody3D`s force `position.y = 0.0` after
`move_and_slide()`. This is a flat 2.5D world. The one vertical motion in the game is cosmetic — the
Chorus floats on a sine applied to its billboard, and descends out of that float when it dies. No
planned version introduces real vertical movement; see the vision's non-goals.

## Rendering budget

The device renders on the **V3D GPU**, and only because of one line in the session's `~/.profile`
(§The device). Measured on the panel, three 15 s runs, with the v0 art at 640×480:

| | value | budget |
|---|---|---|
| mean frame | 2.86 ms | 16.67 ms |
| 1% low | 3.03 ms | |
| worst frame | 3.05 ms | |
| process CPU | ~25% of one core | |

That is 18% of budget, about 5× headroom. Every version below states what it may spend. The same
scene under software rendering (llvmpipe) costs 11.1 ms mean and 16.27 ms worst — 98% of budget —
which is the number to remember if the device fix is ever lost.

## Contracts

- **`Level` → entities.** `to_world(x,y)`, `to_cell(pos)`, `is_solid`, `is_wall`, `door_at(cell)`,
  `depth_shade(pos)`, and the shared `astar`. An entity never reads the grid directly.
- **Anything usable** implements `interact(player: Node3D) -> void`.
- **Anything shootable** implements `hit(damage: int) -> void`.
- **`Game` signals** are the only cross-system channel. A system that needs to know something
  subscribes; it does not reach into another node.
- **Art** — a texture is a function in `h11_art.js` registered in the `A` table, its size declared in
  `h11_palette.json` under `sizes`, its pixels inside PLAYPAL, its alpha strictly 0 or 255.
- **Audio** — a sound is a function in `gen_sounds.py` returning samples in ±1, registered in the
  `SFX` dictionary in `game.gd`.

## Data model

Today the entire persistent state of a run lives in the `Game` autoload and dies with the process;
there is no save file and no repository. From **v2.4** a thin `Progress` store (deck reached,
difficulty, settings) lands behind an interface so that v6's server can back it with something other
than a local file — the same shape of seam the rest of the architecture uses.

Deck data is files on disk: `levels/*.txt` today, plus (from v1.3) `data/entities.json` and (from
v3.1) `data/weapons.json`. Everything the AI versions may rewrite is in that directory and nothing
else.

## Failure modes

The project has been bitten three times by the same class of bug — a failure that is silent in a
release build — and the architecture now names it:

- **`assert` is stripped in release builds.** A missing map file once produced a black screen instead
  of an error. `_parse` now pushes an error and shows an on-screen message. Ragged rows are still
  only an `assert`; v1.1 fixes that.
- **Non-resources do not ship.** `export_filter = "all_resources"` includes only Godot resources; the
  ASCII map is a plain `.txt` and reaches the build only through `include_filter`.
- **Everything importable in the project folder ships.** Reference art placed anywhere under the
  project root was baked into the binary twice. `exclude_filter` now covers `specification/*`,
  `assets/alt/*`, `design_handoff*` and `h11_overgrowth_delta/*`, and the build is checked for
  leakage after export.

## The device

Waveshare PocketTerm35 — Raspberry Pi 5, Debian 13, Sway on Wayland, a 640×480 HDMI panel.

- **Hardware rendering is conditional on one line.** The Pi 5 splits rendering (`v3d`, `card0` /
  `renderD128`) from display (`vc4`, `card1`). Out of the box wlroots advertises `card1` to clients as
  the dmabuf main device; Mesa cannot create a screen on a display-only device and falls back to
  llvmpipe **silently**. `export WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128` beside the `sway` launch
  in `~/.profile` fixes it. Verify with
  `ls -l /proc/$(pgrep -x h11.arm64)/fd | grep dri` — no `renderD128` means software rendering is back.
  This lives on the device, not in this repository.
- **The desktop runs at scale 1.25** (an effective 512×384) so terminal text is readable at arm's
  length. That is right for the desktop and wrong for a 640×480 pixel-art game, so `run_on_pi.sh`
  drops the output to scale 1 for the life of the game and restores the previous value from a trap on
  exit.
- **Deployment** is `tools/deploy_to_term35.sh`: read credentials from the gitignored
  `.term35-connect.txt`, export, stop the running game, copy, start it detached (`setsid` so it
  survives the ssh session, `ssh -f` so the script does not hang on the surviving process's fds),
  then verify over a second connection.

## Acceptance and testing

There is no unit-test framework and no per-test runner. Acceptance is four commands, and a phase is
done when they pass:

```bash
python3 tools/check_palette.py --stats     # art: PLAYPAL, binary alpha, exact sizes
godot --headless --path . -- --smoke       # gameplay: 16 assertions, exits 0/1
godot --path . -- --drive=/tmp/shots       # a scripted playthrough that saves frames
./h11.arm64 -- --bench=15                  # on the device: frame timings vs 16.67 ms
```

`--smoke` lives in `_run_smoke()` in [debug_drive.gd](../scripts/debug_drive.gd) and pins the deck:
32×22, 7 mutants, 9 doors, the locked door at `(18,15)`, the keycard at `(25,10)`, the exit at
`(29,18)`. **Editing the map breaks it** — the two move together. From **v1.4** those constants come
from the deck file rather than being literals, so adding decks does not mean rewriting the test.

Each roadmap phase below lists the checks that encode its Definition of Done; new checks are added to
these four runners rather than to a new framework.

## Repository layout

```
assets/            committed art and audio — OUTPUT of tools/, never hand-edited
  alt/             eight finished sprites for creature lines not yet used; excluded from the build
  sfx/             procedural WAVs
levels/            deck files (ASCII)
scenes/            five near-empty .tscn files; all logic is in scripts/
scripts/           game.gd (autoload) · level.gd (builder) · entities · hud.gd · debug_drive.gd
shaders/           depth_shade.gdshader + the mipmapped variant for floor/ceiling
specification/     VISION.md · ARCHITECTURE.md · ROADMAP.md · ART_REDESIGN.md · implementation/
tools/             h11_art.js · gen_assets.mjs · check_palette.py · gen_sounds.py · deploy scripts
.claude/skills/    the SDLC pipeline that turns a roadmap phase into shipped code
```

## Stack

Godot 4.7.2 (standard build, no .NET), GDScript, the **GL Compatibility** renderer — chosen because
the V3D provides OpenGL 3.1 / GLES 3.1 and the Forward+ renderer needs Vulkan the Pi cannot offer at
this budget. Node 25 for the art pipeline, Python 3 (stdlib only) for the audio pipeline and the
palette checker; Pillow is deliberately not a dependency. Bash for deploy. No runtime dependencies
beyond the engine: the exported binary embeds everything.
