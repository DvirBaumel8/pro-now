import { describe, expect, it } from "vitest";
import {
  allServices,
  browseOnly,
  credentialsFor,
  dispatchableNow,
  eligibleServices,
  pilotCatalog,
  pilotServiceById,
  type CredentialKind,
} from "../src/index";

/**
 * These tests are not about the catalogue's size. They are about the four
 * ways a catalogue silently breaks a NOW marketplace:
 *
 *   1. A SCHEDULED_ONLY service leaks into the "available now" surface, the
 *      customer taps, dispatch finds nobody, and the whole app reads broken.
 *   2. A service that needs a licence loses it in an edit, and the platform
 *      starts sending unlicensed people to licensed work.
 *   3. Two services share an id, and one silently shadows the other.
 *   4. A service ships with no way to be found — no keywords — so it exists
 *      for everyone except the person who needs it.
 *
 * Each is cheap to test and expensive to discover in production.
 */

const services = allServices(pilotCatalog);

describe("pilot catalogue integrity", () => {
  it("has unique ids and unique codes", () => {
    expect(new Set(services.map((s) => s.id)).size).toBe(services.length);
    expect(new Set(services.map((s) => s.code)).size).toBe(services.length);
  });

  it("gives every service a name, keywords and at least two symptoms", () => {
    for (const s of services) {
      expect(s.nameHe.trim(), s.id).not.toBe("");
      expect(s.keywordsHe.length, s.id).toBeGreaterThanOrEqual(4);
      expect(s.symptomsHe.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.photoSubjectHe.trim(), s.id).not.toBe("");
    }
  });

  it("indexes every service by id", () => {
    expect(Object.keys(pilotServiceById).length).toBe(services.length);
    for (const s of services) expect(pilotServiceById[s.id]).toBe(s);
  });

  it("orders typicalMinutes low-to-high where declared", () => {
    for (const s of services) {
      if (!s.typicalMinutes) continue;
      const [lo, hi] = s.typicalMinutes;
      expect(lo, s.id).toBeGreaterThan(0);
      expect(hi, s.id).toBeGreaterThan(lo);
    }
  });
});

describe("what may be offered as available right now", () => {
  it("never includes a SCHEDULED_ONLY service", () => {
    for (const s of dispatchableNow(pilotCatalog)) {
      expect(s.fulfillmentProfile, s.id).not.toBe("SCHEDULED_ONLY");
    }
  });

  it("never includes an inactive service", () => {
    for (const s of dispatchableNow(pilotCatalog)) {
      expect(s.activationStatus, s.id).toBe("ACTIVE");
    }
  });

  it("keeps the pilot small enough to feel alive", () => {
    // Not an arbitrary bound: past roughly this many live services, one city's
    // supply spreads thin enough that most taps find nobody. If this fails
    // because the pilot genuinely grew, the number moves — deliberately, with
    // supply to back it.
    const now = dispatchableNow(pilotCatalog);
    expect(now.length).toBeGreaterThanOrEqual(10);
    expect(now.length).toBeLessThanOrEqual(16);
  });

  it("offers at least one URGENT_NOW service per live urgent trade", () => {
    const urgent = dispatchableNow(pilotCatalog).filter((s) => s.fulfillmentProfile === "URGENT_NOW");
    expect(urgent.map((s) => s.id)).toEqual(
      expect.arrayContaining(["svc-leak", "svc-blockage", "svc-electric", "svc-lock", "svc-courier"])
    );
  });

  it("excludes gas, which is modelled but not a decision this codebase makes", () => {
    const gas = pilotServiceById["svc-gas"]!;
    expect(gas.activationStatus).toBe("INACTIVE");
    expect(gas.requiredCredentials).toContain("GAS_LICENSE");
    expect(dispatchableNow(pilotCatalog).map((s) => s.id)).not.toContain("svc-gas");
    expect(browseOnly(pilotCatalog).map((s) => s.id)).not.toContain("svc-gas");
  });

  it("puts the scheduled trades in browse, not in now", () => {
    const browse = browseOnly(pilotCatalog).map((s) => s.id);
    expect(browse).toEqual(expect.arrayContaining(["svc-paint", "svc-furniture", "svc-tv", "svc-garden"]));
    const now = dispatchableNow(pilotCatalog).map((s) => s.id);
    for (const id of browse) expect(now).not.toContain(id);
  });
});

