# H11 // Deck 1 — Art Redesign Brief

A brief for redesigning the game's entire visual art in Claude Design.
Goal: replace the procedural placeholder art from `tools/gen_assets.py` with
hand-crafted pixel art at a shippable quality bar — **a post-apocalyptic sci-fi
research lab rendered in the Doom (1993) colour palette**.

The technical constraints in section 3 are not negotiable: they are dictated by
the engine and the target hardware. Everything else is an art decision.

---

## 1. Concept

### What this place is

H11 is a research station. Hypothesis 11: there exists an algorithm that mutates
both the environment and the creatures inside it. Deck 1 is the habitation-and-lab
level where the experiment got out of containment. The player wakes up inside,
after it has already happened.

The visual story of every surface must answer three questions:

1. **What it used to be.** A clean modular station: steel panels with rivets,
   cable runs, stencilled markings, glass containment boxes, medical lockers.
   1980s "heavy future" design — the Nostromo, not an Apple Store.
2. **What happened.** Decompression, fire, blood, an evacuation that failed.
   Evidence of violence, not merely neglect.
3. **What is growing now.** The H11 algorithm rewrites matter: biomass pushes
   through panel seams, organic growths wrap the pipes, spores fill the vents.
   This is not mould — it is something with a geometry of its own.

Proportions on a typical texture: **60% machinery / 25% destruction / 15% biomass.**
Biomass increases toward the end of the level (see 6.1 — zoning).

### References

**The standard is Freedoom.** A reference subset lives in
`specification/style-refs/freedoom/` (BSD 3-clause — see `ATTRIBUTION.md` there).
It is a complete, finished Doom-compatible asset set, and it defines the bar for
this redesign: when a question is not answered by this document, open the
reference and match it.

| Folder | Use it for |
|---|---|
| `patches/aq*` | wall panels, metal, lamps, pipes, rust, supports — a sci-fi station, exactly H11's subject |
| `patches/comp*`, `tscrn*` | computer banks and terminal screens |
| `patches/exit_red`, `exit_grn`, `doslvr*` | exit panels and door leaves |
| `flats/` | floor and ceiling tiling |
| `monsters/` | figure construction, silhouette, colour on flesh |
| `weapons/` | first-person framing and muzzle flash |
| `pickups/` | how a tiny object stays readable |

Secondary references, for mood rather than execution:

| Reference | What we take from it |
|---|---|
| Doom 3, Alpha Labs | panel layout, cabling, warning decals |
| Half-Life, Black Mesa | lab equipment that reads at a glance |
| Alien (1979), Nostromo | stencil typography, hazard stripes, monochrome CRTs |

### What we do NOT do

- No neon cyberpunk. Blue and purple are banned as dominant colours.
- No soft glow blur. Light is drawn with stepped ramps, never with a gradient.
- No anti-aliased softness. Every pixel is a decision.
- No fine detail that will vanish at 40% brightness (see 3.6).

---

## 2. Palette

**The palette is Doom's PLAYPAL, and that is a hard rule: every pixel of every
asset must be one of its 256 entries.** The file is `specification/playpal-base.lmp`
(Freedoom's base palette). Conformance is mechanically checkable: read that 768-byte
file as 256 RGB triplets and assert every opaque pixel of an asset is one of them.
This is what "the Doom colour gamut" means here — not an approximation of it.

Within PLAYPAL, work inside one ramp at a time. These are the real ramps, by index:

| Role | PLAYPAL indices | Range | Use for |
|---|---|---|---|
| **STEEL** (grey) | 80–111 | `#EFEFEF` → `#131313` | the base material of ~70% of all walls |
| **RUST** (brown) | 48–79 | `#FFEBDF` → `#2B230F` | seams, corners, cut metal, everything that suffered |
| **TAN** (warm grey-brown) | 128–151 | `#BFA78F` → `#43331B` | worn paint, cloth, the mutant's jumpsuit |
| **BLOOD** (desaturated red) | 16–47 | `#FFB7B7` → `#430000` | stains, dried blood, flesh shadow |
| **RED** (saturated) | 168–191 | `#FFFFFF` → `#430000` | emergency lamps, locked-door indicators, mutant eyes on attack |
| **TOXIC** (green) | 112–127 | `#77FF6F` → `#0B1707` | screen text, "OK" indicators, H11 biomass, medkit cross |
| **AMBER / FIRE** | 208–223 | `#FFEBDB` → `#AF4300` | hazard stripes, energy cells, muzzle flash |
| **YELLOW** | 224–231 | `#FFFFD7` → `#FFFF00` | the brightest warning accents only |
| **OLIVE** | 152–167 | `#7B7F63` → `#373F27` | grime over green, oxidised brass |
| **INK** | 6–8 | `#131313` → `#070707` | seams, outlines, shadow |
| BLUE | 192–207 | `#E7E7FF` → `#0000FF` | **restricted** — a dead CRT reflection only, ≤2% of a texture |

Note that Doom's reds live in two separate ramps: 16–47 is the muted one (use it for
*stains*), 168–191 is the screaming one (use it for *light*). Never mix them in one object.

