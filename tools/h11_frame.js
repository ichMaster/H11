/* Target-frame renderer (ART_REDESIGN.md 6.2).
 *
 * Not a game file and not an illustration: a miniature of the engine's own
 * renderer, so the mockup is produced the same way the game produces a frame.
 *   - 640x480, one render pixel per physical panel pixel, no upscale
 *   - column raycast, 1 cell = 2 m, wall face = one full texture (UV 0..1)
 *   - depth_shade.gdshader:  exp(-distance * FOG), FOG defaulting to the shipped
 *     Level.FOG_DENSITY. Keep them equal: a mockup rendered at a different fog is
 *     not comparable with a --drive frame, which is the only thing it is for.
 *   - Wolf3D trick: north/south faces * 0.72
 *   - billboard sprites, binary alpha, pixel_size 0.0078125 (256 px = 2 m)
 *   - HUD composited at its exact pixel sizes, never scaled
 *
 * Usage (browser/run_script): loadTextures() -> renderFrame(opts) -> ImageData.
 */
(function () {
  'use strict';

  const W = 640, H = 480, CELL = 2.0;

  const MAP = [
    '#########',
    '####D####',
    '##S...V##',
    '##....H##',
    '##L...C##',
    '##....1##',
    '##B...V##',
    '##....H##',
    '##1...C##',
    '##....R##',
    '##T...###',
    '##.....##',
    '#########'
  ];

  const WALL_TEX = {
    '#': 'wall_panel', 'V': 'wall_vent', 'L': 'wall_light', 'S': 'wall_screen',
    'H': 'wall_hazard', '1': 'wall_h11', 'B': 'wall_blood', 'X': 'wall_exit',
    'D': 'door', 'K': 'door_locked', 'T': 'wall_lab', 'C': 'wall_pipes', 'R': 'wall_breach'
  };

  function solid(cx, cy) {
    if (cy < 0 || cy >= MAP.length) return '#';
    const row = MAP[cy];
    if (cx < 0 || cx >= row.length) return '#';
    const c = row[cx];
    return c === '.' ? null : c;
  }

  function mkTex(imgData) {
    return { w: imgData.width, h: imgData.height, d: imgData.data };
  }

  function renderFrame(tex, opts) {
    const o = opts || {};
    const px = o.px === undefined ? 4.5 : o.px;
    const py = o.py === undefined ? 8.35 : o.py;
    const dirX = 0, dirY = -1, planeX = 0.66, planeY = 0;
    const out = new Uint8ClampedArray(W * H * 4);
    const zbuf = new Float64Array(W);
    const lampDim = o.lampDim === undefined ? 1 : o.lampDim;
    // Must track Level.FOG_DENSITY in scripts/level.gd. It was 0.085 when the art
    // was authored and is 0.025 now; leaving the old value here made every mockup
    // darker at distance than the game it was being compared against.
    const FOG = o.fog === undefined ? 0.025 : o.fog;
    if (!o.quiet) console.error(`  frame: fog ${FOG}, ${W}x${H}`);

    const put = (x, y, r, g, b) => {
      const i = (y * W + x) * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
    };

    // ---- floor + ceiling (two level-wide planes, uv_scale one tile per cell)
    const fl = tex.floor, ce = tex.ceiling;
    for (let y = H / 2 + 1; y < H; y++) {
      const p = y - H / 2;
      const rowDist = (0.5 * H) / p;                 // cells
      const rdx0 = dirX - planeX, rdy0 = dirY - planeY;
      const rdx1 = dirX + planeX, rdy1 = dirY + planeY;
      const stepX = rowDist * (rdx1 - rdx0) / W, stepY = rowDist * (rdy1 - rdy0) / W;
      let fx = px + rowDist * rdx0, fy = py + rowDist * rdy0;
      const shade = Math.exp(-rowDist * CELL * FOG);
      for (let x = 0; x < W; x++) {
        const tx = Math.floor((fx - Math.floor(fx)) * fl.w) & (fl.w - 1);
        const ty = Math.floor((fy - Math.floor(fy)) * fl.h) & (fl.h - 1);
        let i = (ty * fl.w + tx) * 4;
        put(x, y, fl.d[i] * shade, fl.d[i + 1] * shade, fl.d[i + 2] * shade);
        const cy2 = H - y - 1;
        const cs = shade * 0.9;
        i = (ty * ce.w + tx) * 4;
        put(x, cy2, ce.d[i] * cs, ce.d[i + 1] * cs, ce.d[i + 2] * cs);
        fx += stepX; fy += stepY;
      }
    }

    // ---- walls
    for (let x = 0; x < W; x++) {
      const camX = 2 * x / W - 1;
      const rdx = dirX + planeX * camX, rdy = dirY + planeY * camX;
      let mapX = Math.floor(px), mapY = Math.floor(py);
      const ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx);
      const ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
      let sx, sy, sdx, sdy;
      if (rdx < 0) { sx = -1; sdx = (px - mapX) * ddx; } else { sx = 1; sdx = (mapX + 1 - px) * ddx; }
      if (rdy < 0) { sy = -1; sdy = (py - mapY) * ddy; } else { sy = 1; sdy = (mapY + 1 - py) * ddy; }
      let side = 0, hit = null;
      for (let guard = 0; guard < 64 && !hit; guard++) {
        if (sdx < sdy) { sdx += ddx; mapX += sx; side = 0; }
        else { sdy += ddy; mapY += sy; side = 1; }
        hit = solid(mapX, mapY);
      }
      const pd = side === 0 ? (sdx - ddx) : (sdy - ddy);
      zbuf[x] = pd;
      const lh = Math.floor(H / pd);
      const y0 = Math.max(0, Math.floor(-lh / 2 + H / 2));
      const y1 = Math.min(H - 1, Math.floor(lh / 2 + H / 2));
      let wallX = side === 0 ? py + pd * rdy : px + pd * rdx;
      wallX -= Math.floor(wallX);
      const t = tex[WALL_TEX[hit] || 'wall_panel'];
      let texX = Math.floor(wallX * t.w);
      if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = t.w - texX - 1;
      let shade = Math.exp(-pd * CELL * FOG);
      if (side === 1) shade *= 0.72;                 // the Wolf3D depth trick
      if (hit === 'L') shade *= lampDim;             // wall_light flickers
      const step = t.h / lh;
      let texPos = (y0 - H / 2 + lh / 2) * step;
      for (let y = y0; y <= y1; y++) {
        const texY = Math.min(t.h - 1, Math.max(0, Math.floor(texPos)));
        texPos += step;
        const i = (texY * t.w + texX) * 4;
        put(x, y, t.d[i] * shade, t.d[i + 1] * shade, t.d[i + 2] * shade);
      }
    }

    // ---- billboards (sprites face the player; pixel_size 0.0078125 -> 2 m tall)
    const sprites = (o.sprites || []).map(s => Object.assign({}, s,
      { dist: (px - s.x) * (px - s.x) + (py - s.y) * (py - s.y) }))
      .sort((a, b) => b.dist - a.dist);
    for (const s of sprites) {
      const t = tex[s.tex];
      const rx = s.x - px, ry = s.y - py;
      const inv = 1 / (planeX * dirY - dirX * planeY);
      const tX = inv * (dirY * rx - dirX * ry);
      const tY = inv * (-planeY * rx + planeX * ry);
      if (tY <= 0.05) continue;
      const scr = Math.floor((W / 2) * (1 + tX / tY));
      const sh = Math.abs(Math.floor(H / tY)) * (s.scale || 1);
      const sw = sh;
      const vOff = Math.floor((s.lift || 0) / tY);
      const dy0 = Math.max(0, Math.floor(-sh / 2 + H / 2) + vOff);
      const dy1 = Math.min(H - 1, Math.floor(sh / 2 + H / 2) + vOff);
      const dx0 = Math.max(0, Math.floor(-sw / 2 + scr));
      const dx1 = Math.min(W - 1, Math.floor(sw / 2 + scr));
      const shade = Math.exp(-tY * CELL * FOG);
      for (let x = dx0; x <= dx1; x++) {
        if (tY >= zbuf[x]) continue;
        const texX = Math.floor((x - (-sw / 2 + scr)) * t.w / sw);
        if (texX < 0 || texX >= t.w) continue;
        for (let y = dy0; y <= dy1; y++) {
          const texY = Math.floor((y - vOff - (-sh / 2 + H / 2)) * t.h / sh);
          if (texY < 0 || texY >= t.h) continue;
          const i = (texY * t.w + texX) * 4;
          if (t.d[i + 3] < 128) continue;
          put(x, y, t.d[i] * shade, t.d[i + 1] * shade, t.d[i + 2] * shade);
        }
      }
    }

    // ---- HUD, every asset at its exact pixel size
    const blit = (t, dx, dy) => {
      for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
        const i = (y * t.w + x) * 4;
        if (t.d[i + 3] < 128) continue;
        const X = dx + x, Y = dy + y;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        put(X, Y, t.d[i], t.d[i + 1], t.d[i + 2]);
      }
    };
    const wpn = tex[o.firing ? 'weapon_1' : 'weapon_0'];
    blit(wpn, 260, 272 + (o.firing ? 4 : 0));
    blit(tex.hud_bar, 0, 416);
    blit(tex.crosshair, 312, 232);
    if (o.hasKey) blit(tex.hud_keycard, 458, 438);

    return { data: out, width: W, height: H };
  }

  const R = { MAP, WALL_TEX, renderFrame, mkTex, W, H };
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  if (typeof globalThis !== 'undefined') globalThis.H11Frame = R;
})();
