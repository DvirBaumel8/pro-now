import { describe, expect, it } from "vitest";
import {
  availabilityScenes,
  availabilitySceneViolations,
  postureFor,
  postureLabelHe,
} from "../src/availability-scene";

const IDS = ["c1", "c2", "c3"];

describe("availability is drawn, never inferred", () => {
  it("shows only the professionals the server called available", () => {
    const scenes = availabilityScenes({
      candidateIds: IDS,
      availableCandidateIds: ["c1", "c3"],
      departmentCode: "BEAUTY",
    });
    expect(scenes.map((s) => s.candidateId)).toEqual(["c1", "c3"]);
  });

  it("shows nobody when nobody is available", () => {
    // An empty street is an empty street. It is not a statement about
    // anyone, which is exactly why absence is the right way to say it.
    expect(
      availabilityScenes({ candidateIds: IDS, availableCandidateIds: [], departmentCode: "BEAUTY" })
    ).toEqual([]);
  });

  it("gives each trade the waiting that fits it", () => {
    expect(postureFor("BEAUTY")).toBe("AT_DOOR");
    expect(postureFor("PETS")).toBe("EMPTY_LEAD");
    expect(postureFor("LOGISTICS")).toBe("EMPTY_LOAD");
    expect(postureFor("HOME_URGENT")).toBe("KIT_READY");
  });

  it("still gives a posture to a department it has never heard of", () => {
    expect(postureFor("SOMETHING_NEW")).toBe("KIT_READY");
  });

  it("says in words what the picture says", () => {
    expect(postureLabelHe("EMPTY_LEAD")).toContain("ממתין לטיול");
    expect(postureLabelHe("EMPTY_LOAD")).toContain("פנוי להובלה");
  });
});

describe("availabilitySceneViolations", () => {
  const ok = availabilityScenes({
    candidateIds: IDS,
    availableCandidateIds: ["c1"],
    departmentCode: "BEAUTY",
  });

  it("passes a sound scene", () => {
    expect(
      availabilitySceneViolations({ scenes: ok, candidateIds: IDS, availableCandidateIds: ["c1"] })
    ).toEqual([]);
  });

  it("refuses to draw someone who is busy", () => {
    // Drawing a barber mid-haircut would tell the customer that this
    // person is working for somebody else right now.
    const v = availabilitySceneViolations({
      scenes: ok,
      candidateIds: IDS,
      availableCandidateIds: [],
    });
    expect(v.join(" ")).toContain("theirs, not ours to show");
  });

  it("refuses to draw somebody who is not a candidate at all", () => {
    const v = availabilitySceneViolations({
      scenes: ok,
      candidateIds: ["c2", "c3"],
      availableCandidateIds: ["c1"],
    });
    expect(v.join(" ")).toContain("Supply is never invented");
  });

  it("refuses to show one person twice", () => {
    const v = availabilitySceneViolations({
      scenes: [...ok, ...ok],
      candidateIds: IDS,
      availableCandidateIds: ["c1"],
    });
    expect(v.join(" ")).toContain("appears twice");
  });
});

/**
 * The rule the scene cannot enforce on its own, stated here so the
 * caller's mistake has somewhere to be caught.
 *
 * `availabilityScenes` is honest by construction: it draws exactly the
 * ids it is handed. What went wrong was the HANDING — the living map
 * passed every candidate that was not still being checked, which included
 * the one it had already chosen. The screen then said "פנוי עכשיו · מוכן
 * לצאת" over the shop of the professional who was fourteen minutes away
 * and driving, beside a card saying so.
 */
describe("who counts as available", () => {
  it("draws nobody when the caller says nobody is free", () => {
    const scenes = availabilityScenes({
      candidateIds: ["a", "b", "c"],
      availableCandidateIds: [],
      departmentCode: "HOME_URGENT",
    });
    expect(scenes).toEqual([]);
  });

  it("draws only the ids it was given, never the whole list", () => {
    // The property that makes the caller's filter the only decision: if
    // this ever widened, a screen could show availability it never asked
    // for and the server never confirmed.
    const scenes = availabilityScenes({
      candidateIds: ["a", "b", "c"],
      availableCandidateIds: ["b"],
      departmentCode: "HOME_URGENT",
    });
    expect(scenes.map((s) => s.candidateId)).toEqual(["b"]);
  });

  it("ignores an available id that is not a candidate at all", () => {
    // A stale id from a previous search must not summon a scene over a
    // shop nobody is standing in.
    const scenes = availabilityScenes({
      candidateIds: ["a"],
      availableCandidateIds: ["a", "ghost"],
      departmentCode: "HOME_URGENT",
    });
    expect(scenes.map((s) => s.candidateId)).toEqual(["a"]);
  });

  it("never says a professional is free without saying what they are doing", () => {
    // "פנוי עכשיו" on its own is a claim; the posture is what makes it a
    // picture of somebody rather than a badge.
    for (const posture of ["AT_DOOR", "EMPTY_LEAD", "EMPTY_LOAD", "KIT_READY"] as const) {
      expect(postureLabelHe(posture)).toContain("·");
    }
  });
});
