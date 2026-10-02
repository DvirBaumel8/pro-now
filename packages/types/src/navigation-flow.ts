/**
 * WHAT A TRANSITION BETWEEN TWO SCREENS SHOULD LOOK LIKE.
 *
 * Amit, after the world went in: *"אין חלונות מעבר, אין עניין מזה"*, and
 * later, plainly: *"תעבוד על כל המעברי עמוד."* Two separate faults were
 * hiding behind that one sentence, and both are decided here rather than in
 * the screens.
 *
 * FAULT 1 — EVERY MOVE LOOKED THE SAME. The app had one animation and
 * played it for everything: going deeper, coming back, switching tabs. A
 * back that animates like a forward is worse than no animation at all,
 * because the motion actively tells you the wrong thing — you feel you went
 * somewhere new when you returned to where you were. Direction has to come
 * from the two routes, not from which handler happened to fire, or it goes
 * out of agreement with itself the first time a screen gets a second way in.
 *
 * FAULT 2 — SOME MOVES DIDN'T ANIMATE AT ALL. The transition replayed on a
 * change of route NAME. Tapping a second category is still `category`, a
 * second service is still `service`, so the busiest taps in the app — the
 * ones on the home tiles Amit called dead — swapped their contents with no
 * motion whatsoever. Identity has to include what the screen is ABOUT.
 *
 * ---------------------------------------------------------------------
 * THE MODEL: DEPTH, NOT HANDLERS
 * ---------------------------------------------------------------------
 * Every destination sits at a DEPTH in the journey — how far into asking
 * for a professional you are. Compare the depth you left with the depth you
 * arrived at and the direction falls out:
 *
 *   deeper  → forward   (the new screen arrives from the reading direction)
 *   shallower → back    (the same motion, reversed)
 *   equal   → lateral   (a sibling: another category, another tab)
 *
 * This is why no call site passes a direction. `onBack` handlers navigate
 * with the same `go` as everything else and still animate as a return,
 * because returning is a fact about the two screens rather than about the
 * button that was pressed. The phone's own back gesture gets it right for
 * free, which is the case that was broken and the hardest to remember.
 *
 * Lateral is its own answer rather than a rounding of forward. Switching
 * from "לבית" to "רכב" is not progress and should not feel like it; it is
 * the same shelf, one step along, so it moves a short distance and mostly
 * cross-fades. Distances and durations live here too — a screen should not
 * be able to invent its own, which is how a product ends up with five
 * transition speeds and no reason for any of them.
 */

/** The three things a move between screens can be. */
export type NavDirection = "forward" | "back" | "lateral";

export interface TransitionShape {
  /**
   * Where the arriving screen starts, as a share of its own width.
   * NEGATIVE is left of centre. The app reads right-to-left, so going
   * forward the new screen comes from the LEFT — the direction the eye is
   * already travelling — and coming back it comes from the right.
   */
  readonly fromX: number;
  /** How long it takes. Short on purpose: see below. */
  readonly durationMs: number;
  /** Opacity at the start. A lateral move leans on the fade, not the slide. */
  readonly fromOpacity: number;
  /**
   * Scale at the start, settling to 1.
   *
   * Amit: *"המעבר עמוד נראה אותו דבר, לא שמים לב מה קורה."*
   *
   * A slide alone is a weak signal when both screens are the same dark
   * world with a panel over it — the shapes barely move relative to each
   * other, so the eye reads a flicker rather than a move. Arriving
   * slightly small and settling reads as DEPTH: the screen comes toward
   * you going forward and recedes coming back, which is the difference
   * between "something changed" and "you went somewhere".
   *
   * A transform, like the slide, so it still runs off the JS thread.
   * Small on purpose — a big zoom is a slideshow effect and dates a
   * product faster than a slow transition does.
   */
  readonly fromScale: number;
}

/**
 * 260ms for a real move, 190ms for a sibling.
 *
 * Both are deliberately short. This is an app someone opens because their
 * kitchen is flooding, and every millisecond of transition is time they
 * spend watching instead of getting help. A slow transition is also the
 * first thing that dates a product.
 */
