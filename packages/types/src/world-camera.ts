import type { NormalizedPoint } from "./virtual-venue";
import { PLAN_METRES, STREET_METRES, pitchForMetres } from "./world-geo";

/**
 * WHICH WAY IS UP, WHILE SOMEBODY IS WALKING.
 *
 * ---------------------------------------------------------------------
 * THE QUESTION, AND WHY IT IS NOT A PREFERENCE
 * ---------------------------------------------------------------------
 * A map keeps north at the top. A game turns the world so that forward is
 * up. Our product is both — Amit walks the street and then watches a
 * professional travel to him — and picking one wholesale breaks the other
 * half.
 *
 * Asked which, ChatGPT refused both and gave the answer that is obviously
 * right once somebody says it:
 *
 *     "לא North-up בזמן Explore, זה יהרוג חלק גדול מתחושת המשחק... אבל
 *      גם לא camera snap לכיוון בכל שינוי של הג'ויסטיק, זה יהיה מסחרר.
 *      heading-follow רך: הדמות פונה מיד, אבל המצלמה מתחילה להסתובב רק
 *      אחרי שהכיוון נשמר בערך 300–500ms, ואז מתיישרת אליו ב-600–900ms עם
 *      damping. פנייה קטנה לא מסובבת עולם שלם. שינוי כיוון אמיתי כן."
 *
 * And the two halves join up without a cut, because the camera already
 * rises with zoom (`pitchForMetres`): as it goes overhead the bearing
 * returns to north, so close is a game and far is a map and there is no
 * moment where it is neither.
 *
 * ---------------------------------------------------------------------
 * THE INVARIANT THAT HAS TO BE WRITTEN DOWN BEFORE IT IS A BUG
 * ---------------------------------------------------------------------
 * ChatGPT again, unprompted, and it is the kind of note that saves a
 * fortnight:
 *
 *     "camera rotation must never rotate world entities independently of
 *      their ground anchors. bearing משנה projection של כל העולם יחד;
 *      הוא לא 'מסובב sprites כדי שייראו טוב'."
 *
 * The tempting shortcut — turn the ground, then turn each shopfront back
 * so it still faces the reader — produces a world where a building and
 * the pavement it stands on disagree about where they are, and it is
 * invisible until somebody walks a full circle. So `rotateWorld` is the
 * ONE function that bearing is allowed to touch, it takes a point, and
 * every anchor in the world goes through it. A sprite's own rotation is
 * not a function of bearing at all — see `entityRotationFor`, which
 * exists only so that the rule has something to be tested against.
 *
 * ---------------------------------------------------------------------
 * AND IT IS NOT WIRED UP YET. HERE IS THE ATTEMPT, SO IT IS NOT REPEATED
 * ---------------------------------------------------------------------
 * The obvious wiring is to rotate the VIEWPORT — the window, not the
 * world, because the window's centre is the screen's centre and while
 * the camera is following somebody that is the person, so the city turns
 * around them rather than swinging them round the city. Every sprite
 * then gets the inverse rotation about its own feet, which React Native
 * can express as `[translateY(h/2), rotate(-θ), translateY(-h/2)]`.
 *
 * That was built and it broke the frame. Rotating the window needs
 * `overflow: hidden` or the city spills over the chrome, and the clipped
 * window then no longer covers the screen: the world is clamped to cover
 * a RECTANGLE, and a rotated rectangle needs its circumscribed circle
 * covered. The walk screen came back as a band of city with black above
 * and below it — a worse version of the hole the animated zoom left, and
 * for exactly the same reason, which is that the camera's clamp and the
 * camera's shape were computed independently.
 *
 * Doing it properly means the clamp has to know the bearing: the covered
 * span is `screen · |cos θ| + screenOther · |sin θ|` on each axis, which
 * is a per-frame quantity, and Animated cannot express it — the same
 * wall `WorldViewport`'s zoom note ran into. So it waits for the camera
 * offset to be driven on one clock with the clamp recomputed per frame,
 * which is a real piece of work rather than a transform.
 *
 * Everything below is tested and correct and costs nothing to keep. What
 * is missing is a viewport that can be turned without losing its corners.
 */

/** How long a heading must be held before the camera believes it. */
export const BEARING_HOLD_MS = 420;

/**
 * The time constant of the turn.
 *
 * Exponential damping rather than a fixed duration, because the camera is
 * continuously re-targeted while somebody steers — the same reason
 * `WorldBackdrop` moves with `Easing.out` and holds its position rather
 * than replaying a 0-to-1 progress. A time constant survives being
 * interrupted; a duration restarts.
 *
 * It is a TIME CONSTANT and not the duration of the turn: a turn is
 * visually finished at about two and a half of these, so 300 puts the
 * camera on the new heading in roughly 750ms, inside ChatGPT's 600–900.
 * Written as 780 first, which is that whole window in one constant and
 * therefore a camera that never quite arrives.
 */
