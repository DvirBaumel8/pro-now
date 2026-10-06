import { describe, expect, it } from "vitest";
import { livingMapViolations, type JobMatchView } from "@pro-now/types";

import { liveEtaClock, matchRevealState, onTheWayState, revealFigure } from "./matchReveal";

const professional = {
  id: "pro-1",
  displayName: "דנה",
  proNowRatingAverage: null,
  proNowRatingCount: 0,
  proNowCompletedJobs: 0,
} as unknown as JobMatchView["professional"];

describe("the reveal of who is coming", () => {
  it("is the one assigned professional, chosen, and nothing invented", () => {
    const state = matchRevealState({ professional }, "HOME_URGENT", "נזילה או דליפת מים", "/world/character_home_icon.webp");
    expect(livingMapViolations(state)).toEqual([]);
    expect(state.phase).toBe("MATCH_REVEAL");
    expect(state.candidates).toHaveLength(1);
    expect(state.candidates[0]).toMatchObject({
      candidateId: "pro-1",
      displayNameHe: "דנה",
      professionHe: "נזילה או דליפת מים",
      state: "CHOSEN",
      // A new professional stays new: no rating made up.
      ratingAverage: null,
      ratingCount: 0,
    });
    expect(state.journey).toBeNull();
  });

  it("shows the face they chose in the doorway: the character at full length, a photo in a ring", () => {
    expect(revealFigure("/world/character_home_icon.webp", true)).toEqual({ uri: "/world/character_home_world.webp", round: false });
    expect(revealFigure("https://media/p.jpg", false)).toEqual({ uri: "https://media/p.jpg", round: true });
    expect(revealFigure(null, false)).toBeNull();
  });
});

describe("on the way, in the street", () => {
  it("is the one assignment on its way, with no position drawn", () => {
    const state = onTheWayState({ jobId: "job-1", professional }, "HOME_URGENT", "נזילה או דליפת מים", null);
    expect(livingMapViolations(state)).toEqual([]);
    expect(state.phase).toBe("ASSIGNED_ROUTE");
    expect(state.journey).toEqual({ assignmentId: "job-1:pro-1", latestFix: null, previousFix: null });
    expect(state.candidates.map((c) => c.state)).toEqual(["CHOSEN"]);
  });

  it("times the card from the server's ETA, measured against the ETA at assignment", () => {
    const clock = liveEtaClock({ etaSeconds: 300, computedAt: "2026-10-07T10:00:00.000Z" }, 900);
    expect(clock).toEqual({ arrivalAtMs: Date.parse("2026-10-07T10:05:00.000Z"), startedAtMs: Date.parse("2026-10-07T09:50:00.000Z") });
    // A later ETA than at assignment never puts the start in the future.
    const later = liveEtaClock({ etaSeconds: 1200, computedAt: "2026-10-07T10:00:00.000Z" }, 900)!;
    expect(later.arrivalAtMs - later.startedAtMs).toBe(1200 * 1000);
    expect(liveEtaClock(null, 900)).toBeNull();
  });
});
