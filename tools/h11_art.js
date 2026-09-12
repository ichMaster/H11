/* H11 // Deck 1 — art source of truth.
 *
 * Every asset in assets/*.png is drawn by this file. No random per-pixel noise:
 * gradients are ordered (4x4 Bayer) dithers between two adjacent entries of one
 * PLAYPAL ramp. Every colour below was lifted from the Freedoom reference set in
 * specification/style-refs/ and is therefore a PLAYPAL entry by construction.
 *
 * Runs in Node (tools/gen_assets.mjs) and in a browser (the design canvas).
 * See ART_REDESIGN.md sections 2 and 3.
 *
 * RESOLUTION. The game renders at 640x480, one render pixel per panel pixel,
 * so every asset is twice the size it was at 320x240. Assets are AUTHORED in a
 * 128-unit design space and RASTERISED at SCALE = 2. That is not an upscale:
 * curves, organic edges, ordered dither and surface grain are all computed in
 * device pixels, so they carry real detail at 256 that did not exist at 128.
 * Only structural strokes and stencil type scale proportionally, which is
 * correct — a 2 mm panel seam is 2 mm whatever the render target.
 * Set SCALE back to 1 to regenerate the 320x240 set.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- palette
  // Ramps run light -> dark. Indices here are ramp positions, not PLAYPAL
  // indices; the PLAYPAL index range each ramp covers is in the comment.

  const STEEL = [ // PLAYPAL 80-111 + INK tail
    0xEFEFEF, 0xDFDFDF, 0xCBCBCB, 0xBFBFBF, 0xB3B3B3, 0xA7A7A7, 0x9F9F9F, 0x939393,
    0x8B8B8B, 0x7F7F7F, 0x777777, 0x6B6B6B, 0x636363, 0x5B5B5B, 0x575757, 0x4F4F4F,
    0x4B4B4B, 0x434343, 0x3B3B3B, 0x373737, 0x2F2F2F, 0x2B2B2B, 0x272727, 0x232323,
    0x1B1B1B, 0x131313, 0x0B0B0B, 0x070707];

  const RUST = [ // PLAYPAL 48-79 (the TAN/RUST browns)
    0xBFA78F, 0xB79F87, 0xAF977F, 0xA78F77, 0x9F876F, 0x9F8363, 0x947C63, 0x8C745B,
    0x846B56, 0x7C634E, 0x78604C, 0x6F5743, 0x675333, 0x5F4B37, 0x574333, 0x4F3B2B,
    0x4B371B, 0x43331B, 0x3F2F17, 0x332B13, 0x2B230F, 0x1F170B, 0x170F07];

  const CUT = [ // fresh / oxidising cut metal
    0xCB7F4F, 0xC07C4A, 0xB37347, 0xA46B3D, 0x9C6338, 0x8F5F37, 0x875733, 0x774F2B,
    0x6B4727, 0x5B472B, 0x4B371B];

  const BLOOD = [ // PLAYPAL 16-47 — stains, never light
    0xFFB7B7, 0xF3A3A3, 0xE78F8F, 0xD37373, 0xC76363, 0xBB5757, 0xAF4747, 0xA33B3B,
    0x972F2F, 0x8B2323, 0x7F1B1B, 0x731313, 0x670B0B, 0x5B0707, 0x530707, 0x4F0000,
    0x430000, 0x170F07];

  const RED = [ // PLAYPAL 168-191 — light, never stain
    0xFF9B9B, 0xFF7B7B, 0xFF5F5F, 0xFF3F3F, 0xFF1F1F, 0xFF0000, 0xEF0000, 0xE30000,
    0xD70000, 0xCB0000, 0xBF0000, 0xB30000, 0xA70000, 0x9B0000, 0x8C0000, 0x800000,
    0x740000, 0x670000, 0x5B0000, 0x4F0000, 0x430000];

  const TOXIC = [ // PLAYPAL 112-127 — H11 biomass, screens, OK lamps
    0x77FF6F, 0x6FEF67, 0x67DF5F, 0x5FCF57, 0x5BBF4F, 0x53AF47, 0x4B9F3F, 0x439337,
    0x3F832F, 0x37732B, 0x2F6323, 0x27531B, 0x1F4317, 0x17330F, 0x13230B, 0x0B1707];

  const OLIVE = [ // PLAYPAL 152-167 — grime over green
    0x7C8063, 0x7B7F63, 0x676B4F, 0x676B4E, 0x5B6347, 0x5B6345, 0x53573B, 0x525638,
    0x474F33, 0x454E30, 0x3F472B, 0x3D4527, 0x373F27, 0x343D22, 0x2F371F, 0x2B3419,
    0x232B0F];

  const AMBER = [ // PLAYPAL 208-223 — hazard, energy, muzzle flash
    0xFFDBC7, 0xFFC7A7, 0xFFB383, 0xFF9F43, 0xDF670F, 0xCB5707, 0xB74700, 0xA73F00,
    0x932F00, 0x872300, 0x732B00];

  const GOLD = [0xEBDB57, 0xD7BB43, 0xC39B2F, 0xAF7B1F, 0x9B5B13, 0x874307];
  const YELLOW = [0xFFFFD7, 0xFFFFB3, 0xFFFF8F, 0xFFFF73, 0xFFFF6B, 0xFFFF00];
  const BLUE = [0xE7E7FF, 0xABABFF, 0x8F8FFF, 0x5353FF, 0x1B1BFF, 0x0000FF, 0x0000B3, 0x000083, 0x000053, 0x000023];
  const FLESH = [0x8F7753, 0x7B634F, 0x6F5743, 0x5F4B37, 0x4F3B2B, 0x3F2F17, 0x332B13, 0x1F170B];

  const INK = 0x070707;
  const SEAM = 0x131313;

  const PAL = { STEEL, RUST, CUT, BLOOD, RED, TOXIC, OLIVE, AMBER, GOLD, YELLOW, BLUE, FLESH, INK, SEAM };

  // ------------------------------------------------------------------ fonts
  const F5 = {
    'A': '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    'B': '####.|#...#|#...#|####.|#...#|#...#|####.',
    'C': '.###.|#...#|#....|#....|#....|#...#|.###.',
    'D': '####.|#...#|#...#|#...#|#...#|#...#|####.',
    'E': '#####|#....|#....|####.|#....|#....|#####',
    'F': '#####|#....|#....|####.|#....|#....|#....',
    'G': '.###.|#...#|#....|#.###|#...#|#...#|.###.',
    'H': '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    'I': '#####|..#..|..#..|..#..|..#..|..#..|#####',
    'J': '....#|....#|....#|....#|#...#|#...#|.###.',
    'K': '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    'L': '#....|#....|#....|#....|#....|#....|#####',
    'M': '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
    'N': '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
    'O': '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    'P': '####.|#...#|#...#|####.|#....|#....|#....',
    'Q': '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    'S': '.###.|#...#|#....|.###.|....#|#...#|.###.',
    'T': '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    'U': '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    'W': '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
    'X': '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    'Z': '#####|....#|...#.|..#..|.#...|#....|#####',
    '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
    '3': '#####|...#.|..#..|...#.|....#|#...#|.###.',
    '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    '5': '#####|#....|####.|....#|....#|#...#|.###.',
    '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
    '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
    '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '/': '....#|....#|...#.|..#..|.#...|#....|#....',
    '.': '.....|.....|.....|.....|.....|.##..|.##..',
    '-': '.....|.....|.....|#####|.....|.....|.....',
    ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    ' ': '.....|.....|.....|.....|.....|.....|.....'
  };

  const F3 = {
    'A': '.#.|#.#|###|#.#|#.#', 'B': '##.|#.#|##.|#.#|##.', 'C': '.##|#..|#..|#..|.##',
    'D': '##.|#.#|#.#|#.#|##.', 'E': '###|#..|##.|#..|###', 'F': '###|#..|##.|#..|#..',
    'G': '.##|#..|#.#|#.#|.##', 'H': '#.#|#.#|###|#.#|#.#', 'I': '###|.#.|.#.|.#.|###',
    'J': '..#|..#|..#|#.#|.#.', 'K': '#.#|#.#|##.|#.#|#.#', 'L': '#..|#..|#..|#..|###',
    'M': '#.#|###|###|#.#|#.#', 'N': '#.#|###|###|###|#.#', 'O': '.#.|#.#|#.#|#.#|.#.',
    'P': '##.|#.#|##.|#..|#..', 'Q': '.#.|#.#|#.#|###|.##', 'R': '##.|#.#|##.|#.#|#.#',
    'S': '.##|#..|.#.|..#|##.', 'T': '###|.#.|.#.|.#.|.#.', 'U': '#.#|#.#|#.#|#.#|.#.',
    'V': '#.#|#.#|#.#|.#.|.#.', 'W': '#.#|#.#|###|###|#.#', 'X': '#.#|#.#|.#.|#.#|#.#',
    'Y': '#.#|#.#|.#.|.#.|.#.', 'Z': '###|..#|.#.|#..|###',
    '0': '###|#.#|#.#|#.#|###', '1': '.#.|##.|.#.|.#.|###', '2': '##.|..#|.#.|#..|###',
    '3': '##.|..#|.#.|..#|##.', '4': '#.#|#.#|###|..#|..#', '5': '###|#..|##.|..#|##.',
    '6': '.##|#..|###|#.#|###', '7': '###|..#|.#.|.#.|.#.', '8': '###|#.#|###|#.#|###',
    '9': '###|#.#|###|..#|##.',
    '/': '..#|..#|.#.|#..|#..', '.': '...|...|...|...|.#.', '-': '...|...|###|...|...',
    ':': '...|.#.|...|.#.|...', '%': '#.#|..#|.#.|#..|#.#', ' ': '...|...|...|...|...'
  };

  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];

  // 640x480 render target -> every asset is 2x its 320x240 size (ART_REDESIGN 3.1)
  const SCALE = 2;

  function hsh(x, y, s) {
    let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
    n = ((n ^ (n >>> 13)) * 1274126177) | 0;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  // ------------------------------------------------------------------ canvas
  class I {
    // dw/dh are DESIGN units; the buffer is dw*SCALE x dh*SCALE device pixels.
    constructor(dw, dh, fill, scale) {
      this.s = scale === undefined ? SCALE : scale;
      this.dw = dw; this.dh = dh;
      this.w = dw * this.s; this.h = dh * this.s;
      this.d = new Uint8ClampedArray(this.w * this.h * 4);
      this.wrapX = false; this.wrapY = false;
      if (fill !== undefined && fill !== null) this.rect(0, 0, dw, dh, fill);
    }
    // ---- device space: one real pixel. Detail finer than a design unit lives here.
    dpx(x, y, c, a) {
      if (c === null || c === undefined) return;
      x = Math.round(x); y = Math.round(y);
      if (this.wrapX) x = ((x % this.w) + this.w) % this.w;
      if (this.wrapY) y = ((y % this.h) + this.h) % this.h;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
      const i = (y * this.w + x) * 4;
      this.d[i] = (c >> 16) & 255; this.d[i + 1] = (c >> 8) & 255; this.d[i + 2] = c & 255;
      this.d[i + 3] = a === undefined ? 255 : a;
    }
    dget(x, y) {
      if (this.wrapX) x = ((x % this.w) + this.w) % this.w;
      if (this.wrapY) y = ((y % this.h) + this.h) % this.h;
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
      const i = (y * this.w + x) * 4;
      return { c: (this.d[i] << 16) | (this.d[i + 1] << 8) | this.d[i + 2], a: this.d[i + 3] };
    }
    drect(x, y, w, h, c) {
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.dpx(x + i, y + j, c);
    }
    // ---- design space: one unit = SCALE device pixels
    px(x, y, c, a) {
      const s = this.s, X = Math.round(x) * s, Y = Math.round(y) * s;
      for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) this.dpx(X + i, Y + j, c, a);
    }
    rect(x, y, w, h, c) { const s = this.s; this.drect(Math.round(x) * s, Math.round(y) * s, Math.round(w) * s, Math.round(h) * s, c); }
    hline(x, y, w, c) { this.rect(x, y, w, 1, c); }
    vline(x, y, h, c) { this.rect(x, y, 1, h, c); }
    frame(x, y, w, h, c) { this.hline(x, y, w, c); this.hline(x, y + h - 1, w, c); this.vline(x, y, h, c); this.vline(x + w - 1, y, h, c); }
    bevel(x, y, w, h, lt, dk) {
      this.hline(x, y, w, lt); this.vline(x, y, h, lt);
      this.hline(x, y + h - 1, w, dk); this.vline(x + w - 1, y, h, dk);
    }
    recess(x, y, w, h, lt, dk) { this.bevel(x, y, w, h, dk, lt); }
    // ordered dither, rasterised in DEVICE pixels -> finer at 256 than it was at 128
    dith(x, y, w, h, ca, cb, lvl) {
      const s = this.s, X = Math.round(x) * s, Y = Math.round(y) * s, W2 = Math.round(w) * s, H2 = Math.round(h) * s;
      for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
        const px = X + i, py = Y + j;
        this.dpx(px, py, BAYER[((py % 4) + 4) % 4][((px % 4) + 4) % 4] < lvl ? cb : ca);
      }
    }
    vramp(x, y, w, h, ramp, i0, i1, steps) {
      const n = steps || Math.abs(i1 - i0) + 1;
      for (let k = 0; k < n; k++) {
        const y0 = y + Math.floor(h * k / n), y1 = y + Math.floor(h * (k + 1) / n);
        const idx = Math.round(i0 + (i1 - i0) * k / Math.max(1, n - 1));
        const nxt = Math.round(i0 + (i1 - i0) * Math.min(n - 1, k + 1) / Math.max(1, n - 1));
        this.rect(x, y0, w, y1 - y0, ramp[idx]);
        if (nxt !== idx && y1 - y0 > 2) this.dith(x, y1 - 2, w, 2, ramp[idx], ramp[nxt], 8);
      }
    }
    line(x0, y0, x1, y1, c) {
      // round first: Bresenham's equality test never fires on fractional endpoints
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      for (; ;) {
        this.px(x0, y0, c);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    }
    // curves rasterise in device space — this is where 256 genuinely buys detail
    ell(cx, cy, rx, ry, c) {
      const s = this.s, CX = cx * s, CY = cy * s, RX = rx * s + (s - 1) / 2, RY = ry * s + (s - 1) / 2;
      for (let y = -Math.ceil(RY); y <= Math.ceil(RY); y++) for (let x = -Math.ceil(RX); x <= Math.ceil(RX); x++)
        if ((x * x) / (RX * RX) + (y * y) / (RY * RY) <= 1.0) this.dpx(CX + x, CY + y, c);
    }
    ring(cx, cy, r, t, c) {
      const s = this.s, CX = cx * s, CY = cy * s, R = r * s + (s - 1) / 2, T = t * s;
      for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) for (let x = -Math.ceil(R); x <= Math.ceil(R); x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= R && d >= R - T) this.dpx(CX + x, CY + y, c);
      }
    }
    // organic patch — hash shapes the EDGE only, in device pixels
    blob(cx, cy, r, c, seed, core) {
      const s = this.s, CX = Math.round(cx * s), CY = Math.round(cy * s), R = r * s;
      const k = core === undefined ? 0.55 : core;
      for (let y = -Math.ceil(R); y <= Math.ceil(R); y++) for (let x = -Math.ceil(R); x <= Math.ceil(R); x++) {
        const d = Math.sqrt(x * x + y * y) / R;
        if (d > 1) continue;
        const t = d < k ? 1 : 1 - (d - k) / (1 - k);
        if (hsh(CX + x, CY + y, seed) < t) this.dpx(CX + x, CY + y, c);
      }
    }
    // surface grain, device pixels: same coverage, four times the granularity
    speck(x, y, w, h, c, dens, seed) {
      const s = this.s, X = Math.round(x) * s, Y = Math.round(y) * s, W2 = Math.round(w) * s, H2 = Math.round(h) * s;
      for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++)
        if (hsh(X + i, Y + j, seed) < dens) this.dpx(X + i, Y + j, c);
    }
    glyphs(font, gh, x, y, str, c, sc) {
      sc = sc || 1;
      const gw = font === F3 ? 3 : 5, adv = (gw + 1) * sc;
      let cx = x;
      for (const ch of str.toUpperCase()) {
        const g = font[ch];
        if (g) {
          const rows = g.split('|');
          for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++)
            if (rows[j][i] === '#') this.rect(cx + i * sc, y + j * sc, sc, sc, c);
        }
        cx += adv;
      }
      return cx - x - sc;
    }
    t5(x, y, s2, c, sc) { return this.glyphs(F5, 7, x, y, s2, c, sc); }
    t3(x, y, s2, c, sc) { return this.glyphs(F3, 5, x, y, s2, c, sc); }
    w5(str, sc) { return str.length * 6 * (sc || 1) - (sc || 1); }
    w3(str, sc) { return str.length * 4 * (sc || 1) - (sc || 1); }
    // silhouette contour, SCALE device pixels thick so it survives the fog
    outline(c) {
      const W = this.w, H2 = this.h, d = this.d;
      const R = (c >> 16) & 255, G = (c >> 8) & 255, B = c & 255;
      for (let pass = 0; pass < this.s; pass++) {
        const hits = [];
        for (let y = 0; y < H2; y++) {
          const row = y * W;
          for (let x = 0; x < W; x++) {
            const i = (row + x) * 4;
            if (d[i + 3] > 0) continue;
            if ((x > 0 && d[i - 4 + 3] > 0) || (x < W - 1 && d[i + 4 + 3] > 0) ||
                (y > 0 && d[i - W * 4 + 3] > 0) || (y < H2 - 1 && d[i + W * 4 + 3] > 0)) hits.push(i);
          }
        }
        for (let k = 0; k < hits.length; k++) {
          const i = hits[k];
          d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255;
        }
      }
    }
    harden() { for (let i = 3; i < this.d.length; i += 4) this.d[i] = this.d[i] >= 128 ? 255 : 0; }
  }

  // tapered capsule with a lateral shading callback — limbs and pipes
  function capsule(img, x0, y0, x1, y1, r0, r1, cf) {
    const s = img.s;
    x0 *= s; y0 *= s; x1 *= s; y1 *= s; r0 = r0 * s + (s - 1) / 2; r1 = r1 * s + (s - 1) / 2;
    const minx = Math.floor(Math.min(x0, x1) - Math.max(r0, r1)) - 1;
    const maxx = Math.ceil(Math.max(x0, x1) + Math.max(r0, r1)) + 1;
    const miny = Math.floor(Math.min(y0, y1) - Math.max(r0, r1)) - 1;
    const maxy = Math.ceil(Math.max(y0, y1) + Math.max(r0, r1)) + 1;
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      let t = ((x - x0) * dx + (y - y0) * dy) / L2;
      t = Math.max(0, Math.min(1, t));
      const px = x0 + dx * t, py = y0 + dy * t;
      const d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      const r = r0 + (r1 - r0) * t;
      if (d > r) continue;
      const side = (x - px) / Math.max(1, r);
      const c = cf(t, side, x / s, y / s);
      if (c !== null && c !== undefined) img.dpx(x, y, c);
    }
  }

  // shade picker for a cylinder lit from the left
  function cyl(ramp, base) {
    return function (t, side) {
      const i = base + Math.round(side * 4 + 1.2);
      return ramp[Math.max(0, Math.min(ramp.length - 1, i))];
    };
  }

  // ------------------------------------------------------- shared wall parts
  // Every wall shares this substrate so the level reads as one building.
  // Left and right edges are mirror-symmetric -> horizontal tiling is seamless.

  function substrate(g, opt) {
    opt = opt || {};
    const rust = opt.rust === undefined ? 1 : opt.rust;
    g.wrapX = true;
    // plate field: two adjacent STEEL steps, ordered dither, no noise
    g.rect(0, 0, 128, 128, STEEL[16]);
    g.dith(0, 0, 128, 128, STEEL[16], STEEL[17], 6);
    // large panel blocks give the 2x2 m face its form
    g.dith(8, 12, 112, 44, STEEL[15], STEEL[16], 5);
    g.dith(8, 68, 112, 46, STEEL[16], STEEL[17], 7);

    // cornice (top join zone, 8 px)
    g.rect(0, 0, 128, 8, STEEL[19]);
    g.hline(0, 0, 128, STEEL[13]);
    g.hline(0, 6, 128, STEEL[12]);
    g.hline(0, 7, 128, STEEL[25]);
    g.dith(0, 1, 128, 5, STEEL[19], STEEL[21], 6);

    // skirting (bottom join zone, 8 px)
    g.hline(0, 119, 128, STEEL[25]);
    g.rect(0, 120, 128, 8, STEEL[21]);
    g.hline(0, 120, 128, STEEL[14]);
    g.dith(0, 121, 128, 7, STEEL[21], STEEL[23], 7);

    // mid seam — the single strongest horizontal in the set
    g.hline(0, 59, 128, STEEL[11]);
    g.rect(0, 60, 128, 3, SEAM);
    g.hline(0, 63, 128, STEEL[19]);

    // wrapping support column straddling the tile edge (x = -4 .. +4)
    for (const cx of [-4, 124]) {
      g.rect(cx, 8, 8, 111, STEEL[14]);
      g.vline(cx, 8, 111, STEEL[10]);
      g.vline(cx + 1, 8, 111, STEEL[9]);
      g.vline(cx + 6, 8, 111, STEEL[20]);
      g.vline(cx + 7, 8, 111, STEEL[24]);
      for (let y = 14; y < 118; y += 26) rivet(g, cx + 4, y);
    }

    // inner panel bevels
    g.recess(8, 12, 112, 44, STEEL[11], STEEL[23]);
    g.recess(8, 68, 112, 46, STEEL[11], STEEL[23]);

    // cable conduit
    if (opt.cable !== false) {
      const cx = opt.cableX === undefined ? 100 : opt.cableX;
      g.rect(cx, 8, 9, 111, STEEL[18]);
      g.vline(cx, 8, 111, STEEL[12]);
      g.vline(cx + 8, 8, 111, STEEL[24]);
      g.vline(cx + 3, 8, 111, STEEL[21]);
      g.vline(cx + 5, 8, 111, STEEL[15]);
      for (let y = 18; y < 118; y += 24) {
        g.rect(cx - 2, y, 13, 5, STEEL[13]);
        g.hline(cx - 2, y, 13, STEEL[8]);
        g.hline(cx - 2, y + 4, 13, STEEL[23]);
      }
    }

    if (rust > 0) grime(g, rust, opt.seed || 7);
    return g;
  }

  function rivet(g, cx, cy) {
    g.ell(cx, cy, 2, 2, STEEL[12]);
    g.px(cx - 1, cy - 1, STEEL[6]);
    g.px(cx, cy - 1, STEEL[8]);
    g.px(cx + 1, cy + 1, STEEL[24]);
    g.px(cx, cy + 1, STEEL[22]);
  }

  // rust lives in corners and along seams — never in the middle of a clean plate
  function grime(g, amt, seed) {
    const anchors = [[0, 61], [128, 61], [64, 61], [30, 61], [96, 61],
    [4, 117], [124, 117], [44, 119], [86, 119], [10, 13], [118, 13], [62, 10]];
    for (let i = 0; i < anchors.length; i++) {
      const x = anchors[i][0] + Math.round((hsh(i, 1, seed) - 0.5) * 22);
      const y = anchors[i][1] + Math.round((hsh(i, 2, seed) - 0.5) * 8);
      const rr = Math.round((7 + hsh(i, 3, seed) * 9) * amt);
      if (rr < 2) continue;
      g.blob(x, y, rr, RUST[18], seed + i, 0.25);
      g.blob(x, y, Math.round(rr * 0.6), RUST[16], seed + i + 40, 0.3);
      g.blob(x + 2, y - 1, Math.round(rr * 0.3), RUST[13], seed + i + 80, 0.4);
    }
    g.speck(0, 114, 128, 6, RUST[20], 0.10 * amt, seed + 900);
    g.speck(0, 8, 128, 4, RUST[19], 0.06 * amt, seed + 901);
  }

  // ------------------------------------------------------------ wall assets
  const A = {};

  A.wall_panel = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1, seed: 3 });
    g.t3(14, 100, 'PNL 12-A', RUST[9], 1);
    g.speck(14, 100, 32, 5, STEEL[17], 0.35, 55);
    // polished wear on the rib lips — this is where the p90 is spent
    for (const y of [12, 68]) { g.hline(9, y, 110, STEEL[6]); g.hline(9, y + 1, 110, STEEL[9]); }
    g.hline(0, 6, 128, STEEL[8]);
    g.line(24, 22, 58, 19, STEEL[2]);
    g.line(24, 23, 58, 20, STEEL[6]);
    g.line(70, 80, 100, 84, STEEL[3]);
    g.line(70, 81, 100, 85, STEEL[8]);
    g.line(14, 46, 34, 48, STEEL[5]);
    return g;
  };

  A.wall_vent = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1.1, cableX: 108, seed: 11 });
    const x = 16, y = 72, w = 80, h = 42;
    g.rect(x - 3, y - 3, w + 6, h + 6, STEEL[15]);
    g.bevel(x - 3, y - 3, w + 6, h + 6, STEEL[9], STEEL[24]);
    g.rect(x, y, w, h, STEEL[23]);
    // louvres: dark blade, bright top lip — this is the whole texture
    for (let i = 0; i < 7; i++) {
      const by = y + 2 + i * 6;
      g.rect(x + 2, by, w - 4, 4, STEEL[22]);
      g.hline(x + 2, by, w - 4, STEEL[12]);
      g.hline(x + 2, by + 3, w - 4, INK);
    }
    for (const rx of [x + 1, x + w - 2]) g.vline(rx, y, h, STEEL[17]);
    rivet(g, x + 4, y - 6); rivet(g, x + w - 4, y - 6);

    // biomass through the air system, not mould
    for (let i = 0; i < 5; i++) {
      const bx = x + 10 + i * 17;
      g.blob(bx, y + h - 1, 7 + (i % 3) * 3, TOXIC[12], 200 + i, 0.4);
      g.blob(bx, y + h + 2, 5 + (i % 2) * 3, TOXIC[13], 220 + i, 0.45);
      capsule(g, bx, y + h, bx - 2 + (i % 3), 120 + (i % 4), 2.5, 1, function () { return TOXIC[13]; });
    }
    g.blob(48, 116, 14, TOXIC[14], 260, 0.35);
    g.blob(44, 118, 8, TOXIC[12], 261, 0.4);
    g.speck(16, 108, 80, 18, TOXIC[11], 0.05, 262);

    g.t5(30, 62 - 40, 'AIR 04', RUST[6], 1);
    g.t5(30, 63 - 40, 'AIR 04', RUST[10], 1);
    return g;
  };

  A.wall_light = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 0.7, cableX: 108, seed: 19 });
    // housing
    g.rect(6, 22, 116, 24, BLOOD[16]);
    g.bevel(6, 22, 116, 24, BLOOD[12], INK);
    g.rect(9, 25, 110, 18, STEEL[24]);
    // glass + filament
    g.rect(12, 28, 104, 12, RED[4]);
    g.rect(12, 31, 104, 5, RED[2]);
    g.hline(12, 33, 104, RED[0]);
    g.dith(12, 28, 104, 3, RED[4], RED[6], 8);
    g.dith(12, 37, 104, 3, RED[4], RED[8], 9);
    // the crack
    g.line(66, 28, 72, 39, BLOOD[15]);
    g.line(67, 28, 73, 39, RED[12]);
    g.line(72, 33, 84, 30, BLOOD[16]);
    // grille bars over the glass
    for (let x = 18; x < 116; x += 12) g.vline(x, 28, 12, BLOOD[15]);
    // stepped spill: five hard bands, dither only at the joins
    // At 256 the Bayer cell is half the physical size, so a given dither level
    // reads denser than it did at 128 — the spill levels are pulled back to match.
    const bands = [[46, 12, STEEL[12], BLOOD[12], 4], [58, 13, STEEL[15], BLOOD[14], 3],
    [71, 14, STEEL[17], BLOOD[15], 2], [85, 16, STEEL[18], BLOOD[16], 1],
    [101, 18, STEEL[19], BLOOD[17], 1]];
    for (const [y, h, a, b, lvl] of bands) { g.dith(12, y, 104, h, a, b, lvl); }
    for (const y of [58, 71, 85, 101]) g.dith(12, y - 1, 104, 2, STEEL[15], STEEL[17], 8);
    g.hline(12, 46, 104, BLOOD[8]);
    g.dith(12, 47, 104, 3, BLOOD[10], RED[14], 5);
    // spill onto the cornice above
    g.dith(12, 12, 104, 9, STEEL[16], BLOOD[14], 2);
    g.recess(10, 46, 108, 72, STEEL[10], STEEL[24]);
    g.t3(52, 110, 'EM LGT', BLOOD[8], 1);
    return g;
  };

  A.wall_screen = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 0.8, cableX: 110, seed: 23 });
    const x = 18, y = 14, w = 76, h = 44;
    // recessed bezel
    g.rect(x - 4, y - 4, w + 8, h + 8, STEEL[19]);
    g.recess(x - 4, y - 4, w + 8, h + 8, STEEL[10], STEEL[25]);
    g.rect(x, y, w, h, INK);
    // The screen sits one step up the ramp from its scanlines, so both stay in
    // PLAYPAL. It used to be TOXIC[15] with a literal 0x061000 underneath it -
    // but TOXIC[15] is the darkest entry there is, so "one step darker" had to
    // be invented, and an invented colour is exactly what rule 1 forbids.
    g.rect(x + 2, y + 2, w - 4, h - 4, TOXIC[14]);
    // scanlines: every second DEVICE row, one ramp step darker, never black
    for (let j = (y + 2) * g.s; j < (y + h - 2) * g.s; j += 2) g.drect((x + 2) * g.s, j, (w - 4) * g.s, 1, TOXIC[15]);
    g.t3(x + 6, y + 7, 'H11//CYCLE 7', TOXIC[5], 1);
    g.t3(x + 6, y + 15, 'STABLE', TOXIC[7], 1);
    g.t3(x + 6, y + 27, 'CONTAINMENT', RED[4], 1);
    g.t3(x + 6, y + 35, 'FAIL', RED[2], 1);
    // dead CRT reflection — the only BLUE in the level, under 2% of the texture
    for (let i = 0; i < 3; i++) g.line(x + 58 + i, y + 30, x + 68 + i, y + 5, BLUE[7]);
    g.px(x + 70, y + 4, BLUE[6]);
    g.hline(x + 2, y + 2, w - 4, TOXIC[13]);
    rivet(g, x - 1, y - 1); rivet(g, x + w, y - 1);
    rivet(g, x - 1, y + h); rivet(g, x + w, y + h);

    // keyboard, keys punched out
    const kx = 14, ky = 74;
    g.rect(kx, ky, 86, 30, STEEL[20]);
    g.bevel(kx, ky, 86, 30, STEEL[11], STEEL[25]);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
      const ax = kx + 4 + c * 8, ay = ky + 4 + r * 8;
      const dead = (r === 0 && c === 3) || (r === 1 && c === 6) || (r === 2 && c === 1) || (r === 2 && c === 2);
      if (dead) { g.rect(ax, ay, 6, 6, INK); continue; }
      g.rect(ax, ay, 6, 6, STEEL[17]);
      g.hline(ax, ay, 6, STEEL[12]);
      g.hline(ax, ay + 5, 6, STEEL[23]);
    }
    g.blob(96, 98, 9, BLOOD[14], 77, 0.3);
    g.blob(99, 100, 5, BLOOD[13], 78, 0.35);
    return g;
  };

  A.wall_hazard = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1.2, cable: false, seed: 29 });
    const y0 = 82, y1 = 118;
    // 45 deg stripes. Pitch is 16 design units = 32 device px; 256 / 32 = 8,
    // so the diagonal carries across the tile seam. Drawn in device pixels, so
    // the 45 degree edge steps one real pixel at a time instead of two.
    const S2 = g.s, dy0 = y0 * S2, dy1 = y1 * S2, P = 16 * S2;
    for (let y = dy0; y < dy1; y++) for (let x = 0; x < g.w; x++) {
      const v = ((x + y) % P + P) % P;
      g.dpx(x, y, v < P / 2 ? GOLD[2] : SEAM);
      if (v === 0) g.dpx(x, y, GOLD[0]);
      if (v === P / 2 - 1) g.dpx(x, y, GOLD[4]);
    }
    g.hline(0, y0 - 1, 128, STEEL[9]);
    g.hline(0, y1, 128, STEEL[25]);
    // scraped back to bare metal
    g.blob(30, 96, 11, STEEL[15], 310, 0.3);
    g.blob(33, 99, 6, STEEL[11], 311, 0.35);
    g.blob(92, 108, 9, STEEL[16], 312, 0.3);
    g.blob(70, 88, 6, STEEL[13], 313, 0.35);
    g.speck(0, y0, 128, y1 - y0, RUST[18], 0.06, 314);

    g.t5(10, 18, 'H11 ZONE', GOLD[2], 2);
    g.t5(10, 19, 'H11 ZONE', GOLD[4], 2);
    // hazard trefoil, geometric
    const cx = 64, cy = 62, hy = 0;
    for (const [dx, dy] of [[0, -13], [-11, 7], [11, 7]]) {
      g.ell(cx + dx, cy + dy + hy, 8, 8, GOLD[2]);
      g.ell(cx + dx, cy + dy + hy, 4, 4, SEAM);
    }
    g.ell(cx, cy + hy, 5, 5, SEAM);
    g.ell(cx, cy + hy, 3, 3, GOLD[2]);
    return g;
  };

  A.wall_h11 = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1.1, cable: false, seed: 31 });
    // the level's mark: must read at 10 m, so it is drawn as mass, not as type
    const ink = 0x731313, hi = BLOOD[10], lo = BLOOD[14];
    const bars = [
      [12, 16, 10, 92], [40, 16, 10, 92], [12, 56, 38, 10], // H
      [62, 16, 10, 92], [56, 26, 6, 8], [54, 100, 26, 8],   // 1
      [98, 16, 10, 92], [92, 26, 6, 8], [90, 100, 26, 8]    // 1
    ];
    for (const [x, y, w, h] of bars) {
      g.rect(x, y, w, h, ink);
      g.dith(x, y, w, h, ink, hi, 4);
      g.dith(x, y + h - 4, w, 4, ink, lo, 8);
    }
    // paint eaten back to the steel
    for (let i = 0; i < 26; i++) {
      const x = 8 + Math.floor(hsh(i, 1, 41) * 112), y = 14 + Math.floor(hsh(i, 2, 42) * 96);
      g.blob(x, y, 2 + Math.floor(hsh(i, 3, 43) * 4), STEEL[17], 400 + i, 0.3);
    }
    g.speck(8, 14, 112, 96, STEEL[16], 0.05, 460);
    // drips
    for (const [x, len] of [[16, 22], [44, 14], [66, 26], [102, 18], [30, 9], [88, 12]]) {
      capsule(g, x, 106, x, 106 + len, 2, 0.6, function () { return 0x731313; });
      g.px(x, 106 + len + 1, BLOOD[14]);
    }
    return g;
  };

  A.wall_blood = function () {
    const g = A.wall_panel();
    // one event, with a direction: impact left of centre, throw to the right
    g.blob(44, 44, 22, BLOOD[14], 500, 0.45);
    g.blob(48, 42, 14, BLOOD[15], 501, 0.5);
    g.blob(50, 40, 7, BLOOD[16], 502, 0.55);
    g.blob(30, 50, 10, BLOOD[17], 503, 0.3);
    for (let i = 0; i < 22; i++) {
      const t = i / 21;
      const x = 56 + Math.round(t * 62 + hsh(i, 5, 51) * 8);
      const y = 30 + Math.round(t * 26 + hsh(i, 6, 52) * 20);
      g.blob(x, y, 1 + Math.floor(hsh(i, 7, 53) * 3), BLOOD[13], 520 + i, 0.4);
    }
    for (let i = 0; i < 10; i++) {
      const x = 26 + i * 4 + Math.floor(hsh(i, 8, 54) * 3);
      const y = 20 + Math.floor(hsh(i, 9, 55) * 14);
      g.px(x, y, BLOOD[12]);
    }
    // runs, longest reaching the bottom of the frame
    const runs = [[40, 118], [46, 74], [52, 96], [58, 52], [34, 40], [64, 30], [28, 22]];
    for (let i = 0; i < runs.length; i++) {
      const [x, len] = runs[i];
      capsule(g, x, 58, x + (i % 2 ? 1 : -1), 58 + len, 2.2, 0.7, function (t) { return t > 0.7 ? BLOOD[15] : BLOOD[14]; });
      g.blob(x + (i % 2 ? 1 : -1), 58 + len, 2, BLOOD[15], 560 + i, 0.4);
    }
    g.blob(44, 122, 16, BLOOD[16], 580, 0.4);
    g.blob(44, 124, 9, BLOOD[17], 581, 0.5);
    return g;
  };

  A.wall_exit = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 0.18, cable: false, seed: 37 });
    // the cleanest surface in the game
    const x = 8, y = 14, w = 112, h = 40;
    g.rect(x, y, w, h, STEEL[21]);
    g.recess(x, y, w, h, STEEL[9], STEEL[25]);
    g.rect(x + 3, y + 3, w - 6, h - 6, 0x13230B);
    g.dith(x + 3, y + 3, w - 6, h - 6, 0x13230B, TOXIC[14], 5);
    const label = 'EXIT';
    const tw = g.w5(label, 4);
    const tx = x + Math.floor((w - tw) / 2), ty = y + 8;
    g.t5(tx, ty + 1, label, TOXIC[12], 4);
    g.t5(tx, ty, label, TOXIC[4], 4);
    g.t5(tx, ty, label, TOXIC[2], 3);
    g.hline(x + 3, y + 3, w - 6, TOXIC[11]);
    for (let i = 0; i < 4; i++) rivet(g, x + 4 + i * ((w - 8) / 3), y + h - 3);

    // plunger
    const cx = 64, cy = 86;
    g.ring(cx, cy, 22, 4, STEEL[16]);
    g.ring(cx, cy, 22, 1, STEEL[10]);
    g.ring(cx, cy, 19, 3, AMBER[3]);
    g.ring(cx, cy, 19, 1, AMBER[1]);
    g.ell(cx, cy, 15, 15, BLOOD[13]);
    g.ell(cx, cy, 13, 13, RED[9]);
    g.ell(cx, cy - 1, 11, 10, RED[5]);
    g.ell(cx - 3, cy - 4, 5, 4, RED[2]);
    g.t3(cx - 14, cy + 26, 'RELEASE', STEEL[6], 1);
    return g;
  };

  A.wall_lab = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 0.8, cable: false, seed: 43 });
    const x = 22, y = 14, w = 84, h = 74;
    // containment box
    g.rect(x - 4, y - 4, w + 8, h + 8, STEEL[15]);
    g.bevel(x - 4, y - 4, w + 8, h + 8, STEEL[8], STEEL[24]);
    g.rect(x, y, w, h, STEEL[23]);
    g.rect(x + 2, y + 2, w - 4, h - 4, STEEL[22]);
    g.dith(x + 2, y + 2, w - 4, h - 4, STEEL[22], STEEL[24], 8);
    // specimen, out of focus behind the glass
    g.blob(64, 64, 20, FLESH[5], 600, 0.6);
    g.blob(64, 62, 15, FLESH[4], 606, 0.65);
    g.blob(64, 44, 12, FLESH[4], 601, 0.7);
    g.blob(60, 41, 3, FLESH[1], 602, 0.8);
    g.blob(69, 43, 2, FLESH[1], 603, 0.8);
    g.blob(64, 82, 16, FLESH[6], 604, 0.6);
    capsule(g, 54, 56, 46, 84, 5, 4, function () { return FLESH[5]; });
    capsule(g, 74, 56, 82, 80, 5, 4, function () { return FLESH[6]; });
    g.blob(50, 62, 6, TOXIC[11], 605, 0.5);
    g.blob(76, 50, 4, TOXIC[10], 607, 0.5);
    // glass haze, light
    g.dith(x + 2, y + 2, w - 4, h - 4, null, STEEL[21], 3);
    // reflection + crack
    for (let i = 0; i < 4; i++) g.line(x + 6 + i, y + h - 10, x + 26 + i, y + 6, STEEL[20]);
    const c0 = [x + 58, y + 30];
    for (const [dx, dy] of [[-16, 14], [12, 18], [-6, 26], [18, -8], [-20, -6], [4, -18]]) {
      g.line(c0[0], c0[1], c0[0] + dx, c0[1] + dy, STEEL[8]);
    }
    g.ell(c0[0], c0[1], 2, 2, STEEL[3]);
    g.frame(x, y, w, h, STEEL[11]);
    g.frame(x + 1, y + 1, w - 2, h - 2, STEEL[24]);
    // console
    g.rect(14, 94, 100, 22, STEEL[19]);
    g.bevel(14, 94, 100, 22, STEEL[10], STEEL[25]);
    g.rect(18, 98, 92, 14, STEEL[23]);
    for (let i = 0; i < 10; i++) {
      const dx = 22 + i * 9;
      g.ell(dx, 105, 3, 3, INK);
      g.ell(dx, 105, 2, 2, i === 6 ? AMBER[3] : BLOOD[16]);
      if (i === 6) { g.px(dx, 104, AMBER[1]); g.px(dx - 1, 104, AMBER[2]); }
    }
    return g;
  };

  A.wall_pipes = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1.0, cable: false, seed: 47 });
    const pipes = [[24, 13], [62, 10], [96, 8]];
    for (let i = 0; i < pipes.length; i++) {
      const [px, r] = pipes[i];
      capsule(g, px, 4, px, 124, r, r, cyl(STEEL, 16));
      g.vline(px - r + 2, 4, 120, STEEL[9]);
      g.vline(px - r + 3, 4, 120, STEEL[7]);
      g.vline(px + r - 1, 4, 120, STEEL[24]);
      for (let y = 16; y < 124; y += 34) {
        g.rect(px - r - 2, y, r * 2 + 4, 7, STEEL[14]);
        g.hline(px - r - 2, y, r * 2 + 4, STEEL[8]);
        g.hline(px - r - 2, y + 6, r * 2 + 4, STEEL[24]);
        g.dith(px - r - 2, y + 1, r * 2 + 4, 5, STEEL[14], STEEL[17], 6);
      }
    }
    // blown coupling on the middle pipe
    const bx = 62, by = 60;
    g.rect(bx - 13, by, 26, 12, INK);
    for (let i = 0; i < 9; i++) {
      const a = i / 8 * Math.PI * 2;
      g.line(bx, by + 6, Math.round(bx + Math.cos(a) * 15), Math.round(by + 6 + Math.sin(a) * 9), CUT[3]);
    }
    g.blob(bx, by + 6, 9, INK, 700, 0.5);
    g.blob(bx - 10, by + 4, 5, CUT[1], 701, 0.4);
    g.blob(bx + 11, by + 8, 5, CUT[2], 702, 0.4);
    // frost
    for (const [fx, fy, fr] of [[bx - 15, by + 1, 7], [bx + 15, by + 9, 6], [bx + 2, by - 9, 5]]) {
      g.blob(fx, fy, fr, STEEL[9], 710 + fx, 0.25);
      g.blob(fx, fy, Math.round(fr * 0.5), STEEL[4], 730 + fx, 0.35);
    }
    g.speck(bx - 22, by - 12, 44, 38, STEEL[6], 0.05, 740);
    // pool
    g.ell(62, 126, 30, 8, STEEL[21]);
    g.ell(62, 126, 24, 6, STEEL[19]);
    g.ell(58, 124, 12, 3, STEEL[13]);
    g.hline(34, 120, 56, STEEL[24]);
    // biomass through the gap
    g.blob(43, 92, 11, TOXIC[12], 760, 0.4);
    g.blob(45, 100, 8, TOXIC[13], 761, 0.4);
    g.blob(80, 40, 9, TOXIC[12], 762, 0.4);
    g.blob(79, 32, 6, TOXIC[10], 763, 0.45);
    for (const [x0, y0, x1, y1] of [[43, 84, 47, 110], [80, 32, 78, 56]])
      capsule(g, x0, y0, x1, y1, 3, 1.2, function (t) { return t < 0.5 ? TOXIC[11] : TOXIC[13]; });
    return g;
  };

  A.wall_breach = function () {
    const g = new I(128, 128);
    substrate(g, { rust: 1.3, cable: false, seed: 53 });
    // the hole
    const cx = 62, cy = 62;
    g.blob(cx, cy, 38, INK, 800, 0.62);
    g.blob(cx - 12, cy + 16, 18, INK, 801, 0.6);
    g.blob(cx + 16, cy - 12, 15, INK, 802, 0.6);
    // shapes in the dark behind it
    g.blob(cx - 8, cy + 6, 11, STEEL[22], 810, 0.5);
    g.blob(cx + 14, cy + 2, 7, STEEL[23], 811, 0.5);
    g.rect(cx - 2, cy - 26, 5, 22, STEEL[23]);
    // metal curled outward on two arcs only — a tear, not a sunburst
    for (const [a0, a1] of [[-2.6, -0.6], [1.1, 2.9]]) {
      for (let i = 0; i < 26; i++) {
        const a = a0 + (a1 - a0) * (i / 25);
        const r = 32 + hsh(i, 1, 820) * 9;
        const len = 3 + hsh(i, 2, 821) * 6;
        const x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
        const x2 = Math.round(cx + Math.cos(a) * (r - len)), y2 = Math.round(cy + Math.sin(a) * (r - len));
        g.line(x, y, x2, y2, CUT[5]);
        g.px(x2, y2, CUT[1]);
      }
    }
    g.blob(cx - 30, cy - 22, 9, CUT[6], 822, 0.35);
    g.blob(cx + 28, cy + 20, 8, CUT[7], 823, 0.35);
    // rebar bent outward
    for (const [x0, y0, x1, y1, x2, y2] of [
      [30, 34, 52, 60, 74, 52], [34, 92, 60, 72, 92, 80], [64, 26, 58, 60, 82, 96]]) {
      g.line(x0, y0, x1, y1, STEEL[12]); g.line(x1, y1, x2, y2, STEEL[12]);
      g.line(x0, y0 + 1, x1, y1 + 1, STEEL[20]); g.line(x1, y1 + 1, x2, y2 + 1, STEEL[20]);
      g.line(x0 - 1, y0, x1 - 1, y1, STEEL[6]);
    }
    g.blob(40, 110, 9, TOXIC[12], 830, 0.4);
    g.blob(96, 44, 7, TOXIC[13], 831, 0.4);
    g.blob(92, 100, 6, TOXIC[12], 832, 0.4);
    g.speck(24, 24, 80, 80, RUST[17], 0.05, 840);
    return g;
  };

  // ------------------------------------------------------------------ doors
  function doorBase(g, accent, accentHi) {
    g.wrapX = false;
    g.rect(0, 0, 128, 128, STEEL[17]);
    g.dith(0, 0, 128, 128, STEEL[17], STEEL[18], 6);
    // hydraulic jambs
    for (const jx of [0, 116]) {
      g.rect(jx, 0, 12, 128, STEEL[19]);
      g.vline(jx === 0 ? 0 : 127, 0, 128, STEEL[24]);
      g.vline(jx === 0 ? 1 : 126, 0, 128, STEEL[11]);
      for (let y = 6; y < 124; y += 18) {
        g.rect(jx + 2, y, 8, 12, STEEL[15]);
        g.hline(jx + 2, y, 8, STEEL[8]);
        g.hline(jx + 2, y + 11, 8, STEEL[24]);
        g.vline(jx + 5, y + 1, 10, STEEL[10]);
      }
    }
    // stiffening ribs, horizontal — a door never reads as wall
    for (let y = 8; y < 120; y += 14) {
      g.rect(12, y, 104, 9, STEEL[16]);
      g.hline(12, y, 104, STEEL[10]);
      g.hline(12, y + 8, 104, STEEL[23]);
      g.dith(12, y + 1, 104, 7, STEEL[16], STEEL[17], 6);
    }
    // leaves + centre join
    g.vline(60, 0, 128, STEEL[24]);
    g.rect(61, 0, 6, 128, SEAM);
    g.vline(67, 0, 128, STEEL[12]);
    // status strip down the seam
    g.rect(62, 6, 4, 116, accent);
    for (let y = 6; y < 122; y += 10) g.rect(62, y, 4, 3, INK);
    for (let y = 8; y < 122; y += 10) g.hline(62, y, 4, accentHi);
    // portholes
    for (const cx of [34, 94]) {
      g.ell(cx, 46, 15, 15, STEEL[20]);
      g.ring(cx, 46, 15, 2, STEEL[13]);
      g.ring(cx, 46, 15, 1, STEEL[8]);
      g.ell(cx, 46, 12, 12, SEAM);
      g.ell(cx, 46, 11, 11, INK);
      for (let i = 0; i < 7; i++) g.line(cx - 9 + i, 54, cx - 1 + i, 37, STEEL[21]);
      for (let i = 0; i < 4; i++) rivet(g, Math.round(cx + Math.cos(i / 4 * 6.283 + 0.8) * 18), Math.round(46 + Math.sin(i / 4 * 6.283 + 0.8) * 18));
    }
    return g;
  }

  A.door = function () {
    const g = new I(128, 128);
    doorBase(g, AMBER[3], AMBER[1]);
    // control panel
    g.rect(84, 86, 30, 26, STEEL[19]);
    g.bevel(84, 86, 30, 26, STEEL[10], STEEL[25]);
    g.rect(87, 89, 24, 20, STEEL[23]);
    g.ell(94, 96, 4, 4, INK);
    g.ell(94, 96, 3, 3, TOXIC[5]);
    g.px(93, 95, TOXIC[1]);
    g.ell(105, 96, 3, 3, INK);
    g.ell(105, 96, 2, 2, STEEL[20]);
    g.t3(90, 102, 'OPEN', TOXIC[6], 1);
    g.t3(14, 118, 'D-04', STEEL[9], 1);
    grimeDoor(g, 0.8, 61);
    return g;
  };

  A.door_locked = function () {
    const g = new I(128, 128);
    doorBase(g, RED[4], RED[2]);
    // same geometry, maximal colour difference + a lock block
    g.rect(84, 86, 30, 26, STEEL[19]);
    g.bevel(84, 86, 30, 26, STEEL[10], STEEL[25]);
    g.rect(87, 89, 24, 20, STEEL[23]);
    g.ell(94, 96, 4, 4, INK);
    g.ell(94, 96, 3, 3, RED[4]);
    g.px(93, 95, RED[1]);
    g.ell(105, 96, 3, 3, INK);
    g.ell(105, 96, 2, 2, BLOOD[16]);
    g.t3(90, 102, 'LOCK', RED[4], 1);

    const lx = 14, ly = 80;
    g.rect(lx, ly, 42, 34, STEEL[17]);
    g.bevel(lx, ly, 42, 34, STEEL[9], STEEL[25]);
    g.rect(lx + 3, ly + 3, 36, 10, INK);       // card slot
    g.hline(lx + 3, ly + 2, 36, STEEL[23]);
    g.hline(lx + 3, ly + 13, 36, STEEL[12]);
    g.rect(lx + 5, ly + 5, 32, 2, RED[9]);
    g.t3(lx + 5, ly + 17, 'RED', RED[4], 1);
    g.t3(lx + 5, ly + 25, 'CLEARANCE', RED[6], 1);
    for (let i = 0; i < 3; i++) { g.ell(lx + 36, ly + 19 + i * 6, 2, 2, INK); g.px(lx + 36, ly + 19 + i * 6, RED[5]); }
    grimeDoor(g, 1.0, 67);
    return g;
  };

  function grimeDoor(g, amt, seed) {
    for (const [x, y, r] of [[6, 120, 10], [122, 122, 9], [30, 124, 8], [100, 6, 7], [62, 126, 8]]) {
      const rr = Math.round(r * amt);
      g.blob(x, y, rr, RUST[18], seed + x, 0.3);
      g.blob(x, y, Math.round(rr * 0.6), RUST[16], seed + x + 9, 0.35);
    }
    g.speck(12, 110, 104, 16, RUST[19], 0.07 * amt, seed + 500);
  }

  // ---------------------------------------------------------- floor/ceiling
  A.floor = function () {
    const g = new I(128, 128);
    g.wrapX = true; g.wrapY = true;
    // one ramp step darker than the walls; utterly even — a 32x22 repeat shows everything
    g.rect(0, 0, 128, 128, STEEL[18]);
    g.dith(0, 0, 128, 128, STEEL[18], STEEL[19], 7);
    for (let py = 0; py < 4; py++) for (let px = 0; px < 4; px++) {
      const x = px * 32, y = py * 32;
      g.dith(x + 2, y + 2, 28, 28, STEEL[17], STEEL[18], (px + py) % 2 ? 6 : 9);
      // anti-slip tread
      for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) {
        const tx = x + 5 + i * 4, ty = y + 5 + j * 4;
        g.px(tx, ty, STEEL[13]);
        g.px(tx + 1, ty, STEEL[14]);
        g.px(tx, ty + 1, STEEL[21]);
        g.px(tx + 1, ty + 1, STEEL[22]);
      }
      g.recess(x + 1, y + 1, 30, 30, STEEL[13], STEEL[24]);
    }
    for (let k = 0; k < 5; k++) {
      g.hline(0, k * 32 - 1, 128, SEAM);
      g.hline(0, k * 32, 128, STEEL[23]);
      g.vline(k * 32 - 1, 0, 128, SEAM);
      g.vline(k * 32, 0, 128, STEEL[23]);
    }
    g.speck(0, 0, 128, 128, STEEL[20], 0.04, 880);
    g.speck(0, 0, 128, 128, STEEL[12], 0.012, 881);
    return g;
  };

  A.ceiling = function () {
    const g = new I(128, 128);
    g.wrapX = true; g.wrapY = true;
    g.rect(0, 0, 128, 128, STEEL[21]);
    g.dith(0, 0, 128, 128, STEEL[21], STEEL[22], 7);
    for (let py = 0; py < 2; py++) for (let px = 0; px < 2; px++) {
      const x = px * 64, y = py * 64;
      g.dith(x + 3, y + 3, 58, 58, STEEL[20], STEEL[21], (px + py) % 2 ? 5 : 9);
      g.recess(x + 2, y + 2, 60, 60, STEEL[15], STEEL[25]);
    }
    for (let k = 0; k < 3; k++) {
      g.hline(0, k * 64 - 1, 128, SEAM); g.hline(0, k * 64, 128, STEEL[24]);
      g.vline(k * 64 - 1, 0, 128, SEAM); g.vline(k * 64, 0, 128, STEEL[24]);
    }
    // service trays, all running one way — the only real contrast up here
    for (const ty of [16, 80]) {
      g.rect(0, ty, 128, 14, STEEL[18]);
      g.hline(0, ty, 128, STEEL[5]);
      g.hline(0, ty + 1, 128, STEEL[9]);
      g.hline(0, ty + 2, 128, STEEL[14]);
      g.hline(0, ty + 13, 128, INK);
      g.hline(0, ty + 12, 128, STEEL[24]);
      for (let x = 0; x < 128; x += 2) g.px(x, ty + 5, STEEL[23]);
      for (let x = 0; x < 128; x += 2) g.px(x + 1, ty + 8, STEEL[25]);
      g.hline(0, ty + 6, 128, STEEL[13]);
      for (let x = 4; x < 128; x += 32) {
        g.rect(x, ty - 3, 6, 20, STEEL[16]);
        g.vline(x, ty - 3, 20, STEEL[8]);
        g.vline(x + 5, ty - 3, 20, STEEL[25]);
        g.hline(x, ty - 3, 6, STEEL[6]);
      }
    }
    g.speck(0, 0, 128, 128, STEEL[23], 0.05, 890);
    return g;
  };

  // ----------------------------------------------------------------- mutant
  // The Chorus. Drawn against Freedoom's paina1: ONE symmetric plated mass,
  // top-lit, dark grooves between the plates, heavy horns off the upper
  // corners, a wide horizontal gash of amber teeth across the middle, tusks
  // curling in beneath it, tubes trailing to the floor.
  //
  // Three things make it H11's rather than a copy: the brow is a row of eyes
  // where paina1 has none, the grooves are packed with the same biomass as the
  // vents, and it is still wearing station property.
  //
  // It FLOATS. mutant_0..3 are a drift cycle, not a walk — see HANDOFF.md §7.
  // The trailing tubes reach the bottom of the frame in every living pose, so
  // the sprite still bottoms out on the floor plane the way the engine expects.

  const BONE = [STEEL[0], STEEL[2], STEEL[3], STEEL[6], STEEL[8], STEEL[11]];

  function shader(tab) {
    return function (t, side) {
      return tab[side < -0.45 ? 0 : side < -0.05 ? 1 : side < 0.42 ? 2 : side < 0.74 ? 3 : 4];
    };
  }
  const SHELL = shader([RUST[3], RUST[6], RUST[9], RUST[13], RUST[17]]);
  const SHELL_D = shader([RUST[7], RUST[10], RUST[13], RUST[16], RUST[19]]);
  const HORN = shader([BLOOD[8], BLOOD[10], BLOOD[12], BLOOD[14], BLOOD[16]]);
  const TUBE = shader([BLOOD[6], BLOOD[9], BLOOD[11], BLOOD[14], BLOOD[16]]);
  const TUSK = shader([BONE[2], BONE[3], BONE[3], BONE[4], BONE[5]]);
  const PALE = shader([FLESH[0], FLESH[1], FLESH[2], FLESH[4], FLESH[6]]);
  const MEAT = shader([BLOOD[10], BLOOD[12], BLOOD[14], BLOOD[15], BLOOD[17]]);

  function part(g, p0, p1, r0, r1, cf) {
    capsule(g, p0[0], p0[1], p1[0], p1[1], r0 + 1, r1 + 1, function () { return INK; });
    capsule(g, p0[0], p0[1], p1[0], p1[1], r0, r1, cf);
  }
  // two-segment limb with an outlined contour — horns, tusks, tubes
  function curve(g, p0, p1, p2, r0, r1, r2, cf) {
    part(g, p0, p1, r0, r1, cf);
    part(g, p1, p2, r1, r2, cf);
  }
  function eyeRow(g, list, col, hi) {
    for (const [x, y, r] of list) { g.ell(x, y, r + 2, r + 2, INK); g.ell(x, y, r + 1, r + 1, 0x170F07); }
    for (const [x, y, r] of list) {
      const d = r * 2 - 1;
      g.rect(x - r + 1, y - r + 1, d, d, col);
      if (r >= 2) g.px(x - r + 1, y - r + 1, hi);
    }
  }
  // a horizontal run clipped to the shell ellipse — banding that follows the form
  function shellRow(g, cy, ry, y, c, inset) {
    const t = (y - cy) / ry;
    if (Math.abs(t) >= 1) return;
    const hw = 48 * Math.sqrt(1 - t * t) - (inset || 0);
    if (hw < 2) return;
    g.hline(64 - hw, y, hw * 2, c);
  }

  // the gash: one wide horizontal mouth, amber teeth against black
  function gash(g, cy, mh) {
    g.ell(64, cy, 42, mh + 3, INK);
    g.ell(64, cy, 40, mh + 1, 0x170F07);
    g.ell(64, cy, 38, Math.max(2, mh - 1), INK);
    for (let i = 0; i < 17; i++) {
      const x = 28 + i * 4.5, t = (x - 64) / 38;
      const room = mh * Math.sqrt(Math.max(0, 1 - t * t));
      const l = room * (0.5 + 0.42 * Math.abs(Math.cos(i * 1.6)));
      if (l < 1.5) continue;
      g.rect(x, cy - room + 1, 3, l, GOLD[2]);
      g.rect(x, cy - room + 1, 3, 2, GOLD[0]);
      g.rect(x, cy - room + l, 3, 1, GOLD[4]);
    }
    for (let i = 0; i < 14; i++) {
      const x = 31 + i * 5, t = (x - 64) / 38;
      const room = mh * Math.sqrt(Math.max(0, 1 - t * t));
      const l = room * (0.42 + 0.4 * Math.abs(Math.sin(i * 2.1)));
      if (l < 1.5) continue;
      g.rect(x, cy + room - 1 - l, 3, l, GOLD[3]);
      g.rect(x, cy + room - 2, 3, 1, GOLD[1]);
    }
    g.ell(64, cy + mh - 4, 17, 3, BLOOD[13]);
    g.ell(64, cy - mh - 1, 40, 3, RUST[8]);
    g.ell(64, cy + mh + 1, 36, 3, RUST[15]);
  }

  function collar(g, cy) {
    capsule(g, 48, cy, 80, cy, 6, 6, function () { return INK; });
    capsule(g, 48, cy, 80, cy, 5, 5, shader([RUST[6], RUST[9], RUST[12], RUST[15], RUST[18]]));
    g.rect(58, cy - 4, 13, 8, INK);
    g.rect(59, cy - 3, 11, 6, GOLD[3]);
    g.t3(60, cy - 2, 'H11', RUST[20], 1);
    g.blob(74, cy + 2, 5, BLOOD[15], 300, 0.45);
    g.blob(52, cy - 2, 4, TOXIC[10], 301, 0.5);
  }

  function chorus(g, p) {
    const o = p.bob, cy = 56 + o;
    // trailing tubes, behind the shell, always reaching the bottom of the frame
    // Tubes hang and curl — they must never read as legs, or the thing looks
    // like it is standing. Tips sweep inward and the lengths are uneven.
    const sw = p.sway;
    for (let i = 0; i < 6; i++) {
      const base = [[38, 24, 34], [90, 104, 94], [48, 34, 46], [80, 94, 82], [58, 50, 60], [70, 78, 68]][i];
      const s2 = Math.sin(sw + i * 1.1) * 6 * (p.flare || 1);
      const tipY = [126, 126, 118, 114, 122, 110][i];
      const curl = (base[2] - base[1]) * 1.4;
      curve(g, [base[0], 92 + o], [base[1] + s2, 104 + o], [base[1] + s2 + curl, tipY], 4.5, 3.2, 1.4, TUBE);
      g.blob(base[1] + s2 + curl, tipY, 2.6, BLOOD[15], 200 + base[0], 0.5);
    }
    // horns
    const hf = p.flare || 1;
    curve(g, [34, 34 + o], [16 - 4 * (hf - 1), 22 + o], [22, 5 + o], 9, 5.5, 1.6, HORN);
    curve(g, [94, 34 + o], [112 + 4 * (hf - 1), 22 + o], [106, 5 + o], 9, 5.5, 1.6, HORN);
    curve(g, [28, 66 + o], [11, 70 + o], [4, 60 + o], 5.5, 3.4, 1.2, HORN);
    curve(g, [100, 66 + o], [117, 70 + o], [124, 60 + o], 5.5, 3.4, 1.2, HORN);

    // ONE carapace mass — the banding is shading inside it, never separate parts
    g.ell(64, cy, 48, 46, INK);
    g.ell(64, cy, 47, 45, RUST[13]);
    g.ell(62, cy - 4, 42, 39, RUST[11]);
    g.ell(59, cy - 9, 34, 31, RUST[9]);
    g.ell(56, cy - 14, 24, 21, RUST[7]);
    g.ell(54, cy - 18, 13, 11, RUST[5]);
    g.blob(88, cy + 22, 16, RUST[16], 205, 0.5);
    g.blob(80, cy + 34, 12, RUST[18], 206, 0.5);
    g.blob(40, cy + 30, 11, RUST[16], 207, 0.5);
    for (const dy of [-36, -24, 18, 30, 39]) {
      shellRow(g, cy, 46, cy + dy, INK, 1);
      shellRow(g, cy, 46, cy + dy + 1, RUST[dy < 0 ? 6 : 11], 2);
      shellRow(g, cy, 46, cy + dy - 1, RUST[18], 2);
    }
    for (const [bx, dy, br] of [[40, -35, 6], [88, -23, 7], [32, 20, 6], [96, 31, 5],
    [64, -42, 5], [50, 40, 5], [78, -36, 4]]) {
      g.blob(bx, cy + dy, br, TOXIC[10], 210 + bx, 0.45);
      g.blob(bx, cy + dy - 1, br * 0.55, TOXIC[8], 230 + bx, 0.5);
    }

    gash(g, cy + 2, p.gap);

    // brow: where a face would be, a row of eyes instead
    g.ell(64, cy - 13, 33, 7, RUST[16]);
    g.ell(64, cy - 14, 32, 5, RUST[11]);
    g.ell(63, cy - 16, 30, 3, RUST[6]);
    eyeRow(g, [[40, cy - 13, 3], [48, cy - 15, 2], [56, cy - 13, 3], [64, cy - 15, 2],
    [72, cy - 13, 3], [80, cy - 15, 2], [88, cy - 13, 3], [44, cy - 10, 1], [84, cy - 10, 1],
    [59, cy - 11, 1]], p.eye, p.eyeHi);

    // tusks curling in under the mouth
    curve(g, [48, cy + 24], [43, cy + 44], [58, cy + 56], 3, 2, 0.8, TUSK);
    curve(g, [80, cy + 24], [85, cy + 44], [70, cy + 56], 3, 2, 0.8, TUSK);

    (p.front || collar)(g, cy + 48, p);
  }

  function chorusFrame(p) {
    const g = new I(128, 128);
    chorus(g, p);
    g.outline(INK); g.harden();
    return g;
  }
  const EY = { eye: 0xFFFF6B, eyeHi: 0xFFFFD7 };
  const EYR = { eye: 0xFF5F5F, eyeHi: 0xFF9B9B };

  // drift cycle: it hangs, it does not walk
  A.mutant_0 = function () { return chorusFrame(Object.assign({ bob: 0, gap: 8, sway: 0.0 }, EY)); };
  A.mutant_1 = function () { return chorusFrame(Object.assign({ bob: -5, gap: 10, sway: 1.6 }, EY)); };
  A.mutant_2 = function () { return chorusFrame(Object.assign({ bob: 0, gap: 8, sway: 3.1 }, EY)); };
  A.mutant_3 = function () { return chorusFrame(Object.assign({ bob: 5, gap: 6, sway: 4.7 }, EY)); };
  A.mutant_attack = function () {
    return chorusFrame(Object.assign({ bob: -4, gap: 17, sway: 0.8, flare: 1.6 }, EYR));
  };

  A.mutant_die = function () {
    // it comes down. Shell squashed and sinking, one horn snapped, gash slack,
    // eyes going out, tubes gone limp underneath it.
    const g = new I(128, 128);
    const cy = 74;
    for (let i = 0; i < 6; i++) {
      const base = [[40, 30, 24], [88, 98, 104], [50, 42, 38], [78, 86, 90], [58, 56, 60], [70, 72, 68]][i];
      curve(g, [base[0], cy + 30], [base[1], cy + 42], [base[2], 126], 4.5, 3.2, 1.4, TUBE);
    }
    curve(g, [36, cy - 18], [20, cy - 28], [26, cy - 40], 9, 5.5, 1.6, HORN);
    curve(g, [92, cy - 18], [106, cy - 26], [104, cy - 30], 9, 5, 3.2, HORN);   // snapped
    g.blob(104, cy - 32, 5, BLOOD[9], 320, 0.5);
    curve(g, [30, cy + 8], [14, cy + 14], [8, cy + 6], 5.5, 3.4, 1.2, HORN);
    curve(g, [98, cy + 8], [114, cy + 14], [120, cy + 6], 5.5, 3.4, 1.2, HORN);
    g.ell(64, cy, 50, 38, INK);
    g.ell(64, cy, 49, 37, RUST[15]);
    g.ell(62, cy - 4, 43, 31, RUST[13]);
    g.ell(59, cy - 8, 34, 24, RUST[11]);
    g.ell(56, cy - 12, 22, 15, RUST[9]);
    for (const dy of [-26, -16, 14, 24]) {
      const t = dy / 37, hw = 49 * Math.sqrt(Math.max(0, 1 - t * t)) - 2;
      g.hline(64 - hw, cy + dy, hw * 2, INK);
      g.hline(64 - hw, cy + dy + 1, hw * 2, RUST[14]);
    }
    // split across the shell, wet inside
    for (let i = 0; i < 18; i++) {
      const x = 30 + i * 4, y = cy - 20 + Math.round(Math.sin(i * 0.9) * 3);
      g.rect(x, y, 4, 6, INK);
      g.rect(x, y + 1, 4, 3, BLOOD[15]);
    }
    g.blob(52, cy - 18, 9, BLOOD[14], 330, 0.45);
    g.blob(80, cy - 16, 7, BLOOD[15], 331, 0.45);
    gash(g, cy + 4, 5);
    g.ell(64, cy - 12, 30, 6, RUST[17]);
    eyeRow(g, [[42, cy - 12, 2], [52, cy - 13, 2], [64, cy - 12, 2], [76, cy - 13, 2],
    [86, cy - 12, 2], [58, cy - 10, 1]], BLOOD[9], BLOOD[7]);
    curve(g, [48, cy + 22], [42, cy + 38], [56, cy + 48], 3, 2, 0.8, TUSK);
    curve(g, [80, cy + 22], [86, cy + 38], [72, cy + 48], 3, 2, 0.8, TUSK);
    collar(g, cy + 36);
    g.blob(64, 126, 26, BLOOD[15], 340, 0.5);
    g.outline(INK); g.harden();
    return g;
  };

  A.mutant_dead = function () {
    // a collapsed shell on the floor, split open, teeth spilled. Low and wide —
    // nothing about it can be mistaken for a thing still in the air.
    const g = new I(128, 128);
    const cy = 112;
    g.blob(64, 126, 44, BLOOD[15], 350, 0.55);
    g.blob(44, 127, 26, BLOOD[14], 351, 0.55);
    g.blob(92, 127, 20, BLOOD[16], 352, 0.5);
    for (const [x0, x1, x2] of [[36, 20, 10], [92, 108, 118], [50, 40, 30], [78, 90, 100]]) {
      curve(g, [x0, cy + 2], [x1, cy + 10], [x2, 126], 4, 3, 1.4, TUBE);
    }
    curve(g, [34, cy - 6], [16, cy + 2], [6, cy + 12], 8, 5, 1.6, HORN);
    curve(g, [94, cy - 6], [110, cy + 4], [118, cy + 14], 8, 5, 1.6, HORN);
    // the shell, cracked open and face down
    g.ell(64, cy, 46, 18, INK);
    g.ell(64, cy, 45, 17, RUST[16]);
    g.ell(62, cy - 3, 40, 12, RUST[14]);
    g.ell(58, cy - 5, 30, 8, RUST[12]);
    for (const dy of [-9, -2, 6]) {
      const t = dy / 17, hw = 45 * Math.sqrt(Math.max(0, 1 - t * t)) - 2;
      g.hline(64 - hw, cy + dy, hw * 2, INK);
      g.hline(64 - hw, cy + dy + 1, hw * 2, RUST[13]);
    }
    // the split, with the gash torn wide inside it
    g.ell(64, cy - 1, 30, 9, INK);
    g.ell(64, cy - 1, 28, 7, 0x170F07);
    g.ell(64, cy, 24, 5, BLOOD[16]);
    for (let i = 0; i < 13; i++) {
      const x = 40 + i * 4, t = (x - 64) / 28;
      const room = 7 * Math.sqrt(Math.max(0, 1 - t * t));
      if (room < 2) continue;
      g.rect(x, cy - 1 - room + 1, 3, Math.max(2, room), GOLD[3]);
      g.rect(x, cy - 1 - room + 1, 3, 1, GOLD[1]);
    }
    // teeth knocked loose onto the floor
    for (const [tx, ty] of [[28, 122], [36, 126], [98, 124], [106, 121], [22, 118], [112, 127]]) {
      g.rect(tx, ty, 3, 4, GOLD[2]); g.rect(tx, ty, 3, 1, GOLD[0]);
    }
    eyeRow(g, [[44, cy - 6, 2], [56, cy - 7, 2], [72, cy - 7, 2], [84, cy - 6, 2]], 0x170F07, BLOOD[16]);
    g.blob(50, cy + 6, 8, TOXIC[11], 360, 0.45);
    g.blob(84, cy + 4, 6, TOXIC[12], 361, 0.5);
    curve(g, [50, cy + 6], [46, cy + 16], [58, cy + 22], 2.6, 1.8, 0.8, TUSK);
    curve(g, [78, cy + 6], [82, cy + 16], [70, cy + 22], 2.6, 1.8, 0.8, TUSK);
    g.outline(INK); g.harden();
    return g;
  };

  // ---------------------------------------------------------------- pickups
  A.medkit = function () {
    const g = new I(128, 128);
    const x = 32, y = 74, w = 64, h = 42;
    // handle
    g.ring(64, 72, 13, 4, STEEL[14]);
    g.ring(64, 72, 13, 1, STEEL[7]);
    g.rect(50, 72, 28, 8, 0);
    for (let i = 0; i < 28; i++) g.px(50 + i, 72 + 0, 0, 0);
    g.rect(48, 74, 32, 8, 0);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 32; i++) g.px(48 + i, 74 + j, 0, 0);
    // body
    g.rect(x, y, w, h, 0xBFBFBF);
    g.rect(x, y, w, 6, 0xCBCBCB);
    g.hline(x, y, w, 0xDFDFDF);
    g.dith(x, y + 6, w, h - 6, 0xBFBFBF, 0xB3B3B3, 5);
    g.rect(x, y + h - 6, w, 6, 0x8B8B8B);
    g.hline(x, y + h - 1, w, STEEL[16]);
    g.vline(x, y, h, 0xD3D3D3);
    g.vline(x + w - 1, y, h, 0x939393);
    // green cross
    g.rect(x + 24, y + 10, 16, 22, TOXIC[5]);
    g.rect(x + 17, y + 17, 30, 8, TOXIC[5]);
    g.rect(x + 26, y + 10, 12, 22, TOXIC[3]);
    g.rect(x + 17, y + 19, 30, 4, TOXIC[3]);
    g.hline(x + 26, y + 10, 12, TOXIC[1]);
    // latches
    for (const lx of [x + 6, x + w - 12]) { g.rect(lx, y + 14, 6, 12, 0x7F7F7F); g.hline(lx, y + 14, 6, 0xA7A7A7); g.hline(lx, y + 25, 6, STEEL[19]); }
    // dried handprint
    g.blob(x + 54, y + 22, 8, BLOOD[15], 960, 0.35);
    for (let i = 0; i < 4; i++) capsule(g, x + 51 + i * 3, y + 18, x + 50 + i * 4, y + 8, 1.6, 1, function () { return BLOOD[15]; });
    // dent
    g.blob(x + 3, y + h - 4, 6, 0x8B8B8B, 961, 0.4);
    g.blob(x + 2, y + h - 3, 3, 0x777777, 962, 0.5);
    g.px(x + 30, y + 2, 0xFFFFFF); g.px(x + 31, y + 2, 0xEFEFEF);
    g.outline(INK); g.harden();
    return g;
  };

  A.ammo = function () {
    const g = new I(128, 128);
    const cx = 64, top = 66, bot = 120, r = 20;
    // contacts
    for (const dx of [-10, 10]) {
      g.rect(cx + dx - 4, top - 10, 9, 11, STEEL[13]);
      g.hline(cx + dx - 4, top - 10, 9, STEEL[4]);
      g.vline(cx + dx - 4, top - 10, 11, STEEL[8]);
      g.vline(cx + dx + 4, top - 10, 11, STEEL[21]);
      g.rect(cx + dx - 2, top - 9, 5, 3, STEEL[2]);
    }
    // body: hard vertical bands, no smooth gradient
    const bands = [[-20, 4, 21], [-16, 4, 18], [-12, 6, 15], [-6, 7, 12], [1, 5, 10],
    [6, 5, 13], [11, 5, 17], [16, 5, 20]];
    for (const [ox, w, idx] of bands) g.rect(cx + ox, top, w, bot - top, STEEL[idx]);
    g.dith(cx - 8, top, 6, bot - top, STEEL[12], STEEL[10], 8);
    g.vline(cx - 4, top, bot - top, STEEL[7]);
    // caps
    g.ell(cx, top, r, 7, STEEL[14]);
    g.ell(cx, top - 1, r - 4, 5, STEEL[8]);
    g.ell(cx, top - 2, r - 11, 3, STEEL[4]);
    g.ell(cx, bot, r, 7, STEEL[21]);
    g.ell(cx, bot - 1, r - 4, 5, STEEL[18]);
    // clamp rings
    for (const y of [top + 8, bot - 12]) {
      g.rect(cx - r, y, r * 2 + 1, 5, STEEL[12]);
      g.hline(cx - r, y, r * 2 + 1, STEEL[6]);
      g.hline(cx - r, y + 4, r * 2 + 1, STEEL[23]);
      for (let i = 0; i < 5; i++) g.px(cx - 14 + i * 7, y + 2, STEEL[20]);
    }
    // amber window — the brightest point of the asset
    const wy = top + 18, wh = 26;
    g.rect(cx - 15, wy - 2, 30, wh + 4, INK);
    g.rect(cx - 13, wy, 26, wh, AMBER[7]);
    g.rect(cx - 11, wy + 1, 22, wh - 2, AMBER[5]);
    g.dith(cx - 11, wy + 1, 22, wh - 2, AMBER[5], AMBER[4], 8);
    g.rect(cx - 8, wy + 2, 16, wh - 4, AMBER[3]);
    g.dith(cx - 8, wy + 2, 16, wh - 4, AMBER[3], AMBER[2], 7);
    g.rect(cx - 5, wy + 4, 10, wh - 8, AMBER[1]);
    g.rect(cx - 3, wy + 6, 6, wh - 12, 0xFFFF8F);
    g.rect(cx - 1, wy + 9, 3, wh - 18, 0xFFFFD7);
    g.hline(cx - 13, wy, 26, AMBER[0]);
    g.vline(cx - 13, wy, wh, AMBER[2]);
    g.t3(cx - 7, bot - 10, 'H11', SEAM, 1);
    g.t3(cx - 7, bot - 11, 'H11', STEEL[8], 1);
    g.blob(cx + 15, bot - 20, 5, RUST[17], 970, 0.4);
    g.outline(INK); g.harden();
    return g;
  };

  A.keycard = function () {
    const g = new I(128, 128);
    const x = 32, y = 84, w = 62, h = 34;
    g.rect(x, y, w, h, 0xCB0000);
    g.hline(x, y, w, RED[2]);
    g.hline(x, y + 1, w, RED[4]);
    g.dith(x, y + 2, w, h - 6, 0xCB0000, RED[11], 4);
    g.rect(x, y + h - 4, w, 4, 0x730000);
    g.hline(x, y + h - 1, w, 0x430000);
    g.vline(x, y, h, RED[4]);
    g.vline(x + w - 1, y, h, 0x800000);
    g.rect(x, y + 6, w, 6, INK);              // magnetic stripe
    g.hline(x, y + 6, w, SEAM);
    g.hline(x, y + 11, w, 0x430000);
    g.rect(x + 4, y + 16, 17, 13, GOLD[4]);   // chip
    g.rect(x + 5, y + 17, 15, 11, GOLD[2]);
    g.hline(x + 5, y + 17, 15, GOLD[0]);
    for (let i = 1; i < 4; i++) g.vline(x + 4 + i * 4, y + 16, 13, GOLD[4]);
    g.hline(x + 4, y + 22, 17, GOLD[4]);
    g.t5(x + 26, y + 18, 'RED', 0x430000, 2);
    g.t5(x + 26, y + 17, 'RED', 0xFFFFFF, 2);
    g.hline(x + 2, y + 31, w - 4, 0x430000);
    g.outline(INK); g.harden();
    return g;
  };

  // ----------------------------------------------------------------- weapon
  // Station impulse cutter. 96x72, drawn at exact HUD size — never scaled.
  function cutter(g, dy) {
    const o = dy;
    const ex = 58, ey = 30 + o;   // emitter port, slightly right of centre
    for (let i = 0; i < 24; i++) {   // cable, out of frame bottom-left
      const t = i / 23;
      const px = Math.round(30 - t * 30), py = Math.round(54 + o + t * 20 + Math.sin(t * 3.4) * 4);
      g.rect(px, py, 4, 4, STEEL[23]);
      g.rect(px, py, 4, 2, STEEL[19]);
    }
    // body: one trapezoid mass in hard vertical bands, cropped by the bottom edge
    const bands = [[26, 8, 20], [34, 7, 18], [41, 8, 16], [49, 9, 14], [58, 8, 15],
    [66, 7, 17], [73, 7, 19], [80, 8, 22]];
    for (const [bx, bw, idx] of bands) {
      const top = 34 + o + Math.round(Math.abs(bx + bw / 2 - 56) * 0.28);
      g.rect(bx, top, bw, 72 - top, STEEL[idx]);
      g.hline(bx, top, bw, STEEL[Math.max(0, idx - 6)]);
      g.hline(bx, top + 1, bw, STEEL[Math.max(0, idx - 3)]);
    }
    for (let i = 0; i < 4; i++) {   // heat fins
      const fy = 48 + o + i * 6;
      if (fy > 69) break;
      g.hline(30, fy, 54, STEEL[22]);
      g.hline(30, fy + 1, 54, STEEL[12]);
    }
    // emitter housing, ring, dark aperture
    capsule(g, ex, ey + 14, ex, ey, 16, 16, cyl(STEEL, 15));
    g.ring(ex, ey, 16, 4, STEEL[16]);
    g.ring(ex, ey, 16, 1, STEEL[7]);
    g.ring(ex, ey, 16, 2, STEEL[4]);
    g.ring(ex, ey, 13, 3, STEEL[20]);
    g.ring(ex, ey, 13, 1, STEEL[11]);
    g.ell(ex, ey, 10, 10, STEEL[24]);
    g.ell(ex, ey, 8, 8, SEAM);
    g.ell(ex, ey, 6, 6, INK);
    g.ell(ex - 4, ey - 5, 3, 2, STEEL[7]);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.283 + 0.5;
      g.rect(Math.round(ex + Math.cos(a) * 14) - 1, Math.round(ey + Math.sin(a) * 14) - 1, 2, 2, STEEL[3]);
    }
    // charge indicator, left flank
    g.rect(28, 44 + o, 11, 21, INK);
    g.frame(28, 44 + o, 11, 21, STEEL[20]);
    for (let i = 0; i < 4; i++) {
      const on = i < 3, cy2 = 46 + o + i * 5;
      if (cy2 > 62) break;
      g.rect(30, cy2, 7, 3, on ? AMBER[3] : STEEL[22]);
      if (on) g.hline(30, cy2, 7, AMBER[1]);
    }
    // tape-wrapped grip — a narrow column, only its top shows above the glove
    g.rect(64, 38 + o, 13, 22, 0x332B13);
    g.rect(66, 38 + o, 9, 22, 0x4B371B);
    g.vline(66, 38 + o, 22, 0x8F5F37);
    for (let i = 0; i < 5; i++) { g.hline(64, 40 + o + i * 4, 13, 0x8F5F37); g.hline(64, 41 + o + i * 4, 13, 0x5F4323); }
    g.vline(76, 38 + o, 22, 0x1F170B);
    // gloved hand: a dark foreground mass, fingers read as INK separations
    capsule(g, 62, 58 + o, 94, 56 + o, 15, 14, function () { return INK; });
    capsule(g, 62, 58 + o, 94, 56 + o, 14, 13, function (t, side) {
      const i = side < -0.55 ? 0 : side < -0.05 ? 1 : side < 0.5 ? 2 : 3;
      return [STEEL[17], STEEL[19], STEEL[22], STEEL[25]][i];
    });
    for (let i = 0; i < 4; i++) {
      const fx = 64 + i * 9;
      g.vline(fx + 7, 46 + o, 26, INK);
      g.vline(fx + 8, 46 + o, 26, STEEL[25]);
      g.ell(fx + 3, 48 + o, 4, 3, STEEL[18]);
      g.ell(fx + 2, 47 + o, 2, 1, STEEL[12]);
      g.hline(fx, 62 + o, 7, STEEL[24]);
    }
    g.hline(60, 46 + o, 36, STEEL[14]);
    g.hline(60, 47 + o, 36, STEEL[20]);
    g.line(60, 70 + o, 96, 68 + o, INK);
    g.blob(42, 62 + o, 5, RUST[17], 980, 0.4);
    g.blob(84, 40 + o, 4, RUST[18], 981, 0.4);
    return g;
  }

  A.weapon_0 = function () {
    const g = new I(96, 72);
    cutter(g, 0);
    g.outline(INK); g.harden();
    return g;
  };

  A.weapon_1 = function () {
    const g = new I(96, 72);
    cutter(g, 3);
    // stepped, crisp, asymmetric star — 0.09 s on screen, so it must shout
    const ex = 58, ey = 33;
    const spikes = [[-1.55, 26], [-1.0, 14], [-0.45, 21], [0.1, 12], [0.7, 18], [1.25, 10],
    [1.9, 24], [2.5, 13], [3.05, 19], [3.6, 10], [4.2, 22], [4.9, 13], [5.5, 17]];
    for (const [a, len] of spikes) {
      const x1 = Math.round(ex + Math.cos(a) * len), y1 = Math.round(ey + Math.sin(a) * len);
      capsule(g, ex, ey, x1, y1, 5, 1, function (t) { return t < 0.4 ? AMBER[2] : t < 0.78 ? AMBER[3] : RED[4]; });
    }
    g.ell(ex, ey, 12, 12, AMBER[2]);
    g.ell(ex, ey, 10, 10, AMBER[1]);
    g.ell(ex, ey, 8, 8, 0xFFFF6B);
    g.ell(ex, ey, 5, 5, 0xFFFF8F);
    g.ell(ex - 1, ey - 1, 3, 3, 0xFFFFD7);
    for (const [a, len] of [[-2.3, 30], [0.4, 28], [2.2, 32], [4.4, 27], [5.9, 25]]) {
      const x1 = Math.round(ex + Math.cos(a) * len), y1 = Math.round(ey + Math.sin(a) * len);
      g.line(ex, ey, x1, y1, RED[4]);
      g.px(x1, y1, RED[2]);
    }
    g.harden();
    return g;
  };

  A.crosshair = function () {
    const g = new I(9, 9);
    const c = 0xBFBFBF, d = 0x7F7F7F;
    for (const [x, y] of [[4, 0], [4, 1], [4, 7], [4, 8], [0, 4], [1, 4], [7, 4], [8, 4]]) g.px(x, y, c);
    for (const [x, y] of [[4, 2], [4, 6], [2, 4], [6, 4]]) g.px(x, y, d);
    g.harden();
    return g;
  };

  // -------------------------------------------------------------------- HUD
  A.hud_keycard = function () {
    const g = new I(16, 16);
    g.rect(2, 2, 12, 12, 0xCB0000);
    g.hline(2, 2, 12, RED[3]);
    g.rect(2, 5, 12, 3, INK);
    g.rect(3, 10, 4, 3, GOLD[2]);
    g.px(3, 10, GOLD[0]);
    g.rect(2, 13, 12, 1, 0x730000);
    g.frame(1, 1, 14, 14, INK);
    g.harden();
    return g;
  };

  A.hud_bar = function () {
    // 320x32 instrument panel. Godot draws only the NUMBERS, inside the
    // recessed windows; the labels and the nameplate are painted here.
    // Window rects (bar-local) are listed in HANDOFF.md and must match hud.gd.
    const g = new I(320, 32);
    g.rect(0, 0, 320, 32, STEEL[17]);
    g.dith(0, 0, 320, 32, STEEL[17], STEEL[18], 6);
    g.hline(0, 0, 320, STEEL[9]);
    g.hline(0, 1, 320, STEEL[12]);
    g.hline(0, 2, 320, BLOOD[11]);
    g.hline(0, 30, 320, STEEL[23]);
    g.hline(0, 31, 320, INK);
    for (let x = 6; x < 320; x += 26) { rivet(g, x, 6); rivet(g, x, 27); }

    const blocks = [
      [4, 70, 'HEALTH', RED[4]],
      [78, 62, 'AMMO', AMBER[3]],
      [144, 70, 'MUTANTS', STEEL[4]],
      [218, 36, 'KEY', OLIVE[1]]
    ];
    for (const [x, w, label, accent] of blocks) {
      g.rect(x, 4, w, 24, STEEL[19]);
      g.bevel(x, 4, w, 24, STEEL[11], STEEL[24]);
      g.dith(x + 1, 5, w - 2, 22, STEEL[19], STEEL[20], 5);
      g.t3(x + 3, 6, label, accent, 1);
      g.hline(x + 2, 12, w - 4, STEEL[24]);
      if (label === 'KEY') continue;
      g.rect(x + 3, 13, w - 6, 13, SEAM);            // display window
      g.recess(x + 3, 13, w - 6, 13, STEEL[13], INK);
      g.rect(x + 4, 14, w - 8, 11, INK);
      g.dith(x + 4, 14, w - 8, 11, INK, SEAM, 5);
    }
    // key socket: exactly 18x18 so hud_keycard.png (16x16) drops in unscaled
    g.rect(228, 10, 18, 18, STEEL[24]);
    g.recess(228, 10, 18, 18, STEEL[13], INK);
    g.rect(229, 11, 16, 16, INK);
    g.dith(229, 11, 16, 16, INK, SEAM, 4);

    const nx = 258;
    g.rect(nx, 5, 58, 22, STEEL[15]);
    g.bevel(nx, 5, 58, 22, STEEL[7], STEEL[24]);
    g.dith(nx + 1, 6, 56, 20, STEEL[15], STEEL[16], 7);
    g.t3(nx + 6, 9, 'H11', STEEL[25], 1);
    g.t3(nx + 22, 9, '//', BLOOD[11], 1);
    g.t3(nx + 6, 17, 'DECK 1', STEEL[25], 1);
    for (let i = 0; i < 3; i++) {
      const y = 8 + Math.floor(hsh(i, 3, 991) * 16);
      g.line(nx + 3, y, nx + 8 + Math.floor(hsh(i, 4, 992) * 20), y - 1, STEEL[11]);
    }
    g.speck(0, 24, 320, 6, RUST[19], 0.05, 993);
    g.speck(0, 3, 320, 3, RUST[18], 0.04, 994);
    return g;
  };

  // Device sizes at SCALE = 2 (ART_REDESIGN 3.1 / 3.4 / 3.5). Design space is half.
  const DESIGN = {
    wall_panel: [128, 128], wall_vent: [128, 128], wall_light: [128, 128], wall_screen: [128, 128],
    wall_hazard: [128, 128], wall_h11: [128, 128], wall_blood: [128, 128], wall_exit: [128, 128],
    wall_lab: [128, 128], wall_pipes: [128, 128], wall_breach: [128, 128],
    door: [128, 128], door_locked: [128, 128], floor: [128, 128], ceiling: [128, 128],
    mutant_0: [128, 128], mutant_1: [128, 128], mutant_2: [128, 128], mutant_3: [128, 128],
    mutant_attack: [128, 128], mutant_die: [128, 128], mutant_dead: [128, 128],
    medkit: [128, 128], ammo: [128, 128], keycard: [128, 128],
    weapon_0: [96, 72], weapon_1: [96, 72], crosshair: [9, 9],
    hud_bar: [320, 32], hud_keycard: [16, 16]
  };
  const SIZES = {};
  for (const k in DESIGN) SIZES[k] = [DESIGN[k][0] * SCALE, DESIGN[k][1] * SCALE];

  const H11 = { PAL, I, A, SIZES, DESIGN, SCALE, capsule, hsh, F5, F3, substrate, rivet,
    shader, part, curve, eyeRow, gash, collar, chorus, chorusFrame, BONE, SHELL, HORN, TUBE, TUSK, PALE, MEAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = H11;
  if (typeof globalThis !== 'undefined') globalThis.H11 = H11;
})();
