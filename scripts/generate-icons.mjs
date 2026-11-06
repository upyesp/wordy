// Regenerates public/icons/*.png — dependency-free (zlib + manual PNG chunks).
// The pointy-top hexagon is scaled as large as the canvas (or the maskable
// safe zone) allows. Colours mirror the DARK palette in src/theme.ts.
// Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// DARK palette (theme.ts)
const BG = [0x0b, 0x0b, 0x16];
const FACE = [0x36, 0xe2, 0xff];
const RIM = [0xbd, 0xfa, 0xff];
const INK = [0x06, 0x22, 0x2b];

const SS = 3; // supersampling factor
const RIM_FRAC = 0.02; // rim width as a fraction of the canvas
// W box relative to the hexagon; stroke thickness relative to the W height.
const W_W = 0.52;
const W_H = 0.38;
const W_T = 0.27;
// Zigzag control points (normalised in the W box).
const W_PTS = [
  [0, 0],
  [0.25, 1],
  [0.5, 0.1],
  [0.75, 1],
  [1, 0],
];

const ICONS = [
  { file: 'icon-192.png', S: 192, mode: 'any' },
  { file: 'icon-512.png', S: 512, mode: 'any' },
  { file: 'apple-touch-icon.png', S: 180, mode: 'any' },
  { file: 'icon-maskable-512.png', S: 512, mode: 'maskable' },
];

/** Pointy-top hexagon containment (same orientation as src/hex.ts). */
function inHex(x, y, r) {
  const a = (Math.sqrt(3) / 2) * r; // apothem
  const s60 = Math.sin(Math.PI / 3);
  const c60 = Math.cos(Math.PI / 3);
  return (
    Math.abs(x) <= a &&
    Math.abs(c60 * x + s60 * y) <= a &&
    Math.abs(-c60 * x + s60 * y) <= a
  );
}

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function render(S, r) {
  const rimW = S * RIM_FRAC;
  const hexW = Math.sqrt(3) * r;
  const hexH = 2 * r;
  const wW = W_W * hexW;
  const wH = W_H * hexH;
  const wT = (W_T * wH) / 2;
  const pts = W_PTS.map(([x, y]) => [(x - 0.5) * wW, (y - 0.5) * wH]);
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);

  const N = S * SS;
  const img = new Uint8Array(N * N * 3);
  for (let j = 0; j < N; j++) {
    const v = (j + 0.5) / SS - S / 2;
    for (let i = 0; i < N; i++) {
      const u = (i + 0.5) / SS - S / 2;
      let c = BG;
      if (inHex(u, v, r - rimW)) c = FACE;
      else if (inHex(u, v, r)) c = RIM;
      for (const [[ax, ay], [bx, by]] of segs) {
        if (distSeg(u, v, ax, ay, bx, by) <= wT) {
          c = INK;
          break;
        }
      }
      const o = (j * N + i) * 3;
      img[o] = c[0];
      img[o + 1] = c[1];
      img[o + 2] = c[2];
    }
  }

  // Box-downsample the supersampled image.
  const out = Buffer.alloc(S * S * 4);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      let R = 0;
      let G = 0;
      let B = 0;
      for (let sj = 0; sj < SS; sj++) {
        for (let si = 0; si < SS; si++) {
          const o = ((y * SS + sj) * N + x * SS + si) * 3;
          R += img[o];
          G += img[o + 1];
          B += img[o + 2];
        }
      }
      const n = SS * SS;
      const o = (y * S + x) * 4;
      out[o] = Math.round(R / n);
      out[o + 1] = Math.round(G / n);
      out[o + 2] = Math.round(B / n);
      out[o + 3] = 255;
    }
  }
  return out;
}

// --- PNG encoding -----------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------------------------

for (const { file, S, mode } of ICONS) {
  // 'any' icons: hexagon height fills the canvas minus an 8px margin.
  // Maskable: content stays inside the 80% safe-zone circle (radius 0.4·S).
  const r = mode === 'maskable' ? 0.4 * S - 1 : (S - 8) / 2;
  const png = encodePNG(S, S, render(S, r));
  const path = join(ROOT, 'public', 'icons', file);
  writeFileSync(path, png);
  console.log(`${file}: ${S}x${S} mode=${mode} r=${r.toFixed(1)} (${png.length} bytes)`);
}
