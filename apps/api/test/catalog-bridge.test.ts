import { describe, it, expect } from "vitest";
import {
  PILOT_TO_DATABASE_SERVICE_CODE,
  PILOT_SERVICES_NOT_IN_DATABASE,
  databaseCodeForPilotService,
  coverage,
  pilotServiceById,
} from "@pro-now/types";
import { services as databaseServices } from "../prisma/seed-data/services";

const databaseCodes = new Set(databaseServices.map((s) => s.code));
const pilotIds = Object.keys(pilotServiceById);

describe("catalog bridge — packages/types/src/catalog-bridge.ts", () => {
  it("never names a database service that does not exist", () => {
    // The failure this catches: a mapping that looks right and resolves to
    // nothing, so the customer's request is refused at the far end with
    // SERVICE_NOT_FOUND and the screen has no idea why.
    for (const [pilotId, code] of Object.entries(PILOT_TO_DATABASE_SERVICE_CODE)) {
      expect(databaseCodes.has(code), `${pilotId} -> ${code}`).toBe(true);
    }
  });

  it("never maps a pilot service that does not exist", () => {
    const known = new Set(pilotIds);
    for (const pilotId of Object.keys(PILOT_TO_DATABASE_SERVICE_CODE)) {
      expect(known.has(pilotId), pilotId).toBe(true);
    }
  });

  it("maps each database service at most once", () => {
    // Two customer-facing services pointing at one dispatch service would
    // make the professional's screen ambiguous about what was asked for.
    const used = Object.values(PILOT_TO_DATABASE_SERVICE_CODE);
    expect(new Set(used).size).toBe(used.length);
  });

  it("accounts for every pilot service exactly once, as mapped or as absent", () => {
    // The whole catalogue has to be classified. A service that is in
    // neither list is one nobody has looked at.
    const mapped = new Set(Object.keys(PILOT_TO_DATABASE_SERVICE_CODE));
    const absent = new Set(PILOT_SERVICES_NOT_IN_DATABASE);
    for (const id of pilotIds) {
      const inMapped = mapped.has(id);
      const inAbsent = absent.has(id);
      expect(inMapped || inAbsent, `${id} is in neither list`).toBe(true);
      expect(inMapped && inAbsent, `${id} is in both lists`).toBe(false);
    }
  });

  it("refuses an unmapped service with a reason rather than a substitute", () => {
    const result = databaseCodeForPilotService("svc-gas");
    expect(result.databaseCode).toBeNull();
    expect(result.reasonHe).toBeTruthy();
  });

  it("resolves a mapped service", () => {
    expect(databaseCodeForPilotService("svc-leak").databaseCode).toBe("HOME_PLUMB_LEAK");
  });

  it("reports how much of the customer's catalogue can be ordered", () => {
    const c = coverage(pilotIds);
    expect(c.mapped + c.unmapped).toBe(c.total);
    // Not an assertion about the right number — a record of the current
    // one, so that a change in it is visible in a diff.
    expect(c.mapped).toBeGreaterThan(0);
  });
});
