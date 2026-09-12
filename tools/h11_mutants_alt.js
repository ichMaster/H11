/* H11 // Deck 1 — mutant direction studies.
 *
 * Three alternatives to the shipped mutant, pushed toward Doom (1993) creature
 * design: flesh over machinery, warmer ramps, one memorable silhouette each.
 * Load AFTER tools/h11_art.js. Adds entries to H11.A and H11.SIZES under the
 * alt_* prefix, so the shipping set is untouched until a direction is chosen.
 */
(function () {
  'use strict';
  const H = globalThis.H11;
  const { I, PAL, capsule, hsh, shader, part, curve, eyeRow, chorusFrame, BONE, PALE } = H;
  const { STEEL, RUST, BLOOD, RED, TOXIC, AMBER, GOLD, FLESH, CUT, INK } = PAL;

  // eyeRow from h11_art.js draws socket + iris; the explorations below used a
  // flatter version, kept here so their look does not drift.
  function eyes(g, list, col, hi) {
    for (const [x, y, r] of list) {
      const d = r * 2 - 1;
      g.rect(x - r + 1, y - r + 1, d, d, col);
      if (r >= 2) g.px(x - r + 1, y - r + 1, hi);
    }
  }
  function teeth(g, x0, x1, y, n, up, len) {
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i / (n - 1));
      const l = len * (0.6 + 0.4 * Math.abs(Math.cos(i * 1.7)));
      capsule(g, x, y, x + (up ? 0.5 : -0.5), y + (up ? -l : l), 1.7, 0.6, (t) => t < 0.5 ? BONE[2] : BONE[0]);
    }
  }

  // ══════════════════════════════════════════════ A — THE CREW
  // The former-human line: Doom's zombieman read, but the flesh has won.
  // Closest to what exists, so the cheapest to adopt. Suit is TAN/RUST, not
  // steel grey, which is most of what moves it from Quake to Doom.
  const SUIT = shader([RUST[9], RUST[12], RUST[14], RUST[16], RUST[18]]);
  const SKIN = shader([FLESH[1], FLESH[2], FLESH[3], FLESH[4], FLESH[6]]);
  const MEAT = shader([BLOOD[7], BLOOD[9], BLOOD[11], BLOOD[13], BLOOD[15]]);

  function crew(g, p) {
    const hip = [64, 82], chest = [65 + p.lean, 46];
    // far leg + far arm
    part(g, [hip[0] + 7, hip[1]], p.rknee, 7.5, 6, SUIT);
    part(g, p.rknee, p.rfoot, 6, 5, SUIT);
    g.rect(p.rfoot[0] - 7, p.rfoot[1], 15, 128 - p.rfoot[1], RUST[19]);
    part(g, [chest[0] + 16, chest[1] + 3], p.relb, 6.5, 5.5, SKIN);
    part(g, p.relb, p.rhand, 5.5, 4, SKIN);
    // near leg
    part(g, [hip[0] - 7, hip[1]], p.lknee, 8, 6.5, SUIT);
    part(g, p.lknee, p.lfoot, 6.5, 5, SUIT);
    g.rect(p.lfoot[0] - 8, p.lfoot[1], 16, 128 - p.lfoot[1], RUST[18]);
    g.rect(p.lfoot[0] - 8, p.lfoot[1], 16, 2, RUST[15]);
    // torso: trousers and belt below, opened ribcage above
    part(g, hip, [chest[0], chest[1] + 8], 12, 17, SUIT);
    g.rect(chest[0] - 15, 74, 30, 5, RUST[16]);
    g.rect(chest[0] - 3, 74, 7, 5, GOLD[3]);
    capsule(g, chest[0] - 2, chest[1] + 8, chest[0] + 2, chest[1] - 2, 17, 14, MEAT);
    // ribs showing through
    for (let i = 0; i < 5; i++) {
      const y = chest[1] - 6 + i * 5;
      capsule(g, chest[0] - 13, y, chest[0] + 12, y + 2, 1.6, 1.6, () => BONE[3]);
      capsule(g, chest[0] - 13, y + 1, chest[0] + 12, y + 3, 1, 1, () => BLOOD[15]);
    }
    g.blob(chest[0] + 2, chest[1] + 12, 9, BLOOD[14], 21, 0.55);
    g.blob(chest[0] - 6, chest[1] - 2, 5, BLOOD[16], 22, 0.6);
    // torn suit collar and one intact sleeve, so he still reads as staff
    capsule(g, chest[0] - 19, chest[1] + 1, chest[0] - 22, chest[1] + 10, 11, 9, SUIT);
    capsule(g, chest[0] + 15, chest[1] - 1, chest[0] + 18, chest[1] + 6, 8.5, 7, SUIT);
    part(g, [chest[0] - 21, chest[1] + 6], p.lelb, 7, 5.5, SUIT);
    part(g, p.lelb, p.lhand, 5.5, 4.2, SKIN);
    for (const h of [p.lhand, p.rhand]) {
      g.ell(h[0], h[1], 6, 5, INK);
      g.ell(h[0], h[1], 5, 4, FLESH[3]);
      g.ell(h[0] - 1, h[1] - 1, 3, 2, FLESH[2]);
      for (let i = 0; i < 3; i++) {
        const tx = h[0] - 6 + i * 6, ty = h[1] + 11;
        capsule(g, h[0] - 3 + i * 3, h[1] + 2, tx, ty, 2, 1.1, () => INK);
        capsule(g, h[0] - 3 + i * 3, h[1] + 2, tx, ty - 2, 1.4, 0.9, (t) => t < 0.6 ? FLESH[3] : FLESH[5]);
        g.px(tx, ty - 1, BONE[2]); g.px(tx, ty, BONE[4]);
      }
    }
    // head: skull coming through the face
    const hx = chest[0] + p.headx, hy = 24;
    part(g, [hx + 1, hy + 14], [hx, hy + 5], 5, 6.5, SKIN);
    capsule(g, hx, hy, hx + 1, hy + 2, 13, 13, () => INK);
    g.ell(hx, hy, 12, 12, FLESH[4]);
    g.ell(hx - 3, hy - 3, 9, 8, FLESH[3]);
    g.ell(hx - 5, hy - 6, 4, 3, FLESH[2]);
    g.blob(hx + 6, hy - 5, 6, BONE[3], 30, 0.6);       // skull through the temple
    g.blob(hx + 7, hy - 6, 3, BONE[1], 31, 0.65);
    g.ell(hx - 6, hy - 4, 4, 4, INK);                   // the socket that is empty
    g.ell(hx - 6, hy - 4, 2, 2, 0x170F07);
    eyes(g, [[hx + 5, hy - 4, 3]], p.eye, p.eyeHi);
    // long distended jaw, narrow — this is the Doom read
    g.ell(hx + 1, hy + 9, 8, p.jaw, 0x170F07);
    g.ell(hx + 1, hy + 9, 6, Math.max(1, p.jaw - 2), INK);
    teeth(g, hx - 5, hx + 7, hy + 9 - p.jaw + 2, 6, false, 3.5);
    teeth(g, hx - 4, hx + 6, hy + 9 + p.jaw - 2, 5, true, 3.5);
    g.blob(hx - 11, hy + 3, 4, TOXIC[9], 33, 0.5);      // the H11 link, kept small
    g.blob(chest[0] - 20, chest[1] - 5, 7, TOXIC[9], 34, 0.5);
    g.blob(chest[0] - 23, chest[1] - 9, 4, TOXIC[7], 35, 0.55);
  }

  function crewFrame(p) {
    const g = new I(128, 128);
    crew(g, p);
    g.outline(INK); g.harden();
    return g;
  }
  H.A.alt_crew_0 = () => crewFrame({
    lean: 1, headx: 3, jaw: 6, eye: 0xFFFF6B, eyeHi: 0xFFFFD7,
    lknee: [50, 102], lfoot: [44, 121], rknee: [78, 104], rfoot: [86, 121],
    lelb: [36, 70], lhand: [30, 106], relb: [90, 66], rhand: [96, 88]
  });
  H.A.alt_crew_attack = () => crewFrame({
    lean: 0, headx: 0, jaw: 10, eye: 0xFF5F5F, eyeHi: 0xFF9B9B,
    lknee: [48, 102], lfoot: [36, 122], rknee: [80, 102], rfoot: [92, 122],
    lelb: [30, 38], lhand: [15, 56], relb: [98, 36], rhand: [113, 54]
  });

  // ══════════════════════════════════════════════ B — THE CRAWLER
  // The pinky line: drop the humanoid entirely. Low, wide, forward-charging,
  // mostly jaw. Best silhouette in the set — unmistakable at 20 m and
  // unmistakably not a person, which the walk frames can never be.
  const HIDE = shader([FLESH[1], FLESH[2], FLESH[4], FLESH[5], FLESH[7]]);
  const HIDE_D = shader([FLESH[3], FLESH[4], FLESH[5], FLESH[6], FLESH[7]]);

  function crawler(g, p) {
    // rear legs, behind the mass
    part(g, [48, 96], [40, 114], 7, 5.5, HIDE_D);
    part(g, [40, 114], [34, 126], 5.5, 4.5, HIDE_D);
    part(g, [80, 96], [88, 114], 7, 5.5, HIDE_D);
    part(g, [88, 114], [94, 126], 5.5, 4.5, HIDE_D);
    // body: a wedge, tall at the shoulders and falling away behind
    capsule(g, 64, 72, 64, 100, 27, 23, () => INK);
    capsule(g, 64, 72, 64, 100, 26, 22, HIDE);
    capsule(g, 40, 84, 88, 84, 20, 20, () => INK);
    capsule(g, 40, 84, 88, 84, 19, 19, HIDE);
    g.blob(50, 70, 12, FLESH[2], 40, 0.55);
    g.blob(78, 74, 10, FLESH[3], 41, 0.55);
    g.blob(64, 104, 18, FLESH[6], 42, 0.5);
    for (let i = 0; i < 9; i++) {
      const a = i * 1.9;
      g.blob(64 + Math.cos(a) * 19, 86 + Math.sin(a) * 13, 3 + (i % 3), BLOOD[15], 50 + i, 0.5);
    }
    // dorsal spines: five, chunky, angled back
    for (let i = 0; i < 5; i++) {
      const x = 46 + i * 9, h2 = 9 - Math.abs(2 - i) * 1.6;
      capsule(g, x, 58, x - 5, 58 - h2, 4, 1.2, (t) => t < 0.5 ? TOXIC[9] : TOXIC[6]);
      g.blob(x - 5, 58 - h2, 3.5, TOXIC[7], 60 + i, 0.55);
    }
    g.blob(50, 58, 8, TOXIC[10], 67, 0.5);
    g.blob(80, 60, 7, TOXIC[11], 68, 0.5);
    // front legs, splayed forward, in front of the mass
    part(g, [48, 98], [30, 112], 9, 7, HIDE);
    part(g, [30, 112], [24, 125], 7, 6, HIDE);
    part(g, [80, 98], [98, 112], 9, 7, HIDE);
    part(g, [98, 112], [104, 125], 7, 6, HIDE);
    for (const fx of [24, 104]) {
      g.ell(fx, 125, 10, 4, INK);
      g.ell(fx, 125, 9, 3, FLESH[5]);
      for (let i = 0; i < 3; i++) {
        capsule(g, fx - 6 + i * 6, 124, fx - 8 + i * 8, 128, 2.2, 1.2, () => INK);
        capsule(g, fx - 6 + i * 6, 124, fx - 8 + i * 8, 127, 1.4, 0.7, () => BONE[3]);
      }
    }
    // the head: a blunt skull pushed forward, the maw cut into it
    capsule(g, 64, 78, 64, 96, 30, 27, () => INK);
    capsule(g, 64, 78, 64, 96, 29, 26, HIDE);
    g.blob(50, 74, 11, FLESH[2], 70, 0.55);
    g.blob(64, 100, 14, FLESH[6], 71, 0.5);
    const mw = p.maw;
    // maw: an oval pit, not a letterbox
    g.ell(64, 92, 27, mw + 4, INK);
    g.ell(64, 92, 25, mw + 2, 0x170F07);
    g.ell(64, 92, 21, Math.max(2, mw), BLOOD[16]);
    g.ell(64, 93, 13, Math.max(1, mw - 4), INK);
    g.ell(64, 92 + mw - 1, 14, 3, BLOOD[14]);           // tongue
    // teeth: irregular, angled toward the centre
    for (let i = 0; i < 11; i++) {
      const t = i / 10, x = 42 + t * 44;
      const lean = (x - 64) * 0.09;
      const l = (6 + 3.5 * Math.abs(Math.cos(i * 1.9))) * (1 - Math.abs(t - 0.5) * 0.5);
      capsule(g, x, 92 - mw - 1, x + lean, 92 - mw - 1 + l, 2.2, 0.7, (u) => u < 0.45 ? BONE[3] : BONE[0]);
    }
    for (let i = 0; i < 8; i++) {
      const t = i / 7, x = 46 + t * 36;
      const l = (5 + 3 * Math.abs(Math.sin(i * 2.3))) * (1 - Math.abs(t - 0.5) * 0.5);
      capsule(g, x, 92 + mw + 1, x - (x - 64) * 0.08, 92 + mw + 1 - l, 2, 0.7, (u) => u < 0.45 ? BONE[4] : BONE[1]);
    }
    g.ell(64, 92 - mw - 4, 27, 4, FLESH[3]);            // upper lip
    g.ell(64, 92 + mw + 4, 22, 4, FLESH[5]);            // lower lip
    // brow, with the eyes set back in its shadow
    capsule(g, 44, 72, 84, 72, 10, 10, () => INK);
    capsule(g, 44, 72, 84, 72, 9, 9, HIDE);
    g.ell(64, 68, 22, 5, FLESH[2]);
    g.ell(64, 75, 24, 5, 0x170F07);
    eyes(g, [[49, 75, 3], [57, 74, 2], [71, 74, 2], [79, 75, 3], [64, 77, 2], [43, 78, 1], [85, 78, 1]], p.eye, p.eyeHi);
  }

  function crawlerFrame(p) {
    const g = new I(128, 128);
    crawler(g, p);
    g.outline(INK); g.harden();
    return g;
  }
  H.A.alt_crawler_0 = () => crawlerFrame({ maw: 6, eye: 0xFFFF6B, eyeHi: 0xFFFFD7 });
  H.A.alt_crawler_attack = () => crawlerFrame({ maw: 15, eye: 0xFF5F5F, eyeHi: 0xFF9B9B });

  // ══════════════════════════════════════════════ C — THE BLOOM
  // The cacodemon line, and the only one that is actually about H11's fiction:
  // an algorithm that rewrites matter, finished with a person. A suspended sac
  // of biomass with a crown of eyes and a lamprey mouth, still trailing the
  // ribcage and one arm of what it used to be.
  const SAC = shader([TOXIC[6], TOXIC[8], TOXIC[9], TOXIC[11], TOXIC[13]]);

  function bloom(g, p) {
    const BONEC = shader([BONE[0], BONE[1], BONE[2], BONE[4], BONE[5]]);
    // the arm it kept, reaching the bottom of the frame
    part(g, [72, 92], [86, 108], 5, 3.4, shader([FLESH[1], FLESH[2], FLESH[3], FLESH[5], FLESH[7]]));
    part(g, [86, 108], [92, 124], 3.4, 2.4, shader([FLESH[2], FLESH[3], FLESH[4], FLESH[6], FLESH[7]]));
    g.ell(92, 125, 5, 4, INK);
    g.ell(92, 125, 4, 3, FLESH[3]);
    for (let i = 0; i < 3; i++) capsule(g, 89 + i * 3, 125, 88 + i * 4, 128, 1.7, 0.9, () => FLESH[5]);
    // spine and ribcage hanging out of the sac — bone, not stripes
    capsule(g, 62, 82, 57, 124, 4.5, 3, () => INK);
    capsule(g, 62, 82, 57, 124, 3.4, 2, BONEC);
    for (let i = 0; i < 4; i++) {
      const y = 92 + i * 8, w = 12 - i * 2.4, cx = 62 - i * 1.1;
      capsule(g, cx - w, y, cx + w, y + 2, 2, 2, () => INK);
      capsule(g, cx - w, y, cx + w, y + 2, 1.1, 1.1, (t) => t < 0.35 ? BONE[4] : t < 0.75 ? BONE[2] : BONE[5]);
    }
    g.blob(60, 94, 9, BLOOD[15], 90, 0.4);
    g.blob(64, 104, 7, BLOOD[16], 92, 0.4);
    g.blob(56, 114, 5, BLOOD[17], 91, 0.45);
    g.blob(58, 88, 6, FLESH[4], 93, 0.5);
    // hanging tendrils
    for (const [x0, x1, len] of [[44, 38, 30], [84, 92, 20], [50, 46, 40], [76, 80, 16]]) {
      capsule(g, x0, 78, x1, 78 + len, 3.2, 0.8, (t) => t < 0.5 ? TOXIC[10] : TOXIC[12]);
      g.blob(x1, 78 + len, 2.6, TOXIC[9], 70 + x0, 0.55);
    }
    // the sac. Shaded with offset blobs, never a concentric onion, and never
    // a dith() — dither writes into the transparent field and squares off the
    // silhouette, which is fatal on a sprite.
    g.ell(64, 52, 34, 32, INK);
    g.ell(64, 52, 33, 31, TOXIC[14]);
    g.blob(62, 50, 29, TOXIC[12], 100, 0.7);
    g.blob(58, 46, 24, TOXIC[10], 101, 0.7);
    g.blob(55, 42, 18, TOXIC[8], 102, 0.7);
    g.blob(52, 38, 11, TOXIC[6], 103, 0.7);
    g.blob(50, 34, 5, TOXIC[4], 104, 0.7);
    for (const [bx, by, br, bc] of [[84, 62, 12, TOXIC[13]], [42, 70, 10, TOXIC[12]],
    [88, 40, 8, TOXIC[10]], [36, 46, 8, TOXIC[9]], [72, 76, 12, TOXIC[13]],
    [70, 28, 8, TOXIC[8]], [46, 60, 7, TOXIC[12]]])
      g.blob(bx, by, br, bc, 110 + bx, 0.45);
    // veins of the person inside
    for (let i = 0; i < 9; i++) {
      const a = 0.4 + i * 0.7;
      g.line(64 + Math.cos(a) * 11, 52 + Math.sin(a) * 9, 64 + Math.cos(a) * 28, 52 + Math.sin(a) * 24, BLOOD[15]);
      g.line(64 + Math.cos(a) * 11, 53 + Math.sin(a) * 9, 64 + Math.cos(a) * 22, 53 + Math.sin(a) * 19, BLOOD[17]);
    }
    // lamprey mouth: a deep pit with one ring of chunky raked teeth
    const mr = p.maw, mx = 67, my = 70;
    g.ell(mx, my, mr + 7, mr + 5, TOXIC[15]);
    g.ell(mx, my, mr + 5, mr + 3, 0x170F07);
    g.ell(mx, my, mr + 3, mr + 1, INK);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * 6.283 + 0.35;
      const ox = Math.cos(a), oy = Math.sin(a) * 0.82;
      capsule(g, mx + ox * (mr + 2), my + oy * (mr + 2), mx + ox * (mr - 4), my + oy * (mr - 4),
        2.2, 0.6, (t) => t < 0.55 ? BONE[5] : t < 0.85 ? BONE[3] : BONE[1]);
    }
    g.ell(mx, my, Math.max(2, mr - 4), Math.max(1, mr - 5), INK);
    g.ell(mx - 2, my - 2, Math.max(1, mr - 8), Math.max(1, mr - 9), 0x170F07);
    // crown of eyes — too many, irregular, set deep
    const list = [[40, 48, 4], [47, 36, 3], [57, 30, 4], [68, 28, 3], [78, 33, 4],
    [86, 43, 3], [90, 55, 3], [36, 60, 3], [52, 44, 3], [72, 41, 2], [82, 68, 2], [44, 72, 2]];
    for (const [x, y, r] of list) { g.ell(x, y, r + 2, r + 2, INK); g.ell(x, y, r + 1, r + 1, 0x170F07); }
    eyes(g, list, p.eye, p.eyeHi);
  }

  function bloomFrame(p) {
    const g = new I(128, 128);
    bloom(g, p);
    g.outline(INK); g.harden();
    return g;
  }
  H.A.alt_bloom_0 = () => bloomFrame({ maw: 11, eye: 0xFFFF6B, eyeHi: 0xFFFFD7 });
  H.A.alt_bloom_attack = () => bloomFrame({ maw: 17, eye: 0xFF5F5F, eyeHi: 0xFF9B9B });


  // ══════════════════════════════════════════════ D — THE CHOIR
  // The rejected half of turn 2. Same shell as the shipped mutant — it calls
  // the rig straight out of h11_art.js — but the person is still in there,
  // fused into the lower plates under the tusks. Kept because the face is
  // worth reusing on a decal or on a set-piece corpse.
  function frontFace(g, cy, p) {
    capsule(g, 46, cy - 4, 82, cy - 4, 10, 10, () => INK);
    capsule(g, 46, cy - 4, 82, cy - 4, 9, 9, PALE);
    capsule(g, 64, cy - 12, 64, cy - 4, 15, 14, () => INK);
    g.ell(64, cy - 14, 14, 14, FLESH[2]);
    g.ell(61, cy - 17, 10, 9, FLESH[1]);
    g.ell(58, cy - 21, 5, 4, FLESH[0]);
    g.ell(58, cy - 15, 4, 2, 0x170F07);
    g.ell(70, cy - 15, 4, 2, 0x170F07);
    g.hline(54, cy - 15, 9, FLESH[4]); g.hline(66, cy - 15, 9, FLESH[4]);
    g.ell(64, cy - 6, 6, p.scream, INK);
    g.ell(64, cy - 7, 4, Math.max(1, p.scream - 2), 0x170F07);
    g.blob(76, cy - 18, 5, BLOOD[15], 310, 0.45);
    g.blob(52, cy - 20, 4, TOXIC[10], 311, 0.5);
    g.blob(78, cy + 2, 4, TOXIC[11], 312, 0.5);
    curve(g, [48, cy - 8], [34, cy + 2], [30, cy + 14], 4, 3, 1.8, PALE);
    curve(g, [80, cy - 8], [94, cy + 2], [98, cy + 14], 4, 3, 1.8, PALE);
  }
  H.A.alt_choir_0 = () => chorusFrame({ bob: 0, gap: 8, sway: 0.0, scream: 3, front: frontFace, eye: 0xFFFF6B, eyeHi: 0xFFFFD7 });
  H.A.alt_choir_attack = () => chorusFrame({ bob: -4, gap: 17, sway: 0.8, flare: 1.6, scream: 6, front: frontFace, eye: 0xFF5F5F, eyeHi: 0xFF9B9B });

  for (const k of ['alt_crew_0', 'alt_crew_attack', 'alt_crawler_0', 'alt_crawler_attack',
    'alt_bloom_0', 'alt_bloom_attack', 'alt_choir_0', 'alt_choir_attack'])
    H.SIZES[k] = [128 * H.SCALE, 128 * H.SCALE];
})();