### Colour budget

Measured over the 51 Freedoom station textures: **17 colours minimum, 32 median,
103 maximum** per texture. If a 256×256 texture needs more than ~40 colours, the
detail is probably noise rather than form.

⚠️ This is exactly where the current placeholder art fails: `gen_assets.py` applies
a ±6 per-channel random `noise()` pass, which produces 81–221 unique colours in a
single 64×64 tile, none of them in PLAYPAL. Random per-pixel jitter is not dithering.

### Dithering

Gradients are made **only** with ordered dithering (checkerboard / 25-50-75%)
between two adjacent entries of one ramp. That is what produces the Doom look.
No generated smooth transitions, no random noise.

## 3. Technical constraints (mandatory)

Violating any of these means the asset does not work in the game.

### 3.1 Screen

The game renders at **640×480**, one render pixel per physical pixel of the
PocketTerm35 panel. There is no upscale. Filtering is `nearest`, mipmaps are off,
textures are uncompressed (`[importer_defaults]` in `project.godot`). Whatever is
drawn is what you see.

This replaces the previous 320×240 logical viewport, which was scaled ×2 and threw
away three quarters of the panel's resolution. **Measured on the device** (spin
tests of 20 s and 12 s, current art, GL Compatibility):

| Render resolution | Mean frame | 1% low | Worst frame |
|---|---|---|---|
| 320×240 | 6.19 ms — 162 fps | 7.41 ms — 135 fps | 9.82 ms |
| **640×480** | **8.60 ms — 116 fps** | **10.42 ms — 96 fps** | **12.80 ms** |

The budget for 60 fps is 16.67 ms. At 640×480 not one frame in the run exceeded it,
leaving roughly 60% headroom. Four times the pixels cost only 39% more frame time,
because the bottleneck is per-frame CPU overhead rather than fill rate.

⚠️ Two caveats. Those numbers were taken with the current 64×64 textures; 256×256
textures move more memory, which this test does not cover. And the device is
currently rendering in **software** — its log says `Using Device: Mesa - llvmpipe`,
so the Pi 5's VideoCore VII GPU is not being used at all, even though the `v3d` and
`vc4` kernel modules are loaded and `/dev/dri/renderD128` exists. Godot asks for
desktop OpenGL, V3D provides OpenGL ES, and Mesa silently falls back to the CPU
rasteriser. Every figure above is therefore a floor, not a ceiling.

**The art consequence, stated plainly:** at 640×480 the chunky Wolf3D pixel is gone.
The game stops reading as 1993 and starts reading as late-nineties. From here the
palette, the material vocabulary and the depth cueing carry the Doom identity —
not the pixel size.

### 3.2 Walls

One wall face = **one full texture** (UV 0..1) across a 2×2 metre area. Therefore:

- The texture must read as a **single panel**, not as a fine repeating tile.
- It **must tile seamlessly horizontally** — adjacent cells with the same texture
  sit flush against each other. Left and right edges must match.
- There is no vertical tiling: the bottom of the texture is the floor, the top is
  the ceiling. The top 12–16 px and bottom 12–16 px are the join zone with the
  ceiling/floor — that is where a cornice or skirting goes, not important detail.

**Resolution: 256×256** (up from the current 64×64). At 640×480 a wall seen from
two metres occupies ~240 px of screen, so 256 is close to 1:1. Cost is ~192 KB per
texture uncompressed; the whole wall set stays under 4 MB.

### 3.3 Floor and ceiling

These are two level-wide planes with `uv_scale = (32, 22)`. The texture therefore
tiles seamlessly **in all four directions**. No asymmetric details, no lettering
that only reads in one orientation — a 32×22 repeat grid is very visible.
Resolution 256×256.