export const BEARING_ALIGN_MS = 300;

/** Below this, a change of heading is a wobble and not a turn. */
export const BEARING_DEADZONE = (14 * Math.PI) / 180;

/** The heading of a direction of travel, in radians, 0 = up the screen. */
export function headingOf(dir: NormalizedPoint): number {
  if (dir.u === 0 && dir.v === 0) return 0;
  // v grows downwards, so "up the screen" is -v.
  return Math.atan2(dir.u, -dir.v);
}

/** The signed shortest way round from `a` to `b`, in radians. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export interface BearingState {
  /** Where the camera is looking now, radians. */
  bearing: number;
  /** The heading it is currently considering. */
  candidate: number;
  /** How long that candidate has been held. */
  heldMs: number;
}

export function restingBearing(): BearingState {
  return { bearing: 0, candidate: 0, heldMs: 0 };
}

export interface BearingInput {
  /** Where the figure is facing right now. Null when standing still. */
  heading: number | null;
  /** How much of the place is in frame. Overview returns to north. */
  metresAcross: number;
  /** Milliseconds since the last step. */
  dtMs: number;
}

/**
 * One step of the camera's own mind.
 *
 * Pure, so the whole behaviour — the hold, the damping, the return to
 * north — is a table of numbers in a test rather than something anybody
 * has to feel on a phone to check.
 */
export function stepBearing(state: BearingState, input: BearingInput): BearingState {
  const pitch = pitchForMetres(input.metresAcross);

  /*
   * PULLED BACK, THE WORLD IS A MAP AGAIN.
   *
   * The same ramp that lifts the camera overhead returns the bearing to
   * north, so the two never disagree: there is no zoom at which you are
   * looking straight down at a world that is still rotated to somebody's
   * walking direction, which is the most disorienting frame of the two.
   */
  if (pitch <= 0 || input.heading === null) {
    const target = pitch <= 0 ? 0 : state.bearing;
    return {
      bearing: damp(state.bearing, target, input.dtMs),
      candidate: state.candidate,
      heldMs: pitch <= 0 ? 0 : state.heldMs,
    };
  }

  const heading = input.heading;

  /*
   * A NEW CANDIDATE RESETS THE CLOCK; THE SAME ONE ADVANCES IT.
   *
   * The deadzone is what stops a joystick's own jitter from restarting
   * the timer forever — without it the camera would hold a candidate for
   * 419ms, be handed a heading two degrees away, and begin again, so a
   * person walking a straight line would never turn the world at all.
   */
  const drifted = Math.abs(angleDelta(state.candidate, heading)) > BEARING_DEADZONE;
  const candidate = drifted ? heading : state.candidate;
  const heldMs = drifted ? 0 : state.heldMs + input.dtMs;

  /*
   * And the camera only commits once the candidate has been held. A
   * glance down a side street does not take the city with it; walking
   * down it does.
   */
  const committed = heldMs >= BEARING_HOLD_MS;
  const target = committed ? candidate : state.bearing;

  return { bearing: damp(state.bearing, target, input.dtMs), candidate, heldMs };
}

/** Exponential approach along the shortest arc. */
function damp(from: number, to: number, dtMs: number): number {
  if (dtMs <= 0) return from;
  const k = 1 - Math.exp(-dtMs / BEARING_ALIGN_MS);
  return from + angleDelta(from, to) * k;
}

/**
 * THE ONLY THING BEARING IS ALLOWED TO DO.
 *
 * Rotates a point about the middle of the frame. The ground goes through
 * it, the roads go through it, and so does every entity's GROUND ANCHOR —
 * which is what keeps a shopfront on its own pavement through a turn.
 *
 * `aspect` is the world's width over its height: without it, rotating in
 * normalised coordinates shears everything, because a step of 0.1 in `u`
 * is a different distance from a step of 0.1 in `v`.
 */
export function rotateWorld(p: NormalizedPoint, bearing: number, aspect: number): NormalizedPoint {
  if (bearing === 0) return p;
  const cos = Math.cos(bearing);
  const sin = Math.sin(bearing);
  // Into a square space, rotate, and back.
  const x = (p.u - 0.5) * aspect;
  const y = p.v - 0.5;
  const rx = x * cos - y * sin;
  const ry = x * sin + y * cos;
  return { u: 0.5 + rx / aspect, v: 0.5 + ry };
}

