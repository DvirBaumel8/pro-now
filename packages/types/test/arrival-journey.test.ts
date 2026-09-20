import { describe, expect, it } from "vitest";

import {
  beatAt,
  cardMayShow,
  CARD_REST,
  JOURNEY,
  JOURNEY_TOTAL_MS,
  journeyViolations,
  RETURN,
  shotForBeat,
} from "../src";

describe("the journey to a professional", () => {
  it("is one continuous move with no gaps", () => {
    expect(journeyViolations()).toEqual([]);
  });

  it("pulls back before it travels, and closes in last", () => {
    expect(shotForBeat(beatAt(300))).toBe("WIDE");
    expect(shotForBeat(beatAt(1200))).toBe("DISTRICT");
    expect(shotForBeat(beatAt(2000))).toBe("VENUE");
  });

  it("does not open the card until the camera has stopped and held", () => {
    expect(cardMayShow(0)).toBe(false);
    expect(cardMayShow(1800)).toBe(false);
    // Arrived, but still holding: this is the beat that must survive.
    expect(cardMayShow(2350)).toBe(false);
    expect(cardMayShow(2450)).toBe(true);
  });

  it("refuses a timeline where the card steals the arrival", () => {
    const rushed = JOURNEY.map((b) =>
      b.beat === "ARRIVAL_HOLD" ? { ...b, durationMs: 0 } : b
    );
    expect(journeyViolations(rushed).join(" ")).toContain("arrival hold");
  });

  it("refuses a timeline with a gap in it — a move, not a slideshow", () => {
    const gapped = JOURNEY.map((b) => (b.beat === "TRAVEL" ? { ...b, startMs: b.startMs + 200 } : b));
    expect(journeyViolations(gapped).join(" ")).toContain("continuous");
  });

  it("lands the card at rest inside three seconds", () => {
    expect(JOURNEY_TOTAL_MS).toBeLessThanOrEqual(3000);
    expect(beatAt(JOURNEY_TOTAL_MS)).toBe("SETTLED");
  });

  it("leaves the world visible behind the card", () => {
    // Not a quote sheet: the street and the top of the venue stay in view.
    expect(CARD_REST.heightShare).toBeLessThan(0.5);
    expect(CARD_REST.scrimOpacity).toBeLessThan(0.2);
  });

  it("comes back to the street, not to the wide shot", () => {
    expect(RETURN.restsAt).toBe("DISTRICT");
    // The way back is quicker: the place is already familiar.
    expect(RETURN.cameraDurationMs).toBeLessThan(JOURNEY_TOTAL_MS);
    // The camera starts moving before the card has finished leaving.
    expect(RETURN.cameraStartMs).toBeLessThan(RETURN.cardOutMs);
  });
});
