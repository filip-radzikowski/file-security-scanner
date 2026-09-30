import { CARD_H, CARD_W, CENTER, RESERVED, WORLD_SIZE } from './constants';

export interface Point {
  x: number;
  y: number;
}

/** Card centre positions. */
type Placed = Point;

const PADDING = 28;
const EDGE_MARGIN = 80;
const START_RADIUS = 250;
/** Distance between successive spiral arms. */
const ARM_GAP = 150;
/** Distance travelled along the spiral between candidate positions. */
const STEP = 44;
const START_ANGLE = -Math.PI / 3;

function overlapsCard(a: Point, b: Placed): boolean {
  return Math.abs(a.x - b.x) < CARD_W + PADDING && Math.abs(a.y - b.y) < CARD_H + PADDING;
}

function overlapsReserved(p: Point): boolean {
  return (
    p.x + CARD_W / 2 + PADDING > RESERVED.left &&
    p.x - CARD_W / 2 - PADDING < RESERVED.right &&
    p.y + CARD_H / 2 + PADDING > RESERVED.top &&
    p.y - CARD_H / 2 - PADDING < RESERVED.bottom
  );
}

function inBounds(p: Point): boolean {
  return (
    p.x - CARD_W / 2 >= EDGE_MARGIN &&
    p.x + CARD_W / 2 <= WORLD_SIZE - EDGE_MARGIN &&
    p.y - CARD_H / 2 >= EDGE_MARGIN &&
    p.y + CARD_H / 2 <= WORLD_SIZE - EDGE_MARGIN
  );
}

/**
 * Walks an Archimedean spiral outward from the centre and returns the first
 * position where a card fits without touching the centre cluster or another card.
 */
export function findSpawnPosition(existing: Placed[]): Point {
  let theta = 0;
  for (let i = 0; i < 20000; i++) {
    const r = START_RADIUS + (ARM_GAP / (2 * Math.PI)) * theta;
    const angle = START_ANGLE + theta;
    const p = { x: Math.round(CENTER + r * Math.cos(angle)), y: Math.round(CENTER + r * Math.sin(angle)) };
    if (inBounds(p) && !overlapsReserved(p) && !existing.some((c) => overlapsCard(p, c))) return p;
    theta += STEP / r;
  }
  return { x: CENTER + START_RADIUS, y: CENTER - START_RADIUS };
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function cardRect(p: Point): Rect {
  return { left: p.x - CARD_W / 2, right: p.x + CARD_W / 2, top: p.y - CARD_H / 2, bottom: p.y + CARD_H / 2 };
}

/** Bounding box of the trail from the centre to a card, and of the card itself. */
export function trailRect(p: Point): Rect {
  const c = cardRect(p);
  return {
    left: Math.min(c.left, CENTER),
    right: Math.max(c.right, CENTER),
    top: Math.min(c.top, CENTER),
    bottom: Math.max(c.bottom, CENTER),
  };
}

const DOT_SPACING = 20;

/** Evenly spaced dots from a to b, leaving out any that fall inside a skip rect. */
export function dotsBetween(a: Point, b: Point, skip: Rect[], spacing: number = DOT_SPACING): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return [];
  const ux = dx / length;
  const uy = dy / length;
  const dots: Point[] = [];
  for (let d = spacing; d < length; d += spacing) {
    const dot = { x: a.x + ux * d, y: a.y + uy * d };
    const hidden = skip.some((r) => dot.x > r.left && dot.x < r.right && dot.y > r.top && dot.y < r.bottom);
    if (!hidden) dots.push(dot);
  }
  return dots;
}

/** Points for the faint dotted trail from the centre cluster to a card. */
export function trailDots(p: Point, others: Rect[] = []): Point[] {
  const card = cardRect(p);
  const paddedCard: Rect = {
    left: card.left - 8,
    right: card.right + 8,
    top: card.top - 8,
    bottom: card.bottom + 8,
  };
  // `others` are the other cards' rects, so a trail never runs across a card that isn't its own.
  return dotsBetween({ x: CENTER, y: CENTER }, p, [RESERVED, paddedCard, ...others]);
}
