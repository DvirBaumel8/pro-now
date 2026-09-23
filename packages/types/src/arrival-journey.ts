/**
 * THE JOURNEY TO A PROFESSIONAL — one camera move, seven beats.
 *
 * ---------------------------------------------------------------------
 * WHOSE SPEC THIS IS
 * ---------------------------------------------------------------------
 * Amit asked for the shape:
 *
 *     "רוצה שיקח אותי בזום אווט לבית העסק הרצוי, ואז זום אין לבית העסק,
 *      שפותח כרטיס מקצוען עם הפרטים והאימותים."
 *
 * and asked that ChatGPT direct the timing rather than my interpreting it.
 * The numbers below are its answer, implemented as given rather than
 * approximated, with one instruction carried over exactly because it is the
 * part most likely to be "optimised" away later:
 *
 *     "לא לעשות zoom-out → עצירה → pan → עצירה → zoom-in; זה ירגיש כמו
 *      מצגת. זו תנועת מצלמה אחת עם שלושה beats."
 *
 * So this is not three animations in a row. It is one continuous move whose
 * rate changes: pulling back, drifting, then closing in. The two near-stops
 * are near-stops, not pauses — the camera never actually holds still until
 * it arrives.
 *
 * ---------------------------------------------------------------------
 * THE BEAT THAT LOOKS LIKE WASTE AND IS NOT
 * ---------------------------------------------------------------------
 * `ARRIVAL_HOLD` is 150ms in which nothing happens: the camera has stopped
 * and the card has not yet appeared. It will look, to anyone reading a
 * performance budget, like 150ms to save.
 *
 * It is the whole point of the sequence. Without it the card arrives while
 * the journey is still resolving and steals the moment the journey existed
 * to create — you never see that you got somewhere. ChatGPT flagged exactly
 * this: *"אחרת הכרטיס גונב את הרגע לפני שהמסע הסתיים."* `journeyViolations`
 * turns that into a failing test rather than a comment, so removing it
 * breaks the build instead of quietly breaking the feeling.
 */

export type JourneyBeat =
  /** The input collapses into a small HUD. The world does not move yet. */
  | "SEARCH_REACT"
  /** Pulling back to the whole neighbourhood, with a drift toward centre. */
  | "WIDE_OUT"
  /** A near-stop. The chosen place lights, once and softly. */
  | "ORIENT"
  /** Travelling the streets, the zoom already beginning to rise. */
  | "TRAVEL"
  /** Closing on the venue until it is most of the frame. */
  | "VENUE_IN"
  /** Arrived, and nothing else yet. */
  | "ARRIVAL_HOLD"
  /**
   * INSIDE.
   *
   * Amit: *"ביקשתי שמזהה מקצוען פנוי שייכנס לתוך החנות שלו ממש בזום אין,
   * בשביל לראות את כל הפרטים של החנות מבפנים. ממש שינוי מצלמה לתוך
   * החנות, שינוי פריים, לא להישאר באותו עמוד."*
   *
   * The journey ended at the shopfront: the building filled the frame
   * and the card rose over the street. That is arriving AT a business,
   * and he is asking to arrive IN one — which is a different picture,
   * not a closer one. Scaling a façade up only makes the glass bigger.
   *
   * So there is a beat for crossing the threshold, and it draws the
   * trade's own interior (`venueInteriorAssetId`). Where that art has
   * not been made yet the beat is SKIPPED rather than faked: the journey
   * is the one it always was, and nothing pretends to be an inside.
   */
  | "INTERIOR"
  /** The card rises. */
  | "CARD_IN"
  /** Settled. */
  | "SETTLED";

export interface BeatSpec {
  beat: JourneyBeat;
  /** Milliseconds from the tap. */
  startMs: number;
  durationMs: number;
}

/*
 * THE WHOLE MOVE STILL LANDS INSIDE THREE SECONDS.
 *
 * That ceiling is a product rule with a test behind it — this is an app
 * somebody opens because their kitchen is flooding — so the threshold
 * beat is paid for rather than added on top. Forty milliseconds come off
 * the pull-back and forty off the travel, both of which are long enough
 * to give them and neither of which is the moment anybody remembers.
 */
export const JOURNEY: readonly BeatSpec[] = [
  { beat: "SEARCH_REACT", startMs: 0, durationMs: 180 },
  { beat: "WIDE_OUT", startMs: 180, durationMs: 560 },
  { beat: "ORIENT", startMs: 740, durationMs: 120 },
  { beat: "TRAVEL", startMs: 860, durationMs: 860 },
  { beat: "VENUE_IN", startMs: 1720, durationMs: 500 },
  { beat: "ARRIVAL_HOLD", startMs: 2220, durationMs: 150 },
  /*
   * Crossing the threshold. Short, because it is a cut with a fade over
   * it rather than a move: the camera does not travel through a wall,
   * the picture changes to the one on the other side of it.
   */
  { beat: "INTERIOR", startMs: 2370, durationMs: 320 },
  { beat: "CARD_IN", startMs: 2690, durationMs: 300 },
];

/** Tap to card-at-rest. Long enough to have travelled, short enough to be a marketplace. */
export const JOURNEY_TOTAL_MS = 2990;

