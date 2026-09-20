import { GAITS, type Gait } from "@pro-now/types";

/**
 * THE ELLIPSE THAT PUTS A FIGURE ON THE GROUND.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS CODE AND NOT PART OF THE ARTWORK
 * ---------------------------------------------------------------------
 * Amit, looking at the world: *"אין הגיון שיש קטנוע מרחף על רקע של
 * משאית."* He was describing a figure with no relationship to the ground
 * it was standing on, and the first instinct — ask for the shadow to be
 * drawn into the file — is the wrong one, for two reasons.
 *
 * A baked shadow is a claim about one light direction, one ground colour
 * and one height off the floor, made by whoever drew the sprite. Put two
 * sprites drawn on different days next to each other and their shadows
 * disagree, which reads worse than no shadow at all: the eye forgives a
 * missing shadow and does not forgive two suns.
 *
 * And a baked shadow cannot move. The whole gait model in `world-motion.ts`
 * is a figure rising and falling as it walks. A shadow painted onto the
 * sprite rises with it — so the harder the walk is animated, the more the
 * figure looks like a sticker being waved about. The contact shadow has to
 * stay on the floor while the figure leaves it, and that is only possible
 * if it is a separate thing that knows how high the figure currently is.
 *
 * ---------------------------------------------------------------------
 * WHAT IT ACTUALLY DOES
 * ---------------------------------------------------------------------
 * One soft ellipse, one colour, no direction. It is not lighting — it is
 * the dark patch directly under something, which is the only shadow that
 * is true regardless of where the sun is. As the figure lifts, the ellipse
 * gets smaller and fainter, because contact is what is being lost.
 */
export const SHADOW = {
  /** The ellipse's width as a fraction of the figure's own width. */
  widthRatio: 0.66,
  /** The ellipse's height as a fraction of its own width — a flat oval. */
  flatness: 0.3,
  /** How dark it is at full contact. */
  opacity: 0.3,
  /** How much narrower it gets at the top of a stride. */
  liftShrink: 0.22,
  /** How much fainter it gets at the top of a stride. */
  liftFade: 0.45,
  /** Never smaller than this fraction of full, or it disappears mid-step. */
  minScale: 0.55,
} as const;

export interface ContactShadowShape {
  width: number;
  height: number;
  opacity: number;
}

/**
 * How high off the ground a figure is right now, 0 (planted) to 1 (the
 * top of its stride), from the bob the gait produced.
 *
 * `bobAt` returns a value in figure-heights and is always <= 0 (up is
 * negative on a screen). Dividing by the gait's own amplitude normalises
 * it, so a scooter whose bob is tiny and a walker whose bob is large both
 * report 1 at the top of their own stride — which is right: what the
 * shadow reacts to is the fraction of the lift, not its size in pixels.
 */
export function liftFromBob(gait: Gait, bob: number): number {
  const amplitude = GAITS[gait].bob;
  if (amplitude <= 0) return 0;
  return Math.max(0, Math.min(1, -bob / amplitude));
}

/**
 * The ellipse under a figure of this width, at this lift.
 *
 * Takes the figure's ALREADY-SCALED width, so a figure further up the
 * street gets a smaller shadow without this function knowing anything
 * about depth.
 */
export function shadowFor(figureWidth: number, lift = 0): ContactShadowShape {
  const l = Math.max(0, Math.min(1, lift));
  const shrink = Math.max(SHADOW.minScale, 1 - l * SHADOW.liftShrink);
  const width = Math.max(0, figureWidth) * SHADOW.widthRatio * shrink;
  return {
    width,
    height: width * SHADOW.flatness,
    opacity: SHADOW.opacity * (1 - l * SHADOW.liftFade),
  };
}

/** Everything wrong with the shadow model, as a test rather than a comment. */
export function contactShadowViolations(): string[] {
  const out: string[] = [];

  // A shadow wider than the thing casting it is a spotlight, not contact.
  if (SHADOW.widthRatio > 1) out.push("the shadow is wider than the figure");
  // An ellipse taller than it is wide is a figure standing on a wall.
  if (SHADOW.flatness >= 1) out.push("the contact shadow is not flat");
  // Opaque black under everything turns the street into a chessboard.
  if (SHADOW.opacity <= 0 || SHADOW.opacity > 0.5) {
    out.push(`the shadow opacity ${SHADOW.opacity} is not a soft contact patch`);
  }
  // If it can vanish, a figure mid-stride reads as having jumped off the
  // world rather than as having taken a step.
  if (SHADOW.minScale <= 0) out.push("the shadow can disappear at the top of a stride");
  if (SHADOW.liftFade >= 1) out.push("the shadow fades to nothing at the top of a stride");
  // Lifting must never make the shadow grow; that is a light moving
  // closer, which is a claim this model does not get to make.
  const planted = shadowFor(100, 0);
  const lifted = shadowFor(100, 1);
  if (lifted.width > planted.width) out.push("lifting makes the shadow larger");
  if (lifted.opacity > planted.opacity) out.push("lifting makes the shadow darker");

  return out;
}
