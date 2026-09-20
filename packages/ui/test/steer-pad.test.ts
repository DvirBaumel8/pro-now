import { describe, expect, it } from "vitest";

import { headingFrom } from "../src/components/livingmap/steerPad";

const R = 58;

describe("reading a thumb as a direction", () => {
  it("treats up on screen as north", () => {
    // Screen `y` grows downward, so a touch above centre is negative.
    // Getting this backwards sends the avatar the wrong way, which is the
    // single most obvious way a control can feel broken.
    expect(headingFrom(0, -R * 0.8, R)).toBe("N");
    expect(headingFrom(0, R * 0.8, R)).toBe("S");
  });

  it("reads the four corners", () => {
    const d = R * 0.6;
    expect(headingFrom(d, -d, R)).toBe("NE");
    expect(headingFrom(d, d, R)).toBe("SE");
    expect(headingFrom(-d, d, R)).toBe("SW");
    expect(headingFrom(-d, -d, R)).toBe("NW");
  });

  it("ignores a thumb resting on the hub", () => {
    // Without a dead zone a thumb at rest picks an arbitrary direction and
    // the avatar wanders off on its own.
    expect(headingFrom(1, 1, R)).toBeNull();
    expect(headingFrom(0, 0, R)).toBeNull();
  });

  it("commits once the thumb leaves the hub", () => {
    expect(headingFrom(R * 0.3, 0, R)).toBe("E");
  });

  it("gives eight headings and never a ninth", () => {
    const seen = new Set<string | null>();
    for (let deg = 0; deg < 360; deg += 3) {
      const rad = (deg * Math.PI) / 180;
      seen.add(headingFrom(Math.cos(rad) * R, Math.sin(rad) * R, R));
    }
    expect(seen.size).toBe(8);
    expect(seen.has(null)).toBe(false);
  });
});
