import { describe, expect, it } from "vitest";

import { canHandOffToMaps, mapsHandoffUrl } from "../src/maps-handoff";

/**
 * A BUTTON THAT SAYS IT OPENS MAPS HAS TO OPEN MAPS.
 *
 * Amit: *"איפה הכתובת נפתחת במפות עם זמן מוערך לנסיעה?"* The sheet's
 * button closed the sheet and did nothing, under a note about the maps
 * VENDOR being an open decision. That note is true and it was excusing
 * the wrong thing: computing routes needs a vendor, handing an address
 * to the app somebody already has needs a link.
 */
describe("handing an address to the person's own maps app", () => {
  const address = "רחוב הברזל 12, רמת אביב, תל אביב";

  it("uses the neutral scheme on Android, so the person picks their app", () => {
    expect(mapsHandoffUrl(address, "android")).toMatch(/^geo:0,0\?q=/);
  });

  it("uses Apple's scheme on iOS, which does not register geo:", () => {
    expect(mapsHandoffUrl(address, "ios")).toMatch(/^maps:\/\/\?q=/);
  });

  it("names a company only in a browser, which has no maps app to defer to", () => {
    // The one branch that has to choose, and it is chosen because there
    // is nothing else to hand the address to.
    expect(mapsHandoffUrl(address, "web")).toMatch(/^https:\/\//);
  });

  it("escapes the address rather than pasting it into a URL", () => {
    for (const platform of ["android", "ios", "web"] as const) {
      const url = mapsHandoffUrl(address, platform);
      expect(url, platform).not.toContain(" ");
      expect(url, platform).toContain(encodeURIComponent("רחוב הברזל 12"));
    }
  });

  it("sends the address as a search, never as invented coordinates", () => {
    /*
     * We have not geocoded anything — choosing a geocoder is the open
     * decision this module deliberately does not touch — so a lat/long
     * here would be a number we made up. Their app resolves it against
     * its own current data instead.
     */
    expect(mapsHandoffUrl(address, "android")).toContain("0,0?q=");
  });

  it("refuses to open on nothing", () => {
    for (const bad of ["", "   ", null, undefined]) {
      expect(canHandOffToMaps(bad), String(bad)).toBe(false);
    }
    expect(canHandOffToMaps(address)).toBe(true);
  });
});
