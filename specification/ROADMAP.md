# Roadmap — H11

Eight versions, built in order: **v0** the prototype that proved the loop on the device, hardened and
given a control scheme worth building on → **v1** foundation (structure, GPU-native assets, the data
seams everything later plugs into) → **v2** the station (decks and creature lines) → **v3** arsenal
(weapons, effects, ammunition) → **v4** presence (movement feel, environment dynamics, a sound field)
→ **v5** the Navigator (automap and voice) → **v6** server and multiple players → **v7** Hypothesis 11
(agents, and an algorithm that rewrites the station while you are in it).

Versions are numbered from 0; phases inside a version are `vA.B` (A = version, B = phase), e.g.
`v2.3`. Each phase lists a **Goal**, a short description, **Tasks**, a **Definition of Done**, and the
**Tests** that encode that DoD — added to the four acceptance runners in
[ARCHITECTURE.md](ARCHITECTURE.md) §Acceptance and testing, never to a new framework.

**Versioning (`A.B.C`).** `A` = roadmap version, `B` = phase within it (`v2.3` → `2.3.0`), `C` = a
post-release fix on that phase. Releases are cut per phase. Never bump the version without explicit
confirmation. v0.1–v0.7 shipped before this roadmap existed and are documented retrospectively; the
first tagged release is **`0.8.0`**, cut 2026-09-12.

**The two axes.** *The world* grows one deck → many decks → many creature lines → a station that
edits itself. *The shell* grows one local process → a process with a map and a voice → a server with
clients. They are bound by the builders in `scripts/level.gd` and `tools/`, which never learn which
axis they are serving. Complexity is added by version, never all at once.

**Source of the plan.** The version list is `specification/TODO.txt` ordered by dependency; each
version names the TODO items it discharges. Two phases come from elsewhere: **v0.8** is the hardening
pass over [CODE_REVIEW.md](../CODE_REVIEW.md), and **v0.9** closes a gap the TODO never named — the
control scheme, which every version from v2 onward would otherwise extend by accident.

---

## v0 — Prototype 0: one deck, on the device, at 60 fps

*(TODO 0 — shipped)*

The proof that the whole loop closes on real hardware: an ASCII map becomes geometry, a player
clears a deck, and it runs on a 3.5″ panel on the GPU inside the frame budget. Everything here is
already in `main`; v0.1–v0.7 are written retrospectively so later versions have something to depend
on, and because two of them (v0.6, v0.7) are the reason the budget exists at all. The last two phases
are not retrospective: **v0.8** clears the review of the prototype, **v0.9** turns the control scheme
into data before six versions start appending keys to it, and **v0.10** gives the deck a score and the
repository its first supplied asset. **Depends on:** nothing.

### v0.1 — The engine loop (shipped)

**Goal:** an ASCII file becomes a walkable 3D deck.

The map parser, the wall-mesh builder (one merged mesh per texture, only faces adjacent to walkable
cells), floor and ceiling planes, the `AStarGrid2D` over the same grid, and entity spawning per map
character. The `Game` autoload with run state, the runtime-built input map on physical keycodes, and
the signal set every later system listens to.

**DoD:** `godot --path .` opens a deck you can walk, with collision.

### v0.2 — The game (shipped)

**Goal:** a deck you can actually clear.

Player movement and a hitscan weapon; the Chorus with an A* chase, a line-of-sight check, a lunge and
a distance-falloff hit chance; sliding doors with a crush sensor; a locked door that consumes a
keycard and unmarks the A* cell; pickups; the exit panel; the death and completion overlays.

**DoD:** find the keycard, unlock the door, reach the exit — win and restart.

### v0.3 — The look (shipped)

**Goal:** Doom-era light without lights.

The unshaded depth-shading shader with a single `FOG_DENSITY` knob, north/south face darkening baked
into vertex colour, a flickering emergency lamp driven from `main.gd`, and billboard sprites that
recompute the same exponential in GDScript so they sink into the dark with the walls.

**DoD:** a corridor recedes into darkness and sprites darken with it.

### v0.4 — Acceptance without a keyboard (shipped)

**Goal:** the game can be checked by a machine.

`--smoke`: a headless run that drives the player through a locked door, the keycard, a kill and the
exit, printing PASS/FAIL and exiting 0/1. `--drive`: a scripted playthrough that saves frames.
Later joined by `--bench`.

