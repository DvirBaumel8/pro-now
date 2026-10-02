import { describe, expect, it } from "vitest";

import { IL_MOBILE, resolveAddress } from "./orderTarget";

describe("resolveAddress", () => {
  const list = [{ id: "a" }, { id: "b" }];
  it("keeps the chosen address", () => expect(resolveAddress(list, "b")?.id).toBe("b"));
  it("falls back to the first when the choice is gone or unset", () => {
    expect(resolveAddress(list, "deleted")?.id).toBe("a");
    expect(resolveAddress(list, null)?.id).toBe("a");
  });
  it("is null with no saved address", () => expect(resolveAddress([], "a")).toBeNull());
});

describe("IL_MOBILE", () => {
  it("accepts Israeli mobiles and refuses the rest", () => {
    expect(IL_MOBILE.test("050-1234567")).toBe(true);
    expect(IL_MOBILE.test("+972501234567")).toBe(true);
    expect(IL_MOBILE.test("03-1234567")).toBe(false);
  });
});
