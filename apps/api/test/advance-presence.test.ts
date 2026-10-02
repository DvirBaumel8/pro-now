import { describe, it, expect } from "vitest";
import {
  advancePresence,
  releaseAfterCompletion,
  releaseAfterCancellation,
} from "../src/domain/job/advance-presence.js";

function fakePrisma(state: { presenceState: string } | null) {
  return {
    state,
    client: {
      professionalProfile: {
        findUnique: async () => state,
        update: async ({ data }: any) => {
          if (state) state.presenceState = data.presenceState;
          return state;
        },
      },
    } as never,
  };
}

describe("advancePresence — the person moves with the job", () => {
  it("walks a professional along their own machine", async () => {
    const fake = fakePrisma({ presenceState: "ASSIGNED" });
    const result = await advancePresence(fake.client, "p1", "EN_ROUTE");
    expect(result).toEqual({ moved: true, from: "ASSIGNED", to: "EN_ROUTE" });
    expect(fake.state!.presenceState).toBe("EN_ROUTE");
  });

  it("treats a repeated tap as already done, not as an error", async () => {
    const fake = fakePrisma({ presenceState: "ARRIVED" });
    const result = await advancePresence(fake.client, "p1", "ARRIVED");
    expect(result.moved).toBe(false);
    expect(fake.state!.presenceState).toBe("ARRIVED");
  });

  it("refuses to drag somebody to a state the machine cannot reach", async () => {
    /*
     * The job's state and the person's can disagree — a support action, a
     * cancellation racing an arrival. Overwriting the person to match the
     * job is how somebody ends up marked AVAILABLE while standing in a
     * customer's kitchen.
     */
    const fake = fakePrisma({ presenceState: "AVAILABLE" });
    const result = await advancePresence(fake.client, "p1", "SERVICING");
    expect(result.moved).toBe(false);
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("does nothing for an unassigned job", async () => {
    const fake = fakePrisma(null);
    expect(await advancePresence(fake.client, null, "EN_ROUTE")).toEqual({
      moved: false,
      from: null,
      to: null,
    });
  });
});

describe("releaseAfterCompletion — back on the market", () => {
  it("returns a professional who finished to AVAILABLE", async () => {
    /*
     * THE BUG THIS EXISTS FOR.
     *
     * Nothing moved a professional off ASSIGNED, and dispatch only looks
     * at AVAILABLE ones — so accepting a single job removed them from the
     * market for the rest of their shift. On a platform whose promise is
     * that somebody comes now, the supply emptied itself one accept at a
     * time, and the only symptom was jobs finding nobody.
     */
    const fake = fakePrisma({ presenceState: "SERVICING" });
    const result = await releaseAfterCompletion(fake.client, "p1");
    expect(result.to).toBe("AVAILABLE");
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("passes through COMPLETING rather than jumping over it", async () => {
    // The machine has the step, so the record should show it. A support
    // screen needs somewhere to look if the second half ever fails.
    const seen: string[] = [];
    const state = { presenceState: "SERVICING" };
    const client = {
      professionalProfile: {
        findUnique: async () => state,
        update: async ({ data }: any) => {
          seen.push(data.presenceState);
          state.presenceState = data.presenceState;
          return state;
        },
      },
    } as never;
    await releaseAfterCompletion(client, "p1");
    expect(seen).toEqual(["COMPLETING", "AVAILABLE"]);
  });
});

describe("releaseAfterCancellation — a job that ended without finishing", () => {
  it("brings back a professional who was already on their way", async () => {
    // There is no such thing as un-arriving, so the remaining steps of
    // the job that will not happen are walked instead.
    const fake = fakePrisma({ presenceState: "EN_ROUTE" });
    await releaseAfterCancellation(fake.client, "p1");
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("brings back a professional who had only just been offered it", async () => {
    const fake = fakePrisma({ presenceState: "OFFER_RECEIVED" });
    await releaseAfterCancellation(fake.client, "p1");
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("leaves an already-available professional alone", async () => {
    const fake = fakePrisma({ presenceState: "AVAILABLE" });
    await releaseAfterCancellation(fake.client, "p1");
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("does not haul somebody out of a shift they are ending", async () => {
    // ENDING_SHIFT is their decision, and a cancelled job is not a reason
    // to put them back to work.
    const fake = fakePrisma({ presenceState: "ENDING_SHIFT" });
    await releaseAfterCancellation(fake.client, "p1");
    expect(fake.state!.presenceState).toBe("ENDING_SHIFT");
  });
});

describe("cancellation is its own edge, not a walk forward", () => {
  it("brings back a professional cancelled before they set off", async () => {
    /*
     * The gap that produced this: the JOB machine allows
     * PRO_ASSIGNED → CANCELLED, and the PRESENCE machine had no edge out
     * of ASSIGNED except EN_ROUTE. A customer changing their mind in the
     * first minute left the professional stranded for the shift.
     */
    const fake = fakePrisma({ presenceState: "ASSIGNED" });
    const result = await releaseAfterCancellation(fake.client, "p1");
    expect(result).toEqual({ moved: true, from: "ASSIGNED", to: "AVAILABLE" });
    expect(fake.state!.presenceState).toBe("AVAILABLE");
  });

  it("never records a step that did not happen", async () => {
    // Walking EN_ROUTE forward to AVAILABLE would write ARRIVED and
    // SERVICING into the record of a job nobody arrived at. One write.
    const seen: string[] = [];
    const state = { presenceState: "EN_ROUTE" };
    const client = {
      professionalProfile: {
        findUnique: async () => state,
        update: async ({ data }: any) => {
          seen.push(data.presenceState);
          state.presenceState = data.presenceState;
          return state;
        },
      },
    } as never;
    await releaseAfterCancellation(client, "p1");
    expect(seen).toEqual(["AVAILABLE"]);
  });

  it("releases from every state a job can be cancelled in", async () => {
    for (const from of ["OFFER_RECEIVED", "RESERVED", "ASSIGNED", "EN_ROUTE", "ARRIVED", "SERVICING"]) {
      const fake = fakePrisma({ presenceState: from });
      await releaseAfterCancellation(fake.client, "p1");
      expect(fake.state!.presenceState, from).toBe("AVAILABLE");
    }
  });
});
