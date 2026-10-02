import { describe, expect, it } from "vitest";

import { pilotCatalog } from "../src/pilot-catalog";
import { pilotIntakeByService } from "../src/intake";
import { WORLD_DISTRICTS } from "../src/world-districts";
import { CUSTOMER_CATEGORIES } from "../src/customer-categories";

/**
 * IS EVERY FIELD FILLED?
 *
 * Amit: *"שכל השדות מלאים."* That is not a styling note — a service with
 * no description is a blank space on a screen a customer is standing in
 * front of at eleven at night, and a service with no typical duration
 * gives the professional an offer card with a hole in it.
 *
 * Checking it by eye means opening 43 screens. Checking it here means it
 * cannot regress, and a new service cannot be added half-written.
 *
 * Each rule below names the SCREEN that breaks without it, because a
 * completeness test with no consequence attached is how a project ends up
 * with a rule nobody can justify and everybody works around.
 */

const services = pilotCatalog.flatMap((d) => d.categories.flatMap((c) => c.services));

describe("every service is fully written", () => {
  it("has a name and a description", () => {
    // The service page's title and its one-line explanation.
    const bare = services.filter((s) => !s.nameHe.trim() || !s.descriptionHe.trim());
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("has concrete cases to tap", () => {
    // "מה הכי מתאים?" on the service page. With none, the customer is
    // handed an empty text box and asked to write a brief.
    const bare = services.filter((s) => s.symptomsHe.length === 0);
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("has words a customer would actually type", () => {
    // The matcher reads these. A service with no keywords is unreachable
    // from the search box — it exists and cannot be found.
    const bare = services.filter((s) => s.keywordsHe.length === 0);
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("says what a photograph of this work would show", () => {
    const bare = services.filter((s) => !s.photoSubjectHe.trim());
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("has intake questions if a customer can order it", () => {
    /*
     * Every question earns its place: it changes what the professional
     * brings, how long they book, or whether they can take the job.
     *
     * Scoped to services that can actually be ordered. `svc-gas` and
     * `svc-doctor` are INACTIVE — a gas fitter needs a statutory licence
     * and a home doctor needs medical regulation, and both are §4
     * decisions nobody has made. Writing their intake now would be
     * building a screen no customer can reach, and worse, it would make
     * the catalogue look ready for a service that is not.
     */
    const bare = services
      .filter((s) => s.activationStatus !== "INACTIVE")
      .filter((s) => (pilotIntakeByService[s.id] ?? []).length === 0);
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("gives the professional a duration to plan around, where there is one", () => {
    /*
     * `typicalMinutes` is what the offer card says the job will take, and
     * a NOW job without it asks somebody to accept work of unknown length
     * in ten seconds. So it is required for those.
     *
     * It is NOT required for SCHEDULED_ONLY work, and that is the honest
     * line rather than a convenient one. "Paint a room" ranges from two
     * hours to two days depending on the room, and a number invented to
     * satisfy a test would be a fabricated estimate on a professional's
     * screen — the same class of thing as a fabricated ETA. Scheduled work
     * is agreed between the two people, which is what SCHEDULED_ONLY means.
     */
    const bare = services
      .filter((s) => s.fulfillmentProfile !== "SCHEDULED_ONLY")
      .filter((s) => !s.typicalMinutes);
    expect(bare.map((s) => s.id)).toEqual([]);
  });

  it("states a sensible duration range", () => {
    const wrong = services.filter(
      (s) => s.typicalMinutes && (s.typicalMinutes[0] <= 0 || s.typicalMinutes[1] < s.typicalMinutes[0])
    );
    expect(wrong.map((s) => s.id)).toEqual([]);
  });
});

describe("every trade has somewhere to happen", () => {
  it("has a district with a venue and both characters", () => {
    for (const [code, d] of Object.entries(WORLD_DISTRICTS)) {
      expect(d.venueAssetId, code).toBeTruthy();
      expect(d.characterWorldAssetId, code).toBeTruthy();
      expect(d.characterPortraitAssetId, code).toBeTruthy();
      expect(d.brandHe.trim(), code).toBeTruthy();
      expect(d.labelHe.trim(), code).toBeTruthy();
    }
  });

  it("is reachable from the home screen", () => {
    // A department with no category is a set of services that exist, pass
    // eligibility, have professionals online — and that no customer can
    // reach, because nothing on the home screen leads there.
    const covered = new Set(CUSTOMER_CATEGORIES.flatMap((c) => c.departments));
    const orphans = Object.keys(WORLD_DISTRICTS).filter((d) => !covered.has(d as never));
    expect(orphans).toEqual([]);
  });
});

describe("every category is fully written", () => {
  it("has a label and a note", () => {
    for (const c of CUSTOMER_CATEGORIES) {
      expect(c.labelHe.trim(), c.id).toBeTruthy();
      expect(c.noteHe.trim(), c.id).toBeTruthy();
      expect(c.departments.length, c.id).toBeGreaterThan(0);
    }
  });
});
