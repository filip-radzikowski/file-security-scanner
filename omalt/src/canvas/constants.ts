/** World geometry, in points. The world is centred on the text box. */
export const WORLD_SIZE = 6000;
export const CENTER = WORLD_SIZE / 2;

export const COMPOSER_W = 340;
export const COMPOSER_H = 132;
/** Room above the composer for the wordmark and tagline. */
export const HEADER_H = 120;
/** Room below the composer for the suggestion card / growth hint. */
export const SUGGESTION_H = 200;

export const CARD_W = 168;
export const CARD_H = 124;

/**
 * "Thought notes": the latest entries drift up from the wordmark in a staggered chain,
 * newest closest. Offsets are from the world centre to each note's centre.
 */
export const NOTE_W = 190;
export const NOTE_H = 76;
export const NOTE_SLOTS = [
  { x: 0, y: -250 },
  { x: -88, y: -340 },
  { x: 88, y: -430 },
  { x: -88, y: -520 },
  { x: 88, y: -610 },
] as const;
/** Expanded note: wider and taller, centred on the column. Height depends on the text (see ThoughtNotes). */
export const NOTE_OPEN_W = 272;
/** Tallest an expanded note can be; reserved above the chain so cards never land there. */
export const NOTE_OPEN_MAX_H = 340;
export const NOTE_GAP = 14;
export const NOTE_OPACITY = [1, 0.92, 0.84, 0.76, 0.68] as const;
/** Where the dotted chain to the notes starts (just above the wordmark). */
export const NOTE_CHAIN_START = { x: CENTER, y: CENTER - 165 };

/** Area around the centre that new cards, trails and ambient dots must keep clear. */
export const RESERVED = {
  left: CENTER - COMPOSER_W / 2 - 24,
  right: CENTER + COMPOSER_W / 2 + 24,
  // Room for the whole chain even with one note expanded (older notes shift up to make space).
  top: CENTER + NOTE_SLOTS[NOTE_SLOTS.length - 1].y - NOTE_H / 2 - 30 - (NOTE_OPEN_MAX_H - NOTE_H),
  bottom: CENTER + COMPOSER_H / 2 + SUGGESTION_H,
};

/**
 * Culling works in big chunks so React only re-renders when the viewport centre crosses a
 * chunk boundary (roughly every CHUNK points of travel), never mid-glide. Everything in the
 * 3x3 chunks around the viewport centre is rendered, which is at least one full chunk of
 * look-ahead in every direction.
 */
export const CHUNK = 900;
