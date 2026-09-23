/**
 * THE WORLD DIRECTOR — what makes a street feel alive instead of looping.
 *
 * ---------------------------------------------------------------------
 * THE MISTAKE THIS EXISTS TO PREVENT
 * ---------------------------------------------------------------------
 * Amit: *"חייב תנועתיות כלשהי לא תמונה מתה."* He is right, and the obvious
 * response is wrong. ChatGPT named it before anyone built it:
 *
 *   "אם אוטובוס, שלוש מכוניות, שני אנשים, כלב, אופניים, עצים ו-professionals
 *    זזים יחד — נקבל screensaver… החיים מגיעים מאי-סדירות, לא מכמות."
 *
 * A street where everything moves at once does not read as busy. It reads
 * as a loading screen. What reads as alive is a courier passing, then
 * nothing, then a dog walker — irregular, sparse, and never quite the same
 * twice.
 *
 * So motion is scheduled rather than looped. At most two significant things
 * happen at once, plus one or two small ones, and the director refuses to
 * start a second tow truck while the first is still on screen.
 */

/**
 * Something that happens in the world. None of it touches any data.
 *
 * ---------------------------------------------------------------------
 * THE CORRECTION THAT CHANGED THIS LIST
 * ---------------------------------------------------------------------
 * The first version had passing cars, an arriving bus and anonymous
 * pedestrians — city traffic, because "make the street feel alive" sounds
 * like it means traffic. Amit read it and asked the right question:
 *
 *   "מה קשור המכוניות והאוטובוס, איפה שליח איפה משאית קטנה טנדר?"
 *
 * This world is not a traffic simulator. It is the marketplace. A private
 * car crossing the frame says nothing about PRO NOW; a courier on a scooter
 * says the whole thing. So everything significant that moves here is
 * somebody working, and the street is busy because professionals are on
 * their way rather than because a loop is running.
 *
 * The small moments stay ambient — a light, birds, a cat — because a world
 * where every single thing is an employee is its own kind of unreal.
 */
export type WorldMoment =
  /** A courier crossing on a scooter, box on the back. */
  | "COURIER_PASS"
  /** The small removals van. */
  | "MOVER_PASS"
  /** A tow truck, unhurried. */
  | "TOW_PASS"
  /** A dog walker with a dog — a trade in the catalogue, not a resident. */
  | "DOG_WALK"
  | "WINDOW_LIGHT"
  | "BIRDS"
  | "CAT_APPEAR";

/**
 * Significant moments cross the frame and draw the eye. Micro moments are
 * noticed only if you happen to be looking. The budget is counted
 * separately for each, because that distinction is the whole design.
 */
const SIGNIFICANT: ReadonlySet<WorldMoment> = new Set<WorldMoment>([
  "COURIER_PASS",
  "MOVER_PASS",
  "TOW_PASS",
  "DOG_WALK",
]);

export const MOTION_BUDGET = { significant: 2, micro: 2 } as const;

/**
 * How long each moment occupies the world, and how rare it is.
 *
 * Weighted so the street reads as the marketplace it is: couriers are
 * common because short jobs are, a removals van is occasional, and a tow
 * truck is rare.
 */
export const MOMENT_SPEC: Readonly<Record<WorldMoment, { durationMs: number; weight: number }>> = {
  COURIER_PASS: { durationMs: 5200, weight: 30 },
  DOG_WALK: { durationMs: 9000, weight: 18 },
  MOVER_PASS: { durationMs: 7200, weight: 12 },
  // The rarest thing on the street. A tow truck every twenty seconds is a
  // neighbourhood with a problem.
  TOW_PASS: { durationMs: 8000, weight: 5 },
  WINDOW_LIGHT: { durationMs: 2600, weight: 12 },
  BIRDS: { durationMs: 2200, weight: 8 },
  CAT_APPEAR: { durationMs: 4200, weight: 5 },
};

export interface RunningMoment {
  moment: WorldMoment;
  /** When it started, on the same clock passed to `directWorld`. */
  startedAt: number;
  /**
   * How long THIS playing actually lasts, when it is not the table's value.
   *
   * A journey's length is a property of the traveller and the road, not of
   * the moment — a person on foot and a scooter take different times over
   * the same street (see `world-motion.ts`). The director has to cull by
   * the duration being played or the two disagree, and the visible symptom
   * is a figure that arrives at the end of the road and then stands there,
   * motionless, until the table says it may leave.
   */
  durationMs?: number;
}

export interface DirectorDecision {
  /** Moments still playing. */
  running: RunningMoment[];
  /** One new moment to start now, or null for a beat of quiet. */
  start: WorldMoment | null;
}

export const isSignificant = (m: WorldMoment): boolean => SIGNIFICANT.has(m);

