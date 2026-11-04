/**
 * Generates the PWA icons with no image library: a small PNG encoder on top of
 * node:zlib. Run `node scripts/generate-icons.mjs` after changing the mark.
 *
 * The artwork is the official HakimeRAD mark from hakimerad.com — a broken ring
 * with a 2x2 grid of squares (navy #0a2540 tile, white ring, blue/cyan squares),
 * the same composition as the site's favicon.svg. Geometry is copied verbatim
 * from the site's inline header SVG (viewBox 0 0 375 323).
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const NAVY = [10, 37, 64, 255]; // #0a2540
const WHITE = [255, 255, 255, 255];
const BLUE = [0, 119, 182, 255]; // #0077b6
const CYAN = [0, 180, 216, 255]; // #00b4d8
const CLEAR = [0, 0, 0, 0];

// Mark geometry, in the site's own coordinate space.
const MARK_W = 375;
const MARK_H = 323;
const RING = { cx: 151.08, cy: 161.5, radius: 135.75, stroke: 51.5 };
// The ring is drawn as four arcs; these are the four gaps between them, in
// degrees clockwise from the positive x axis.
const GAPS = [
  [81.2, 90.1],
  [175.1, 184.9],
  [269.9, 278.8],
  [330, 30.3],
];
const SQUARES = [
  { x: 243, y: 95.5, size: 60, radius: 12, colour: BLUE },
  { x: 315, y: 95.5, size: 60, radius: 12, colour: CYAN },
  { x: 243, y: 167.5, size: 60, radius: 12, colour: CYAN },
  { x: 315, y: 167.5, size: 60, radius: 12, colour: BLUE },
];

const SUPERSAMPLE = 4;

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

/** Windows .ico container holding one PNG-compressed 32-bit image. */
function encodeIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;
  entry[1] = size >= 256 ? 0 : size;
  entry[2] = 0; // palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // bytes in resource
  entry.writeUInt32LE(22, 12); // offset of image data
  return Buffer.concat([header, entry, png]);
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function inGap(angle) {
  return GAPS.some(([from, to]) =>
    from < to ? angle > from && angle < to : angle > from || angle < to,
  );
}

/** Colour at one supersampled pixel, in mark coordinates (mx, my). */
function markColour(mx, my) {
  for (const square of SQUARES) {
    if (
      mx < square.x ||
      mx > square.x + square.size ||
      my < square.y ||
      my > square.y + square.size
    )
      continue;
    const cx = clamp(mx, square.x + square.radius, square.x + square.size - square.radius);
    const cy = clamp(my, square.y + square.radius, square.y + square.size - square.radius);
    if ((mx - cx) ** 2 + (my - cy) ** 2 <= square.radius ** 2) return square.colour;
  }

  const dx = mx - RING.cx;
  const dy = my - RING.cy;
  const distance = Math.hypot(dx, dy);
  const half = RING.stroke / 2;
  if (distance >= RING.radius - half && distance <= RING.radius + half) {
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    if (!inGap(angle)) return WHITE;
  }
  return null;
}

function drawIcon(size, { maskable = false } = {}) {
  const width = size * SUPERSAMPLE;
  const pixel = Buffer.alloc(width * width * 4);
  const radius = Math.round(width * 0.22);

  // Mark footprint: the site fills ~76% of the tile; maskable art stays inside
  // the 80% safe zone, so it is drawn smaller and centred on a full-bleed tile.
  const markWidth = width * (maskable ? 0.6 : 0.74);
  const scale = markWidth / MARK_W;
  const offsetX = (width - MARK_W * scale) / 2;
  const offsetY = (width - MARK_H * scale) / 2;

  for (let y = 0; y < width; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const cx = clamp(x, radius, width - 1 - radius);
      const cy = clamp(y, radius, width - 1 - radius);
      const inBackground =
        maskable || (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
      const colour = inBackground
        ? (markColour((x - offsetX) / scale, (y - offsetY) / scale) ?? NAVY)
        : CLEAR;
      pixel[offset] = colour[0];
      pixel[offset + 1] = colour[1];
      pixel[offset + 2] = colour[2];
      pixel[offset + 3] = colour[3];
    }
  }

  // Box-filter down to the requested size: cheap anti-aliasing for the arcs.
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const offset = ((y * SUPERSAMPLE + sy) * width + (x * SUPERSAMPLE + sx)) * 4;
          r += pixel[offset];
          g += pixel[offset + 1];
          b += pixel[offset + 2];
          a += pixel[offset + 3];
        }
      }
      const samples = SUPERSAMPLE * SUPERSAMPLE;
      const target = (y * size + x) * 4;
      out[target] = Math.round(r / samples);
      out[target + 1] = Math.round(g / samples);
      out[target + 2] = Math.round(b / samples);
      out[target + 3] = Math.round(a / samples);
    }
  }
  return encodePng(size, size, out);
}

const publicDir = resolve(process.cwd(), "public");
const iconsDir = resolve(publicDir, "icons");
mkdirSync(iconsDir, { recursive: true });

const outputs = [
  [resolve(iconsDir, "icon-192.png"), drawIcon(192)],
  [resolve(iconsDir, "icon-512.png"), drawIcon(512)],
  [resolve(iconsDir, "icon-maskable-512.png"), drawIcon(512, { maskable: true })],
  [resolve(iconsDir, "apple-touch-icon.png"), drawIcon(180)],
  [resolve(publicDir, "favicon.ico"), encodeIco(drawIcon(32), 32)],
];

for (const [path, buffer] of outputs) {
  writeFileSync(path, buffer);
  console.log(`${path.replace(`${process.cwd()}\\`, "")}: ${buffer.length} bytes`);
}
