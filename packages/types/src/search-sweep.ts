import type { CameraState, VirtualVenue } from "./virtual-venue";

/**
 * THE SEARCH SWEEP — the camera walking the street, looking.
 *
 * ---------------------------------------------------------------------
 * WHAT AMIT ASKED FOR
 * ---------------------------------------------------------------------
 *   "אני חייב שבזמן חיפוש במפה לבעל מקצוע תהיה תזוזה בין מספרות, לדוגמא,
 *    עד שמוצא. פעילות, חייב עוד תנועות."
 *
 * The waiting screen had life crossing it — a courier, a dog walker, a
 * light coming on — but the *camera* sat perfectly still, and that is what
 * made it read as a picture with animation on it rather than as a search.
 * A still camera says "here is a street." A camera moving from shop to shop
 * says "I am looking for someone," which is the literal truth of what the
 * server is doing in those seconds.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NOT DECORATION, AND WHERE THE LINE IS
 * ---------------------------------------------------------------------
 * Dispatch really does evaluate candidates while this screen is up. So a
 * camera visiting each candidate's venue in turn is a rendering of
 * something happening, not a loading animation dressed as one — and the
 * visits are built from the real candidate list, so the world cannot show
 * four shops while three people are being checked.
 *
 * What it must never do is *report* on a visit. No shop goes dark because
 * someone declined, none gets a tick, none is skipped in a way that says
 * "not this one". That would broadcast one professional's decision to a
 * stranger, and it would also be a lie the moment dispatch re-checks
 * somebody. The camera looks; it does not judge. `sweepViolations` below
 * turns that into a test rather than a paragraph nobody reads.
 *
 * ---------------------------------------------------------------------
 * THE SHAPE OF THE MOVE
 * ---------------------------------------------------------------------
 * Travel, settle, travel — never a constant glide. A camera panning at a
 * steady speed is a screensaver again; a camera that arrives somewhere,
 * holds long enough for you to see a shop, and then moves on is somebody
 * searching. `TRAVEL_MS` is the move, `DWELL_MS` is the pause, and the
 * pause is the longer of the two on purpose.
 */

/** How long the camera takes to travel from one venue to the next. */
export const TRAVEL_MS = 1100;
/** How long it rests on a venue before moving on. */
export const DWELL_MS = 1500;
/** One full visit: arrive, look, leave. */
export const VISIT_MS = TRAVEL_MS + DWELL_MS;

/**
 * How close the camera gets while sweeping.
 *
 * Expressed as a CameraState zoom for compatibility; what actually decides
 * how much world is on screen is `worldZoomFor(shot)`, because only the
 * neighbourhood knows how big it is. See the note there — reading this
 * number as "how far away the camera is" is the exact mistake that left the
 * search screen showing a van and some tarmac.
 *
 * Nearer than the wide shot, further than the venue shot the customer gets
 * when they choose one. The sweep is a look down the street, not an
 * inspection — and keeping it short of `VENUE` leaves the push-in at the
 * end of the search somewhere to go.
 */
export const SWEEP_ZOOM = 1.28;

export interface SweepStop {
  /** The venue being looked at. */
  candidateId: string;
  /** Index in the sweep order, from 0. */
  order: number;
}

/**
 * The order the camera visits venues in: down the street.
 *
 * ---------------------------------------------------------------------
 * TWO EARLIER VERSIONS, AND WHY THIS IS THE RIGHT ONE
 * ---------------------------------------------------------------------
 * It sorted by `u` when the world was a street, then by angle when the
 * world was a plaza. Both were the same instinct — follow the shape of the
 * world — and the shape is now a street through a neighbourhood, so the
 * sweep follows it from the near end to the far one.
 *
 * That also makes the loop mean something. Reaching the far end and
 * starting again is a search still running, not an animation repeating,
 * because the customer has visibly been past every shop in between.
 *
 * What has not changed is the part that matters for honesty: the order
 * comes from where the venues stand and from nothing about the people. An
 * order derived from rating, distance or likelihood would be a ranking on
 * screen in a phase where nothing has been ranked.
 */