/**
 * Decide what the world does next.
 *
 * Pure and deterministic given `roll`, so the pacing can be tested rather
 * than watched. `roll` is a 0..1 value the caller supplies — random in the
 * app, fixed in a test.
 *
 * Returning `start: null` is a real and frequent answer. Quiet is what
 * makes the next courier worth noticing.
 */
export function directWorld(args: {
  now: number;
  running: readonly RunningMoment[];
  roll: number;
  /** Reduced motion: the world holds still and nothing is scheduled. */
  reducedMotion?: boolean;
  /**
   * What the customer is looking for, if anything.
   *
   * Makes that trade's own traffic more likely and nothing else less
   * possible — see `weightFor`. Absent on screens that are not about a
   * particular trade, where the street is simply the street.
   */
  departmentCode?: string | null;
  /**
   * Whether it is dark enough for a light to come on.
   *
   * A window lighting up at one in the afternoon is the small detail that
   * tells you the world is a loop rather than a place — and now that the
   * light over the street is taken from the viewer's own clock
   * (`world-daylight.ts`), a lit window in broad daylight would contradict
   * the sky above it on the same screen.
   *
   * Undefined means "do not know", and the moment stays available: a
   * caller who has not been given a clock should not lose a moment over
   * it.
   */
  lampsLit?: boolean;
}): DirectorDecision {
  const running = args.running.filter(
    (r) => args.now - r.startedAt < (r.durationMs ?? MOMENT_SPEC[r.moment].durationMs)
  );

  if (args.reducedMotion) return { running, start: null };

  const sig = running.filter((r) => isSignificant(r.moment)).length;
  const micro = running.length - sig;

  const candidates = (Object.keys(MOMENT_SPEC) as WorldMoment[]).filter((m) => {
    // Never two of the same thing at once — two identical vehicles crossing
    // together is the single most obvious way to look like a loop.
    if (running.some((r) => r.moment === m)) return false;
    // A light comes on when it gets dark. See `lampsLit`.
    if (m === "WINDOW_LIGHT" && args.lampsLit === false) return false;
    return isSignificant(m) ? sig < MOTION_BUDGET.significant : micro < MOTION_BUDGET.micro;
  });

  if (candidates.length === 0) return { running, start: null };

  const total = candidates.reduce((a, m) => a + weightFor(m, args.departmentCode), 0);
  let n = Math.max(0, Math.min(1, args.roll)) * total;
  for (const m of candidates) {
    n -= weightFor(m, args.departmentCode);
    if (n <= 0) return { running, start: m };
  }
  return { running, start: candidates[candidates.length - 1] ?? null };
}

/**
 * How long to wait before considering the next moment.
 *
 * Irregular on purpose: a fixed cadence is a metronome, and a metronome is
 * the thing the eye learns to predict and then stops seeing.
 */
export function nextBeatMs(roll: number): number {
  const clamped = Math.max(0, Math.min(1, roll));
  return 1800 + Math.round(clamped * 5200);
}

/**
 * WHICH TRADE THE STREET IS BUSY WITH.
 *
 * ---------------------------------------------------------------------
 * THE IDEA, AND WHOSE IT IS
 * ---------------------------------------------------------------------
 * ChatGPT proposed it and it is worth taking: *"לא צריך לדעת רק איזה asset
 * נע, אלא גם לאיזה מחלקה הוא שייך. כשמחפשים שירות לרכב, העולם יכול לתת
 * prominence יותר ל-AUTO."*
 *
 * It costs one weighting and it earns something real. Waiting on a tow
 * truck while a barber's scooter is the only thing moving says the world
 * is scenery running beside your problem. A tow truck going past while you
 * wait for a tow truck says the world is the marketplace you are inside.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A NUDGE AND NOT A FILTER
 * ---------------------------------------------------------------------
 * The temptation is to show only the relevant trade, and that would be
 * worse on both counts. It would read as staged — four tow trucks in
 * ninety seconds is a world performing for you — and it would quietly
 * imply supply: *look how many are out there*, about professionals nobody
 * has counted.
 *
 * So the relevant trade becomes more likely and nothing becomes certain or
 * impossible. The street stays mixed, because a real one is.
 */
const MOMENT_DEPARTMENT: Readonly<Partial<Record<WorldMoment, string>>> = {
  COURIER_PASS: "LOGISTICS",
  MOVER_PASS: "LOGISTICS",
  TOW_PASS: "VEHICLE",
  DOG_WALK: "PETS",
};

/** How much more likely the searched trade's own traffic becomes. */
export const RELEVANCE_BOOST = 3;

export function weightFor(moment: WorldMoment, departmentCode?: string | null): number {
  const base = MOMENT_SPEC[moment].weight;
  if (!departmentCode) return base;
  return MOMENT_DEPARTMENT[moment] === departmentCode ? base * RELEVANCE_BOOST : base;
}