**DoD:** `godot --headless --path . -- --smoke` exits 0 with 16 passes.

### v0.5 — The device (shipped)

**Goal:** it runs on the PocketTerm, from one command.

The Linux arm64 export preset with the `pocketterm` feature tag; `deploy_to_term35.sh` reading
credentials from a gitignored file, exporting, copying and launching detached; `run_on_pi.sh`
resolving the Wayland socket. Two classes of shipping bug found and fixed here: the ASCII map is not
a Godot resource and needed `include_filter`; everything importable under the project root ships, and
licensed reference art was baked into the binary twice before `exclude_filter` covered it.

**DoD:** `tools/deploy_to_term35.sh --build` puts a running game on the panel and the binary contains
nothing it must not ship.

### v0.6 — The art redesign, 640×480 native (shipped)

**Goal:** hand-authored pixel art at panel resolution.

Thirty-three textures drawn by code in `tools/h11_art.js` within the Doom PLAYPAL gamut, with
ordered 4×4 dithers and no literal colours, regenerated by `node tools/gen_assets.mjs` and gated by
`tools/check_palette.py`. The render target moved from a 320×240 viewport scaled 2× to native
640×480, so every HUD coordinate doubled and `Sprite3D.pixel_size` became `0.0078125`. Mipmaps and a
second shader for the two level-wide planes. The Chorus became a floating creature: a four-frame
drift cycle, a sine on the billboard, and a death that descends out of that float.

**DoD:** `check_palette.py` passes 33/33; `--drive` frames match the sign-off mockup.

### v0.7 — The GPU, and what it was hiding (shipped)

**Goal:** the frame budget is real, and measured.

The device was rendering in **software** the whole time. The Pi 5 splits rendering (`v3d`) from
display (`vc4`); wlroots advertised the display node to clients, Mesa could not create a screen on it
and fell back to llvmpipe without an error. One line beside the `sway` launch —
`WLR_RENDER_DRM_DEVICE=/dev/dri/renderD128` — moved the game onto the GPU: mean frame 11.1 → 2.86 ms,
worst 16.27 → 3.05 ms, CPU ~110% → ~25%. The panel's 1.25 desktop scale is dropped to 1 for the life
of the game and restored on exit. Also here: the winding bug that had rendered the entire level
perimeter black since the initial commit.

**DoD:** `renderD128` appears in the running game's open fds; `--bench` reports ≥5× headroom.

### v0.8 — Prototype-0 hardening (released `0.8.0`)

**Goal:** clear the review before building on top of it.

[CODE_REVIEW.md](../CODE_REVIEW.md) found 39 confirmed defects. This phase closes the five **High**
findings — every one of them visible to a player right now — and the nine **Medium** findings, which
are failure paths that will bite once the pipeline below starts running unattended. **Depends on:**
v0.7.

**Tasks:**
- Doors show a 1/6 crop of their texture: Godot's `BoxMesh` uses a 3×2 per-face UV atlas. Set
  `uv_scale = (3, 2)` on the door materials, or replace the slab with explicit quads.
- Killed mutants stay permanently red: `_flash` is set by the killing blow and the decay is
  unreachable once `state == DEAD`. Clear it in `_die()`.
- Ammo and keycard pickups render as medkits: `add_child` fires `_ready` before `setup()` assigns
  `kind`. Apply the texture in `setup()`, or call `setup()` before `add_child`.
- Floor and ceiling fog is evaluated at the four corners of a level-wide plane. Move the exponential
  into `fragment()` in the mipmapped shader (it is used only by those two planes).
- `ambient.wav` has a hard discontinuity at the loop seam — an audible click every six seconds.
  Cross-fade the seam in `gen_sounds.py`.
- The nine **Medium** findings: the deploy's kill-then-overwrite order, the smoke test hanging
  instead of exiting 1 when its map assumptions break, ragged map rows guarded only by `assert`,
  `check_palette.py` crashing on a corrupt PNG instead of failing one file, `gen_assets.mjs` writing
  an asset that failed its own alpha check, `--only` with an unknown name exiting 0 silently, the
  mockup renderer's hardcoded fog, `run_on_pi.sh`'s scale restore not being crash-safe, and the
  remote-deploy cleanup script that can never kill the running game.
