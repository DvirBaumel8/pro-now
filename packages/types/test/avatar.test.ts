import { describe, expect, it } from "vitest";

import { AVATARS, avatarById, avatarViolations, walkingAssetFor } from "../src/avatar";

describe("the avatar roster", () => {
  it("holds its own rules", () => {
    expect(avatarViolations()).toEqual([]);
  });

  it("can be chosen from in twenty seconds", () => {
    // Amit set the budget and it is the right one: somebody whose kitchen
    // is flooding has not arrived to dress a doll. One screen, no scroll.
    expect(AVATARS.length).toBeLessThanOrEqual(12);
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
      expect(Object.keys(a).sort()).toEqual(
        ["heightRatio", "id", "labelHe", "portraitAssetId", "presentation", "worldAssetId"].sort()
      );
    }
  });

  it("labels the drawing, never the person", () => {
    for (const a of AVATARS) {
      if (a.presentation === "ANIMAL") {
        // An animal's label says what the drawing is, which is still a
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
    expect(animals.length).toBe(2);
    expect(AVATARS.length - animals.length).toBe(10);
  });

  it("draws an animal shorter than a person", () => {
    for (const a of AVATARS) {
      if (a.presentation === "ANIMAL") {
        expect(a.heightRatio).toBeLessThan(0.8);
        expect(a.heightRatio).toBeGreaterThan(0);
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
