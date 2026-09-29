import { describe, expect, it } from "vitest";
import { breakableEmail, isPlausibleEmail } from "../src/email";

describe("isPlausibleEmail", () => {
  it("accepts ordinary addresses, trimmed", () => {
    for (const e of ["dana@example.com", " a.b+c@mail.co.il ", "x@y.io"]) expect(isPlausibleEmail(e), e).toBe(true);
  });
  it("rejects what cannot receive a link", () => {
    for (const e of ["", "dana", "dana@", "@example.com", "dana@example", "dana @example.com", "dana@example.c"])
      expect(isPlausibleEmail(e), e).toBe(false);
  });
});

describe("breakableEmail", () => {
  it("adds an invisible break after @ and each dot, and nothing else", () => {
    const out = breakableEmail("dana.levi@example.co.il");
    expect(out.replace(/​/g, "")).toBe("dana.levi@example.co.il");
    expect(out.split("​")).toHaveLength(5);
  });
});
