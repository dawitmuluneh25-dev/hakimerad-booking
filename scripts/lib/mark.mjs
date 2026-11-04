/**
 * The official HakimeRAD mark, as geometry rather than a bitmap: a broken ring
 * with a 2x2 grid of squares. Copied verbatim from the inline SVG in the
 * hakimerad.com header (viewBox 0 0 375 323) so generated artwork matches the
 * real brand without shipping a font or an SVG rasteriser.
 */

export const NAVY = [10, 37, 64, 255]; // #0a2540
export const WHITE = [255, 255, 255, 255];
export const BLUE = [0, 119, 182, 255]; // #0077b6
export const CYAN = [0, 180, 216, 255]; // #00b4d8
export const CLEAR = [0, 0, 0, 0];

export const MARK_W = 375;
export const MARK_H = 323;

const RING = { cx: 151.08, cy: 161.5, radius: 135.75, stroke: 51.5 };

// The ring is drawn as four arcs; these are the gaps between them, in degrees
// clockwise from the positive x axis.
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

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function inGap(angle) {
  return GAPS.some(([from, to]) =>
    from < to ? angle > from && angle < to : angle > from || angle < to,
  );
}

/**
 * Colour at one point in mark coordinates, or null when the point is outside
 * the mark (so callers can show their own background through).
 */
export function markColour(mx, my) {
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
