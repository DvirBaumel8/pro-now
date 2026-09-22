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

/**
 * ---------------------------------------------------------------------
 * HOW LONG A MOVE TAKES — AND WHY IT IS NOT ONE NUMBER
 * ---------------------------------------------------------------------
 * Amit: *"גם את התנועתיות של איתור המקצוען זה זז לא טוב."*
 *
 * Every hop took the same 1100ms no matter how far it was. Measured on
 * the real layout, the hops between eight candidates run from 0.237 to
 * 0.642 of the world across — **a factor of 2.7** — so the camera crawled
 * between neighbouring shops and whip-panned across the far ones, and it
 * did both in the same breath. That is not a camera operator; it is a
 * value being interpolated.
 *
 * A person moving a camera moves it at roughly a constant SPEED and takes
 * longer to cover more ground. So distance decides the duration now.
 *
 * ---------------------------------------------------------------------
 * BUT THE BEAT STILL MATTERS, SO THE SPEED IS NOT PERFECTLY CONSTANT
 * ---------------------------------------------------------------------
 * Travel-settle-travel is a rhythm, and pure constant speed would make
 * one move nearly three times the length of another and break it. The
 * clamp is the compromise and it is deliberate: across that same 2.7x
 * spread of distances the durations vary by at most 1.9x and the speed by
 * about 1.4x. Mostly a constant speed, inside a beat that still reads as
 * a beat.
 *
 * The dwell does NOT vary. The pause is the half that says "looking", and
 * a pause whose length depended on how far you had just come would make
 * the nearest shops feel skimmed.
 */

/**
 * World-widths per millisecond. Set so the median hop on the real layout
 * takes about the 1100ms the whole sweep used to take, which keeps the
 * overall tempo of the search screen where it was.
 */
export const SWEEP_SPEED_PER_MS = 0.00041;
/** No move snappier than this, however close the next shop is. */
export const MIN_TRAVEL_MS = 800;
/** No move slower than this, however far. */
export const MAX_TRAVEL_MS = 1500;
/**
 * The nominal move, for a sweep with nothing to measure — a single venue
 * has no hop, and something still has to be handed to the viewport.
 */
export const TRAVEL_MS = 1100;
/** How long it rests on a venue before moving on. Constant, on purpose. */
export const DWELL_MS = 1500;
/**
 * The nominal visit. Kept because the scene, the tests and the captions
 * all want one number for "about how long a stop lasts" — but the real
 * length of any given visit comes from the schedule below, because the
 * travel half of it now depends on how far the camera had to come.
 */
export const VISIT_MS = TRAVEL_MS + DWELL_MS;

/** How far apart two points on the world plate are. */
function span(a: { u: number; v: number }, b: { u: number; v: number }): number {
  return Math.hypot(b.u - a.u, b.v - a.v);
}

/** The time that move deserves. */
export function travelMsFor(distance: number): number {
  const wanted = distance / SWEEP_SPEED_PER_MS;
  return Math.round(Math.min(MAX_TRAVEL_MS, Math.max(MIN_TRAVEL_MS, wanted)));
}

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

/** One stop, with the move that reaches it and when that move begins. */
export interface ScheduledStop extends SweepStop {
  /** How long the camera takes to arrive here from the previous stop. */
  travelMs: number;
  /** travelMs + DWELL_MS. */
  visitMs: number;
  /** Milliseconds into the lap at which this visit begins. */
  startsAt: number;
}

export interface SweepScheduleResult {
  stops: ScheduledStop[];
  /** One full pass down the street and back to the first shop. */
  lapMs: number;
}

/**
 * The lap, timed.
 *
 * The move that REACHES a stop is the one measured against it, including
 * the first — which is the hop from the last shop back to the first,
 * because the sweep loops and the opening move of the search is the same
 * move it will make again at the end of every lap. Timing it any other
 * way would make the first pass a different shape from every pass after
 * it, and the search screen is up for exactly as long as it takes, which
 * is often more than one lap.
 */
export function sweepSchedule(venues: readonly VirtualVenue[]): SweepScheduleResult {
  const order = sweepOrder(venues);
  if (order.length === 0) return { stops: [], lapMs: 0 };

  const byId = new Map(venues.map((v) => [v.candidateId, v]));
  const anchorOf = (id: string) => byId.get(id)!.worldAnchor;

  let startsAt = 0;
  const stops = order.map((stop, i) => {
    const previous = order[(i - 1 + order.length) % order.length]!;
    // A lone candidate has nowhere to come from; it gets the nominal move
    // rather than a zero-length one, so the camera still settles into it.
    const travelMs =
      order.length === 1 ? TRAVEL_MS : travelMsFor(span(anchorOf(previous.candidateId), anchorOf(stop.candidateId)));
    const visitMs = travelMs + DWELL_MS;
    const at = startsAt;
    startsAt += visitMs;
    return { ...stop, travelMs, visitMs, startsAt: at };
  });

  return { stops, lapMs: startsAt };
}

/**
 * The next moment the frame changes, after `elapsedMs`.
 *
 * The scene sleeps until exactly this rather than polling — see the sweep
 * clock in `LivingMapScene`. With one visit length that was arithmetic on
 * a constant; now that visits differ it has to be looked up, and having
 * the schedule answer it is what keeps the clock and the frame from
 * drifting apart.
 */
export function nextSweepBoundary(venues: readonly VirtualVenue[], elapsedMs: number): number {
  const { stops, lapMs } = sweepSchedule(venues);
  if (stops.length === 0 || lapMs <= 0) return VISIT_MS;
  const t = Math.max(0, elapsedMs);
  const within = t % lapMs;
  const next = stops.find((s) => s.startsAt > within);
  return t + ((next ? next.startsAt : lapMs) - within);
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
  const { stops: scheduled, lapMs } = sweepSchedule(args.venues);
  const t = Math.max(0, args.elapsedMs);
  const within = lapMs > 0 ? t % lapMs : 0;

  // The last stop whose visit has begun. `findLast` keeps this a lookup
  // rather than arithmetic, which is the whole point of the schedule:
  // visits are no longer all the same length, so the index cannot be
  // divided out of the clock any more.
  let stop = scheduled[0]!;
  for (const s of scheduled) {
    if (s.startsAt <= within) stop = s;
    else break;
  }
  const venue = byId.get(stop.candidateId)!;

  return {
    camera: {
      // DISTRICT, not VENUE: the customer has chosen nobody, and the venue
      // shot is the language for "this one". Spending it here would leave
      // the actual choice with nothing to say.
      shot: "DISTRICT",
      focus: { u: venue.worldAnchor.u, v: venue.worldAnchor.v },
      zoom: SWEEP_ZOOM,
      // The move THIS stop deserves. The viewport hard-coded 1200ms and
      // never read this field, so a number computed here for the camera
      // to move by was quietly discarded on the way to the camera.
      durationMs: stop.travelMs,
    },
    candidateId: stop.candidateId,
    travelling: within - stop.startsAt < stop.travelMs,
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
  const { stops } = sweepSchedule(args.venues);
  if (stops.length === 0) return 0;
  const t = Math.max(0, args.elapsedMs);
  // Nothing has been looked at until the camera has FINISHED travelling to
  // a shop. Counting on departure would put a number on screen before
  // anything had happened — and with the moves no longer all the same
  // length, "arrived" has to be asked of each stop rather than divided
  // out of the clock.
  const arrived = stops.filter((s) => t >= s.startsAt + s.travelMs).length;
  return Math.min(stops.length, arrived);
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
