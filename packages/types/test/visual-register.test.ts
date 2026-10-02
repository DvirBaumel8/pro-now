import { describe, expect, it } from "vitest";

import {
  kindOfAssetId,
  mayAppearOn,
  REGISTER_OF,
  registerViolations,
  type ArtKind,
} from "../src/visual-register";

describe("the visual register", () => {
  it("holds its own rules", () => {
    expect(registerViolations()).toEqual([]);
  });

  /*
   * Amit: *"בכללי את כל העולם! זה הכיוון שלי!!!! לא אנשים ריאליסטיים. רק
   * שנפתח כרטיס מקצוען שיראו את התמונה האמיתית."*
   */
  it("draws the whole world and photographs only the professional", () => {
    const real = (Object.keys(REGISTER_OF) as ArtKind[]).filter(
      (k) => REGISTER_OF[k] === "REALITY"
    );
    expect(real).toEqual(["PROVIDER_PHOTO"]);
  });

  it("keeps a real person out of an invented street", () => {
    // A real photograph of a real human standing at an invented address is
    // the one claim this product must never make. `virtual-venue.ts` makes
    // it a type error to treat a shop as a place; this keeps the artwork
    // from saying it anyway.
    expect(mayAppearOn("PROVIDER_PHOTO", "WORLD")).toBe(false);
    expect(mayAppearOn("PROVIDER_PHOTO", "CARD")).toBe(true);
  });

  it("lets a drawing go anywhere, because a drawing claims nothing", () => {
    expect(mayAppearOn("AVATAR_PORTRAIT", "CARD")).toBe(true);
    expect(mayAppearOn("DISTRICT", "WORLD")).toBe(true);
  });

  it("governs a new file by its name rather than by a list", () => {
    // The ids ARE the file names, so a district nobody has drawn yet is
    // already covered — which is what stops the rule rotting.
    expect(kindOfAssetId("district_locksmith")).toBe("DISTRICT");
    expect(kindOfAssetId("character_locksmith_world")).toBe("WORLD_CHARACTER");
    expect(kindOfAssetId("character_locksmith_icon")).toBe("CATEGORY_PORTRAIT");
    expect(kindOfAssetId("avatar_13_portrait")).toBe("AVATAR_PORTRAIT");
  });

  it("says nothing about a name it does not recognise", () => {
    // Silence rather than a guess: a wrong answer here would be a rule
    // pretending to cover a file it has never seen.
    expect(kindOfAssetId("some_new_thing")).toBeNull();
  });

  it("puts every kind of world art in the illustrated register", () => {
    for (const id of [
      "world_neighbourhood",
      "shared_ground_street",
      "district_home",
      "character_home_world",
      "character_home_icon",
      "avatar_04_world_back",
    ]) {
      const kind = kindOfAssetId(id);
      expect(kind).not.toBeNull();
      expect(REGISTER_OF[kind!]).toBe("ILLUSTRATION");
    }
  });

  /*
   * The category tiles are the app's front door, and they were
   * photographic professionals. ChatGPT: *"זה הופך את הפורטרטים לנכס הכי
   * דחוף ברשימה, כי הם מסך הפתיחה עכשיו ולא עיטור."*
   */
  it("includes the front door in the change", () => {
    expect(REGISTER_OF.CATEGORY_PORTRAIT).toBe("ILLUSTRATION");
  });
});
