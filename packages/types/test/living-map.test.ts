import { describe, expect, it } from "vitest";

import {
  DEMO_WORLD,
  foundHeadlineHe,
  journeyMayAnimate,
  livingMapViolations,
  matchFactsHe,
  searchingDetailHe,
  themeForDepartment,
  type CandidatePresence,
  type LivingMapState,
} from "../src/living-map";

/**
 * These tests guard the three invariants the Living Map is built on. Every
 * one of them is easy to break with a change that reads as harmless — a
 * third bubble "so the ring looks better", a position "just for the demo",
 * a route drawn before there is a maps provider — and every one of those is
 * a claim about where real people are.
 */

const candidate = (over: Partial<CandidatePresence> = {}): CandidatePresence => ({
  candidateId: "cand-1",
  displayNameHe: "דוגמה",
  professionHe: "ספר עד הבית",
  photoUri: null,
  ratingAverage: null,
  ratingCount: 0,
  completedJobs: null,
  state: "ELIGIBLE",
  ...over,
});

const state = (over: Partial<LivingMapState> = {}): LivingMapState => ({
  phase: "SEARCHING",
  theme: "HAIR",
  adapter: DEMO_WORLD,
  candidates: [],
  journey: null,
  ...over,
});

describe("only real candidates may be drawn", () => {
  it("rejects a candidate with no id", () => {
    const v = livingMapViolations(state({ candidates: [candidate({ candidateId: " " })] }));
    expect(v.join(" ")).toContain("only real candidates");
  });

  it("accepts an empty ring — nobody found yet is an honest picture", () => {
    expect(livingMapViolations(state())).toEqual([]);
  });
});

describe("the match is singular", () => {
  it("refuses two chosen candidates", () => {
    const v = livingMapViolations(
      state({
        phase: "MATCH_REVEAL",
        candidates: [
          candidate({ candidateId: "a", state: "CHOSEN" }),
          candidate({ candidateId: "b", state: "CHOSEN" }),
        ],
      })
    );
    expect(v.join(" ")).toContain("singular");
  });

  it("refuses a reveal with nobody chosen", () => {
    const v = livingMapViolations(state({ phase: "MATCH_REVEAL", candidates: [candidate()] }));
    expect(v.join(" ")).toContain("MATCH_REVEAL without exactly one");
  });

  it("refuses a chosen candidate while still searching", () => {
    const v = livingMapViolations(
      state({ candidates: [candidate({ state: "CHOSEN" })] })
    );
    expect(v.join(" ")).toContain("still SEARCHING");
  });
});

describe("a journey requires an assignment", () => {
  it("refuses a route phase with no journey", () => {
    const v = livingMapViolations(
      state({ phase: "ASSIGNED_ROUTE", candidates: [candidate({ state: "CHOSEN" })] })
    );
    expect(v.join(" ")).toContain("without a journey");
  });

  it("refuses a journey with no assignmentId", () => {
    const v = livingMapViolations(
      state({
        phase: "ASSIGNED_ROUTE",
        adapter: { ...DEMO_WORLD, kind: "GOOGLE_MAPS", illustrativeOnly: false },
        journey: { assignmentId: "", latestFix: null, previousFix: null },
      })
    );
    expect(v.join(" ")).toContain("requires an assignment");
  });

  it("refuses a journey outside the route phase", () => {
    const v = livingMapViolations(
      state({ journey: { assignmentId: "job-1", latestFix: null, previousFix: null } })
    );
    expect(v.join(" ")).toContain("belongs only to an assigned job");
  });

  it("refuses a real position on the illustrated world", () => {
    /*
     * The seductive one. The demo world looks like a map, so dropping a
     * real fix onto it "just to see the marker" produces a screen that is
     * pure fiction and completely convincing.
     */
    const v = livingMapViolations(
      state({
        phase: "ASSIGNED_ROUTE",
        journey: {
          assignmentId: "job-1",
          latestFix: { lat: 32.1, lng: 34.8, observedAtMs: 1, accuracyMetres: 20, routeProgress: 0.4 },
          previousFix: null,
        },
      })
    );
    expect(v.join(" ")).toContain("no geography to place it in");
  });
});

