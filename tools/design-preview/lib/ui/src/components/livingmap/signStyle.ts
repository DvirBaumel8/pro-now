/**
 * THE RULES A SHOP'S SIGN FOLLOWS — separated from the component that
 * draws it, so they can be tested without a renderer.
 *
 * See `ShopSign.tsx` for why every venue carries its professional's own
 * name. This file holds the two decisions that have to stay stable: when a
 * sign is too small to be worth drawing, and what colour a given
 * professional's awning is.
 */

/**
 * Under this many points of shop width, a name cannot be read.
 *
 * Below it the sign is not drawn at all rather than drawn small. An
 * illegible sign on every shop at once is noise on the whole street, and it
 * is worse than no sign because it still costs the reader a glance.
 */
export const SIGN_MIN_WIDTH = 74;

/**
 * The awning colours. Six, because past that they stop being tellable
 * apart at the size a shopfront is actually drawn.
 */
export const SIGN_ACCENTS: readonly string[] = [
  "#D9431F",
  "#0B7A5E",
  "#2F5FD0",
  "#B8860B",
  "#7A3FA0",
  "#1F7A8C",
];

/**
 * A stable colour per professional.
 *
 * A hash of the candidate's id rather than their position in a list: an
 * index changes when the list is re-ordered, and a shop that changes
 * colour between two frames of one search reads as a different shop.
 *
 * The colour carries NO meaning beyond identity. It is not a rank, a price
 * band, a speciality or a status — it exists so that two shops of the same
 * trade standing side by side are told apart before anybody reads a word.
 */
export function signAccent(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return SIGN_ACCENTS[h % SIGN_ACCENTS.length]!;
}

/**
 * How large the name is drawn on a shop of this width.
 *
 * Scaled to the building, but clamped: unbounded, a near shop gets a
 * headline and a far one gets nothing legible, and the street stops looking
 * like one product.
 */
export function signFontSize(shopWidth: number): number {
  return Math.max(9, Math.min(15, Math.round(shopWidth * 0.11)));
}
