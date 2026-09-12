# Vision — H11

## In one sentence

H11 is a handheld retro first-person shooter built for one specific machine — a 3.5″ 640×480
PocketTerm — set on a research station where an algorithm is rewriting both the creatures and the
rooms, and the arc of the project is to make that fiction literally true: by the last version the
algorithm that mutates the station is real code changing the level while you walk through it.

## What we are building

A Wolfenstein 3D / Doom-shaped game that runs natively at 640×480 on a Raspberry Pi 5 handheld, one
render pixel per panel pixel, with hand-authored pixel art in the Doom PLAYPAL gamut. It starts as
one deck you can clear in three minutes and grows into a station: more decks, more creature lines,
an arsenal, a Navigator that maps and speaks, then a server that lets other people walk the same
corridors — and finally an AI that mutates the geometry and the inhabitants between runs and during
them.

The name is the fiction. *Hypothesis 11* is the proposition that one algorithm mutates both an
environment and the creatures inside it. Right now that is set dressing: stencils on the walls, a
creature called the Chorus that used to be station personnel, biomass growing over the panels. The
roadmap's endpoint is the same sentence as a system diagram.

## For whom

One player, one device, in the hand. The PocketTerm35 is the target and the constraint: a 640×480
panel, a 67-key keyboard, a Goodix touch layer, four Cortex cores and a V3D GPU. Everything is sized
to that — the render target, the art, the frame budget, the controls. It runs on a Mac too, at the
same resolution with the same inputs, because that is where it is developed; the Mac is an emulator
of the device, never a second platform with its own affordances.

From v6 a handful of other people can join over a server. That is a small closed circle by design —
friends on a LAN or an invite, not an open lobby.

## Principles

- **One device, one resolution.** 640×480 native, nearest filtering, no upscale and no letterbox.
  Every asset, coordinate and font size is authored for that grid. A second resolution is a second
  product; we do not have one.
- **The frame budget is a hard wall.** 16.67 ms at 60 fps on the device, measured with
  `--bench` on the real hardware, never estimated on the Mac. A feature that cannot be measured
  cannot be accepted.
- **Everything is built in code.** Level geometry, the HUD, the materials — all constructed at
  runtime from data. The scene tree stays nearly empty. This is why a level is an ASCII file and a
  texture is a JavaScript function, and it is what makes v7's real-time mutation possible at all.
- **Art is code.** `assets/*.png` are committed output, not source; `tools/h11_art.js` is the source.
  Colours come from a ramp, gradients are ordered dithers, and `tools/check_palette.py` enforces
  both. The same rule will hold for every asset added later.
- **Data over hardcoding.** Anything the game can read from a file at load — map, creature stats,
  weapon tables, palettes — is read from a file. The AI versions can only ever change what is data.
- **The device is the truth.** The Mac tells you whether it works; the device tells you whether it
  ships. Screenshots come from `grim` over ssh, timings from `--bench` on the panel.
- **Accept on evidence.** Every phase ends with automated checks that encode its Definition of Done —
  a headless smoke run, a palette conformance pass, a scripted playthrough, a bench. A phase without
  a check is not done.
- **Fiction and mechanics converge.** Features that dress the world (stencils, biomass, the Chorus)
  are down payments on systems that later become real (procedural growth, creature variants, the
  mutating algorithm). Nothing is added purely as decoration if it could be a seam instead.

## Non-goals

- **Not a multi-platform game.** No desktop release, no phone port, no widescreen, no settings menu
  full of resolutions. One panel.
- **Not photorealistic, not modern-3D.** No dynamic lights, no normal maps, no post stack. The
  renderer is unshaded with distance darkening, deliberately, because that is both the period look
  and what a V3D at 60 fps affords.
- **Not an open multiplayer service.** v6 serves a closed circle over a LAN or an invite. No
  accounts for strangers, no matchmaking, no persistence of other people's data beyond a session.
- **Not a general engine.** The map format, the art pipeline and the tooling exist to make *this*
  station; they are not a product for other people's games.
- **Not vertical.** Gravity is off and both bodies are pinned to the floor plane. Stairs, jumping and
  multi-floor geometry are out of scope for every planned version; they would change the renderer,
  the collision model and the map format at once.

## The arc, in one paragraph

**v0** proved the loop on the device: one deck, seven mutants, a keycard, an exit, at 60 fps on the
GPU. **v1** turns the prototype into a project — a structure that can hold ten decks, an asset
pipeline sized for the GPU, and the seams (entity data, per-cell surfaces) the rest of the roadmap
plugs into. **v2** fills the station with decks and creature lines. **v3** gives the player an
arsenal and the weapons something to do to the world. **v4** makes the place feel inhabited —
footsteps, flicker, smoke, a sound field. **v5** adds the Navigator: a map you can call up and a
voice that guides you. **v6** puts the station on a server so more than one person walks it. **v7**
turns the fiction on: agents that behave like the station's inhabitants rather than like sprites,
and an algorithm that edits decks in real time. The last version is the title.

## Glossary

- **Deck** — one level. Deck 1 is the prototype's habitation-and-lab floor. A deck is an ASCII map
  file plus whatever data it references.
- **The algorithm / H11** — in fiction, the process rewriting the station and its people. In code,
  from v7, the system that mutates level data at runtime.
- **The Chorus** — the creature line shipped in v0: station personnel finished by the algorithm, a
  floating plated carapace on a fringe of tubes. Other lines (`crawler`, `crew`, `bloom`) are drawn
  and waiting in `assets/alt/`.
- **Creep / biomass** — the growth spreading over the station's surfaces; `wall_creep`,
  `wall_creep_low`, `wall_sac` today, a spreading system later.
- **The device / PocketTerm** — the Waveshare PocketTerm35: Raspberry Pi 5, 640×480 3.5″ panel,
  67-key keyboard, Goodix touch, Sway on Wayland, V3D GPU.
- **Frame budget** — 16.67 ms. Measured on the device with `godot --path . -- --bench=15` or the
  deployed binary's `-- --bench=15`.
- **Acceptance gates** — the three commands every phase must pass: `check_palette.py` (art
  conformance), `--smoke` (headless gameplay), `--drive` (scripted playthrough producing frames).
  From v1 a fourth, `--bench`, guards the budget.
- **PLAYPAL** — Doom's 256-colour palette, the hard gamut constraint on every opaque pixel of every
  asset, checked against `tools/playpal-base.lmp`.
- **Ramp** — a named run of PLAYPAL entries (`STEEL`, `TOXIC`, `FLESH` …) in `tools/h11_art.js`.
  Colours come from a ramp; literals are a defect the checker catches.
- **Navigator** — the v5 guide: an automap and a synthesized voice that orients the player.
- **Prototype 0** — everything shipped before this roadmap existed: `v0` below, documented
  retrospectively so later versions have something to depend on.