export function sweepOrder(venues: readonly VirtualVenue[]): SweepStop[] {
  return [...venues]
    .sort(
      (a, b) =>
        a.worldAnchor.v - b.worldAnchor.v ||
        a.worldAnchor.u - b.worldAnchor.u ||
        a.candidateId.localeCompare(b.candidateId)
    )
    .map((v, order) => ({ candidateId: v.candidateId, order }));
}

export interface SweepFrame {
  camera: CameraState;
  /** Which venue is being looked at right now, if any. */
  candidateId: string | null;
  /** True while travelling, false while resting on a venue. */
  travelling: boolean;
}

/**
 * Where the camera is, `elapsedMs` into the search.
 *
 * Pure: the same elapsed time always gives the same frame, so the sweep is
 * tested by asserting frames rather than by watching the screen and
 * deciding it looks about right.
 *
 * It loops. A search that runs longer than one pass down the street starts
 * again from the beginning rather than stopping on the last shop, because a
 * camera that parks is a camera that has finished, and it has not.
 */
export function sweepFrame(args: {
  venues: readonly VirtualVenue[];
  elapsedMs: number;
  /** Reduced motion: the camera holds a wide, still shot. */
  reducedMotion?: boolean;
}): SweepFrame {
  const stops = sweepOrder(args.venues);

  if (stops.length === 0 || args.reducedMotion) {
    return { camera: { shot: "WIDE", focus: { u: 0.5, v: 0.5 }, zoom: 1 }, candidateId: null, travelling: false };
  }

  const byId = new Map(args.venues.map((v) => [v.candidateId, v]));
  const t = Math.max(0, args.elapsedMs);
  const index = Math.floor(t / VISIT_MS) % stops.length;
  const within = t % VISIT_MS;

  const stop = stops[index]!;
  const venue = byId.get(stop.candidateId)!;

  return {
    camera: {
      // DISTRICT, not VENUE: the customer has chosen nobody, and the venue
      // shot is the language for "this one". Spending it here would leave
      // the actual choice with nothing to say.
      shot: "DISTRICT",
      focus: { u: venue.worldAnchor.u, v: venue.worldAnchor.v },
      zoom: SWEEP_ZOOM,
      durationMs: TRAVEL_MS,
    },
    candidateId: stop.candidateId,
    travelling: within < TRAVEL_MS,
  };
}

/**
 * How many venues the camera has visited at least once.
 *
 * For a caption, and a deliberately modest one — it says how much of the
 * street has been looked at, never how many people said yes. Returns 0
 * before the first arrival so nothing is claimed in the first second.
 */
export function sweptCount(args: { venues: readonly VirtualVenue[]; elapsedMs: number }): number {
  const total = sweepOrder(args.venues).length;
  if (total === 0) return 0;
  // Nothing has been looked at until the camera has finished travelling to
  // the first shop. Counting it on departure would put a number on screen
  // before anything had happened.
  if (args.elapsedMs < TRAVEL_MS) return 0;
  const arrived = Math.floor((args.elapsedMs - TRAVEL_MS) / VISIT_MS) + 1;
  return Math.min(total, arrived);
}

/**
 * Everything wrong with a sweep.
 *
 * The first two are the rules that matter: the camera may only look at
 * venues that exist, and it must visit every one of them. A sweep that
 * silently skipped a candidate would be showing the customer a shorter
 * search than the one actually running.
 */
export function sweepViolations(args: {
  stops: readonly SweepStop[];
  venues: readonly VirtualVenue[];
}): string[] {
  const v: string[] = [];
  const ids = new Set(args.venues.map((x) => x.candidateId));
  const seen = new Set<string>();

  for (const s of args.stops) {
    if (!ids.has(s.candidateId)) {
      v.push(`The sweep looks at "${s.candidateId}", which is not one of the candidates. Supply is never invented.`);
    }
    if (seen.has(s.candidateId)) v.push(`"${s.candidateId}" is visited twice in one pass.`);
    seen.add(s.candidateId);
  }

  for (const id of ids) {
    if (!seen.has(id)) v.push(`"${id}" is being checked but the camera never looks there.`);
  }

  return v;
}
