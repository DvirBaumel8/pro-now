import { describe, expect, it } from "vitest";

import {
  AVATARS,
  PEOPLE_BUDGET,
  avatarById,
  avatarViolations,
  gaitForAvatar,
  isRide,
  walkingAssetFor,
  walkingFallbackFor,
} from "../src/avatar";

describe("the avatar roster", () => {
  it("holds its own rules", () => {
    expect(avatarViolations()).toEqual([]);
  });

  it("can be chosen from in twenty seconds", () => {
    // Amit set the budget and it is the right one: somebody whose kitchen
    // is flooding has not arrived to dress a doll. One screen, no scroll.
    //
    // Counted against the FIGURES. The three PRO NOW rides sit at the end
    // of the grid and are skipped by anybody looking for a face, so they
    // do not spend the budget that matters — but they are capped too.
    expect(AVATARS.filter((a) => !isRide(a.id)).length).toBeLessThanOrEqual(PEOPLE_BUDGET);
    expect(AVATARS.length).toBeLessThanOrEqual(15);
  });

  it("gives nobody a reason to pick a figure that is not them", () => {
    for (const p of ["WOMAN", "MAN"] as const) {
      expect(AVATARS.filter((a) => a.presentation === p).length).toBeGreaterThanOrEqual(3);
    }
  });

  it("draws every avatar differently", () => {
    // Two avatars sharing a drawing is two people who look identical in
    // the street, which defeats the point of choosing one.
    expect(new Set(AVATARS.map((a) => a.worldAssetId)).size).toBe(AVATARS.length);
  });

  it("catches a roster that has grown into a catalogue", () => {
    const tooMany = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      portraitAssetId: `p${i}`,
      worldAssetId: `w${i}`,
      presentation: i % 2 ? ("MAN" as const) : ("WOMAN" as const),
      heightRatio: 1,
      labelHe: `דמות ${i}`,
    }));
    expect(avatarViolations(tooMany).join(" ")).toContain("twenty seconds");
  });
});

describe("not choosing is a real answer", () => {
  it("returns nothing rather than a default person", () => {
    // Putting a stranger in the street on somebody's behalf is worse than
    // an empty pavement: they did not choose it, and they will assume the
    // app decided something about them.
    expect(walkingAssetFor(null)).toBeNull();
    expect(avatarById(null)).toBeNull();
  });

  it("returns nothing for an id that no longer exists", () => {
    // A roster can change between releases; a stored id can outlive its
    // avatar, and that must degrade to "no avatar", never to a crash.
    expect(walkingAssetFor("av_deleted")).toBeNull();
  });

  it("finds the figure for a real choice", () => {
    expect(walkingAssetFor(AVATARS[0]!.id)).toBe(AVATARS[0]!.worldAssetId);
  });
});

describe("an avatar is not identity", () => {
  it("has nowhere to put a name", () => {
    // A professional arriving at a door must not have been handed a
    // picture of who to expect. That is a safety property, not a nicety,
    // and it is enforced by the type having no field for it.
    for (const a of AVATARS) {
      const allowed = [
        "heightRatio",
        "id",
        "labelHe",
        "portraitAssetId",
        "presentation",
        "worldAssetId",
        // How a ride moves. Still a fact about the drawing.
        "gaitHint",
      ].sort();
      for (const key of Object.keys(a)) expect(allowed).toContain(key);
    }
  });

  it("labels the drawing, never the person", () => {
    for (const a of AVATARS) {
      if (a.presentation === "ANIMAL" || a.presentation === "VEHICLE") {
        // An animal or a van is labelled by WHAT IT IS, which is still a
        // fact about the picture rather than about the customer.
        expect(a.labelHe.length).toBeGreaterThan(0);
        continue;
      }
      expect(a.labelHe).toMatch(/^דמות \d+/);
    }
  });
});

