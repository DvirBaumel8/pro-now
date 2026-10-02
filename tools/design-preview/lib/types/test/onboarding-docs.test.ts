import { describe, expect, it } from "vitest";
import { allServices, onboardingDocsFor, pilotCatalog } from "../src";

const ids = (svc: string[]) => onboardingDocsFor(svc).map((d) => `${d.id}:${d.level}`);

describe("documents asked at joining follow the research (2026-09-29)", () => {
  it("everyone gives identity, a face and a tax file", () => {
    for (const s of allServices(pilotCatalog)) {
      const got = ids([s.id]);
      expect(got, s.id).toEqual(expect.arrayContaining(["ID:PLATFORM", "SELFIE:PLATFORM", "BUSINESS:LAW"]));
    }
  });
  it("licensed trades ask for their licence, by law", () => {
    expect(ids(["svc-electric"])).toContain("ELECTRICIAN:LAW");
    expect(ids(["svc-gas"])).toContain("GAS:LAW");
    expect(ids(["svc-ac"])).toContain("AC:LAW");
    expect(ids(["svc-pest"])).toContain("PEST:LAW");
    expect(ids(["svc-vet"])).toContain("VET:LAW");
    expect(ids(["svc-towing"])).toEqual(expect.arrayContaining(["RECOVERY_VEHICLE:LAW", "DRIVING:LAW"]));
  });
  it("unlicensed trades ask for no trade licence", () => {
    for (const s of ["svc-paint", "svc-handyman", "svc-hands", "svc-clean", "svc-dog-walk"]) {
      expect(ids([s]).filter((x) => /ELECTRICIAN|GAS|AC:|PEST|VET|MEDICAL/.test(x)), s).toEqual([]);
    }
  });
  it("never asks for a criminal record — illegal to demand in Israel", () => {
    const every = onboardingDocsFor(allServices(pilotCatalog).map((s) => s.id));
    expect(every.map((d) => d.nameHe).join(" ")).not.toMatch(/יושר|פלילי/);
  });
  it("each document appears once, the strictest level winning", () => {
    const docs = onboardingDocsFor(["svc-solar", "svc-electric"]);
    const el = docs.filter((d) => d.id === "ELECTRICIAN");
    expect(el).toHaveLength(1);
    expect(el[0]!.whenHe).toBeUndefined();
  });
});