- Re-file the 25 **Low** findings as issues against the version that touches that file, rather than
  fixing them here.

**DoD:** every High and Medium finding in `CODE_REVIEW.md` is fixed or explicitly deferred with a
reason recorded in the file; the four acceptance gates pass; the deck looks correct on the device.

**Tests:** `--smoke` gains assertions for pickup texture identity and for a dead enemy's modulate
returning to the depth-shade value; `check_palette.py` gains a corrupt-file case; a new
`--smoke` assertion fails (rather than hangs) when the deck's pinned constants do not match.

**Release:** `0.8.0`.


### v0.9 — Input as data (released `0.9.0`)

**Goal:** the control scheme is a file, decided once, instead of a dictionary that every later
version quietly appends to.

`KEYMAP` in `game.gd` is twelve actions on physical keycodes — right in that it survives a keyboard
language change, wrong in that it is source. Changing a binding means editing GDScript and
re-exporting, and nothing in the game can change one at all. That is tolerable for a prototype with
twelve actions and untenable from here: v2.1 adds a map key, v3.1 weapon switching, v5.1 the
automap, v6 a chat. Each would append to the same dictionary, and by v5 the scheme would be twenty
bindings nobody ever designed. The device also has inputs the game has never touched — a 67-key
keyboard whose layout was never checked against the bindings, and a Goodix capacitive touch layer.

This is the last phase of the prototype for the same reason v0.8 was: it is cheaper to do before six
versions add keys than after. **Depends on:** v0.8.

**Tasks:**
- `data/input.json`: one entry per action — id, the physical keycodes bound to it, a display name for
  the eventual rebinding UI, and whether it repeats. `Game._setup_input()` reads it; `KEYMAP` goes.
- Validate the table at load like a deck (v1.1 generalises this): unknown action ids, unknown key
  names, and **binding conflicts** — the same key on two actions in a context that can receive both.
  A conflict is a failure, not a last-writer-wins surprise.
- **Learn what the buttons actually emit.** The PocketTerm's keyboard advertises twelve `BTN_*`
  gamepad codes alongside its letter codes, and there is no joystick device on the system. Capture
  the real events from `/dev/input/event0` while each button is pressed, and record the result: if
  X/A/B/Y/L/R/Select/Start emit `BTN_*`, they reach Godot as **joypad** input and the current
  `KEYMAP` — which binds `KEY_*` only — means those buttons do nothing today. Either way the action
  table binds both device kinds to the same action ids.
- Check the scheme against the real 67-key PocketTerm keyboard rather than a full-size one: confirm
  every bound key physically exists and is reachable without a modifier the panel makes awkward.
  Record the layout in ARCHITECTURE so later versions bind into a documented scheme.
- Touch as a second input device: screen zones for fire and use, mapped to the same action ids so
  nothing downstream knows which device produced an action. Off unless the device reports a
  touchscreen.
- A held-action and a tap-action distinction in the table (movement is held, use is a tap), so later
  versions stop hand-rolling `is_action_pressed` vs `just_pressed` per feature.
- Update v3.1's weapon switching to *declare* its actions in the table instead of appending to a
  dictionary.

**The agreed button scheme.** Decided here rather than accumulated later; it follows the convention
every handheld Doom port arrived at, so it is already in the player's fingers.

| Button | Action | Why |
|---|---|---|
| D-pad | move forward / back, turn left / right | the base |
| **L** / **R** | strafe left / right | shoulders for strafe is the handheld-FPS answer to having no second stick |
| **B** | fire | under the thumb, the most frequent action |
| **A** | use — doors, the exit panel | beside fire, the second most frequent |
| **X** | run (held) | reachable without leaving fire |
| **Y** | next weapon | idle until v3.1 declares it |
| **Start** | pause / restart after death | convention |
| **Select** | automap | idle until v5.1; shows the fps counter meanwhile |

The keyboard scheme stays as it is — it is how the game is developed on the Mac, and the table binds
both to the same action ids, so neither is a special case.

**DoD:** every binding in the game comes from `data/input.json`; adding an action in a later version
is a line in that file and no GDScript change; a conflicting or unknown binding fails at load with a
named reason; **the button scheme above is playable end to end on the device**, whichever event kind
the buttons emit; and fire and use also work by touch.

