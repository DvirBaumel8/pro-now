import { describe, expect, it } from "vitest";

import {
  minCoverZoom,
  MIN_VENUE_SEPARATION,
  SPOT_SEPARATION,
  PLATE_ASPECT,
  WORLD_SIZE,
  worldBox,
  worldSizeViolations,
  worldZoomFor,
  alongStreet,
  plateSpotFor,
  depthOrder,
  depthScale,
  DISTRICT_SITES,
  districtCentre,
  neighbourhoodViolations,
  PLATE_SPOTS,
  routeToDistrict,
  STREETS,
  streetById,
  venueSlots,
  visibleDistricts,
  WELCOME_VIEW,
  welcomeViewViolations,
  WORLD_EXTENT,
  worldZoomFor,
} from "../src";

describe("the neighbourhood", () => {
  it("passes its own rules", () => {
    expect(neighbourhoodViolations()).toEqual([]);
  });

  it("is bigger than the screen in both directions", () => {
    expect(WORLD_EXTENT.width).toBeGreaterThan(1);
    expect(WORLD_EXTENT.height).toBeGreaterThan(1);
  });

  it("never shows everything at once — there is always a corner left", () => {
    const shots = [
      { focus: { u: 0.5, v: 0.5 }, zoom: 1 },
      { focus: { u: 0.5, v: 0.3 }, zoom: 1 },
      { focus: { u: 0.8, v: 0.7 }, zoom: 1 },
      { focus: { u: 0.5, v: 0.5 }, zoom: 1.4 },
    ];
    for (const shot of shots) {
      expect(visibleDistricts(shot).length).toBeLessThan(DISTRICT_SITES.length);
    }
  });

  it("still lands the customer somewhere, not in an empty field", () => {
    expect(visibleDistricts({ focus: { u: 0.5, v: 0.5 }, zoom: 1 }).length).toBeGreaterThan(0);
  });

  it("spreads the trades over four streets, not one", () => {
    expect(new Set(DISTRICT_SITES.map((s) => s.street)).size).toBe(4);
  });

  it("has a street reached only from another street", () => {
    // "back" never meets "main": it is found, not shown.
    const main = streetById("main");
    const back = streetById("back");
    const near = back.path.some((b) => main.path.some((m) => Math.hypot(m.u - b.u, m.v - b.v) < 0.12));
    expect(near).toBe(false);
  });

  it("walks a street from end to end", () => {
    const s = streetById("main");
    expect(alongStreet(s, 0)).toEqual(s.path[0]);
    expect(alongStreet(s, 1)).toEqual(s.path.at(-1));
    const mid = alongStreet(s, 0.5);
    expect(mid.v).toBeGreaterThan(s.path[0]!.v);
    expect(mid.v).toBeLessThan(s.path.at(-1)!.v);
  });

  it("clamps rather than walking off the end", () => {
    const s = streetById("market");
    expect(alongStreet(s, -3)).toEqual(s.path[0]);
    expect(alongStreet(s, 9)).toEqual(s.path.at(-1));
  });

  it("gives a trade several shops, not one", () => {
    const slots = venueSlots("BEAUTY", 3);
    expect(slots).toHaveLength(3);
    const spread = Math.max(...slots.map((s) => s.v)) - Math.min(...slots.map((s) => s.v));
    expect(spread).toBeGreaterThan(0.02);
  });

  it("spreads one trade's shops out, so there is something to travel between", () => {
    /*
     * This used to demand a slot on each side of the trade's own centre,
     * and it broke the moment a plate put a trade near the right-hand
     * edge — there is no "further right" there, and the demand was an
     * accident of the plate it was written against rather than a rule
     * about the world.
     *
     * What actually matters is that the shops of one trade are not
     * stacked on one another: arriving somewhere with options in it is
     * the whole point, and options you cannot see apart are one option.
     */
    const slots = venueSlots("PETS", 4);
    const apart = slots.flatMap((a, i) =>
      slots.slice(i + 1).map((b) => Math.hypot(a.u - b.u, a.v - b.v))
    );
    expect(Math.max(...apart)).toBeGreaterThan(0.2);
    expect(new Set(slots.map((s) => `${s.u},${s.v}`)).size).toBe(slots.length);
  });

  it("copes with a single candidate", () => {
    expect(venueSlots("VEHICLE", 1)).toHaveLength(1);
    expect(venueSlots("VEHICLE", 0)).toEqual([]);
  });

  it("keeps every shop inside the world", () => {
    for (const site of DISTRICT_SITES) {
      for (const p of venueSlots(site.department, 4)) {
        expect(p.u).toBeGreaterThanOrEqual(0);
        expect(p.u).toBeLessThanOrEqual(1);
        expect(p.v).toBeGreaterThanOrEqual(0);
        expect(p.v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("travels along the streets rather than flying straight there", () => {
    const from = { u: 0.5, v: 0.2 };
    const route = routeToDistrict(from, "LOGISTICS");
    expect(route.length).toBeGreaterThan(3);
    expect(route[0]).toEqual(from);
    expect(route.at(-1)).toEqual(districtCentre("LOGISTICS"));

    // A straight line would have every point on one segment. A street bends.
    const straight = route.every((p, i) => {
      if (i === 0 || i === route.length - 1) return true;
      const t = (p.v - route[0]!.v) / (route.at(-1)!.v - route[0]!.v || 1);
      const expectedU = route[0]!.u + (route.at(-1)!.u - route[0]!.u) * t;
      return Math.abs(p.u - expectedU) < 0.01;
    });
    expect(straight).toBe(false);
  });

  it("sizes and stacks by depth, one rule for everything", () => {
    expect(depthScale(0.9)).toBeGreaterThan(depthScale(0.2));
    expect(depthOrder(0.9)).toBeGreaterThan(depthOrder(0.2));
  });

  it("gives every trade a home", () => {
    for (const s of STREETS) expect(s.path.length).toBeGreaterThan(1);
    expect(DISTRICT_SITES).toHaveLength(11);
  });
});

describe("the first frame", () => {
  it("opens on work rather than on an empty road", () => {
    expect(welcomeViewViolations()).toEqual([]);
    expect(visibleDistricts(WELCOME_VIEW).length).toBeGreaterThanOrEqual(2);
  });

  it("still leaves most of the neighbourhood unseen", () => {
    expect(visibleDistricts(WELCOME_VIEW).length).toBeLessThan(DISTRICT_SITES.length);
  });
});

describe("how much world each shot shows", () => {
  it("opens WIDE on the whole neighbourhood, not on a patch of road", () => {
    // At this zoom one screen covers the world's full width.
    expect(worldZoomFor("WIDE")).toBeCloseTo(1 / WORLD_EXTENT.width, 6);
  });

  it("steps in, never out, as the story narrows", () => {
    expect(worldZoomFor("DISTRICT")).toBeGreaterThan(worldZoomFor("WIDE"));
    expect(worldZoomFor("VENUE")).toBeGreaterThan(worldZoomFor("DISTRICT"));
  });

  it("follows a journey wider than it inspects a shop", () => {
    expect(worldZoomFor("ROUTE")).toBeLessThan(worldZoomFor("VENUE"));
  });

  it("never shows less than a third of the world's width", () => {
    // The old bug: zoom 1 against a 2.4-screen world meant 40% of it, and
    // DISTRICT and VENUE pushed in from there until only tarmac was left.
    for (const shot of ["WIDE", "DISTRICT", "VENUE", "ROUTE"] as const) {
      const visibleFraction = 1 / (worldZoomFor(shot) * WORLD_EXTENT.width);
      expect(visibleFraction).toBeGreaterThan(0.33);
    }
  });
});

describe("the measured plate spots", () => {
  it("keeps every shop clear of the plate's edges", () => {
    // A building is drawn outwards from its footing, so a spot at the very
    // edge puts half the shopfront past the end of the world.
    for (const p of PLATE_SPOTS) {
      expect(p.u).toBeGreaterThanOrEqual(0.12);
      expect(p.u).toBeLessThanOrEqual(0.88);
    }
  });

  it("gives every trade a spot of its own", () => {
    expect(PLATE_SPOTS.length).toBeGreaterThanOrEqual(DISTRICT_SITES.length);
  });
});

describe("shops of one trade do not stand on top of each other", () => {
  it("separates three candidates by more than a building's width", () => {
    // The fault this catches: taking the three NEAREST measured spots put
    // two plumbers 0.12 of the world apart, and a shopfront is about 0.22
    // wide — so the second building was drawn behind the first at a slight
    // offset and read as a ghost rather than as another place.
    for (const site of DISTRICT_SITES) {
      const dept = site.department;
      const slots = venueSlots(dept, 3);
      expect(slots).toHaveLength(3);
      for (let i = 0; i < slots.length; i += 1) {
        for (let j = i + 1; j < slots.length; j += 1) {
          const d = Math.hypot(slots[i]!.u - slots[j]!.u, slots[i]!.v - slots[j]!.v);
          expect(d).toBeGreaterThanOrEqual(MIN_VENUE_SEPARATION * 0.6);
        }
      }
    }
  });

  it("still returns one slot per candidate when the street runs out", () => {
    // Twelve professionals online for one trade is more than the
    // neighbourhood has pavement. Dropping one would be a lie about supply,
    // so they crowd instead.
    expect(venueSlots("HOME_URGENT", 12)).toHaveLength(12);
  });

  it("puts a single candidate on their own trade's spot", () => {
    expect(venueSlots("BEAUTY", 1)[0]).toEqual(plateSpotFor("BEAUTY"));
  });
});

describe("sizes are measured against the world, not the screen", () => {
  it("holds its own invariants", () => {
    expect(worldSizeViolations()).toEqual([]);
  });

  it("keeps a shop narrower than the gap the spots guarantee", () => {
    // Otherwise the separation enforced when the plate was measured buys
    // nothing, and the buildings collide again at the next camera move.
    for (const site of DISTRICT_SITES) {
      const a = plateSpotFor(site.department);
      for (const other of DISTRICT_SITES) {
        if (other.department === site.department) continue;
        const b = plateSpotFor(other.department);
        const apart =
          Math.abs(a.u - b.u) >= SPOT_SEPARATION.u || Math.abs(a.v - b.v) >= SPOT_SEPARATION.v;
        expect(apart, `${site.department} vs ${other.department}`).toBe(true);
      }
    }
  });

  it("puts the whole world on one screen at the widest shot", () => {
    // `worldBox` at the fitting zoom must be exactly one viewport wide —
    // this is what "pulled all the way back" means, and it is the moment
    // the old viewport-relative sizes were most wrong.
    const box = worldBox(390, 550, worldZoomFor("WIDE"));
    expect(Math.round(box.width)).toBe(390);
  });

  it("shapes the world like the plate rather than like the phone", () => {
    // A box shaped like the screen centre-crops the artwork, so a measured
    // coordinate lands somewhere different on every device.
    for (const [w, h] of [[390, 550], [430, 700], [360, 480]]) {
      const box = worldBox(w, h, 1);
      expect(box.width / box.height).toBeCloseTo(PLATE_ASPECT, 5);
    }
  });
});

describe("people are the same size as people", () => {
  /*
   * Amit: *"תוודאו שכל הפרופורציות נכונות."* They were not, and the
   * reason is worth keeping: the doorway professionals were sized
   * against a shopfront's WIDTH and the customer's avatar against the
   * WORLD'S HEIGHT. Two rulers, nothing holding them together, and the
   * customer ended up 2.75 times the height of the professional beside
   * him.
   */
  it("measures every figure against the buildings, not against the world", () => {
    // One number for a person's height, one allowance for the avatar's
    // nearness. Anything else reintroduces the second ruler.
    expect(WORLD_SIZE.personOfVenue).toBeGreaterThan(0);
    expect(WORLD_SIZE.avatarOfPerson).toBeGreaterThanOrEqual(1);
  });

  it("keeps the customer a person rather than a landmark", () => {
    expect(WORLD_SIZE.avatarOfPerson).toBeLessThanOrEqual(1.4);
  });

  it("fits somebody under the lintel of the shop they stand in front of", () => {
    // A figure 0.42 of a shopfront's width is roughly a third of its
    // height at the proportions these buildings are drawn at.
    expect(WORLD_SIZE.personOfVenue).toBeLessThan(0.6);
  });

  it("keeps a walking person smaller than the vehicles sharing the street", () => {
    /*
     * Expressed in the same units to be comparable at all: a traveller is
     * a fraction of the world's HEIGHT, a person a fraction of a
     * shopfront's WIDTH, and the plate is taller than it is wide.
     */
    const worldHeightPerWidth = 1 / PLATE_ASPECT;
    const personOfWorldWidth = WORLD_SIZE.district * WORLD_SIZE.personOfVenue;
    const travellerOfWorldWidth = WORLD_SIZE.travellerHeight * worldHeightPerWidth;
    expect(personOfWorldWidth).toBeLessThan(travellerOfWorldWidth);
    // But not absurdly so: a scooter is not a bus.
    expect(travellerOfWorldWidth / personOfWorldWidth).toBeLessThan(2);
  });

  it("keeps the avatar within a stride of the professionals it walks past", () => {
    const person = WORLD_SIZE.district * WORLD_SIZE.personOfVenue;
    const avatar = person * WORLD_SIZE.avatarOfPerson;
    expect(avatar / person).toBeLessThan(1.4);
    expect(avatar).toBeLessThan(WORLD_SIZE.district);
  });
});

describe("the camera always covers the screen", () => {
  /*
   * The zoom table is written as a fraction of the world's WIDTH and the
   * plate is portrait, so a wide shot could produce a world shorter than
   * the phone. The clamp then pinned it to a corner and the rest of the
   * screen was background colour — black bands down two sides of the
   * city, on the widest shots, which are the ones meant to show the most
   * of it.
   */
  const PHONES: [number, number][] = [
    [390, 844], // iPhone 14
    [430, 932], // iPhone Pro Max
    [360, 800], // common Android
    [412, 915],
    [320, 568], // the smallest phone still worth supporting
    [768, 1024], // a tablet, where the plate is wider than the screen
  ];

  it("never draws the world smaller than the viewport, on any shot or phone", () => {
    for (const [w, h] of PHONES) {
      for (const shot of ["WIDE", "EXPLORE", "ROUTE", "DISTRICT", "VENUE"] as const) {
        const box = worldBox(w, h, worldZoomFor(shot), true);
        expect(box.width, `${shot} on ${w}x${h}`).toBeGreaterThanOrEqual(w - 0.01);
        expect(box.height, `${shot} on ${w}x${h}`).toBeGreaterThanOrEqual(h - 0.01);
      }
    }
  });

  it("raises a zoom that would not cover, and leaves the rest alone", () => {
    const [w, h] = [390, 844];
    const min = minCoverZoom(w, h);
    // Below the floor: raised to exactly cover.
    const tiny = worldBox(w, h, min / 3, true);
    expect(tiny.width).toBeCloseTo(worldBox(w, h, min, true).width, 5);
    // Above it: untouched.
    const close = worldBox(w, h, min * 2, true);
    expect(close.width).toBeGreaterThan(tiny.width * 1.9);
  });

  /*
   * A world that fits on the screen is a picture, not somewhere to walk.
   * This is the shot the customer strolls in, so it has to have somewhere
   * to stroll to.
   */
  it("gives the walking shot real ground to cover", () => {
    const box = worldBox(390, 844, worldZoomFor("EXPLORE"), true);
    expect(box.width / 390).toBeGreaterThan(1.5);
    expect(box.height / 844).toBeGreaterThan(1.3);
  });

  it("keeps the walking shot wider than the one used to read a shopfront", () => {
    expect(worldZoomFor("EXPLORE")).toBeLessThan(worldZoomFor("VENUE"));
  });
});
