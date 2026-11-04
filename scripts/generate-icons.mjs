/**
 * Generates the PWA icons with no image library: a small PNG encoder on top of
 * node:zlib. Run `node scripts/generate-icons.mjs` after changing the mark.
 *
 * The artwork is the official HakimeRAD mark from hakimerad.com — a broken ring
 * with a 2x2 grid of squares. The geometry lives in `scripts/lib/mark.mjs` so the
 * social preview card can reuse it.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CLEAR, MARK_H, MARK_W, NAVY, clamp, markColour } from "./lib/mark.mjs";
import { encodePng } from "./lib/png.mjs";

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

const SUPERSAMPLE = 4;

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
