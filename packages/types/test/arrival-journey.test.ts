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
  interiorBeat,
  isInside,
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
    expect(cardMayShow(2300)).toBe(false);
    /*
     * And still not while the camera is crossing the threshold — the
     * interior has to be seen before something is laid over it, or the
     * beat that was added to show the inside of a shop shows a card.
     */
    expect(cardMayShow(2500)).toBe(false);
    expect(cardMayShow(2690)).toBe(true);
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

/**
 * CROSSING THE THRESHOLD.
 *
 * Amit: *"שיכנס לתוך החנות שלו ממש בזום אין... ממש שינוי מצלמה לתוך
 * החנות, שינוי פריים, לא להישאר באותו עמוד."*
 *
 * The journey ended at the shopfront. Arriving AT a business and
 * arriving IN one are different pictures, not different zoom levels.
 */
describe("going inside", () => {
  it("happens after the arrival is felt and before the card covers it", () => {
    const hold = JOURNEY.find((b) => b.beat === "ARRIVAL_HOLD")!;
    const inside = interiorBeat();
    const card = JOURNEY.find((b) => b.beat === "CARD_IN")!;
    expect(inside.startMs).toBeGreaterThanOrEqual(hold.startMs + hold.durationMs);
    expect(card.startMs).toBeGreaterThanOrEqual(inside.startMs + inside.durationMs);
  });

  it("does not happen at all for a trade with no interior drawn", () => {
    expect(isInside(2990, false)).toBe(false);
    expect(isInside(2990, true)).toBe(true);
    // And not before the beat, whatever art exists.
    expect(isInside(1000, true)).toBe(false);
  });

  it("is refused if it would steal the arrival or be stolen by the card", () => {
    const tooEarly = JOURNEY.map((b) =>
      b.beat === "INTERIOR" ? { ...b, startMs: 2000 } : b
    );
    expect(journeyViolations(tooEarly).join(" ")).toContain("before the arrival hold finishes");

    const cardOnTop = JOURNEY.map((b) =>
      b.beat === "CARD_IN" ? { ...b, startMs: 2400 } : b
    );
    expect(journeyViolations(cardOnTop).join(" ")).toContain("through the door");
  });

  it("still lands the whole move inside three seconds", () => {
    expect(JOURNEY_TOTAL_MS).toBeLessThanOrEqual(3000);
    expect(journeyViolations()).toEqual([]);
  });
});
