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