### 3.4 Sprites (mutants, pickups)

- RGBA format, `alpha_cut = 1` → **alpha must be binary: 0 or 255 only.**
  No semi-transparent pixels, no soft edges. Any partial-alpha pixel becomes a
  hard jagged stump. (Verified against the reference: all 69 Freedoom monster
  frames contain exactly zero semi-transparent pixels. This is how Doom sprites
  are built, not a limitation we are working around.)
- Sprites are billboards, always turned to face the player. Draw one frontal
  view; there are no rotations.
- The figure stands on the floor: **the bottom of the silhouette is the bottom of
  the frame.** Pickups (medkit, cell, keycard) occupy the lower ~40% of the frame,
  as they do today.
- Resolution 256×256 (mutants and pickups). Freedoom's monsters are 48–128 px tall
  in their own frames, so at 256 there is roughly twice the detail of the reference
  — this is the one place the redesign goes beyond the standard rather than matching
  it. Our frame is square and fixed, so the figure is drawn inside it rather than
  cropped to it.
  ⚠️ This requires changing `pixel_size` from `0.03125` to `0.0078125` in
  `scenes/enemy.tscn` and `scenes/pickup.tscn` (256 px must equal 2 m), or sprites
  become 8 m tall.

### 3.5 HUD

The HUD lives in 640×480 coordinates. **Every HUD asset is drawn at its exact pixel
size, never scaled** — otherwise the nearest filter drops pixels.

| Asset | Exact size | Where |
|---|---|---|
| `weapon_0.png`, `weapon_1.png` | **192×144** | placed by `hud.gd:_build()` at `(224, 480 − BAR_H − 144)` |
| `crosshair.png` | **18×18** | centred; the hardcoded `(156,116)` becomes `(311,231)` |
| HUD keycard icon | **32×32**, new file `hud_keycard.png` | currently `keycard.png` at `scale 0.5` — that is not acceptable |
| `hud_bar.png` (new) | **640×64** | replaces a `ColorRect`, see 6.3 |

⚠️ Every coordinate and font size in `hud.gd` is written against the old 320×240
screen and has to be doubled: `SCREEN` becomes `Vector2(640, 480)`, `BAR_H` 28
becomes 64, `FONT_SMALL` 8 becomes 16, `FONT_BIG` 16 becomes 32. Mechanical, but it
touches every line of `_build()`.

### 3.6 Lighting: the constraint that drives everything

There are no lights in this game. The `depth_shade.gdshader` is `unshaded` and
simply multiplies the texture by `exp(-distance * 0.085)`:

| Distance | Multiplier |
|---|---|
| 2 m | 0.84 |
| 6 m | 0.60 |
| 12 m | 0.36 |
| 20 m | 0.18 |

On top of that, **north and south wall faces are multiplied by a further 0.72**
(the Wolf3D depth trick). On top of that, emergency lights flicker: `wall_light`
periodically drops to 0.45.

**What the reference actually measures.** Across the 51 Freedoom station textures:

| | Freedoom (the standard) | H11 today |
|---|---|---|
| median luminance | 21% | 23% |
| 90th percentile | **39%** | **25–27%** |
| mean | 23% | 23% |

So the current art is **not too dark on average** — its median is already correct.
What it lacks is **range**. Freedoom runs from `#070707` seams up to `#B7B7B7`
and `#FFFFFF` specular hits inside the same 128×128 tile; the H11 placeholders sit
in a narrow 20–27% band, which is why they read as mud rather than as metal.

The rules that follow from that:

1. **Draw at full brightness.** No baked directional lighting, no painted
   "light from above" shadows. Volume comes from form and material.
2. **Keep the median near 21%, but spend the whole ramp.** Every texture needs
   near-black seams *and* highlights above 50%. A texture whose p90 is under 35%
   has no material in it. Measure both numbers per file before accepting an asset.
3. **Local contrast matters more than detail.** A `#070707` seam next to
   `#575757` steel survives at any distance. Two adjacent ramp steps merge by
   6 metres. Neighbouring details must differ by at least two ramp steps.
4. **Light sources (lamps, screens, indicators) are the brightest pixels in the
   texture**, because the fog darkens them too. They do not glow — they are
   simply very bright. This is where the top of the RED and AMBER ramps is spent,
   and nowhere else.
5. Acceptance check for every asset: drop the brightness to 40% — the detail must
   still read.