**Tests:** `--smoke` drives the whole deck-1 objective chain through **action ids** rather than
synthetic key events, so it exercises the table; fixtures for an unknown action, an unknown key name
and a duplicate binding each fail at load with their own message; a device pass confirming every
bound key exists on the 67-key layout.

**Release:** `0.9.0` closes the prototype. Everything after it is v1 and the real project.



### v0.10 — Music, and the first supplied asset (released `0.10.0`)

**Goal:** the station has a score, the player can silence it, and the weapon sounds like a weapon.

Every asset in this project is **output**: textures from `tools/h11_art.js`, sounds from
`tools/gen_sounds.py`, and `assets/sfx/*.wav` is overwritten wholesale on every regeneration. A music
track cannot be generated by 200 lines of stdlib Python, so it is the first **supplied** asset the
repository holds — and that needs a documented home before a second one arrives and someone puts it
where the generator will erase it. **Depends on:** v0.9 (the toggle is an action, and this phase is
the first real test of "adding an action is a line in a data file").

**Tasks:**
- `assets/music/` for supplied audio, deliberately beside `assets/sfx/` rather than inside it:
  everything in `sfx/` is generated and disposable, nothing in `music/` is either. Record the
  distinction in ARCHITECTURE §Audio.
- Play the track looped under the ambient bed — the hum is the room, the track is the score, and
  they coexist rather than replace each other. Looping set in code, not in the `.import` flag that
  `ambient.wav` depends on and that a reimport can silently drop.
- A `toggle_music` action bound in **both** input profiles, with an on-screen confirmation. The
  state is not persisted: there is no settings store until v2.4, and inventing one here would be the
  wrong phase for it.
- Replace the weapon sound: the shipped one is a falling-pitch plasma note, and the weapon on screen
  is a pump shotgun. Dull and long — energy concentrated below 200 Hz, the mid scooped, a tail that
  outlasts the fire cooldown so sustained fire overlaps in the voice pool the way a shotgun in a
  corridor does.
- Rename the sound id from `laser` to `shotgun`. A shotgun called `laser.wav` is exactly the drift
  this project keeps catching in review.

**DoD:** the track loops under the ambient bed from the first frame; `M` silences and restores it on
both the Mac and the device; the weapon reads as a shotgun by ear; `tools/check_audio.py` passes; the
build grows by the size of the track and nothing else.

**Tests:** `check_audio.py` covers the new WAV (decode, no clipping) as it does the rest; the
action-count assertion in `--smoke` picks up `toggle_music` automatically because it reads the table
rather than a literal; a device pass for the toggle and for the shotgun by ear.

**Release:** `0.10.0`.


---

## v1 — Foundation: structure, GPU-native assets, data seams

*(TODO 1 — "project structure and redesign sprites to make them adopted for GPU")*

The prototype is one deck hardcoded into a builder. This version turns it into a project that can
hold ten: a directory structure with a place for decks, entities and weapons; an asset pipeline sized
and batched for the V3D rather than for a 128-unit design space; per-cell floor and ceiling; and the
data tables that let a deck declare content the builder has never seen. **Nothing here is visible to
a player** — and everything after it depends on it. **Depends on:** v0.8.

### v1.1 — Project structure and load-time validation

**Goal:** a place for everything the next six versions add, and a loud failure when data is wrong.

**Tasks:**
- Introduce `data/` for content tables and `levels/` for decks; move the deck legend out of the file
  header comment into a generated document so it cannot drift from `WALL_TEX`.
- Replace every remaining `assert` on loaded data with a release-safe validation pass: rectangular
  grid, exactly one `P`, every walkable cell reachable, every character known. Failures push an error
  and show an on-screen message.
- A `tools/validate_deck.py` runner so a deck can be checked without launching the engine, wired into
  the acceptance set.
- Split `level.gd` so that parse, build-geometry, build-navigation and spawn are separately callable —
  the precondition for rebuilding a deck without reloading the scene.

**DoD:** a malformed deck fails with a named reason in a release build; `validate_deck.py` passes on
every file in `levels/`.

**Tests:** `validate_deck.py` fixtures for ragged rows, no `P`, two `P`s, an unknown character and an
unreachable exit; `--smoke` unchanged.

### v1.2 — Per-cell floor and ceiling

**Goal:** the ground stops being two giant triangles.

