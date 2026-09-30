import { RESERVED } from './constants';
import { Rect } from './layout';

/** Size of the grid cells the ambient dots are generated from. */
const CELL = 180;
const KEEP_CLEAR = 24;

export interface AmbientDot {
  key: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  sage: boolean;
}

/** Deterministic hash to [0, 1). The same cell always yields the same dots. */
function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(c, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Sparse, stable scatter of dots covering `rect`, generated per grid cell so it costs nothing to store. */
export function ambientDotsIn(rect: Rect): AmbientDot[] {
  const out: AmbientDot[] = [];
  const x0 = Math.floor(rect.left / CELL);
  const x1 = Math.floor(rect.right / CELL);
  const y0 = Math.floor(rect.top / CELL);
  const y1 = Math.floor(rect.bottom / CELL);
  for (let cx = x0; cx <= x1; cx++) {
    for (let cy = y0; cy <= y1; cy++) {
      const roll = hash(cx, cy, 1);
      const count = roll < 0.18 ? 0 : roll < 0.72 ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const x = (cx + hash(cx, cy, 10 + i)) * CELL;
        const y = (cy + hash(cx, cy, 20 + i)) * CELL;
        const inCentre =
          x > RESERVED.left - KEEP_CLEAR &&
          x < RESERVED.right + KEEP_CLEAR &&
          y > RESERVED.top - KEEP_CLEAR &&
          y < RESERVED.bottom + KEEP_CLEAR;
        if (inCentre) continue;
        const sage = hash(cx, cy, 30 + i) < 0.16;
        out.push({
          key: `${cx}:${cy}:${i}`,
          x,
          y,
          size: 4 + Math.round(hash(cx, cy, 40 + i) * 4),
          opacity: sage ? 0.55 : 0.45 + hash(cx, cy, 50 + i) * 0.4,
          sage,
        });
      }
    }
  }
  return out;
}