describe("verification is per service, not per account", () => {
  it("requires the statutory licence wherever trustProfile says so", () => {
    const licensed: Record<string, CredentialKind> = {
      "svc-electric": "ELECTRICIAN_LICENSE",
      "svc-socket": "ELECTRICIAN_LICENSE",
      "svc-pest": "PEST_CONTROL_LICENSE",
      "svc-gas": "GAS_LICENSE",
    };
    for (const [id, cred] of Object.entries(licensed)) {
      const s = pilotServiceById[id]!;
      expect(s.trustProfile, id).toBe("LICENSE_REQUIRED");
      expect(s.requiredCredentials, id).toContain(cred);
    }
  });

  it("never marks a service LICENSE_REQUIRED without naming a licence", () => {
    const licences: CredentialKind[] = [
      "ELECTRICIAN_LICENSE",
      "GAS_LICENSE",
      "PEST_CONTROL_LICENSE",
    ];
    for (const s of services) {
      if (s.trustProfile !== "LICENSE_REQUIRED") continue;
      expect(s.requiredCredentials.some((c) => licences.includes(c)), s.id).toBe(true);
    }
  });

  it("demands enhanced identity for every ENHANCED service", () => {
    for (const s of services) {
      if (s.trustProfile !== "ENHANCED") continue;
      expect(s.requiredCredentials, s.id).toContain("IDENTITY_ENHANCED");
      expect(s.requiredCredentials, s.id).not.toContain("IDENTITY");
    }
  });

  it("requires a link-to-property policy for the lockout, and only there", () => {
    const withPolicy = services.filter((s) => s.requiredCredentials.includes("PROPERTY_LINK_POLICY"));
    expect(withPolicy.map((s) => s.id)).toEqual(["svc-lock"]);
  });

  it("requires a licence and insurance for anyone driving on a job", () => {
    for (const id of ["svc-courier", "svc-moving"]) {
      const s = pilotServiceById[id]!;
      expect(s.requiredCredentials, id).toContain("DRIVING_LICENSE");
      expect(s.requiredCredentials, id).toContain("VEHICLE_INSURANCE");
    }
  });

  it("asks for identity in some form from every single service", () => {
    for (const s of services) {
      const hasIdentity =
        s.requiredCredentials.includes("IDENTITY") ||
        s.requiredCredentials.includes("IDENTITY_ENHANCED");
      expect(hasIdentity, s.id).toBe(true);
    }
  });
});

describe("eligibleServices", () => {
  const verified: CredentialKind[] = ["IDENTITY", "BUSINESS", "LIABILITY_INSURANCE"];

  it("lets a verified plumber take plumbing and nothing licensed", () => {
    const ids = eligibleServices(services, verified).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["svc-leak", "svc-blockage", "svc-tap"]));
    expect(ids).not.toContain("svc-electric");
    expect(ids).not.toContain("svc-pest");
    expect(ids).not.toContain("svc-gas");
    expect(ids).not.toContain("svc-lock");
  });

  it("adds exactly the electrical services when the licence arrives", () => {
    const before = new Set(eligibleServices(services, verified).map((s) => s.id));
    const after = eligibleServices(services, [...verified, "ELECTRICIAN_LICENSE"]).map((s) => s.id);
    const gained = after.filter((id) => !before.has(id));
    expect(gained.sort()).toEqual(["svc-electric", "svc-socket"]);
  });

  it("does not let standard identity stand in for enhanced identity", () => {
    const ids = eligibleServices(services, [...verified, "IDENTITY_ENHANCED"]).map((s) => s.id);
    expect(ids).toContain("svc-cylinder");
    // The lockout still needs the property-link policy on top.
    expect(ids).not.toContain("svc-lock");
  });

  it("returns nothing for a professional who has verified nothing", () => {
    expect(eligibleServices(services, [])).toEqual([]);
  });

  it("ignores credentials nobody asked for", () => {
    const noise: CredentialKind[] = ["GAS_LICENSE", "VEHICLE_INSURANCE"];
    expect(eligibleServices(services, noise).map((s) => s.id)).toEqual([]);
  });
});

describe("credentialsFor", () => {
  it("collects the union without duplicates", () => {
    const all = credentialsFor(services);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain("ELECTRICIAN_LICENSE");
    expect(all).toContain("PROPERTY_LINK_POLICY");
  });

  it("returns nothing for no services", () => {
    expect(credentialsFor([])).toEqual([]);
  });
});