The two level-wide planes are replaced by per-cell quads merged per texture, exactly like walls. This
fixes the corner-interpolated fog, lets a deck vary its floor per cell, and is what creep needs to
spread across the ground rather than only up a wall.

**Tasks:**
- Emit floor and ceiling quads per walkable cell into per-texture surfaces; keep the mipmapped shader
  for them.
- Extend the map language with floor characters (a second optional grid block, or a per-cell suffix —
  decide in the phase and record it in ARCHITECTURE).
- Add `floor_creep` to the art set with the same tiling proofs as the wall creep.

**DoD:** floor brightness tracks distance to the fragment, not to the level corners; a deck can put
creep on the ground; the far floor does not shimmer while walking.

**Tests:** `--drive` frames compared against the v1.1 baseline for the fog gradient; `check_palette.py`
covers the new textures; `--bench` on the device stays under 6 ms mean.

### v1.3 — Entities as data

**Goal:** a deck declares its inhabitants; the builder does not know them.

**Tasks:**
- `data/entities.json`: for each map character, the scene to spawn plus its tuning (speed, sight,
  attack range, cooldown, hit points, damage range, sprite set, sound set).
- `enemy.gd` reads its tuning from the table instead of `const` blocks; frame lists and sound ids come
  from data.
- `pickup.gd` likewise: kind, texture, amount, message.
- A validation pass over the table at load, reported like a malformed deck.

**DoD:** a second creature line can be added by editing `data/entities.json` and dropping sprites into
`assets/` — no GDScript change.

**Tests:** `--smoke` spawns a synthetic test creature from a fixture table and kills it; a table with a
missing sprite fails validation rather than spawning an invisible enemy.

### v1.4 — Acceptance that survives new decks

**Goal:** adding a deck does not mean rewriting the test.

**Tasks:**
- `--smoke` derives its expectations (dimensions, creature count, door count, the keycard/locked-door/
  exit coordinates) from the deck file instead of literals.
- `--smoke` takes a deck argument and runs against any deck in `levels/`.
- `--drive` takes a start cell and facing so a phase can photograph a specific piece of geometry
  without editing the map (the workaround used throughout v0).
- `--bench` gains a `--bench-deck` argument and reports per-deck.

**DoD:** `--smoke` passes on every deck in `levels/` with no per-deck code.

**Tests:** the runner itself — a deliberately broken fixture deck must make `--smoke` exit 1 with a
named assertion, not hang.

### v1.5 — Asset pipeline for the GPU

**Goal:** the art set is authored and packed for a V3D, not for a 128-unit canvas.

**Tasks:**
- Measure first: texture memory, draw calls and material count per deck on the device; record the
  baseline in the phase report.
- Pack wall textures into atlases per material family, with the UV rectangles emitted into the same
  data the builder reads; keep `check_palette.py` operating on the source PNGs.
- Sprite sheets for creature frames instead of one texture per frame, so a creature is one material.
- Decide mipmap policy per family from measurement, not preference, and record it.
- Regeneration must still reproduce every committed PNG pixel-for-pixel.

**DoD:** draw calls per deck and texture memory both fall against the v1.5 baseline; `--bench` mean
frame improves or is unchanged; `check_palette.py` passes 100%.

**Tests:** a pipeline test asserting atlas UVs round-trip (a texture packed and unpacked equals the
source); `--drive` frames identical to the pre-atlas build within a tolerance of zero.

**Release:** `1.5.0` closes the version.

---

## v2 — The station: decks and creature lines

*(TODO 2 — "more levels with different design and more enemies")*

One deck becomes a station. This version adds deck-to-deck progression, three more decks with
distinct identities, and the creature lines already drawn and waiting in `assets/alt/`. **Depends
on:** v1 (entities as data, deck-agnostic acceptance).

### v2.1 — Deck transitions

**Goal:** the exit leads somewhere.

**Tasks:**
- A deck manifest (`data/decks.json`): order, display name, next deck, starting loadout policy.
- `exit.gd` loads the next deck rather than ending the run; a between-decks screen shows the deck
  name and carried state.
- `Game` carries health, ammo and keys across a transition per the manifest's policy.

**DoD:** clearing deck 1 begins deck 2 with the player's state intact.

