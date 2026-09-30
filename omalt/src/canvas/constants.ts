/** World geometry, in points. The world is centred on the text box. */
export const WORLD_SIZE = 6000;
export const CENTER = WORLD_SIZE / 2;

export const COMPOSER_W = 340;
export const COMPOSER_H = 132;
/** Room above the composer for the wordmark and tagline. */
export const HEADER_H = 120;
/** Room below the composer for the suggestion card. */
export const SUGGESTION_H = 150;

export const CARD_W = 168;
export const CARD_H = 124;

/** Area around the centre that new cards and trails must keep clear. */
export const RESERVED = {
  left: CENTER - COMPOSER_W / 2 - 24,
  right: CENTER + COMPOSER_W / 2 + 24,
  top: CENTER - COMPOSER_H / 2 - HEADER_H,
  bottom: CENTER + COMPOSER_H / 2 + SUGGESTION_H,
};

/** How far outside the viewport (in points) content is still rendered. */
export const CULL_MARGIN = 320;
/** Granularity of the viewport-cell key used to throttle culling updates. */
export const CULL_CELL = 160;
