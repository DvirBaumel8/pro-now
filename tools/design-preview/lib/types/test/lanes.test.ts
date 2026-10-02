import { describe, expect, it } from "vitest";

import { laneForGait, type Gait } from "../src/world-motion";
import { ROAD, roadAt, STREETS } from "../src/world-neighbourhood";

/**
 * NOBODY WALKS IN THE ROAD.
 *
 * `roadAt` was written to prove that no BUILDING stands in the
 * carriageway, because a shopfront on a zebra crossing is obvious once
 * somebody sees it. The question was never asked the other way round, and
 * the answer was that every moving thing in the world took the road —
 * the dog walker included. A person with a dog walked down the middle of
 * it for as long as the street has existed.
 */
describe("which lane a moving thing takes", () => {
  it("puts anything on legs on the pavement", () => {
    for (const gait of ["WALK", "RUN"] as Gait[]) {
      expect(laneForGait(gait), gait).toBe("PAVEMENT");
    }
  });

  it("puts anything on wheels on the road", () => {
    for (const gait of ["RIDE", "DRIVE", "HAUL"] as Gait[]) {
      expect(laneForGait(gait), gait).toBe("ROAD");
    }
  });

  it("answers for every gait there is", () => {
    // A new gait with no lane would fall through to whatever the last
    // branch happens to be, which is how the dog walker ended up driving.
    const every: Gait[] = ["WALK", "RUN", "RIDE", "DRIVE", "HAUL"];
    for (const gait of every) {
      expect(["ROAD", "PAVEMENT"], gait).toContain(laneForGait(gait));
    }
  });

  it("keeps the pavement out of the carriageway, measured", () => {
    /*
     * The two measurements are made to argue rather than to agree
     * quietly: every point of every street spine is checked against the
     * road's own width at that depth. If a street were ever routed
     * across the tarmac, putting pedestrians on it would move the
     * problem rather than fix it.
     */
    const offenders: string[] = [];
    for (const street of STREETS) {
      for (const point of street.path) {
        const road = roadAt(point.v);
        if (Math.abs(point.u - road.u) < road.halfWidth) {
          offenders.push(`${street.id} at v=${point.v} is ${Math.abs(point.u - road.u).toFixed(3)} from the middle of a road ${road.halfWidth.toFixed(3)} wide`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("and the road really is somewhere else — the control", () => {
    // If the check above cannot fail it proves nothing. The carriageway's
    // own points must be inside the carriageway.
    const inside = ROAD.path.filter((q) => Math.abs(q.u - roadAt(q.v).u) < roadAt(q.v).halfWidth);
    expect(inside.length).toBe(ROAD.path.length);
  });
});