**Tests:** `--smoke` gains a transition assertion (reach exit → next deck loaded, state carried);
`--drive` covers the between-decks screen.

### v2.2 — Deck 2: the technical deck

**Goal:** a second deck that is not deck 1 rearranged.

A vertical-corridor floor plan built around the pipes/breach/coolant texture family, with a different
pacing: longer sightlines, fewer rooms, the first two-key lock.

**DoD:** deck 2 passes `--smoke`, is clearable in 3–5 minutes, and reuses no room shape from deck 1.

**Tests:** `--smoke` on deck 2; `validate_deck.py`; `--bench` on the device for the deck's worst view.

### v2.3 — Two more creature lines

**Goal:** the station has more than one thing living in it.

Adopt `crawler` (a quadruped that is mostly jaw — the strongest of the four unused directions) and
`crew` (the former-human line) from `assets/alt/`, as data-table entries with their own behaviour
parameters: the crawler fast and short-sighted, the crew slower with a ranged attack.

**Tasks:**
- Entity table entries, sprite sets, sound sets; a ranged-attack behaviour in `enemy.gd` selected by
  data, not by subclass.
- Per-line death handling (the Chorus descends; the crawler does not float).
- Populate decks 1 and 2 with a mix.

**DoD:** three creature lines coexist on one deck with distinct silhouettes and behaviour; `--bench`
with the worst-case creature count stays inside budget.

**Tests:** `--smoke` kills one of each line and asserts per-line death state; a bench with the maximum
creature count a deck declares.

### v2.4 — Decks 3–4 and progress

**Goal:** a station with a beginning and an end, and it remembers.

Two more decks (the laboratory and the breach), and a `Progress` store behind an interface: deck
reached, difficulty, settings. Local file now; v6's server backs it with something else without
changing the callers.

**DoD:** a four-deck run can be completed, quit, and resumed at the last deck reached.

**Tests:** `--smoke` on decks 3 and 4; a progress round-trip test (write, reload, resume).

**Release:** `2.4.0`.

---

## v3 — Arsenal: weapons, effects, ammunition

*(TODO 3 and 4 — "more weapons and effects of shooting", "finding new weapons and ammunition")*

The player has one hitscan weapon and one ammo type. This version makes weapons data, gives shooting
a visible and audible consequence, and puts new weapons in the world to find. **Depends on:** v1.3
(data tables), v2.1 (carrying state between decks).

### v3.1 — Weapons as data

**Goal:** a weapon is a table row.

**Tasks:**
- `data/weapons.json`: damage, cooldown, range, spread, projectile or hitscan, ammo type and cost,
  sprite set, sound set, HUD placement.
- `player.gd` holds a weapon set and a selected index; the number keys and the cycle key are
  **declared in `data/input.json`** (v0.9), never appended to a dictionary in code.
- The HUD draws the selected weapon and its ammo from the table.
- Ammunition is shared across weapons per the TODO — one ammo pool, per-weapon cost.

**DoD:** three weapons selectable and usable, all defined in data, none in GDScript.

**Tests:** `--smoke` fires each weapon and asserts the ammo cost and damage from the table; a fixture
weapon with an unknown ammo type fails validation.

### v3.2 — Shooting has consequences

**Goal:** a shot marks the world.

**Tasks:**
- Impact decals on walls (a pooled quad set with a cap, oldest recycled) and a spark/dust puff at the
  hit point.
- Muzzle flash as a brief HUD overlay plus a light-free brightness pulse on nearby surfaces, done in
  the existing shader's `tint`.
- Hit feedback on creatures beyond the existing flash: a knockback impulse and a per-line hurt sound.
- A projectile weapon with a visible travelling billboard, to prove the non-hitscan path.

**DoD:** firing at a wall leaves a mark; firing at a creature staggers it; `--bench` with the decal
cap saturated stays inside budget.

**Tests:** `--smoke` asserts the decal pool never exceeds its cap over 200 shots; a bench at the cap.

### v3.3 — Finding weapons

**Goal:** the arsenal is earned.

**Tasks:**
- Weapon pickups as entity-table entries; picking one up adds it to the set and announces it.
- Ammunition pickups scaled to the shared pool; a per-deck budget in the deck manifest so a deck
  cannot be starved or flooded.
- A first-pickup message and HUD highlight.