export const TRANSITIONS: Readonly<Record<NavDirection, TransitionShape>> = {
  /*
   * The travel went from 0.22 to 0.34 of the width at the same time the
   * scale arrived, and for the same reason: at 0.22 on a 390pt phone the
   * new screen entered 86 points out, which on a screen whose top half is
   * the same neighbourhood either side of the move is simply not enough
   * to see. A third of the width, arriving 6% small, is a move.
   *
   * Forward comes from the LEFT because the app is Hebrew and that is the
   * direction the eye already travels; back mirrors it exactly, or a
   * return does not undo the move that got you there.
   */
  forward: { fromX: -0.34, durationMs: 260, fromOpacity: 0, fromScale: 0.94 },
  back: { fromX: 0.34, durationMs: 260, fromOpacity: 0, fromScale: 0.94 },
  /*
   * A sibling barely moves and does not change depth at all: nothing was
   * entered, so nothing should appear to come closer. It leans on the
   * fade, which is what makes a tab read as a tab rather than as a step.
   */
  lateral: { fromX: -0.06, durationMs: 190, fromOpacity: 0.25, fromScale: 1 },
};

/**
 * HOW DEEP EACH CUSTOMER SCREEN SITS.
 *
 * The number is not an index into a list — screens are skipped, and some
 * depths hold several screens. It is an answer to one question: how much
 * closer to a professional standing at your door are you than you were?
 */
export const CUSTOMER_DEPTH: Readonly<Record<string, number>> = {
  welcome: 0,
  auth: 1,
  /** The three tabs are siblings of each other, never progress. */
  home: 2,
  /* The street is a sibling of home, not a step into a request. */
  stroll: 3,
  calls: 2,
  card: 2,
  /** A step off the home shelf: you have pointed at something. */
  address: 3,
  category: 3,
  /** You have named the thing that is wrong. */
  service: 4,
  describe: 5,
  /** The world is looking for someone. */
  living: 6,
  matchconfirm: 6,
  /** Someone is coming. */
  tracking: 7,
  chat: 8,
  arrival: 8,
  quote: 9,
  complete: 10,
  /*
   * The last screen of a job, and one step deeper than the receipt so
   * the move onto it reads as going forward rather than sideways. From
   * here the only way is home, which is a long way back and animates as
   * one — correct, because that is what it is.
   */
  closed: 11,
};

/** The professional's side has its own journey, with its own depths. */
export const PRO_DEPTH: Readonly<Record<string, number>> = {
  welcome: 0,
  auth: 1,
  shift: 2,
  earnings: 2,
  verify: 2,
  profile: 2,
  presence: 3,
  job: 3,
  chat: 4,
  settled: 4,
};

/**
 * The identity of a screen, for the purpose of "did we move?".
 *
 * Includes what the screen is ABOUT, because two categories are two
 * destinations even though they share a route name. Deliberately does NOT
 * include things that change WITHIN a screen — the living map's phase is
 * one mounted scene changing shape, and replaying a page transition over it
 * four times would cut the journey to pieces.
 */
export function screenKey(parts: {
  side: "customer" | "pro" | "gate";
  name: string;
  subject?: string | null;
}): string {
  return parts.subject ? `${parts.side}:${parts.name}:${parts.subject}` : `${parts.side}:${parts.name}`;
}

/** The depth of a screen, by side and name. Unknown names sit at home's depth. */
export function depthOf(side: "customer" | "pro" | "gate", name: string): number {
  if (side === "pro") return PRO_DEPTH[name] ?? 2;
  return CUSTOMER_DEPTH[name] ?? 2;
}

/**
 * The direction of a move. Crossing between the two sides of the product —
 * or arriving from nowhere on first paint — is not a move within a journey,
 * so it reads as lateral rather than as a leap forward.
 */
