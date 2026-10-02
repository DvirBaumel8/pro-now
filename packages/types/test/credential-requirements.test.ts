import { describe, it, expect } from "vitest";
import {
  requirementForCredential,
  requirementsForService,
  credentialTypeFor,
} from "../src/credential-requirements";
import { pilotServiceById } from "../src/pilot-catalog";

describe("credential requirements — carrying the catalogue's answer", () => {
  it("turns a licence into a requirement the engine can match a document against", () => {
    const row = requirementForCredential("ELECTRICIAN_LICENSE");
    expect(row).toEqual({ requirement: "LICENSE:ELECTRICIAN", mandatory: true, isDocument: true });
    expect(credentialTypeFor(row.requirement)).toBe("LICENSE");
  });

  it("keeps insurance and certificates document-shaped too", () => {
    expect(requirementForCredential("LIABILITY_INSURANCE").requirement).toBe("INSURANCE:LIABILITY");
    expect(requirementForCredential("PROFESSIONAL_CERTIFICATE").requirement).toBe(
      "CERTIFICATE:PROFESSIONAL"
    );
  });

  it("leaves account-level requirements account-level", () => {
    // These are settled by the account's verification status, not by a
    // document per service. Classifying one as a document would gate
    // dispatch on a file nobody can ever upload.
    for (const credential of ["IDENTITY", "IDENTITY_ENHANCED", "BUSINESS", "BACKGROUND_CHECK"]) {
      const row = requirementForCredential(credential);
      expect(row.isDocument, credential).toBe(false);
      expect(row.requirement, credential).toBe(credential);
      expect(credentialTypeFor(row.requirement), credential).toBeNull();
    }
  });

  it("treats an unknown credential as account-level rather than guessing", () => {
    // The conservative direction: a mis-classified account-level
    // requirement fails to gate and is visible; a mis-classified document
    // requirement gates on something unobtainable and looks like a bug in
    // onboarding.
    const row = requirementForCredential("SOMETHING_NOBODY_HAS_DEFINED");
    expect(row.isDocument).toBe(false);
  });

  it("never emits the same requirement twice for one service", () => {
    const rows = requirementsForService(["IDENTITY", "IDENTITY", "LIABILITY_INSURANCE"]);
    expect(rows.map((r) => r.requirement)).toEqual(["IDENTITY", "INSURANCE:LIABILITY"]);
  });

  it("classifies every credential the pilot catalogue actually uses", () => {
    /*
     * Not an assertion that each is a document — an assertion that each
     * one produces a requirement at all, and that none produces an empty
     * string. A credential that fell through to "" would become a
     * requirement no credential can satisfy, and the service would be
     * undispatchable with no visible reason.
     */
    const used = new Set<string>();
    for (const service of Object.values(pilotServiceById)) {
      for (const credential of service.requiredCredentials ?? []) used.add(credential);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const credential of used) {
      const row = requirementForCredential(credential);
      expect(row.requirement.trim(), credential).not.toBe("");
    }
  });

  it("gives pest control its licence and a locksmith lockout its property policy", () => {
    // Spot checks against the catalogue's own reasoning, so a future edit
    // that quietly drops one is visible here.
    const pest = requirementsForService(pilotServiceById["svc-pest"]!.requiredCredentials ?? []);
    expect(pest.map((r) => r.requirement)).toContain("LICENSE:PEST_CONTROL");

    const lockout = requirementsForService(pilotServiceById["svc-lock"]!.requiredCredentials ?? []);
    expect(lockout.map((r) => r.requirement)).toContain("IDENTITY_ENHANCED");
    expect(lockout.map((r) => r.requirement)).toContain("PROPERTY_LINK_POLICY");
  });
});
