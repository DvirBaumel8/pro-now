import { describe, it, expect } from "vitest";
import { serviceIdsByCode } from "../src/catalog-bridge";

const catalog = {
  departments: [
    {
      categories: [
        {
          services: [
            { id: "cuid_leak", code: "HOME_PLUMB_LEAK" },
            { id: "cuid_block", code: "HOME_PLUMB_BLOCK" },
          ],
        },
        { services: [{ id: "cuid_lockout", code: "LOCK_LOCKOUT" }] },
      ],
    },
    { categories: [{ services: [{ id: "cuid_pest", code: "PEST_CONTROL" }] }] },
  ],
};

describe("serviceIdsByCode", () => {
  it("finds every service across every department and category", () => {
    const map = serviceIdsByCode(catalog);
    expect(map.get("HOME_PLUMB_LEAK")).toBe("cuid_leak");
    // The failure this catches: walking only the first category of each
    // department, so a service in the second resolves to nothing and the
    // customer is told their area has no locksmiths.
    expect(map.get("LOCK_LOCKOUT")).toBe("cuid_lockout");
    // And only the first department, with the same consequence.
    expect(map.get("PEST_CONTROL")).toBe("cuid_pest");
    expect(map.size).toBe(4);
  });

  it("knows nothing about a code the server did not send", () => {
    expect(serviceIdsByCode(catalog).get("HVAC_REPAIR")).toBeUndefined();
  });

  it("survives an empty catalogue without inventing entries", () => {
    expect(serviceIdsByCode({ departments: [] }).size).toBe(0);
  });
});
