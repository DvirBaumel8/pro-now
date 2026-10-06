import { describe, expect, it } from "vitest";
import { livingMapViolations, type JobMatchView } from "@pro-now/types";

import { matchRevealState, revealFigure } from "./matchReveal";

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
