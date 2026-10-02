/**
 * HOW THE PICKER ARRIVES, AND HOW A CHOICE FEELS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A FILE AND NOT FOUR NUMBERS IN THE SCREEN
 * ---------------------------------------------------------------------
 * Amit: *"שהבחירת אווטאר מהרגע הראשון תהיה טובה."* This is the second
 * screen a customer ever sees and the only one whose entire content is a
 * choice, so the timing of it is the screen — and timing written inline
 * is timing nobody can check.
 *
 * (It is `.ts` rather than `.tsx` for the same reason as everything else
 * here: vitest collects nothing from a suite that imports a component.)
 */

/** How long one tile takes to arrive. */
export const CELL_RISE_MS = 260;

/**
 * The gap between one tile arriving and the next.
 *
 * Small enough that the whole grid reads as one movement rather than as a
 * queue: the last tile has to land inside the window where a stagger is
 * still arrival and not loading.
 *
 * It was 40ms, which was right for twelve tiles and wrong the moment the
 * roster grew to fifteen — three PRO NOW rides joined the twelve people
 * and the grid started taking 820ms to settle. The rule caught it, which
 * is the entire reason the rule is a number in a test rather than a
 * sentence in a comment. 34ms puts fifteen tiles down in 736ms.
 */
export const CELL_STAGGER_MS = 34;

export function cellDelayMs(index: number): number {
  return Math.max(0, index) * CELL_STAGGER_MS;
}

/** When the last tile has finished arriving. */
export function gridSettledMs(count: number): number {
  if (count <= 0) return 0;
  return cellDelayMs(count - 1) + CELL_RISE_MS;
}

/**
 * How a chosen tile sits against the others.
 *
 * ---------------------------------------------------------------------
 * WHY THE OTHERS RECEDE RATHER THAN THE CHOSEN ONE GROWING ALONE
 * ---------------------------------------------------------------------
 * A border around the chosen tile says "this one is ticked". Lifting it
 * while the rest step back says "this one is you" — and the second is
 * what the screen is actually asking. It also survives being looked at
 * from arm's length, which a 2px border does not.
 *
 * The unchosen ones stay at 90% rather than fading far down: they are
 * still choices, and a grid that dims hard the moment you touch it reads
 * as having been decided for you.
 */
export const PICK_SCALE = 1.06;
export const OTHERS_SCALE = 0.94;
export const OTHERS_OPACITY = 0.55;

export interface CellPose {
  scale: number;
  opacity: number;
}

export function poseFor(isPicked: boolean, anyPicked: boolean): CellPose {
  if (!anyPicked) return { scale: 1, opacity: 1 };
  return isPicked
    ? { scale: PICK_SCALE, opacity: 1 }
    : { scale: OTHERS_SCALE, opacity: OTHERS_OPACITY };
}

/**
 * Everything wrong with the picker's motion, as a test rather than prose.
 *
 * `count` is the real roster size rather than a hard-coded twelve. The
 * hard-coded version passed on the day the roster became fifteen, which
 * is the one day it needed to fail.
 */
export function pickerMotionViolations(count = 12): string[] {
  const out: string[] = [];

  // A stagger long enough to watch is a loading spinner made of faces.
  if (gridSettledMs(count) > 800) {
    out.push(`the grid takes ${gridSettledMs(count)}ms to arrive, which reads as loading`);
  }
  // And no stagger at all is twelve things appearing, which reads as a jump.
  if (CELL_STAGGER_MS <= 0) out.push("the tiles arrive all at once");
  if (CELL_RISE_MS <= 0) out.push("the tiles do not arrive, they appear");

  // The chosen one must be the largest thing on screen, or the lift says
  // nothing.
  if (PICK_SCALE <= OTHERS_SCALE) out.push("choosing does not lift the choice");
  // But not so large it stops being one of a set.
  if (PICK_SCALE > 1.2) out.push("the chosen tile has left the grid");
  // The others stay choices.
  if (OTHERS_OPACITY < 0.4) {
    out.push("the unchosen tiles are dimmed to the point of being disabled");
  }
  if (OTHERS_SCALE < 0.85) out.push("the unchosen tiles shrink out of the conversation");

  // Nothing is selected before somebody selects it.
  const resting = poseFor(false, false);
  if (resting.scale !== 1 || resting.opacity !== 1) {
    out.push("the grid is not at rest before a choice is made");
  }

  return out;
}