**A knob, not an art problem.** If the finished art still reads too dark in game,
the fix is `Level.FOG_DENSITY`, not brighter textures: at `0.085` a wall keeps 36%
of its value at 12 m, at `0.05` it keeps 60%. Tune it in game once the first real
textures are in; do not pre-compensate by painting things pale.

### 3.7 File names

File names are **fixed by code** (`WALL_TEX` in `level.gd`, the `preload` calls in
`hud.gd`, `enemy.gd`, `pickup.gd`). Renaming means editing code. Everything lives
flat in `assets/`.

### 3.8 ⚠️ Conflict with the generator

`tools/gen_assets.py` **overwrites all of `assets/*.png`**. After the redesign,
running that script would wipe the new art.

Pick one, before work starts:
- **A (recommended):** rename it to `tools/gen_assets_legacy.py` and note in the
  README that art is now hand-made.
- **B:** rewrite the generator against the new palette and keep it as the source
  of truth (in which case Claude Design produces mockups, not final PNGs — see 7).

---

## 4. Asset list

### 4.1 Replacing existing assets (22 files)

| File | Size | Type | Map character |
|---|---|---|---|
| `wall_panel.png` | 256×256 | tiles horizontally | `#` |
| `wall_vent.png` | 256×256 | tiles horizontally | `V` |
| `wall_light.png` | 256×256 | tiles horizontally | `L` |
| `wall_screen.png` | 256×256 | tiles horizontally | `S` |
| `wall_hazard.png` | 256×256 | tiles horizontally | `H` |
| `wall_h11.png` | 256×256 | tiles horizontally | `1` |
| `wall_blood.png` | 256×256 | tiles horizontally | `B` |
| `wall_exit.png` | 256×256 | tiles horizontally | `X` |
| `door.png` | 256×256 | no tiling | `D` |
| `door_locked.png` | 256×256 | no tiling | `K` |
| `floor.png` | 256×256 | tiles 4-way | — |
| `ceiling.png` | 256×256 | tiles 4-way | — |
| `mutant_0.png` | 256×256 | RGBA, binary alpha | `e` |
| `mutant_1.png` | 256×256 | RGBA | `e` |
| `mutant_attack.png` | 256×256 | RGBA | `e` |
| `mutant_dead.png` | 256×256 | RGBA | `e` |
| `medkit.png` | 256×256 | RGBA | `h` |
| `ammo.png` | 256×256 | RGBA | `a` |
| `keycard.png` | 256×256 | RGBA | `k` |
| `weapon_0.png` | **192×144** | RGBA, HUD | — |
| `weapon_1.png` | **192×144** | RGBA, HUD | — |
| `crosshair.png` | **18×18** | RGBA, HUD | — |

### 4.2 New assets (recommended)

| File | Size | Why | Code cost |
|---|---|---|---|
| `hud_bar.png` | 640×64 | status bar as an instrument panel instead of a flat rectangle | `hud.gd`: `ColorRect` → `TextureRect`, `BAR_H` 28→64 |
| `hud_keycard.png` | 32×32 | keycard icon without scaling | `hud.gd`: the `KEYCARD` constant |
| `wall_lab.png` | 256×256 | a glass containment box with a specimen — the face of the lab | +1 line in `WALL_TEX` (`"T"`) + characters in the map |
| `wall_pipes.png` | 256×256 | burst coolant pipes, frost and biomass | +1 line (`"C"`) |
| `wall_breach.png` | 256×256 | hull breach, rebar, darkness behind it | +1 line (`"R"`) |
| `mutant_2.png`, `mutant_3.png` | 256×256 | a 4-frame walk cycle instead of 2 frames | `enemy.gd`: the `TEX_WALK` array |
| `mutant_die.png` | 256×256 | an intermediate death frame | `enemy.gd`: a short animation |

New wall characters must not collide with `WALKABLE = ".PDKehak"`.
Free and safe: `T`, `C`, `R`, `G`, `M`, `W`, `2`, `3`.

### 4.3 Out of scope (needs a different architecture)

- **Floor variety** (grates, puddles in specific rooms) — the floor is currently a
  single level-wide plane. Would need per-cell quads in `_build_floor_ceiling()`.
- **Decals** (standalone blood splatters, footprints) — needs a new entity type.
- **Animated textures** (screen static, a running warning strip) — needs a frame
  array and a timer on the material.

