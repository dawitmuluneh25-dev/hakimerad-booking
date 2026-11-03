/**
 * Generates the PWA icons with no image library: a small PNG encoder on top of
 * node:zlib. Run `node scripts/generate-icons.mjs` after changing the mark.
 *
 * The mark is a neutral medical cross with a needle line, drawn from the brand
 * teal. It is not an official HakimeRAD logo.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TEAL = [31, 111, 120, 255];
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // no filter
    pixels.copy(
      raw,
      y * (width * 4 + 1) + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const put = (x, y, colour) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels[offset] = colour[0];
    pixels[offset + 1] = colour[1];
    pixels[offset + 2] = colour[2];
    pixels[offset + 3] = colour[3];
  };
  const roundedSquare = (radius, colour) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const cx = Math.min(Math.max(x, radius), size - 1 - radius);
        const cy = Math.min(Math.max(y, radius), size - 1 - radius);
        const inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
        if (inside) put(x, y, colour);
      }
    }
  };
  const rect = (x0, y0, w, h, colour) => {
    for (let y = y0; y < y0 + h; y += 1)
      for (let x = x0; x < x0 + w; x += 1) put(x, y, colour);
  };
  const line = (x0, y0, x1, y1, width, colour) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= steps; i += 1) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      for (let dx = -width; dx <= width; dx += 1) {
        for (let dy = -width; dy <= width; dy += 1) {
          if (dx * dx + dy * dy <= width * width) put(x + dx, y + dy, colour);
        }
      }
    }
  };
  return { pixels, roundedSquare, rect, line };
}

function drawIcon(size, { maskable = false } = {}) {
  const { pixels, roundedSquare, rect, line } = canvas(size);
  if (!maskable) roundedSquare(Math.round(size * 0.22), TEAL);
  else {
    // Full-bleed background; the mark stays inside the safe zone.
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1) {
        const offset = (y * size + x) * 4;
        pixels[offset] = TEAL[0];
        pixels[offset + 1] = TEAL[1];
        pixels[offset + 2] = TEAL[2];
        pixels[offset + 3] = 255;
      }
  }
  const scale = maskable ? 0.62 : 0.72;
  const centre = size / 2;
  const bar = Math.round(size * 0.09 * scale);
  const arm = Math.round(size * 0.24 * scale);
  rect(centre - bar / 2, centre - arm, bar, arm * 2, WHITE);
  rect(centre - arm, centre - bar / 2, arm * 2, bar, WHITE);
  // Needle guide line crossing the cross, as on the hero image.
  line(
    centre - arm * 0.85,
    centre + arm * 0.85,
    centre + arm * 0.85,
    centre - arm * 0.85,
    Math.max(1, Math.round(size * 0.022)),
    TEAL,
  );
  line(
    centre - arm * 0.8,
    centre + arm * 0.8,
    centre + arm * 0.8,
    centre - arm * 0.8,
    Math.max(1, Math.round(size * 0.012)),
    WHITE,
  );
  return encodePng(size, size, pixels);
}

const outDir = resolve(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const outputs = [
  ["icon-192.png", drawIcon(192)],
  ["icon-512.png", drawIcon(512)],
  ["icon-maskable-512.png", drawIcon(512, { maskable: true })],
  ["apple-touch-icon.png", drawIcon(180)],
];

for (const [name, buffer] of outputs) {
  writeFileSync(resolve(outDir, name), buffer);
  console.log(`${name}: ${buffer.length} bytes`);
}
