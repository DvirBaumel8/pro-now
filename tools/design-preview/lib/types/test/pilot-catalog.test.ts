import { describe, expect, it } from "vitest";
import {
  allServices,
  browseOnly,
  categoryAsksForPerson,
  lightweightServices,
  providerChoiceFor,
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

  it("lets the CATALOGUE grow, because the market is what stays small", () => {
    // This assertion used to cap the catalogue at sixteen, and that was the
    // wrong place to hold the line. The thing that must stay small is what
    // one city offers on one day — and `resolveMarket` now enforces that
    // (see market-activation.test.ts). Capping the catalogue instead meant
    // every new trade had to displace an old one, which is how a product
    // ends up permanently shaped like the first ten things it shipped.
    expect(dispatchableNow(pilotCatalog).length).toBeGreaterThanOrEqual(10);
  });

  it("can open a city with nothing but people who carry their own kit", () => {
    // The supply argument for the PEOPLE department: a new city has no
    // movers and no vans on day one, but a trainer, a tutor and a pair of
    // hands need neither.
    const light = lightweightServices(pilotCatalog).filter((s) => s.activationStatus !== "INACTIVE");
    expect(light.length).toBeGreaterThanOrEqual(10);
    for (const s of light) expect(s.mobilityProfile, s.id).not.toBe("NEEDS_VEHICLE");
  });

  it("declares what every professional has to bring", () => {
    for (const s of services) {
      expect(
        ["CARRIES_NOTHING", "CARRIES_ON_PERSON", "NEEDS_VEHICLE"],
        s.id
      ).toContain(s.mobilityProfile);
    }
  });

  it("never sends a van-dependent service as CARRIES_NOTHING", () => {
    // A cheap sanity check on the axis that sets dispatch radius: anything
    // needing parts, machines or a load is NEEDS_VEHICLE.
    for (const id of ["svc-moving", "svc-ac", "svc-fridge", "svc-pest", "svc-paint"]) {
      expect(pilotServiceById[id]!.mobilityProfile, id).toBe("NEEDS_VEHICLE");
    }
  });

  it("holds every PERSONAL_CONTACT service to the checks that profile exists for", () => {
    const personal = services.filter((s) => s.trustProfile === "PERSONAL_CONTACT");
    expect(personal.length).toBeGreaterThan(0);
    for (const s of personal) {
      expect(s.requiredCredentials, s.id).toContain("IDENTITY_ENHANCED");
      expect(s.requiredCredentials, s.id).toContain("BACKGROUND_CHECK");
      // And it must not be live: the verification policy for being alone
      // with a person is a §4 decision that has not been made.
      expect(s.activationStatus, s.id).not.toBe("ACTIVE");
    }
  });

  it("does not let a PERSONAL_CONTACT service reach the dispatchable set", () => {
    for (const s of dispatchableNow(pilotCatalog)) {
      expect(s.trustProfile, s.id).not.toBe("PERSONAL_CONTACT");
    }
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
    /*
     * The two lockouts are the exception this list has to carry, and they
     * are the reason the rule exists at all. Neither a home nor a car
     * lockout has a statutory licence in Israel — what makes them
     * LICENSE_REQUIRED is the ownership check, which is a stricter gate
     * than a trade licence and is modelled as its own credential. Without
     * naming those here, the assertion would force us to invent a licence
     * that does not exist in order to pass (/CLAUDE.md §4).
     */
    const licences: CredentialKind[] = [
      "ELECTRICIAN_LICENSE",
      "GAS_LICENSE",
      "PEST_CONTROL_LICENSE",
      "PROPERTY_LINK_POLICY",
      "VEHICLE_LINK_POLICY",
      "DRIVING_LICENSE",
      "MEDICAL_LICENSE",
      "VETERINARY_LICENSE",
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

  it("requires a link-to-property policy for the home lockout, and only there", () => {
    const withPolicy = services.filter((s) => s.requiredCredentials.includes("PROPERTY_LINK_POLICY"));
    expect(withPolicy.map((s) => s.id)).toEqual(["svc-lock"]);
  });

  /*
   * A CAR IS NOT A PROPERTY, and the separation is enforced rather than
   * documented. Both lockouts open something for a person who cannot, at
   * that moment, prove it is theirs — but a home is proven with a lease or
   * a bill and a car with a plate against a registration, at the roadside,
   * usually at night. One policy written for one of them must never end up
   * governing the other by accident.
   */
  it("requires a link-to-vehicle policy for the car lockout, and only there", () => {
    const withPolicy = services.filter((s) => s.requiredCredentials.includes("VEHICLE_LINK_POLICY"));
    expect(withPolicy.map((s) => s.id)).toEqual(["svc-car-lockout"]);
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

describe("customer photographs are per service, not assumed", () => {
  it("declares a photo prompt or an explicit null for every service", () => {
    for (const s of services) {
      expect(s.customerPhotoPromptHe, s.id).not.toBeUndefined();
    }
  });

  it("asks nobody to photograph their own body", () => {
    // Amit's example, as a test: "אם מישהו צריך ספר אני לא מצפה שהוא ישלח
    // תמונה של השיער שלו". A trainer and a massage have nothing to show;
    // a haircut does — but a picture of a style you LIKED, not of a fault.
    expect(pilotServiceById["svc-trainer"]!.customerPhotoPromptHe).toBeNull();
    expect(pilotServiceById["svc-massage"]!.customerPhotoPromptHe).toBeNull();
    expect(pilotServiceById["svc-haircut"]!.customerPhotoPromptHe).toContain("תסרוקת שאהבת");
  });

  it("names what to photograph rather than saying 'the problem'", () => {
    for (const s of services) {
      const p = s.customerPhotoPromptHe;
      if (p === null) continue;
      expect(p, s.id).not.toContain("התקלה");
      expect((p ?? "").length, s.id).toBeGreaterThan(8);
    }
  });

  it("keeps a photo prompt for the services where a photo saves a visit", () => {
    for (const id of ["svc-leak", "svc-fridge", "svc-electric", "svc-ac"]) {
      expect(pilotServiceById[id]!.customerPhotoPromptHe, id).toBeTruthy();
    }
  });
});

describe("how a professional is found is a property of the service", () => {
  it("declares a matching mode and a media intent for every service", () => {
    for (const s of services) {
      expect(["FASTEST_ELIGIBLE", "PERSON_FIT"], s.id).toContain(s.matchingMode);
      expect(
        ["PROBLEM_EVIDENCE", "INSPIRATION", "ITEM_REFERENCE", "NONE"],
        s.id
      ).toContain(s.mediaIntent);
    }
  });

  it("never auto-assigns a service where the person IS the service", () => {
    // The one combination that makes no sense: "who comes matters, and you
    // do not get to see who". providerChoiceFor derives rather than stores
    // it so the contradiction cannot be written down.
    for (const s of services) {
      if (s.matchingMode !== "PERSON_FIT") continue;
      expect(providerChoiceFor(s), s.id).toBe("CONFIRM_MATCH");
    }
  });

  it("does not stop to ask on an emergency", () => {
    // Being handed a directory while your kitchen fills with water is a
    // burden, not a courtesy.
    for (const id of ["svc-leak", "svc-blockage", "svc-electric", "svc-lock", "svc-courier"]) {
      const s = pilotServiceById[id]!;
      expect(s.matchingMode, id).toBe("FASTEST_ELIGIBLE");
      expect(providerChoiceFor(s), id).toBe("AUTO_ASSIGN");
    }
  });

  it("confirms the person for every service performed ON a person", () => {
    for (const s of services) {
      if (s.trustProfile !== "PERSONAL_CONTACT") continue;
      expect(s.matchingMode, s.id).toBe("PERSON_FIT");
    }
  });

  it("keeps NONE for the services with nothing to show, and only those", () => {
    /*
     * Four services, and each is genuinely un-photographable. A massage and
     * a training session have no object at all. A dead battery looks
     * exactly like a working one. And a car whose keys are locked inside is
     * a car: a photograph tells the locksmith nothing he will not see on
     * arrival, and asking for one at the roadside at night is the same
     * discourtesy as asking someone booking a haircut to photograph their
     * hair.
     */
    const none = services.filter((s) => s.mediaIntent === "NONE").map((s) => s.id);
    expect(none.sort()).toEqual([
      "svc-car-lockout",
      "svc-jump-start",
      "svc-massage",
      "svc-trainer",
    ]);
    for (const id of none) expect(pilotServiceById[id]!.customerPhotoPromptHe).toBeNull();
  });

  it("agrees with the photo prompt in both directions", () => {
    // mediaIntent NONE and a photo prompt would be two fields disagreeing
    // about the same fact — the kind of drift that survives review because
    // each field is individually plausible.
    for (const s of services) {
      if (s.mediaIntent === "NONE") expect(s.customerPhotoPromptHe, s.id).toBeNull();
      else expect(s.customerPhotoPromptHe, s.id).toBeTruthy();
    }
  });

  it("treats a photo of a wanted result as INSPIRATION, not evidence", () => {
    for (const id of ["svc-haircut", "svc-nails"]) {
      expect(pilotServiceById[id]!.mediaIntent, id).toBe("INSPIRATION");
    }
    expect(pilotServiceById["svc-leak"]!.mediaIntent).toBe("PROBLEM_EVIDENCE");
  });
});


/**
 * "מה צריך?" OR "את מי צריך?"
 *
 * Amit: *"מתלבט איתך אם צריך פה את התפקידים גם של האנשי מקצוע ולא רק
 * בעיות."* The rule is derived from the catalogue rather than stored
 * beside it, so these are the properties that must hold for it to stay
 * honest as services are added.
 */
describe("categoryAsksForPerson", () => {
  const byId = (ids: string[]) => ids.map((id) => pilotServiceById[id]!).filter(Boolean);

  it("asks who when every service in the group is a person", () => {
    expect(categoryAsksForPerson(byId(["svc-haircut", "svc-makeup", "svc-nails"]))).toBe(true);
  });

  it("asks what when any of them is a fault", () => {
    // The dangerous case: one barber among eight repairs is a category of
    // repairs, and asking "את מי צריך?" over a list of faults is worse
    // than the question it replaced.
    expect(categoryAsksForPerson(byId(["svc-haircut", "svc-leak"]))).toBe(false);
    expect(categoryAsksForPerson(byId(["svc-leak", "svc-blockage"]))).toBe(false);
  });

  it("asks what when there is nothing to go on", () => {
    // An empty category must not flip the question by default. "את מי
    // צריך?" over no rows at all is the app sounding confident about a
    // list it does not have.
    expect(categoryAsksForPerson([])).toBe(false);
  });

  it("agrees with the way the match is actually made", () => {
    /*
     * The two are derived from the same field on purpose. If a service
     * ever asked "את מי" and then assigned somebody without showing
     * them, the screen would have promised a choice the dispatch does
     * not give — so this asserts they cannot come apart.
     */
    for (const s of allServices(pilotCatalog)) {
      if (categoryAsksForPerson([s])) {
        expect(providerChoiceFor(s)).toBe("CONFIRM_MATCH");
      }
    }
  });
});