If those three are wanted, they are a separate task after the redesign.

---

## 5. Per-asset specification

### 5.1 Walls

**`wall_panel` — the base panel.** The workhorse, 70% of the level. Two horizontal
sections with a seam across the middle, rivets at the corners, a vertical cable
run down one side. Base `#4B4B4B`, seams `#131313`, bevels `#7F7F7F` on top and
`#373737` underneath. Rust only in the corners and along the seams — this panel
should still read as alive. Left and right edges must be symmetric so they join.

**`wall_vent` — ventilation.** A grille in the lower third, louvres dark
(`#272727`) with a highlight along the top edge of each blade (`#636363`) — that
is the main texture here. Something dark seeps out from under the grille: not
blood, but biomass (`#1F4317`) that has grown through the air system. Above the
grille, a stencilled `AIR 04`.

**`wall_light` — the emergency lamp.** The most important texture: it flickers
(`main.gd:_process()` drives its `tint`). A horizontal light strip across the
upper third, housing `#430000`, glass `#FF1F1F`, filament core `#FF5F5F`.
Below the lamp, **a painted stepped light spill on the panel**: 4–5 steps of the
STEEL ramp tinted red, dithered at the boundaries. That spill is what sells the
sense of light when the lamp cuts out and comes back. The glass is cracked in
one place.

**`wall_screen` — terminal.** A recessed monitor in the upper half, black bezel
`#070707`, text on screen. Two states in one texture: a green line
`H11 // CYCLE 7 STABLE` (`#53AF47`) and below it a red `CONTAINMENT FAIL`
(`#FF1F1F`). Scanlines — every second row one ramp step darker, not black.
This is where the restricted BLUE ramp is allowed — `#000083`, as a reflection on the glass. Below the
monitor, a keyboard with several keys punched out.

**`wall_hazard` — warning zone.** A yellow-and-black diagonal stripe
(`#C39B2F` / `#131313`) across the lower third at 45°. **The stripe pitch must
divide 256 evenly or the tiling seam breaks.** Above it, a stencilled `H11 ZONE`
and a biohazard symbol. The stripe is scraped back to bare metal in places.

**`wall_h11` — the signature stencil.** A large stencilled `H11` spanning the full
panel height, faded red paint `#731313` eaten back to the steel. This is the
level's identifying mark — it must read from 10 metres. Drips run below it, as
though the lettering wept.

**`wall_blood` — evidence of violence.** The `wall_panel` base plus a large impact
splatter: core `#530707`, edges `#170F07`, isolated droplets `#731313`. The
splatter has a direction — something was done here, it did not simply appear.
Runs of varying length below it, the longest reaching the bottom of the frame.
**No FLESH colours:** this is a wall, not a mutant.

**`wall_exit` — the exit.** The only "good" texture in the level. A panel with a
large backlit `EXIT` (`#53AF47` on `#13230B`) and a heavy plunger button beneath
it ringed in amber `#FF8F3B`. The cleanest surface in the game — less rust around
it and zero biomass. It should look like a promise.

**`wall_lab` (new).** A glass containment box centred on the panel, cracked glass,
inside it the silhouette of a specimen (`#4F3B2B`) that is no longer in focus.
A console below with dead indicators. One indicator still burning amber.

**`wall_pipes` (new).** Three vertical pipes of differing diameter, a blown coupling
on the middle one, frost build-up `#9F9F9F` around the rupture, a pool at the
bottom edge of the frame. Biomass grown through the gap between the pipes.

**`wall_breach` (new).** The panel torn outward, metal edges curled back
(`#875733` on the cut — fresh metal rusts), darkness `#070707` behind the breach
with a few `#272727` shapes in it. Rebar bent outward: something was coming out,
not going in.

### 5.2 Doors

**`door.png`** — two leaves that part, with a visible centre join. Heavy hydraulics
along the edges, an amber status strip `#FF8F3B` down the centre seam, a porthole
window in each leaf (dark, `#131313`). A control panel to one side with a green
indicator. Stiffening ribs run horizontally so doors never read as wall.

**`door_locked.png`** — the same geometry, **minimal difference in form, maximal
difference in colour**: the status strip and indicators go red `#FF1F1F`, plus a
lock block with a card slot and the legend `RED CLEARANCE`. The player must
understand "not this way" within 0.2 seconds, at distance, in the dark. These two
textures will be compared directly — design them as a pair, not as two drawings.