export function transitionDirection(
  from: { side: "customer" | "pro" | "gate"; name: string } | null,
  to: { side: "customer" | "pro" | "gate"; name: string }
): NavDirection {
  if (!from) return "lateral";
  if (from.side !== to.side) return "lateral";
  const a = depthOf(from.side, from.name);
  const b = depthOf(to.side, to.name);
  if (b > a) return "forward";
  if (b < a) return "back";
  return "lateral";
}

/** The shape to animate, given where you were and where you are. */
export function transitionFor(
  from: { side: "customer" | "pro" | "gate"; name: string } | null,
  to: { side: "customer" | "pro" | "gate"; name: string }
): TransitionShape & { direction: NavDirection } {
  const direction = transitionDirection(from, to);
  return { direction, ...TRANSITIONS[direction] };
}

/**
 * The invariants, as a test rather than as a comment.
 *
 * These are the mistakes that are easy to make later: adding a screen and
 * forgetting its depth (so it silently sits at home's and every move to it
 * is lateral), or tuning a duration up until the app feels slow.
 */
export function navigationViolations(): string[] {
  const out: string[] = [];

  // Forward and back must be mirror images, or a return does not undo the
  // journey out — it just slides differently.
  if (TRANSITIONS.forward.fromX !== -TRANSITIONS.back.fromX) {
    out.push("forward and back must start from opposite sides");
  }
  if (TRANSITIONS.forward.durationMs !== TRANSITIONS.back.durationMs) {
    out.push("forward and back must take the same time");
  }

  // Nothing may get slow. 300ms is the point at which a transition stops
  // feeling like response and starts feeling like waiting.
  for (const [name, shape] of Object.entries(TRANSITIONS)) {
    if (shape.durationMs > 300) out.push(`${name} is too slow at ${shape.durationMs}ms`);
    if (shape.durationMs < 120) out.push(`${name} is too fast to read at ${shape.durationMs}ms`);
  }

  // A sibling move must be visibly smaller than a real one, or the three
  // directions collapse back into one animation.
  /*
   * A screen must not arrive so small that the move reads as a zoom, and
   * must not arrive larger than it settles — that is a shrink, which
   * reads as leaving rather than arriving.
   */
  for (const [name, shape] of Object.entries(TRANSITIONS)) {
    if (shape.fromScale > 1) out.push(`${name} arrives larger than it settles`);
    if (shape.fromScale < 0.88) out.push(`${name} arrives too small at ${shape.fromScale}`);
  }
  // A sibling is not a step into anything, so it must not gain depth.
  if (TRANSITIONS.lateral.fromScale !== 1) {
    out.push("a lateral move must not change depth");
  }

  if (Math.abs(TRANSITIONS.lateral.fromX) >= Math.abs(TRANSITIONS.forward.fromX)) {
    out.push("a lateral move must travel less than a forward one");
  }

  // The customer journey must actually descend: each of these steps is a
  // real commitment and must read as one.
  const journey = ["home", "category", "service", "describe", "living", "tracking", "quote", "complete"];
  for (let i = 1; i < journey.length; i += 1) {
    const prev = CUSTOMER_DEPTH[journey[i - 1]!];
    const next = CUSTOMER_DEPTH[journey[i]!];
    if (prev === undefined || next === undefined) {
      out.push(`missing depth for ${journey[i - 1]} → ${journey[i]}`);
    } else if (next <= prev) {
      out.push(`${journey[i]} must be deeper than ${journey[i - 1]}`);
    }
  }

  // The tabs are siblings. If one of them drifts to another depth, switching
  // tabs starts animating as progress.
  const tabs = ["home", "calls", "card"].map((n) => CUSTOMER_DEPTH[n]);
  if (new Set(tabs.filter((d) => d !== undefined)).size !== 1) {
    out.push("customer tabs must sit at the same depth as each other");
  }
  const proTabs = ["shift", "earnings", "verify", "profile"].map((n) => PRO_DEPTH[n]);
  if (new Set(proTabs.filter((d) => d !== undefined)).size !== 1) {
    out.push("professional tabs must all sit at the same depth");
  }

  return out;
}