/** The way back: the same move, faster, because the place is now familiar. */
export const RETURN = {
  /** The card goes down. */
  cardOutMs: 220,
  /** The camera pulls back to the district, overlapping the card's exit. */
  cameraStartMs: 120,
  cameraDurationMs: 600,
  /**
   * And it stops at the DISTRICT, not at WIDE.
   *
   * Closing a profile leaves you standing in the street you were in, beside
   * the other candidates, so the next one is a drag away. Returning to the
   * wide shot would make every comparison start the journey again —
   * ChatGPT: *"כך הוא יכול לגרור מיד למספרה הבאה."* Only a second back
   * goes out to WIDE.
   */
  restsAt: "DISTRICT" as const,
  wideOutMs: 650,
};

/** How the card sits when it has arrived. */
export const CARD_REST = {
  /**
   * Share of screen height. Deliberately not the 78% a quote sheet takes:
   * the street and the top of the venue stay visible behind it, because the
   * point of the journey was to be somewhere.
   */
  heightShare: 0.4,
  /** The world dims, but is never blurred away. */
  scrimOpacity: 0.14,
} as const;

export function beatAt(elapsedMs: number): JourneyBeat {
  if (elapsedMs >= JOURNEY_TOTAL_MS) return "SETTLED";
  for (let i = JOURNEY.length - 1; i >= 0; i--) {
    if (elapsedMs >= JOURNEY[i]!.startMs) return JOURNEY[i]!.beat;
  }
  return "SEARCH_REACT";
}

/** Which shot the camera is holding during a beat. */
export function shotForBeat(beat: JourneyBeat): "WIDE" | "DISTRICT" | "VENUE" | "INSIDE" {
  switch (beat) {
    case "SEARCH_REACT":
    case "WIDE_OUT":
    case "ORIENT":
      return "WIDE";
    case "TRAVEL":
      return "DISTRICT";
    /*
     * Past the threshold the camera is not looking at the street at all,
     * so the shot is not a zoom on it. Callers with no interior art for
     * this trade treat INSIDE as VENUE and the journey is unchanged —
     * see `interiorBeat`.
     */
    case "INTERIOR":
    case "CARD_IN":
    case "SETTLED":
      return "INSIDE";
    default:
      return "VENUE";
  }
}

/** When the threshold is crossed, for a caller that has the art to cross it. */
export function interiorBeat(): BeatSpec {
  return JOURNEY.find((b) => b.beat === "INTERIOR")!;
}

/** Are we inside yet? False for every trade with no interior drawn. */
export function isInside(elapsedMs: number, hasInterior: boolean): boolean {
  return hasInterior && elapsedMs >= interiorBeat().startMs;
}

/**
 * May the profile card be on screen yet?
 *
 * The rule ChatGPT asked to be enforced rather than remembered: *"FocusSheet
 * cannot become visible before cameraState === VENUE && arrivalHoldCompleted
 * === true."*
 */
export function cardMayShow(elapsedMs: number): boolean {
  return elapsedMs >= JOURNEY.find((b) => b.beat === "CARD_IN")!.startMs;
}

/**
 * Everything wrong with a journey timeline.
 *
 * Mostly guarding against a future edit rather than a current bug: the
 * beats must stay contiguous, the arrival hold must survive, and the card
 * must not be allowed to appear before the camera has stopped.
 */
export function journeyViolations(beats: readonly BeatSpec[] = JOURNEY): string[] {
  const v: string[] = [];

  let expected = 0;
  for (const b of beats) {
    if (b.startMs !== expected) {
      v.push(`"${b.beat}" starts at ${b.startMs}ms but the previous beat ends at ${expected}ms; the move must be continuous.`);
    }
    if (b.durationMs <= 0) v.push(`"${b.beat}" has no duration.`);
    expected = b.startMs + b.durationMs;
  }
  if (expected !== JOURNEY_TOTAL_MS) {
    v.push(`The beats total ${expected}ms but the journey claims ${JOURNEY_TOTAL_MS}ms.`);
  }

  const hold = beats.find((b) => b.beat === "ARRIVAL_HOLD");
  if (!hold || hold.durationMs < 150) {
    v.push(
      "The arrival hold is gone or shortened. It is the beat where the customer sees they have arrived; without it the card steals the moment the journey existed to create."
    );
  }

  const card = beats.find((b) => b.beat === "CARD_IN");
  if (card && hold && card.startMs < hold.startMs + hold.durationMs) {
    v.push("The card starts before the arrival hold finishes.");
  }
  if (card && shotForBeat(beatAt(card.startMs)) === "WIDE") {
    v.push("The card starts before the camera has reached the venue.");
  }

  /*
   * The threshold is crossed after the arrival is felt and before the
   * card covers it. Either way round and one of the two moments eats
   * the other: a card rising over a street that is about to be replaced,
   * or an interior nobody registered arriving at.
   */
  const inside = beats.find((b) => b.beat === "INTERIOR");
  if (inside && hold && inside.startMs < hold.startMs + hold.durationMs) {
    v.push("The camera goes inside before the arrival hold finishes.");
  }
  if (inside && card && card.startMs < inside.startMs + inside.durationMs) {
    v.push("The card rises before the camera is through the door.");
  }

  return v;
}