**DoD:** a deck can place a weapon that the player does not start with, and the run carries it
forward.

**Tests:** `--smoke` picks up a weapon on deck 1 and asserts it is still held after a deck transition.

**Release:** `3.3.0`.

---

## v4 — Presence: movement, environment dynamics, sound

*(TODO 6, 7 and 9 — "walking effect", "blinking lights, smoke and more dynamic on objects", "more
sound effects")*

The station is correct but inert. This version makes it feel occupied: the floor under the player,
the air in the rooms, and a sound field that places things you cannot see. **Depends on:** v1.2
(per-cell surfaces), v3.2 (the effect pooling pattern).

### v4.1 — Walking

**Goal:** the player has feet.

**Tasks:**
- Replace the cosmetic head bob with a step cycle: bob, a slight lateral sway, and a footstep sound
  emitted on the step phase rather than on a timer.
- Per-surface footstep sounds selected by the floor character under the player — metal, grating,
  biomass.
- Landing and stop transitions so starting and stopping do not click.

**DoD:** footsteps land with the bob and change over creep.

**Tests:** `--smoke` asserts a footstep event fires once per step cycle at both walk and run speeds;
`gen_sounds.py` reproducibility unchanged for existing sounds.

### v4.2 — The station breathes

**Goal:** things move that the player did not move.

**Tasks:**
- Generalise the emergency-lamp flicker into a per-material animator driven by a data table:
  flicker, pulse, scroll, and a screen that cycles content.
- Smoke and steam as pooled billboard puffs at cells the deck marks, with the same cap-and-recycle
  discipline as decals.
- Reactive props: a screen that changes when the player passes, a vent that gusts, a sac that
  twitches when a creature is near.

**DoD:** standing still in a corridor, something changes within ten seconds; `--bench` with every
animator on a deck active stays inside budget.

**Tests:** a bench with all animators enabled; `--drive` frames at two times showing a changed
material.

### v4.3 — The sound field

**Goal:** you can hear where you are.

**Tasks:**
- Expand `gen_sounds.py`: per-surface footsteps, weapon variants, creature vocalisations per line,
  door and machinery variants, and two more ambient beds (technical, laboratory) selected per deck.
- Positional audio discipline: distance falloff and unit size per sound class, so a growl behind a
  wall reads as behind a wall.
- A small mixer in `Game`: buses and per-class volume, with the pool sized from measurement.

**DoD:** a creature out of sight can be located by ear; no sound clips or clicks at a loop seam.

**Tests:** an audio-lint check in the acceptance set — every WAV's loop seam continuity, peak below
clipping, and reproducibility of the whole set from the generator.

**Release:** `4.3.0`.

---

## v5 — The Navigator: automap and voice guidance

*(TODO 5 — "levels map mode and voice guidance of a Navigator")*

An orienting layer over a station that is now big enough to get lost in. **Depends on:** v2 (multiple
decks), v4.3 (the audio mixer).

### v5.1 — Automap

**Goal:** a map you can call up, on a 640×480 panel.

**Tasks:**
- A map mode key that draws the explored portion of the deck over the HUD: walls, doors, keys, the
  player and facing.
- Exploration tracking per cell, persisted in the run's progress.
- Legibility at panel size: the map is drawn at the deck's grid scale with a pan that follows the
  player, not a scaled-down whole deck.

**DoD:** the map opens, shows only what has been seen, and is readable at arm's length on the device.

**Tests:** `--smoke` walks a known path and asserts the explored set matches the cells visited;
`--drive` captures the map overlay.

### v5.2 — The Navigator speaks

**Goal:** a voice that orients you.

**Tasks:**
- A Navigator voice: a synthesized line set generated offline into `assets/voice/` (the same
  committed-output discipline as art and sound), not a runtime TTS dependency.
- Trigger rules in data: entering a deck, finding a key, a locked door, low health, the exit
  revealed.
- A cooldown and priority model so lines never overlap or nag.

**DoD:** a first run through a deck is narrated at the right moments and never twice for the same
event.

**Tests:** `--smoke` asserts each trigger fires once and respects the cooldown; an audio-lint pass
over the generated voice set.

**Release:** `5.2.0`.

---

## v6 — Server and multiple players

*(TODO 10 — "Server and multiusers")*

The station gets a second person in it. A closed circle over a LAN or an invite, not an open service.
**Depends on:** v2.4 (the progress seam), v1 (deterministic deck building from data).

### v6.1 — Client/server split

**Goal:** the game runs against a server without noticing.

**Tasks:**
- Extract the authoritative state (deck, entities, doors, pickups, player positions) into a server
  process; the existing game becomes a client of it, still able to run a local in-process server so a
  single-player run is unchanged.
- A wire contract versioned from day one; the client never contains rules the server does not.
- Back the `Progress` store with the server.

**DoD:** single-player against a local in-process server passes every acceptance gate unchanged.

**Tests:** the full `--smoke` suite run in both modes (in-process and over a socket to a local
server).

### v6.2 — Two players on one deck

**Goal:** someone else is in the corridor.

**Tasks:**
- Join, seat and leave; a second player rendered as a billboard with its own sprite set.
- Interest management sized for a deck: full state at this scale, measured before assuming so.
- Reconciliation for movement and shooting with the server authoritative.

**DoD:** two clients on a LAN walk the same deck, see each other, and agree on doors, pickups and
kills.

**Tests:** a two-client integration run in the acceptance set: both join, both move, both shoot the
same creature, and the server's kill count is one.

### v6.3 — Access and sessions

**Goal:** closed by default.

**Tasks:**
- An invite or allowlist; an unauthenticated client never reaches deck state.
- Session lifecycle: reconnect to a running deck, and a host decision when the last player leaves.
- Rate limits and message-size caps on the wire.

**DoD:** an unlisted client is refused before any deck data is sent.

**Tests:** an access test asserting refusal before state transfer; a reconnect test.

**Release:** `6.3.0`.

---

## v7 — Hypothesis 11: agents, and a station that rewrites itself

*(TODO 11 and 12 — "AI bots", "AI for realtime level changes")*

The title becomes the system. First inhabitants that behave rather than patrol; then the algorithm
itself — a process that edits deck data while the deck is being played. **Depends on:** everything:
v1 (data seams and rebuildable decks), v2 (creature lines), v6 (a server that is the single
authority over state).

### v7.1 — Agent bots

**Goal:** an opponent that plays the game rather than runs at you.

**Tasks:**
- An agent seam in the server (the shape `LLMClient` has in other projects): a bot occupies a player
  seat and receives the same observations a client does, at a bounded rate.
- A local behaviour policy first — objectives, pathing, target selection, resource use — so the seam
  is proven without a model in the loop.
- A model-backed policy behind the same seam, off by default, with a strict token and latency budget
  and a deterministic fallback when it exceeds either.

**DoD:** a bot can clear deck 1 unaided; with the model policy off, behaviour is unchanged and
deterministic.

**Tests:** `--smoke` runs a bot through the deck-1 objective chain headless and asserts completion
within a step budget.

### v7.2 — The algorithm mutates the station

**Goal:** the deck changes while you are in it.

The payload of the whole roadmap. Because a deck is data and the builders are callable in pieces
(v1.1), a mutation is an edit to the grid plus a partial rebuild — not a scene reload.

**Tasks:**
- A mutation API on the server: substitute a wall type, open or seal a cell, grow creep along a path,
  spawn or retire an entity — each validated against the deck invariants before it is applied
  (reachability above all: a mutation may never strand the player or the exit).
- Partial rebuild: re-emit only the affected surfaces and navigation cells, within one frame's
  budget, and replicate the edit to clients as a diff.
- A driver: rules first (creep spreads toward the player, breaches open under pressure), then a
  model-backed director behind the same interface, off by default and bounded.
- A run log of every mutation, so a run can be replayed and a bad mutation attributed.

**DoD:** a deck visibly changes during a run without a reload; reachability is never violated; the
frame containing a mutation stays inside budget; two clients observe the same station.

**Tests:** a mutation fuzzer in the acceptance set — thousands of random valid mutations against a
deck, asserting the invariants hold and `validate_deck.py` passes after each; a bench measuring the
worst mutation frame; a two-client convergence test.

**Release:** `7.2.0` — the station rewrites itself, which is where the name came from.

---

## What is deliberately not on this roadmap

Vertical geometry, a second render resolution, a public multiplayer service, a settings menu, and a
general-purpose engine. See [VISION.md](VISION.md) §Non-goals for why each would cost more than it
returns.
