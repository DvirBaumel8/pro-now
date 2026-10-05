import { describe, expect, it } from "vitest";

import { strollHref, worldHref, worldReturnJobId, worldReturnPath, worldShopParam } from "./worldLinks";

describe("the street's way back", () => {
  it("accepts only a job's own screen", () => {
    expect(worldReturnPath("/jobs/cmuvnkz400009svitl2mse52y")).toBe("/jobs/cmuvnkz400009svitl2mse52y");
    for (const bad of [null, "", "/", "/admin", "https://evil.example/jobs/x", "//evil.example", "/jobs/x/../admin", "/jobs/"]) {
      expect(worldReturnPath(bad), String(bad)).toBeNull();
    }
  });

  it("reads the job id back out", () => {
    expect(worldReturnJobId("/jobs/abc")).toBe("abc");
    expect(worldReturnJobId(null)).toBeNull();
  });

  it("accepts only a shop id's shape", () => {
    expect(worldShopParam("home")).toBe("home");
    expect(worldShopParam("../x")).toBeNull();
    expect(worldShopParam(null)).toBeNull();
  });

  it("builds the street's address", () => {
    expect(worldHref()).toBe("/world");
    expect(worldHref({ from: "/jobs/j1" })).toBe("/world?from=%2Fjobs%2Fj1");
    expect(worldHref({ shop: "home" })).toBe("/world?shop=home");
    expect(worldHref({ from: "/admin", shop: "<x>" })).toBe("/world");
  });
});

describe("the stroll's door", () => {
  it("opens the street with a figure", () => {
    expect(strollHref(true)).toBe("/world");
    expect(strollHref(true, "/jobs/j1")).toBe("/world?from=%2Fjobs%2Fj1");
  });

  it("picks a figure first without one, keeping where to come back to", () => {
    expect(strollHref(false)).toBe("/avatar?then=world");
    expect(strollHref(false, "/jobs/j1")).toBe("/avatar?then=world&from=%2Fjobs%2Fj1");
  });
});