describe("the marker never guesses", () => {
  it("will not animate from a single fix", () => {
    const fix = { lat: 32.1, lng: 34.8, observedAtMs: 1, accuracyMetres: 20, routeProgress: 0.4 };
    expect(journeyMayAnimate({ assignmentId: "j", latestFix: fix, previousFix: null })).toBe(false);
  });

  it("will not animate with no fixes at all", () => {
    expect(journeyMayAnimate({ assignmentId: "j", latestFix: null, previousFix: null })).toBe(false);
  });

  it("animates only between two confirmed observations", () => {
    const a = { lat: 32.1, lng: 34.8, observedAtMs: 1, accuracyMetres: 20, routeProgress: 0.2 };
    const b = { ...a, observedAtMs: 2, routeProgress: 0.4 };
    expect(journeyMayAnimate({ assignmentId: "j", latestFix: b, previousFix: a })).toBe(true);
  });
});

describe("the plural is only used when it is true", () => {
  it("says nothing when nobody is eligible yet", () => {
    expect(foundHeadlineHe([candidate({ state: "CHECKING" })])).toBeNull();
  });

  it("uses the singular for one", () => {
    expect(foundHeadlineHe([candidate()])).toBe("מצאנו התאמה זמינה");
  });

  it("counts only eligible and chosen, never those ruled out", () => {
    const list = [
      candidate({ candidateId: "a" }),
      candidate({ candidateId: "b" }),
      candidate({ candidateId: "c", state: "RULED_OUT" }),
      candidate({ candidateId: "d", state: "CHECKING" }),
    ];
    expect(foundHeadlineHe(list)).toBe("מצאנו 2 התאמות זמינות");
  });
});

describe("the searching line moves on events, not on a clock", () => {
  it("starts with availability", () => {
    expect(searchingDetailHe({ checkingEligibility: false, anyCandidateSeen: false })).toBe(
      "בודקים זמינות באזור שלך"
    );
  });

  it("advances only once something real happened", () => {
    expect(searchingDetailHe({ checkingEligibility: true, anyCandidateSeen: false })).toBe(
      "בודקים מי מתאים לבקשה שלך"
    );
    expect(searchingDetailHe({ checkingEligibility: false, anyCandidateSeen: true })).toBe(
      "בודקים מי מתאים לבקשה שלך"
    );
  });
});

describe("a department summons a world", () => {
  it("maps the pilot departments", () => {
    expect(themeForDepartment("BEAUTY")).toBe("HAIR");
    expect(themeForDepartment("VEHICLE")).toBe("AUTO");
    expect(themeForDepartment("PETS")).toBe("PETS");
    expect(themeForDepartment("APPLIANCES")).toBe("ELECTRICAL");
  });

  it("falls back to HOME rather than throwing on an unknown one", () => {
    expect(themeForDepartment("SOMETHING_NEW")).toBe("HOME");
  });
});

describe("matchFactsHe", () => {
  const facts = (over: Partial<Pick<CandidatePresence, "ratingAverage" | "ratingCount" | "completedJobs">>) =>
    matchFactsHe({ ratingAverage: null, ratingCount: 0, completedJobs: null, ...over });

  it("renders a rating and a job count when both are real", () => {
    expect(facts({ ratingAverage: 4.85, ratingCount: 214, completedJobs: 680 })).toBe("★ 4.9 (214) · 680 עבודות");
  });

  it("says nothing at all when the server has nothing", () => {
    expect(facts({})).toBeNull();
  });

  it("refuses to show an average with no reviews behind it", () => {
    // A rating that arrived without a count is not a rating, and rounding
    // it up to one would be inventing a trust score (/CLAUDE.md §3).
    expect(facts({ ratingAverage: 5, ratingCount: 0 })).toBeNull();
  });

  it("shows jobs alone for a professional with no average yet", () => {
    expect(facts({ completedJobs: 4 })).toBe("4 עבודות");
  });

  it("rounds a half up rather than down into a float artefact", () => {
    expect(facts({ ratingAverage: 4.85, ratingCount: 9 })).toBe("★ 4.9 (9)");
    expect(facts({ ratingAverage: 4.84, ratingCount: 9 })).toBe("★ 4.8 (9)");
  });

  it("omits a zero job count rather than printing it", () => {
    expect(facts({ ratingAverage: 4.6, ratingCount: 21, completedJobs: 0 })).toBe("★ 4.6 (21)");
  });
});