### 5.3 Floor and ceiling

**`floor.png`** — steel plates, 4×4 to the frame (so one plate is 64 px = 0.5 m),
seams `#131313`, a light anti-slip tread pattern on each plate. One ramp step
darker than the walls (`#373737`–`#4B4B4B`). Four-way seamlessness is critical:
a 32×22 repeat grid is very visible, so **no unique blemishes** — even texture
only. Variation comes from dithering, not from objects.

**`ceiling.png`** — darker than the floor (`#272727`–`#373737`), service trays and
cabling all running in one direction. Ceiling panels, one of them offset. Again:
even, no unique details. The ceiling is seen at a steep angle and is almost always
darkened, so only the large contrast of the trays does any work.

### 5.4 The mutant

This is the main enemy and the only creature in the game. Right now it is a
rag doll — it needs a real character design.

**Concept.** Former station personnel, rewritten by the H11 algorithm. It reads as
a humanoid — but the proportions are broken: asymmetric shoulders, one arm longer
than the other, the spine curved forward. Remnants of a lab jumpsuit (`#373737`)
have grown into the flesh. Instead of a face, a cluster of eyes (`#FFFF6B`) placed
asymmetrically. Below them, an open jaw with bone teeth `#BFBFBF`. Biomass
`#37732B` sprouts from one shoulder and the back — **the same green as on the
walls. That is the mutant's link to the environment.**

The silhouette must be recognisable at 15 metres as a black shape: wide uneven
shoulders, narrow base, one arm hanging below the knees.

| Frame | Content |
|---|---|
| `mutant_0` | anchor pose, weight on the left leg, right arm hanging |
| `mutant_1` | opposite phase of the walk, torso swung, shoulder tilt reversed |
| `mutant_attack` | both arms raised and forward, jaw open, **eyes switch from `#FFFF6B` to `#FF5F5F`** — the only reliable attack tell the player gets |
| `mutant_dead` | collapsed, a `#530707` pool beneath it, a low flat silhouette that can never be confused with a living one |

Optional `mutant_2`/`mutant_3` for a full 4-frame walk cycle, and `mutant_die`
as an intermediate falling frame.

Technical: outline the silhouette with a single row of `#070707` so the mutant
never merges into a dark wall. Binary alpha. Stands on the bottom edge of the frame.

### 5.5 Pickups

All three get a highlighted top, because they sit on a dark floor and need to
"ask to be picked up". Each has one brightest accent pixel.

**`medkit`** — a field medical block, off-white casing (`#BFBFBF`, not pure white),
green cross `#53AF47`, a handle on top, a dried handprint `#530707` on one side.
One corner is dented.

**`ammo`** — an energy cell: a steel cylinder with an amber window
(`#FF8F3B` → `#FFFF8F` at the core), contacts on top, `H11` markings on the side.
The window is the brightest point of the asset.

**`keycard`** — a red card `#CB0000` with a gold chip `#C39B2F`, a black magnetic
stripe and the word `RED`. This is the level's objective item: it must be the most
noticeable of the three. Draw it crisply and simply — it also becomes the HUD icon.

### 5.6 Weapon

**`weapon_0` (192×144) — idle.** First-person view, the weapon slightly right of
centre, cropped by the bottom edge of the frame. This is not a pistol — it is a
**station impulse cutter**: heavy body `#4B4B4B`, an amber charge indicator on the
side (`#FF8F3B`), a cable running down and out of frame, a tape-wrapped grip
`#5F4323`. The muzzle is a dark aperture inside an emitter ring. The player's hand
is visible on the grip (glove `#373737`).

**`weapon_1` (192×144) — firing.** Same body, shifted down 4–6 px (recoil), plus the
muzzle flash: **a stepped, crisp burst** — core `#FFFF8F`, mid `#FFFF6B`, outer
tongues `#FF8F3B`, farthest sparks `#FF1F1F`. The shape is star-like and
asymmetric, not round. The frame is held for 0.09 s, so it must read as clearly
stronger than idle.

**`crosshair` (18×18)** — four ticks with a gap at the centre, `#BFBFBF`. Minimal:
it sits over the whole frame and must not compete with the enemies. The centre
pixel is empty.

---

## 6. Level composition and HUD

### 6.1 Zoning (without changing the map)

The map in `levels/deck1.txt` does not change — but the texture assignment can be
redrawn so the level tells a story from left to right:

