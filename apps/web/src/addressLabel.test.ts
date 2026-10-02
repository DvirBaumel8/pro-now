import { describe, expect, it } from "vitest";

import { shortAddressHe } from "./addressLabel";

describe("shortAddressHe", () => {
  it("prefers the saved label", () => {
    expect(shortAddressHe({ label: "הבית", formatted: "18, אהרון דוד גורדון, תל־אביב־יפו" })).toBe("הבית");
  });

  it("reads street, number and city from the geocoder's order", () => {
    expect(
      shortAddressHe({ label: null, formatted: "18, אהרון דוד גורדון, תל־אביב־יפו, הצפון הישן - החלק הצפוני, ישראל" })
    ).toBe("אהרון דוד גורדון 18, תל־אביב־יפו");
  });

  it("keeps the first two parts of anything else", () => {
    expect(shortAddressHe({ label: " ", formatted: "רמת אביב, תל אביב, ישראל" })).toBe("רמת אביב, תל אביב");
  });
});
