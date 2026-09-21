import { describe, expect, it } from "vitest";

import {
  VEHICLE_RESPONSE,
  type VehicleState,
  curvatureBetween,
  vehicleMotionViolations,
  vehiclePose,
} from "../src/vehicle-motion";

const cruising: VehicleState = { distance: 100, speed: 9, heading: { u: 0, v: -1 } };

describe("a vehicle reacts to forces", () => {
  it("everything the response has to be true of", () => {
    expect(vehicleMotionViolations()).toEqual([]);
  });

  /*
   * THE ONE THAT MATTERS MOST, AND IT IS ABOUT WHAT MUST NOT HAPPEN.
   *
   * ChatGPT: *"בלי bounce מחזורי. רכב לא 'עושה אנימציה'; הוא מגיב
   * לכוחות."* A van holding a steady speed on a straight road is
   * perfectly still. Anything that moves while nothing is happening to
   * it is the nineties sprite this replaces.
   */
  it("is perfectly still at a steady speed on a straight road", () => {
    const pose = vehiclePose(cruising, 0, 0);
    expect(pose.pitch).toBe(1);
    expect(pose.lean).toBe(0);
    expect(pose.braking).toBe(0);
  });

  it("lifts its nose under power and drops it under the brakes", () => {
    expect(vehiclePose(cruising, 2.5, 0).pitch).toBeGreaterThan(1);
    expect(vehiclePose(cruising, -2.5, 0).pitch).toBeLessThan(1);
  });

  it("never moves enough to be seen as a movement", () => {
    for (const accel of [-20, -6, 6, 20]) {
      const pose = vehiclePose({ ...cruising, speed: 22 }, accel, 0.4);
      // Float slop: the clamp is exact, the subtraction is not.
      expect(Math.abs(pose.pitch - 1)).toBeLessThanOrEqual(VEHICLE_RESPONSE.maxPitch + 1e-9);
      expect(Math.abs(pose.lean)).toBeLessThanOrEqual(VEHICLE_RESPONSE.maxLean + 1e-9);
    }
  });
});

describe("leaning through a corner", () => {
  /*
   * Lateral acceleration goes with the SQUARE of speed, which is both
   * the physics and the fix. Written linear first, a van crawling round
   * a junction at half a metre per second still leaned two degrees — a
   * vehicle doing something while nothing was happening to it.
   */
  it("does not lean at a crawl", () => {
    expect(Math.abs(vehiclePose({ ...cruising, speed: 0.4 }, 0, 0.25).lean)).toBeLessThan(0.002);
  });

  it("leans through the same corner taken at speed", () => {
    expect(vehiclePose({ ...cruising, speed: 14 }, 0, 0.25).lean).toBeGreaterThan(0.02);
  });

  it("leans the other way round the other way", () => {
    const right = vehiclePose({ ...cruising, speed: 14 }, 0, 0.25).lean;
    const left = vehiclePose({ ...cruising, speed: 14 }, 0, -0.25).lean;
    expect(Math.sign(right)).toBe(-Math.sign(left));
  });
});

describe("the brake lights", () => {
  it("stay off for a lift rather than a brake", () => {
    expect(vehiclePose(cruising, -0.3, 0).braking).toBe(0);
  });

  it("come on progressively", () => {
    const light = vehiclePose(cruising, -1.5, 0).braking;
    const hard = vehiclePose(cruising, -3.2, 0).braking;
    expect(light).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(light);
    expect(vehiclePose(cruising, -20, 0).braking).toBe(1);
  });

  /*
   * *"אדום רק כשהחלק האחורי פונה אלינו, לבן מלפנים."* A red light
   * permanently on is one of the things that makes a sprite read as a
   * sticker. In this world `v` grows downwards and the viewer is at the
   * bottom, so a negative `v` heading is driving away.
   */
  it("only face the viewer when the vehicle is driving away", () => {
    expect(vehiclePose({ ...cruising, heading: { u: 0, v: -1 } }, 0, 0).showingRear).toBe(true);
    expect(vehiclePose({ ...cruising, heading: { u: 0, v: 1 } }, 0, 0).showingRear).toBe(false);
    expect(vehiclePose({ ...cruising, heading: { u: 1, v: 0 } }, 0, 0).showingRear).toBe(false);
  });
});

describe("how sharp a turn is", () => {
  it("is zero on a straight line", () => {
    expect(curvatureBetween({ u: 1, v: 0 }, { u: 1, v: 0 }, 10)).toBe(0);
  });

  it("is the angle over the distance", () => {
    expect(curvatureBetween({ u: 1, v: 0 }, { u: 0, v: 1 }, 10)).toBeCloseTo(Math.PI / 2 / 10, 12);
  });

  it("is signed", () => {
    const a = curvatureBetween({ u: 1, v: 0 }, { u: 0, v: 1 }, 10);
    const b = curvatureBetween({ u: 1, v: 0 }, { u: 0, v: -1 }, 10);
    expect(Math.sign(a)).toBe(-Math.sign(b));
  });

  it("is finite over no distance", () => {
    expect(curvatureBetween({ u: 1, v: 0 }, { u: 0, v: 1 }, 0)).toBe(0);
  });
});
