import { describe, expect, it } from "vitest";
import {
  cameraFor,
  layOutVenues,
  virtualVenueViolations,
  WIDE_CAMERA,
  type VirtualVenue,
} from "../src/virtual-venue";

const IDS = ["c1", "c2", "c3"];

describe("venues are avatars of supply, not places", () => {
  it("gives one venue per eligible candidate", () => {
    expect(layOutVenues(IDS, "HAIR").map((v) => v.candidateId)).toEqual(IDS);
  });

  it("places them deterministically, so nothing jumps between renders", () => {
    expect(layOutVenues(IDS, "HAIR")).toEqual(layOutVenues(IDS, "HAIR"));
  });

  it("lays them out inside the world's own space", () => {
    for (const v of layOutVenues(IDS, "HAIR")) {
      expect(v.worldAnchor.u).toBeGreaterThanOrEqual(0);
      expect(v.worldAnchor.u).toBeLessThanOrEqual(1);
      expect(v.worldAnchor.v).toBeGreaterThanOrEqual(0);
      expect(v.worldAnchor.v).toBeLessThanOrEqual(1);
    }
  });

  it("does not order them by anything that could be read as distance", () => {
    // Reversing the input reverses the layout. If position meant "nearest
    // first", the same three people would have to land in the same places
    // whichever order the server listed them in.
    const forward = layOutVenues(IDS, "HAIR").map((v) => v.candidateId);
    const backward = layOutVenues([...IDS].reverse(), "HAIR").map((v) => v.candidateId);
    expect(backward).toEqual([...forward].reverse());
  });

  it("puts a single venue somewhere real, not against a wall", () => {
    /*
     * This used to assert u ≈ 0.5, which was the street world speaking: on
     * one horizontal line, "not at an edge" and "in the middle" were the
     * same statement. In a neighbourhood a shop belongs on its own trade's
     * street, which is nowhere near the centre — so what is actually being
     * protected is that it is inside the world with room around it.
     */
    const only = layOutVenues(["only"], "HAIR")[0]!.worldAnchor;
    expect(only.u).toBeGreaterThan(0.05);
    expect(only.u).toBeLessThan(0.95);
    expect(only.v).toBeGreaterThan(0.05);
    expect(only.v).toBeLessThan(0.95);
  });
});

describe("virtualVenueViolations", () => {
  const venues = layOutVenues(IDS, "HAIR");

  it("passes a sound set", () => {
    expect(virtualVenueViolations({ venues, eligibleCandidateIds: IDS })).toEqual([]);
  });

  it("refuses supply that the server never returned", () => {
    const v = virtualVenueViolations({ venues, eligibleCandidateIds: ["c1", "c2"] });
    expect(v.join(" ")).toContain("supply is never invented");
  });

  it("refuses to show one person as two choices", () => {
    const doubled = [...venues, { ...venues[0] }];
    const v = virtualVenueViolations({ venues: doubled, eligibleCandidateIds: IDS });
    expect(v.join(" ")).toContain("cannot be two choices");
  });

  it("refuses two assigned candidates at once", () => {
    const twoChosen: VirtualVenue[] = venues.map((x) => ({ ...x, state: "CHOSEN" as const }));
    const v = virtualVenueViolations({ venues: twoChosen, eligibleCandidateIds: IDS });
    expect(v.join(" ")).toContain("Exactly one candidate is assigned");
  });
});

describe("the camera narrates", () => {
  const venues = layOutVenues(IDS, "HAIR");

  it("stays wide while searching", () => {
    expect(cameraFor({ shot: "WIDE", venues })).toEqual(WIDE_CAMERA);
  });

  it("stays wide when there is nothing to look at", () => {
    expect(cameraFor({ shot: "DISTRICT", venues: [] })).toEqual(WIDE_CAMERA);
  });

  it("moves in on the district once matches exist", () => {
    const cam = cameraFor({ shot: "DISTRICT", venues });
    expect(cam.zoom).toBeGreaterThan(WIDE_CAMERA.zoom);
    // It looks at where the shops actually are — which is a street in the
    // neighbourhood, not the middle of the world.
    const us = venues.map((v) => v.worldAnchor.u);
    expect(cam.focus.u).toBeGreaterThanOrEqual(Math.min(...us) - 0.1);
    expect(cam.focus.u).toBeLessThanOrEqual(Math.max(...us) + 0.1);
  });

  it("moves in on the chosen venue", () => {
    const cam = cameraFor({ shot: "VENUE", venues, chosenCandidateId: "c3" });
    expect(cam.shot).toBe("VENUE");
    expect(cam.focus).toEqual(venues[2].worldAnchor);
  });

  it("refuses a close-up of nothing", () => {
    // A venue shot with nobody chosen would be a dramatic push-in on empty
    // street. Falling back to the district is the honest answer.
    const cam = cameraFor({ shot: "VENUE", venues, chosenCandidateId: null });
    expect(cam.shot).toBe("DISTRICT");
  });

  it("pulls back out for the journey", () => {
    const venue = cameraFor({ shot: "VENUE", venues, chosenCandidateId: "c1" });
    const route = cameraFor({ shot: "ROUTE", venues, chosenCandidateId: "c1" });
    expect(route.zoom).toBeLessThan(venue.zoom);
  });
});
