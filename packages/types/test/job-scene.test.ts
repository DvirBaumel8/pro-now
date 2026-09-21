import { describe, expect, it } from "vitest";

import {
  JOB_STATES,
  leavingCancels,
  livingMapViolations,
  sceneIsOver,
  scenePhaseForJob,
  DEMO_WORLD,
  type JobState,
  type LivingMapState,
} from "../src";

/**
 * The job says one thing; the world shows another. These tests are about
 * the join between them, which is where a screen quietly starts lying.
 */
describe("scenePhaseForJob", () => {
  it("answers for every job state the server can send", () => {
    // Not a formality. A new state added to JOB_STATES with no thought
    // here would fall through to the default and silently show a search
    // for a job that is, say, in dispute.
    for (const s of JOB_STATES) {
      expect(["SEARCHING", "CANDIDATES_FOUND", "MATCH_REVEAL", "ASSIGNED_ROUTE"]).toContain(
        scenePhaseForJob(s)
      );
    }
  });

  it("never claims to have found candidates from a status alone", () => {
    /*
     * The heart of it. CANDIDATES_FOUND and MATCH_REVEAL require named
     * people; a job status names nobody. If this function ever returns one
     * of them, some screen will draw bubbles for candidates that do not
     * exist — /CLAUDE.md §3.
     */
    for (const s of JOB_STATES) {
      expect(scenePhaseForJob(s)).not.toBe("CANDIDATES_FOUND");
      expect(scenePhaseForJob(s)).not.toBe("MATCH_REVEAL");
    }
  });

  it("shows the search while nobody is assigned", () => {
    expect(scenePhaseForJob("SEARCHING")).toBe("SEARCHING");
    expect(scenePhaseForJob("OFFERING")).toBe("SEARCHING");
  });

  it("opens the street the moment somebody is assigned", () => {
    // Amit's split: searching shows, waiting plays. LivingMapScene only
    // lets the customer steer in ASSIGNED_ROUTE, so this single assertion
    // is what decides whether the game exists at all.
    expect(scenePhaseForJob("PRO_ASSIGNED")).toBe("ASSIGNED_ROUTE");
    expect(scenePhaseForJob("PRO_EN_ROUTE")).toBe("ASSIGNED_ROUTE");
  });

  it("does not snap back to searching once the professional has arrived", () => {
    // A world that reverted to "looking for someone" while the customer's
    // plumber is standing in the kitchen would read as the job being lost.
    for (const s of ["PRO_ARRIVED", "DIAGNOSIS", "IN_PROGRESS"] as JobState[]) {
      expect(scenePhaseForJob(s)).toBe("ASSIGNED_ROUTE");
    }
  });

  it("produces a state the living map considers legal", () => {
    /*
     * The mapping and the invariant checker are written apart, so this is
     * the test that makes them agree: build the state each phase implies
     * and run the product's own rules over it.
     */
    for (const s of JOB_STATES) {
      const phase = scenePhaseForJob(s);
      const state: LivingMapState = {
        phase,
        theme: "HOME",
        adapter: DEMO_WORLD,
        candidates: [],
        journey:
          phase === "ASSIGNED_ROUTE"
            ? { assignmentId: "asg_1", latestFix: null, previousFix: null }
            : null,
      };
      expect(livingMapViolations(state)).toEqual([]);
    }
  });
});

describe("leavingCancels", () => {
  it("is true only while the request is still unanswered", () => {
    expect(leavingCancels("SEARCHING")).toBe(true);
    expect(leavingCancels("OFFERING")).toBe(true);
    expect(leavingCancels("PRO_ASSIGNED")).toBe(false);
    expect(leavingCancels("PRO_EN_ROUTE")).toBe(false);
  });

  it("does not offer to cancel a job that is already cancelled", () => {
    expect(leavingCancels("CANCELLED")).toBe(false);
  });
});

describe("sceneIsOver", () => {
  it("is true exactly for the states with nothing left to watch", () => {
    const over = JOB_STATES.filter(sceneIsOver);
    expect(over).toEqual(["CLOSED", "CANCELLED", "DISPUTED"]);
  });
});
