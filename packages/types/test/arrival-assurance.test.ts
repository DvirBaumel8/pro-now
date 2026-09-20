import { describe, expect, it } from "vitest";

import {
  assessArrival,
  arrivalDetailHe,
  arrivalHeadlineHe,
  PILOT_ARRIVAL_TOLERANCE,
  type ArrivalSignals,
} from "../src/arrival-assurance";

/**
 * These tests are about one promise: THE CUSTOMER IS NEVER THE ONE WHO
 * FINDS OUT.
 *
 * The competitor's answer to "he didn't arrive" is that you telephone him
 * yourself. Every assertion here is a way that answer could creep back in —
 * a state that stays ON_ROUTE when it shouldn't, an ETA that survives the
 * data it was derived from, a rematch that silently re-asks for everything.
 */

const NOW = 1_700_000_000_000;
const base = (over: Partial<ArrivalSignals> = {}): ArrivalSignals => ({
  promisedArrivalMs: NOW + 5 * 60_000,
  lastLocationMs: NOW - 10_000,
  nowMs: NOW,
  ...over,
});

describe("while things are going well", () => {
  it("is ON_ROUTE before the promised time and says nothing", () => {
    const a = assessArrival(base());
    expect(a.phase).toBe("ON_ROUTE");
    expect(a.shouldNotify).toBe(false);
    expect(arrivalDetailHe(a)).toBeNull();
  });

  it("tolerates small slippage without crying wolf", () => {
    // Four minutes late, tolerance is five. Traffic makes every ETA
    // slightly wrong; an alarm at sixty seconds trains people to ignore it.
    const a = assessArrival(base({ promisedArrivalMs: NOW - 4 * 60_000 }));
    expect(a.phase).toBe("ON_ROUTE");
    expect(a.shouldNotify).toBe(false);
  });

  it("reports how late it is even while still ON_ROUTE", () => {
    expect(assessArrival(base({ promisedArrivalMs: NOW - 4 * 60_000 })).minutesLate).toBe(4);
  });
});

describe("when the promise slips", () => {
  it("becomes DELAYED at the tolerance and notifies", () => {
    const a = assessArrival(base({ promisedArrivalMs: NOW - 5 * 60_000 }));
    expect(a.phase).toBe("DELAYED");
    expect(a.risk).toBe("ETA_EXCEEDED");
    expect(a.shouldNotify).toBe(true);
  });

  it("escalates to ARRIVAL_AT_RISK, which is a different sentence", () => {
    const late = assessArrival(base({ promisedArrivalMs: NOW - 5 * 60_000 }));
    const risk = assessArrival(base({ promisedArrivalMs: NOW - 12 * 60_000 }));
    expect(risk.phase).toBe("ARRIVAL_AT_RISK");
    // "מתעכב" asks the customer to wait. The escalation must not.
    expect(arrivalHeadlineHe(risk)).not.toBe(arrivalHeadlineHe(late));
  });

  it("names the delay in minutes rather than saying 'soon'", () => {
    const a = assessArrival(base({ promisedArrivalMs: NOW - 7 * 60_000 }));
    expect(arrivalDetailHe(a)).toContain("7");
  });
});

describe("a route we cannot see is not a route", () => {
  it("goes AT_RISK when the position goes stale, even if the clock is fine", () => {
    /*
     * The seductive failure: the ETA still says four minutes, and it is a
     * real number — it is just no longer about anything, because the
     * position it was derived from is three minutes old.
     */
    const a = assessArrival(
      base({
        promisedArrivalMs: NOW + 4 * 60_000,
        lastLocationMs: NOW - (PILOT_ARRIVAL_TOLERANCE.locationStaleAfterSeconds + 1) * 1000,
      })
    );
    expect(a.phase).toBe("ARRIVAL_AT_RISK");
    expect(a.risk).toBe("LOCATION_STALE");
    expect(arrivalDetailHe(a)).toContain("הפסקנו להציג זמן הגעה");
  });

  it("stays ON_ROUTE while the position is merely a little old", () => {
    const a = assessArrival(
      base({
        lastLocationMs: NOW - (PILOT_ARRIVAL_TOLERANCE.locationStaleAfterSeconds - 5) * 1000,
      })
    );
    expect(a.phase).toBe("ON_ROUTE");
  });

  it("does not require a location to function at all", () => {
    // A professional whose app has not reported yet is not a failure.
    expect(assessArrival(base({ lastLocationMs: null })).phase).toBe("ON_ROUTE");
  });
});

describe("when he is gone", () => {
  it("outranks lateness — how late he was stops being the point", () => {
    const a = assessArrival(base({ promisedArrivalMs: NOW - 30 * 60_000, proGone: true }));
    expect(a.phase).toBe("RECOVERY");
    expect(a.risk).toBe("PRO_CANCELLED");
  });

  it("tells the customer there is nothing for them to do", () => {
    const a = assessArrival(base({ proGone: true }));
    expect(arrivalDetailHe(a)).toContain("לא צריך לעשות כלום");
  });

  it("moves to REMATCHING while dispatch searches", () => {
    expect(assessArrival(base({ proGone: true, searchingReplacement: true })).phase).toBe(
      "REMATCHING"
    );
  });

  it("promises the brief survives, because re-asking is where people leave", () => {
    const a = assessArrival(base({ searchingReplacement: true }));
    expect(arrivalDetailHe(a)).toContain("לא צריך למלא שוב");
  });

  it("lets a found replacement outrank an in-flight search", () => {
    /*
     * Without this ordering, a race between "searching" and "assigned"
     * leaves the screen saying we are looking after someone has already
     * accepted — which is the same class of lie as a stale ETA.
     */
    const a = assessArrival(base({ searchingReplacement: true, replacementAssigned: true }));
    expect(a.phase).toBe("NEW_PRO_ASSIGNED");
    expect(a.risk).toBeNull();
  });
});

describe("the honest dead end", () => {
  it("says there is nobody, and refuses to invent a time", () => {
    const a = assessArrival(base({ proGone: true, replacementImpossible: true }));
    expect(a.phase).toBe("RECOVERY");
    expect(a.risk).toBe("NO_REPLACEMENT");
    const detail = arrivalDetailHe(a) ?? "";
    expect(detail).toContain("לא נמציא זמן הגעה");
    // And it must not soften into "any minute now".
    expect(detail).not.toContain("עוד רגע");
  });
});

describe("what the customer is told", () => {
  it("never claims he is on his way once he is not", () => {
    const broken: ArrivalSignals[] = [
      base({ proGone: true }),
      base({ searchingReplacement: true }),
      base({ proGone: true, replacementImpossible: true }),
      base({ lastLocationMs: NOW - 10 * 60_000 }),
    ];
    for (const s of broken) {
      const headline = arrivalHeadlineHe(assessArrival(s), "דניאל");
      expect(headline).not.toContain("בדרך אליכם");
    }
  });

  it("uses the professional's name when there is one, and a noun when not", () => {
    const a = assessArrival(base());
    expect(arrivalHeadlineHe(a, "דניאל")).toContain("דניאל");
    expect(arrivalHeadlineHe(a)).not.toContain("undefined");
  });

  it("notifies on every phase that is not ON_ROUTE", () => {
    const changed: ArrivalSignals[] = [
      base({ promisedArrivalMs: NOW - 6 * 60_000 }),
      base({ promisedArrivalMs: NOW - 20 * 60_000 }),
      base({ proGone: true }),
      base({ searchingReplacement: true }),
      base({ replacementAssigned: true }),
    ];
    for (const s of changed) expect(assessArrival(s).shouldNotify).toBe(true);
  });
});
