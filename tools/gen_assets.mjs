#!/usr/bin/env node
/* H11 // Deck 1 — asset generator.
 *
 * Replaces the old tools/gen_assets.py. Zero dependencies (no Pillow, no npm):
 * draws every asset from tools/h11_art.js and writes PNGs with node:zlib.
 *
 * Target is 640x480 (ART_REDESIGN.md 3.1), so sizes are the doubled table:
 * walls/doors/flats/sprites/pickups 256x256, weapon 192x144, crosshair 18x18,
 * hud_bar 640x64, hud_keycard 32x32. Set SCALE = 1 in h11_art.js for 320x240.
 *
 *   node tools/gen_assets.mjs            # writes ../assets/*.png
 *   node tools/gen_assets.mjs --out DIR
 *   node tools/gen_assets.mjs --only wall_panel,mutant_0
 *   node tools/gen_assets.mjs --stats    # colour count / median / p90 per file
 *
 * Art rules enforced by construction, not by review:
 *   - every colour comes from a PLAYPAL ramp declared at the top of h11_art.js
 *   - gradients are ordered 4x4 Bayer dithers between two adjacent ramp entries
 *   - there is no noise() pass; nothing is randomised per pixel
 *   - sprite alpha is hardened to 0 or 255 before writing
 *
 * Verify with:  python3 tools/check_palette.py --stats
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- load the drawing code (plain script, shared with the design canvas)
const src = readFileSync(join(HERE, 'h11_art.js'), 'utf8');
new Function(src).call(globalThis);
const H11 = globalThis.H11;

// ---- minimal PNG writer (RGBA8, non-interlaced)
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;                       // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4)
      .copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- cli
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i < 0 ? d : argv[i + 1]; };
const outDir = resolve(HERE, arg('--out', join(HERE, '..', 'assets')));
const only = arg('--only', null);
const wantStats = argv.includes('--stats');
const names = Object.keys(H11.SIZES).filter(n => !only || only.split(',').includes(n));
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let bad = 0;
for (const name of names) {
  const g = H11.A[name]();
  const [w, h] = H11.SIZES[name];
  if (g.w !== w || g.h !== h) { console.error(`! ${name}: ${g.w}x${g.h}, expected ${w}x${h}`); bad++; continue; }
  let semi = 0;
  for (let i = 3; i < g.d.length; i += 4) if (g.d[i] !== 0 && g.d[i] !== 255) semi++;
  if (semi) { console.error(`! ${name}: ${semi} semi-transparent pixels (alpha_cut = 1 needs 0 or 255)`); bad++; }
  writeFileSync(join(outDir, name + '.png'), encodePNG(w, h, g.d));
  if (wantStats) {
    const cols = new Set(); const lum = [];
    for (let i = 0; i < g.d.length; i += 4) {
      if (g.d[i + 3] === 0) continue;
      cols.add((g.d[i] << 16) | (g.d[i + 1] << 8) | g.d[i + 2]);
      lum.push(0.299 * g.d[i] + 0.587 * g.d[i + 1] + 0.114 * g.d[i + 2]);
    }
    lum.sort((a, b) => a - b);
    const q = p => Math.round(lum[Math.floor(p * (lum.length - 1))] / 2.55);
    console.log(`${name.padEnd(15)} ${w}x${h}  colours ${String(cols.size).padStart(3)}  median ${String(q(.5)).padStart(2)}%  p90 ${String(q(.9)).padStart(3)}%`);
  } else {
    console.log(`  ${name}.png  ${w}x${h}`);
  }
}
console.log(`\n${names.length - bad}/${names.length} written to ${outDir}`);
process.exit(bad ? 1 : 0);