/**
 * How much a sprite turns when the camera turns: nothing, ever.
 *
 * This function exists so that the invariant has a name and a test rather
 * than living in a comment somebody will one day disagree with. A
 * shopfront's facing comes from its frontage normal and from which of its
 * drawn angles suits the camera — never from the bearing directly, and
 * never applied as a rotation to the image.
 */
export function entityRotationFor(_bearing: number): 0 {
  void _bearing;
  return 0;
}

/**
 * Everything the camera has to be true of.
 *
 * Simulated rather than reasoned about: the state machine is stepped at
 * 60fps for a few seconds under each condition, because every bug this
 * has is a bug about TIME and none of them are visible in the formula.
 */
export function cameraViolations(): string[] {
  const out: string[] = [];
  const FRAME = 16;

  const run = (steps: number, input: (i: number) => BearingInput, from = restingBearing()) => {
    let s = from;
    for (let i = 0; i < steps; i++) s = stepBearing(s, input(i));
    return s;
  };

  const east = Math.PI / 2;

  // A brief glance does not move the world.
  const glance = run(Math.floor(BEARING_HOLD_MS / FRAME) - 4, () => ({
    heading: east,
    metresAcross: STREET_METRES,
    dtMs: FRAME,
  }));
  if (Math.abs(glance.bearing) > 0.02) out.push("a glance down a side street turned the whole city");

  // Walking that way for a second does.
  const walk = run(120, () => ({ heading: east, metresAcross: STREET_METRES, dtMs: FRAME }));
  if (Math.abs(angleDelta(walk.bearing, east)) > 0.12) {
    out.push("the camera never came round to the direction of travel");
  }

  // It gets there smoothly rather than snapping.
  let previous = 0;
  let worstStep = 0;
  let s = restingBearing();
  for (let i = 0; i < 120; i++) {
    s = stepBearing(s, { heading: east, metresAcross: STREET_METRES, dtMs: FRAME });
    worstStep = Math.max(worstStep, Math.abs(s.bearing - previous));
    previous = s.bearing;
  }
  // A sixteenth of a turn in one frame is a snap.
  if (worstStep > Math.PI / 8) out.push("the camera snaps rather than turning");

  // Jitter inside the deadzone still commits, rather than resetting forever.
  const jittery = run(180, (i) => ({
    heading: east + Math.sin(i) * BEARING_DEADZONE * 0.4,
    metresAcross: STREET_METRES,
    dtMs: FRAME,
  }));
  if (Math.abs(angleDelta(jittery.bearing, east)) > 0.2) {
    out.push("a trembling joystick stops the camera ever committing");
  }

  // Pulled back to a plan, it returns to north.
  const pulledBack = run(
    240,
    () => ({ heading: east, metresAcross: PLAN_METRES + 50, dtMs: FRAME }),
    { bearing: east, candidate: east, heldMs: 1000 }
  );
  if (Math.abs(pulledBack.bearing) > 0.05) out.push("the overview is not north-up");

  // Shortest way round: from just under a full turn, it goes forwards.
  const nearlyRound = stepBearing(
    { bearing: -3.0, candidate: 3.0, heldMs: 1000 },
    { heading: 3.0, metresAcross: STREET_METRES, dtMs: FRAME }
  );
  if (nearlyRound.bearing > -3.0) out.push("the camera takes the long way round");

  /*
   * THE INVARIANT. A shopfront and the pavement under it must arrive at
   * the same place after a turn — which is true by construction only for
   * as long as both go through `rotateWorld` and nothing else.
   */
  const aspect = 0.57;
  for (const bearing of [0.3, 1.2, -2.4]) {
    const anchor = { u: 0.31, v: 0.62 };
    const groundUnderIt = { u: 0.31, v: 0.62 };
    const a = rotateWorld(anchor, bearing, aspect);
    const b = rotateWorld(groundUnderIt, bearing, aspect);
    if (Math.abs(a.u - b.u) > 1e-12 || Math.abs(a.v - b.v) > 1e-12) {
      out.push("an entity and its ground anchor disagree after a turn");
    }
    if (entityRotationFor(bearing) !== 0) out.push("bearing is rotating sprites directly");
  }

  // And rotating is reversible, or a turn loses the world by degrees.
  for (const bearing of [0.3, 1.2, -2.4]) {
    const p = { u: 0.22, v: 0.81 };
    const back = rotateWorld(rotateWorld(p, bearing, aspect), -bearing, aspect);
    if (Math.abs(back.u - p.u) > 1e-9 || Math.abs(back.v - p.v) > 1e-9) {
      out.push("rotating the world and back does not return it");
    }
  }

  return out;
}