| Zone | Map area | Mood | Dominant |
|---|---|---|---|
| Habitation block (start) | left third | "people lived here recently" | STEEL, little rust |
| Laboratory (centre) | corridors with `S`, `L` | "this is where it happened" | BLOOD + AMBER, screens |
| Technical deck (right) | keycard and exit area | "this is where it lives" | TOXIC, biomass, breaches |

This is done by editing characters in `deck1.txt` — but ⚠️ **`_run_smoke()` in
`scripts/debug_drive.gd` is hardcoded to 32×22 dimensions, 7 mutants, 9 doors and
the coordinates `K(18,15)`, `k(25,10)`, `X(29,18)`.** Only change wall *types*
(`#`↔`V`↔`B`↔`1`), never the geometry or the entities — then the smoke test stays
green.

### 6.2 The target frame

The key deliverable for sign-off is **a single 640×480 in-game frame mockup**:
a corridor, a door at the end, an emergency lamp to one side, a mutant half-lit at
medium distance, the HUD at the bottom, the weapon. With the distance darkening
painted in. Everything else in this document exists to make that frame look right.

### 6.3 Status bar

Today it is a `ColorRect` in `#0A0A0D`, 320×28 in the old coordinates, with a red
line on top and text labels
`HEALTH / AMMO / MUTANTS / KEY / H11 DECK 1`.

Redesign: `hud_bar.png` at 640×64 — **a station instrument panel**, not a flat
rectangle. A STEEL plate with a bevel (light edge `#7F7F7F` on top, dark `#272727`
below), rivets, recessed display windows behind each number, stencilled labels,
each with its own colour accent: HEALTH red, AMMO amber, MUTANTS grey, KEY a
socket for the card icon that lights up once the card is taken. On the right,
a scratched `H11 // DECK 1` nameplate.

The numbers stay as Godot text labels. **Optional but a large quality gain:**
wire in a pixel font (`.ttf` or bitmap font) instead of Godot's default font —
right now every HUD string is set in the system font, and that is the most
"unfinished" detail in the frame.

Label coordinates in `hud.gd:_build()` will need to be refitted to the new panel.

### 6.4 End-of-level overlays

`DECK 1 CLEARED` and `YOU DIED` are currently plain text over black at 65% alpha.
For death: flood the screen with `#170F07` instead of black and add a painted
helmet-visor frame. A minimal `hud.gd` change for a noticeable effect.

---

## 7. Pipeline: how this works in Claude Design

Claude Design works with HTML artboards, while the game needs exact PNGs with
binary alpha and PLAYPAL colours. So:

**Stage 1 — Claude Design (direction sign-off).** A canvas of artboards. Every
artboard that shows H11 art shows the **Freedoom reference for the same thing
directly beside it**, at the same scale — that side-by-side is the whole point of
the canvas, because the standard is "as good as Freedoom", and that is only
judgeable by comparison.

| # | Artboard | Contents |
|---|---|---|
| 0 | Palette & Rules | the PLAYPAL ramps by index, dithering examples, the colour budget |
| 1 | Wall Set | 11 H11 textures at ×4, each paired with its closest `aq*` reference and a 3×1 tiling proof |
| 2 | Doors | `door` / `door_locked` as a pair, against `doslvr*` / `aqdoor*` |
| 3 | Floor & Ceiling | both, 3×3 tiling proof, against `flats/aqf*` |
| 4 | Mutant Sheet | 4–6 frames plus a silhouette test, against the Freedoom monster frames |
| 5 | Pickups | all three at ×4 on a dark ground, against `pickups/` |
| 6 | Weapon & Crosshair | `weapon_0/1` at ×4, muzzle flash broken out, against `weapons/` |
| 7 | HUD | the 640×64 status bar, plus the full 640×480 screen |
| 8 | **Target Frame** | the in-game frame from 6.2 — the primary artboard |
| 9 | Depth Test | the same wall fragment at 100 / 60 / 36 / 18% brightness |

**Stage 2 — final PNGs.** The approved direction becomes assets via one of two paths:

- **B (recommended for this project):** rewrite `tools/gen_assets.py` to draw from
  PLAYPAL indices instead of invented RGB tuples, and **delete the `noise()` pass** —
  see the colour-budget warning in section 2. The art then stays reproducible,
  versioned and editable as code. Hand work is only needed for the mutant and the
  weapon. ⚠️ `gen_assets.py` needs Pillow, which is not installed on this machine.