describe("ten people and two animals", () => {
  /*
   * ChatGPT, closing this: *"הייתי נועל 10 אנשים + 2 חיות. לא מוסיף עכשיו
   * עוד שתי דמויות רק בשביל סימטריית 6/6, במיוחד אחרי שהחלטנו שהבחירה
   * עצמה לא שואלת מגדר."* The picker shows a grid and takes a tap; there
   * is no gender question to balance.
   */
  it("keeps the grid mostly people", () => {
    const animals = AVATARS.filter((a) => a.presentation === "ANIMAL");
    const rides = AVATARS.filter((a) => a.presentation === "VEHICLE");
    expect(animals.length).toBe(2);
    expect(AVATARS.length - animals.length - rides.length).toBe(10);
  });

  it("draws an animal shorter than a person", () => {
    for (const a of AVATARS) {
      if (a.presentation === "ANIMAL") {
        expect(a.heightRatio).toBeLessThan(0.8);
        expect(a.heightRatio).toBeGreaterThan(0);
      } else if (a.presentation === "VEHICLE") {
        // A van is taller than the person driving it, and still below the
        // roofline of the shops it drives past.
        expect(a.heightRatio).toBeGreaterThanOrEqual(1);
        expect(a.heightRatio).toBeLessThanOrEqual(1.6);
      } else {
        expect(a.heightRatio).toBe(1);
      }
    }
  });

  it("refuses an animal drawn at human height", () => {
    const wrong = AVATARS.map((a) =>
      a.presentation === "ANIMAL" ? { ...a, heightRatio: 1 } : a
    );
    expect(avatarViolations(wrong).join(" ")).toContain("human height");
  });

  it("refuses a roster that has become a pet shop", () => {
    const pets = AVATARS.map((a) => ({ ...a, presentation: "ANIMAL" as const, heightRatio: 0.4 }));
    expect(avatarViolations(pets).join(" ")).toContain("mostly animals");
  });

  it("still gives every identity a walking figure, animals included", () => {
    for (const a of AVATARS) {
      expect(walkingAssetFor(a.id)).toBe(a.worldAssetId);
    }
  });
});

/**
 * The stand-in, which exists because the shipped world had nobody in it.
 */
describe("the walking figure and its stand-in", () => {
  it("offers a face for every avatar, since no figure is drawn yet", () => {
    for (const a of AVATARS) {
      expect(walkingFallbackFor(a.id)).toBe(a.portraitAssetId);
    }
  });

  it("shows nobody for somebody who skipped the picker", () => {
    // Skipping is a first-class answer, and an unasked-for marker walking
    // the street would be the app choosing a character for them.
    expect(walkingFallbackFor(null)).toBeNull();
    expect(walkingAssetFor(null)).toBeNull();
  });

  it("never returns the same drawing for the figure and the stand-in", () => {
    // If these ever coincide the fallback has silently become the figure,
    // and a head would be walking down the street at a person's height.
    for (const a of AVATARS) {
      expect(walkingFallbackFor(a.id)).not.toBe(walkingAssetFor(a.id));
    }
  });
});


describe("the three PRO NOW rides", () => {
  it("is what you ride rather than who you are", () => {
    const rides = AVATARS.filter((a) => a.presentation === "VEHICLE");
    expect(rides.length).toBe(3);
    for (const r of rides) {
      expect(isRide(r.id)).toBe(true);
      // The mark is the point of them: *"חייב שהמותג לא יצא להם מהראש."*
      expect(r.labelHe).toContain("PRO NOW");
    }
  });

  it("keeps its own gait whatever the pad says", () => {
    // A scooter does not sprint, and a van steered with a walking gait
    // would bob once per stride down the road.
    for (const r of AVATARS.filter((a) => a.presentation === "VEHICLE")) {
      expect(gaitForAvatar(r.id, "WALK")).toBe(r.gaitHint);
      expect(gaitForAvatar(r.id, "RUN")).toBe(r.gaitHint);
    }
  });

  it("leaves a person's gait to the pad", () => {
    const person = AVATARS.find((a) => a.presentation === "MAN")!;
    expect(gaitForAvatar(person.id, "WALK")).toBe("WALK");
    expect(gaitForAvatar(person.id, "RUN")).toBe("RUN");
    expect(isRide(person.id)).toBe(false);
  });

  it("refuses a ride with no gait of its own", () => {
    const wrong = AVATARS.map((a) =>
      a.presentation === "VEHICLE" ? { ...a, gaitHint: undefined } : a
    );
    expect(avatarViolations(wrong).join(" ")).toContain("no gait of its own");
  });

  it("refuses a ride that towers over the street", () => {
    const wrong = AVATARS.map((a) =>
      a.presentation === "VEHICLE" ? { ...a, heightRatio: 2.4 } : a
    );
    expect(avatarViolations(wrong).join(" ")).toContain("taller than it can be");
  });

  it("refuses a roster that has become a car park", () => {
    const fleet = AVATARS.map((a) => ({
      ...a,
      presentation: "VEHICLE" as const,
      gaitHint: "DRIVE" as const,
      heightRatio: 1.2,
    }));
    expect(avatarViolations(fleet).join(" ")).toContain("mostly vehicles");
  });
});
