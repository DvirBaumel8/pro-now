import type { NormalizedPoint } from "./virtual-venue";

/**
 * THINGS YOU FIND BY GOING TO THEM.
 *
 * ---------------------------------------------------------------------
 * WHY PROXIMITY AND NOT A TAP
 * ---------------------------------------------------------------------
 * `world-play.ts` already has discoveries and they are tapped: touch a
 * tree, pigeons come out. That was right for a screen with no avatar on
 * it — the only thing a finger could do was point.
 *
 * Amit's game is a different verb: *"אני רוצה שיהיה משחק, שאתה יכול לרוץ
 * עם החצים, לשחק בין החנויות."* Running somewhere and having the world
 * respond because you ARRIVED is what makes a street a place rather than
 * a board of buttons — and it is the only version that gives the walking
 * a point. A tap needs no legs.
 *
 * So this adds reaching, and changes nothing about discovering: the same
 * `discover()` records it, the same drawer counts it, and the same rule
 * holds that none of it may touch the job. A discovery still cannot carry
 * an ETA, a price or a claim, because it is still just an id.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS NOT A SCORE
 * ---------------------------------------------------------------------
 * There is no timer, nothing is lost by not playing, and arriving late
 * costs nothing. The wait has a real length that belongs to the server,
 * and a game that punished somebody for watching the street instead
 * would be a game competing with the thing it exists to make bearable.
 */

/** Something placed in the street that answers when somebody reaches it. */
export interface Errand {
  /** The discovery id, as `world-play.ts` records it. */
  id: string;
  /** Where it stands, in world coordinates. */
  at: NormalizedPoint;
  /** One short line, shown once, about what just happened. */
  foundHe: string;
}

/**
 * How close counts as reaching.
 *
 * Generous, and deliberately more generous than it looks: the figure is
 * drawn from its feet and the thing it is walking to has width, so a
 * radius tight enough to feel exact on paper reads on screen as walking
 * through something without it noticing.
 */
export const REACH_RADIUS = 0.07;

/**
 * The 3/4 weighting the whole world uses, so reaching across the street
 * is not easier than reaching along it.
 */
const DEPTH_WEIGHT = 0.6;

export function withinReach(at: NormalizedPoint, errand: Errand, radius = REACH_RADIUS): boolean {
  return (
    Math.hypot(errand.at.u - at.u, (errand.at.v - at.v) * DEPTH_WEIGHT) <= radius
  );
}

/**
 * Everything reached from this position that has not been found yet.
 *
 * Pure, and returns ids rather than mutating anything, so the scene can
 * hand them straight to `discover()` — which is already idempotent, so
 * standing still on top of one does not count repeatedly.
 */
export function reachedNow(
  at: NormalizedPoint,
  errands: readonly Errand[],
  found: readonly string[],
  radius = REACH_RADIUS
): string[] {
  return errands
    .filter((e) => !found.includes(e.id) && withinReach(at, e, radius))
    .map((e) => e.id);
}

/**
 * Lay errands out on the pavement the plate actually has.
 *
 * Takes the measured shop spots and puts something BETWEEN them rather
 * than on them: a thing to find standing in a shop doorway is a thing
 * you find by accident on the way to the shop, which is the opposite of
 * a reason to walk somewhere.
 */
export function errandsBetween(spots: readonly NormalizedPoint[], lines: readonly string[]): Errand[] {
  const out: Errand[] = [];
  for (let i = 0; i + 1 < spots.length && out.length < lines.length; i += 1) {
    const a = spots[i]!;
    const b = spots[i + 1]!;
    out.push({
      id: `errand_${out.length + 1}`,
      at: { u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 },
      foundHe: lines[out.length]!,
    });
  }
  return out;
}

/** Everything wrong with the errand model, as a test rather than prose. */
export function errandViolations(errands: readonly Errand[]): string[] {
  const out: string[] = [];

  const ids = new Set<string>();
  for (const e of errands) {
    if (ids.has(e.id)) out.push(`duplicate errand "${e.id}"`);
    ids.add(e.id);
    if (!e.foundHe.trim()) out.push(`"${e.id}" says nothing when it is found`);
    /*
     * The rule that matters, and the reason this is checked rather than
     * trusted: a line about the job turns a game into a claim. No ETA, no
     * price, no promise about the professional — /CLAUDE.md §3 and §4.
     */
    if (/\d+\s*(דק|₪|שקל|%)/.test(e.foundHe) || /מגיע|הגעה|מחיר|הנחה/.test(e.foundHe)) {
      out.push(`"${e.id}" says something about the job: "${e.foundHe}"`);
    }
    if (e.at.u < 0 || e.at.u > 1 || e.at.v < 0 || e.at.v > 1) {
      out.push(`"${e.id}" is outside the world`);
    }
  }

  // Two things to find in the same place is one thing to find.
  for (let i = 0; i < errands.length; i += 1) {
    for (let j = i + 1; j < errands.length; j += 1) {
      if (withinReach(errands[i]!.at, errands[j]!)) {
        out.push(`"${errands[i]!.id}" and "${errands[j]!.id}" are the same spot`);
      }
    }
  }

  return out;
}