- **A:** draw by hand / export from the canvas, drop into `assets/`, and retire
  the generator (see 3.8).

**Stage 3 — acceptance.** Per asset, mechanically checkable:

- every opaque pixel is an entry of `specification/playpal-base.lmp`
- alpha is only 0 or 255 (required by `alpha_cut = 1`)
- the size is exactly what table 4.1 gives
- median and p90 luminance sit near the Freedoom benchmark, 21% and 39%

Measured against the current placeholder art, **none of the 22 assets meet all four** —
that is the baseline this redesign is measured against.

For the level as a whole:

```bash
godot --headless --path . -- --smoke       # gameplay still works
godot --path . -- --drive=/tmp/shots       # screenshots to compare with the Target Frame
```

By hand, per asset:

- [ ] walls: left edge joins the right edge (visual 3×1 proof)
- [ ] floor/ceiling: seamless in all four directions (3×3 proof)
- [ ] legible at 40% brightness
- [ ] side by side with its Freedoom reference, it does not look worse

## 8. Code change checklist

The redesign is not free for the code. The full list:

| Change | File | Reason |
|---|---|---|
| `viewport_width/height` `320`/`240` → `640`/`480` | `project.godot` | render at the panel's native resolution (3.1) |
| revisit `mipmaps/generate: false` | `project.godot` | see the note below — it is the one setting 640×480 puts in question |
| `pixel_size` `0.03125` → `0.0078125` | `scenes/enemy.tscn`, `scenes/pickup.tscn` | 256 px sprites instead of 64; 256 px must equal 2 m |
| `SCREEN` → `Vector2(640, 480)`, `BAR_H` 28 → 64, `FONT_SMALL` 8 → 16, `FONT_BIG` 16 → 32, and every hardcoded coordinate doubled | `scripts/hud.gd` | the whole HUD is laid out in the old 320×240 space |
| `ColorRect` → `TextureRect` with `hud_bar.png` | `scripts/hud.gd` | new status bar |
| `KEYCARD` → `hud_keycard.png`, drop `scale 0.5` | `scripts/hud.gd` | icon without scaling |
| `TEX_WALK` as a 4-frame array | `scripts/enemy.gd` | full walk cycle (optional) |
| +3 lines in `WALL_TEX` (`T`, `C`, `R`) | `scripts/level.gd` | new wall types |
| new wall characters in the map | `levels/deck1.txt` | zoning (6.1) — **do not change geometry** |
| `config/icon` | `project.godot` | the project icon is currently `keycard.png` |
| rewrite against PLAYPAL and drop the `noise()` pass, or retire it | `tools/gen_assets.py` | see 3.8 and section 2 |
| mention hand-made art and the new resolution | `README.md`, `CLAUDE.md` | both currently state the art is procedural and the game 320×240 |

### 8.1 Mipmaps — the one open technical question

Mipmaps are off today (`mipmaps/generate: false` in `[importer_defaults]`), which is
correct for a 320×240 pixel-art game: they blur the crisp nearest-filtered look and
the low resolution hides the aliasing anyway.

At 640×480 that trade changes. The floor and ceiling are single level-wide planes
with the texture repeated 32×22; at four times the pixel density, distant tiles will
shimmer as the camera moves. The options, in order of preference:

1. Leave mipmaps off and accept the shimmer — it is a period-correct artefact, and
   the depth shader darkens the far field anyway, which hides much of it.
2. Enable mipmaps for `floor` and `ceiling` only, keeping walls and sprites crisp.
3. Enable them everywhere and lose the hard pixel edge.

This cannot be decided from a still image. Decide it from `--drive` screenshots, or
better, from watching the real thing move on the device.

---

## 9. In one paragraph (the artist's brief)

An abandoned research station, H11, Deck 1. A heavy steel modular interior of the
1980s "future" that has lived through a catastrophe: rust along the seams, blood
on the panels, a red emergency lamp stuttering, green biomass crawling out of the
vents and the hull breaches — it is the dominant form of life here now. The palette is literally
Doom's PLAYPAL — steel, rust, blood, amber, toxic green, bone; blue only as a dead
CRT reflection. Draw 256×256 pixel
art at full brightness, with hard local contrast and ordered dithering, because
the engine darkens everything by distance on its own. The hero frame is a dark
corridor with something standing at the edge of visibility that has far too many eyes.
