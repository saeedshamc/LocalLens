import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'public', 'icon');
fs.mkdirSync(dir, { recursive: true });

function crc32(buf) {
  let c = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c2 = n;
    for (let k = 0; k < 8; k++) c2 = c2 & 1 ? 0xedb88320 ^ (c2 >>> 1) : c2 >>> 1;
    table[n] = c2 >>> 0;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crc]);
}

/** Draw a lens ring + L mark on a warm background. */
function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cx = size / 2;
  const cy = size / 2;
  const outer = size * 0.42;
  const inner = size * 0.28;
  const stroke = Math.max(1.2, size * 0.07);

  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const dx = x - cx + 0.5;
      const dy = y - cy + 0.5;
      const r = Math.sqrt(dx * dx + dy * dy);

      // Soft cream background
      let R = 247;
      let G = 244;
      let B = 239;

      // Outer fill disk
      if (r <= outer) {
        R = 216;
        G = 239;
        B = 230;
      }
      // Ring stroke
      if (Math.abs(r - outer) <= stroke * 0.55 || Math.abs(r - inner) <= stroke * 0.35) {
        R = 15;
        G = 110;
        B = 86;
      }
      // Inner clear
      if (r < inner - stroke * 0.35) {
        R = 255;
        G = 250;
        B = 243;
      }

      // Letter L
      const lx0 = cx - size * 0.12;
      const lx1 = cx + size * 0.14;
      const ly0 = cy - size * 0.16;
      const ly1 = cy + size * 0.16;
      const thick = Math.max(1.5, size * 0.08);
      const onStem = x >= lx0 && x <= lx0 + thick && y >= ly0 && y <= ly1;
      const onBase = y >= ly1 - thick && y <= ly1 && x >= lx0 && x <= lx1;
      if (onStem || onBase) {
        R = 15;
        G = 110;
        B = 86;
      }

      raw[i] = R;
      raw[i + 1] = G;
      raw[i + 2] = B;
      raw[i + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const s of [16, 32, 48, 128]) {
  fs.writeFileSync(path.join(dir, `${s}.png`), png(s));
}
console.log('Generated icons in public/icon');
