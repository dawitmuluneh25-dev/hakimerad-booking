/**
 * Generates the social preview card (`public/og-image.png`, 1200x630).
 *
 * No fonts are baked in: link previews already print the page title next to the
 * image, so the card carries the mark, the brand colour and nothing that could
 * render differently or drift out of date. Run it after changing the mark:
 *
 *   node scripts/generate-og-image.mjs
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CYAN, MARK_H, MARK_W, markColour } from "./lib/mark.mjs";
import { encodePng } from "./lib/png.mjs";

const OUT_W = 1200;
const OUT_H = 630;
const SS = 2; // supersample factor, box-filtered down at the end

const BACKGROUND_TOP = [10, 37, 64]; // #0a2540, the brand navy
const BACKGROUND_BOTTOM = [7, 26, 45];
const TILE = [14, 47, 77];
const GRID = [255, 255, 255, 0.05];

const width = OUT_W * SS;
const height = OUT_H * SS;
const pixels = Buffer.alloc(width * height * 4);

function blend(base, over, alpha) {
  return [
    Math.round(base[0] + (over[0] - base[0]) * alpha),
    Math.round(base[1] + (over[1] - base[1]) * alpha),
    Math.round(base[2] + (over[2] - base[2]) * alpha),
  ];
}

function setPixel(x, y, [r, g, b]) {
  const offset = (y * width + x) * 4;
  pixels[offset] = r;
  pixels[offset + 1] = g;
  pixels[offset + 2] = b;
  pixels[offset + 3] = 255;
}

// Background: a soft vertical gradient with the site's faint grid on top.
const gridStep = 48 * SS;
for (let y = 0; y < height; y += 1) {
  const t = y / (height - 1);
  const base = [
    Math.round(BACKGROUND_TOP[0] + (BACKGROUND_BOTTOM[0] - BACKGROUND_TOP[0]) * t),
    Math.round(BACKGROUND_TOP[1] + (BACKGROUND_BOTTOM[1] - BACKGROUND_TOP[1]) * t),
    Math.round(BACKGROUND_TOP[2] + (BACKGROUND_BOTTOM[2] - BACKGROUND_TOP[2]) * t),
  ];
  const onGridRow = y % gridStep < SS;
  for (let x = 0; x < width; x += 1) {
    const colour =
      onGridRow || x % gridStep < SS ? blend(base, GRID, GRID[3]) : base;
    setPixel(x, y, colour);
  }
}

// A panel keeps the navy mark tile readable against the navy background.
const tileSize = 330 * SS;
const tileX = (width - tileSize) / 2;
const tileY = (height - tileSize) / 2;
const tileRadius = 56 * SS;

function insideRoundedRect(x, y, left, top, size, radius) {
  const right = left + size;
  const bottom = top + size;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
}

function onRoundedEdge(x, y, left, top, size, radius, thickness) {
  return (
    insideRoundedRect(x, y, left, top, size, radius) &&
    !insideRoundedRect(
      x,
      y,
      left + thickness,
      top + thickness,
      size - thickness * 2,
      Math.max(0, radius - thickness),
    )
  );
}

for (let y = Math.floor(tileY) - 2; y < Math.ceil(tileY + tileSize) + 2; y += 1) {
  for (let x = Math.floor(tileX) - 2; x < Math.ceil(tileX + tileSize) + 2; x += 1) {
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    if (!insideRoundedRect(x, y, tileX, tileY, tileSize, tileRadius)) continue;
    const edge = onRoundedEdge(x, y, tileX, tileY, tileSize, tileRadius, 2 * SS);
    setPixel(x, y, edge ? CYAN : TILE);
  }
}

// The mark itself, centred in the panel.
const markWidth = tileSize * 0.62;
const scale = markWidth / MARK_W;
const offsetX = (width - MARK_W * scale) / 2;
const offsetY = (height - MARK_H * scale) / 2;

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const colour = markColour((x - offsetX) / scale, (y - offsetY) / scale);
    if (colour) setPixel(x, y, colour);
  }
}

// Box-filter back down to 1200x630 for clean arcs and panel edges.
const out = Buffer.alloc(OUT_W * OUT_H * 4);
const samples = SS * SS;
for (let y = 0; y < OUT_H; y += 1) {
  for (let x = 0; x < OUT_W; x += 1) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < SS; sy += 1) {
      for (let sx = 0; sx < SS; sx += 1) {
        const offset = ((y * SS + sy) * width + (x * SS + sx)) * 4;
        r += pixels[offset];
        g += pixels[offset + 1];
        b += pixels[offset + 2];
      }
    }
    const target = (y * OUT_W + x) * 4;
    out[target] = Math.round(r / samples);
    out[target + 1] = Math.round(g / samples);
    out[target + 2] = Math.round(b / samples);
    out[target + 3] = 255;
  }
}

const path = resolve(process.cwd(), "public", "og-image.png");
const png = encodePng(OUT_W, OUT_H, out);
writeFileSync(path, png);
console.log(`public\\og-image.png: ${png.length} bytes (${OUT_W}x${OUT_H})`);
