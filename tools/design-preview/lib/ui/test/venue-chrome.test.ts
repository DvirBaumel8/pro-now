import { describe, expect, it } from "vitest";

import { venueChrome } from "../src/components/livingmap/venueChrome";

const base = { muted: false, dimmed: false, selected: false, cameraFollowing: false };

describe("venueChrome", () => {
  it("names nobody while the street is still being searched", () => {
    // The search screen drew real names on shopfronts before dispatch had
    // chosen anyone. /CLAUDE.md §3: never fabricate availability.
    expect(venueChrome({ ...base, muted: true })).toEqual({ card: false, sign: false });
    expect(venueChrome({ ...base, muted: true, selected: true })).toEqual({ card: false, sign: false });
  });

  it("gives an ordinary shop its nameplate and no card", () => {
    expect(venueChrome(base)).toEqual({ card: false, sign: true });
  });

  it("opens the card on the shop being looked at, and drops its sign", () => {
    // Two boxes saying the same thing stacked on each other.
    expect(venueChrome({ ...base, selected: true })).toEqual({ card: true, sign: false });
  });

  it("shows nothing on a shop that has receded", () => {
    // 0.55 of an 0.35 venue is 0.19, at which type is damage rather than
    // quiet.
    expect(venueChrome({ ...base, dimmed: true })).toEqual({ card: false, sign: false });
  });

  it("stands the card down while the camera is following, and gives the name back to the sign", () => {
    // The whole point: the chosen shop must not go anonymous when its
    // card cannot be kept on the phone.
    const walking = venueChrome({ ...base, selected: true, cameraFollowing: true });
    expect(walking.card).toBe(false);
    expect(walking.sign).toBe(true);
  });

  it("never draws both at once", () => {
    for (const muted of [false, true])
      for (const dimmed of [false, true])
        for (const selected of [false, true])
          for (const cameraFollowing of [false, true]) {
            const c = venueChrome({ muted, dimmed, selected, cameraFollowing });
            expect(c.card && c.sign).toBe(false);
          }
  });
});
