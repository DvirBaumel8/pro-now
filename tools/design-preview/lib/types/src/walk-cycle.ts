/**
 * A CHARACTER THAT ACTUALLY WALKS.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS REPLACES
 * ---------------------------------------------------------------------
 * The customer's figure in the world has been a pin with their portrait
 * in it, because the only art of a person that existed was a portrait —
 * a bust, facing the camera, which cannot walk away from you. Amit said
 * so four times, and the last time plainly: *"לא יכול להיות שהדמות
 * שבחרתי בעיגול קטן וגרוע."*
 *
 * He then had a walk cycle drawn: one sheet, sixteen poses of the same
 * person seen from behind — eight walking, eight running.
 * `tools/design-preview/slice-walkcycle.mjs` cuts them out of the white
 * and trims each to its own silhouette, which is what turns a contact
 * sheet into a cycle.
 *
 * ---------------------------------------------------------------------
 * WHY THE PHASE COMES FROM DISTANCE AND NOT FROM A CLOCK
 * ---------------------------------------------------------------------
 * A cycle driven by a timer runs at the same speed whether the figure
 * is walking, running or standing on a spot — feet sliding along the
 * pavement, which is the single most obvious tell of a cheap animation.
 * Driven by GROUND COVERED, the feet land where the person is, a run
 * plays its frames faster because a run covers more ground, and
 * standing still holds one pose because no ground is being covered.
 *
 * `STRIDE` is how much world one full cycle covers. It is the one
 * number to tune if the feet ever look like they are skating.
 */

export type WalkGait = "WALK" | "RUN";

/** How much of the world's width one complete cycle covers. */
export const STRIDE: Readonly<Record<WalkGait, number>> = {
  WALK: 0.085,
  RUN: 0.13,
};

export const WALK_FRAMES = 8;

/** The asset ids of one cycle, in order. */
export function walkCycleIds(character: string, gait: WalkGait): string[] {
  const kind = gait === "RUN" ? "run" : "walk";
  return Array.from(
    { length: WALK_FRAMES },
    (_, i) => `avatar_${character}_${kind}_${String(i + 1).padStart(2, "0")}`
  );
}

/**
 * Which pose belongs at this point of the walk.
 *
 * `distance` is in world widths, the same unit `pathLength` returns, so
 * a caller never has to convert anything.
 */
export function walkFrameAt(distance: number, gait: WalkGait, frames = WALK_FRAMES): number {
  const stride = STRIDE[gait];
  if (!(stride > 0) || !Number.isFinite(distance)) return 0;
  const phase = (distance / stride) % 1;
  const p = phase < 0 ? phase + 1 : phase;
  return Math.min(frames - 1, Math.floor(p * frames));
}

/** Every id a character's cycles need, for the art check to ask for. */
export function walkCycleAssets(character: string): string[] {
  return [...walkCycleIds(character, "WALK"), ...walkCycleIds(character, "RUN")];
}

export function walkCycleViolations(character: string): string[] {
  const out: string[] = [];
  const walk = walkCycleIds(character, "WALK");
  const run = walkCycleIds(character, "RUN");
  if (new Set([...walk, ...run]).size !== walk.length + run.length) {
    out.push(`${character}: a walk pose and a run pose share an id`);
  }
  /*
   * A run that covers no more ground per cycle than a walk is a walk
   * played faster, which reads as a figure being fast-forwarded rather
   * than running.
   */
  if (!(STRIDE.RUN > STRIDE.WALK)) out.push("a run must cover more ground per stride than a walk");
  /* And the cycle must loop: the last frame leads back to the first. */
  if (walkFrameAt(0, "WALK") !== 0) out.push("a cycle that does not start at its first pose");
  if (walkFrameAt(STRIDE.WALK, "WALK") !== 0) out.push("a cycle that does not return to its first pose");
  return out;
}
