import { describe, expect, it } from "vitest";

import {
  requiredSponsorAssets,
  SPONSOR_BADGE_HE,
  sponsorCtaHe,
  sponsorLeaveHe,
  sponsorShopViolations,
  sponsorSignHe,
  sponsorsHiddenHe,
  sponsorsMayShow,
  type SponsorShop,
  DISTRICT_SITES,
  plateSpotFor,
  SPONSOR_PLATE_SPOTS,
  sponsorSpotFor,
} from "../src";

const LUST: SponsorShop = {
  id: "lust",
  brandName: "Lust",
  categoryHe: "בושם",
  taglineHe: "זו לא רק תחושה, זו אומנות המשיכה",
  siteUrl: "https://mylustshop.com",
  venueAssetId: "sponsor_lust_venue",
  interiorAssetId: "sponsor_lust_hero",
  minimumAge: 18,
};

const OURS = ["district_hair", "hair_barbershop_hero", "district_home", "home_workshop_hero"];

describe("a shop somebody paid to put in the world", () => {
  it("passes its own rules", () => {
    expect(sponsorShopViolations([LUST], OURS)).toEqual([]);
  });

  it("always says it is paid for", () => {
    expect(sponsorSignHe(LUST)).toContain(SPONSOR_BADGE_HE);
  });

  it("cannot wear a trade's building", () => {
    const impostor = { ...LUST, venueAssetId: "district_hair" };
    expect(sponsorShopViolations([impostor], OURS).join(" ")).toContain("a PRO NOW trade's building");
  });

  it("cannot borrow a trade's interior either", () => {
    const impostor = { ...LUST, interiorAssetId: "hair_barbershop_hero" };
    expect(sponsorShopViolations([impostor], OURS).join(" ")).toContain("a PRO NOW trade's interior");
  });

  it("refuses a link that does not leave the app", () => {
    const inApp = { ...LUST, siteUrl: "/shop/lust" };
    expect(sponsorShopViolations([inApp]).join(" ")).toContain("absolute https");
  });

  /*
   * THE ONE THAT IS HERE TO BE BROKEN LATER.
   *
   * Revenue argues for showing advertising more often, and the cheapest
   * way to do it is one more entry in SPONSOR_VISIBLE_STATES. This
   * fails the moment somebody adds it.
   */
  it("is never shown while the professional is working or money is moving", () => {
    expect(sponsorsMayShow("PRO_EN_ROUTE")).toBe(true);
    expect(sponsorsMayShow("PRO_ARRIVED")).toBe(false);
    expect(sponsorsMayShow("DIAGNOSIS")).toBe(false);
    expect(sponsorsMayShow("WAITING_QUOTE_APPROVAL")).toBe(false);
    expect(sponsorsMayShow("IN_PROGRESS")).toBe(false);
    expect(sponsorsMayShow("COMPLETION_PENDING")).toBe(false);
  });

  it("says where the row went rather than simply losing it", () => {
    expect(sponsorsHiddenHe("PRO_EN_ROUTE")).toBeNull();
    expect(sponsorsHiddenHe("DIAGNOSIS")).toContain("המקצוען אצלך");
  });

  it("warns that the site is somebody else's before opening it", () => {
    const line = sponsorLeaveHe(LUST);
    expect(line).toContain("מחוץ לאפליקציה");
    // And it never claims the order, the payment or the delivery.
    expect(line).toContain("שלהם");
    // The brand's own age statement, repeated rather than invented.
    expect(line).toContain("מגיל 18");
  });

  it("says nothing about an age the brand did not state", () => {
    const { minimumAge: _drop, ...noAge } = LUST;
    expect(sponsorLeaveHe(noAge)).not.toContain("מגיל");
  });

  it("names the brand on the way out", () => {
    expect(sponsorCtaHe(LUST)).toContain("Lust");
  });

  it("asks for exactly the art it draws", () => {
    expect(requiredSponsorAssets([LUST])).toEqual(["sponsor_lust_hero", "sponsor_lust_venue"]);
  });

  /*
   * A sponsor shop has no rating, no ETA and no availability — not
   * "empty" ones, none at all. The check is on the object the product
   * actually carries, because a field that exists is a field a screen
   * in a hurry will fill in.
   */
  it("carries nothing that could pass for real supply", () => {
    for (const forbidden of ["rating", "etaMinutes", "distanceKm", "available", "online", "reviews"]) {
      expect(Object.keys(LUST)).not.toContain(forbidden);
    }
  });
});

/**
 * WHERE A PAID BUILDING MAY STAND.
 *
 * Amit: *"למה אין מבנה של לאסט במפה??"* — so there is one. The rules
 * about WHERE are the ones worth a test: a sponsor must never be given
 * ground a trade is standing on, and a sponsor with nowhere to stand
 * must get nothing rather than somewhere.
 */
describe("a paid building on the plate", () => {
  it("never stands where a trade stands", () => {
    const trades = DISTRICT_SITES.map((d) => plateSpotFor(d.department));
    for (let i = 0; i < SPONSOR_PLATE_SPOTS.length; i += 1) {
      const at = sponsorSpotFor(i)!;
      const clash = trades.find((t) => Math.abs(t.u - at.u) < 0.001 && Math.abs(t.v - at.v) < 0.001);
      expect(clash, `sponsor ${i} stands on a trade's frontage`).toBeUndefined();
    }
  });

  it("gives nothing to a sponsor the plate has no room for", () => {
    expect(sponsorSpotFor(SPONSOR_PLATE_SPOTS.length)).toBeNull();
    expect(sponsorSpotFor(-1)).toBeNull();
  });

  it("takes plots the trades did not, when the world is a real street plan", () => {
    // Fifteen plots: eleven for the trades, and the rest for anybody else.
    const plots = Array.from({ length: 15 }, (_, i) => ({ u: i / 20, v: 0.5 }));
    expect(sponsorSpotFor(0, plots)).toEqual(plots[DISTRICT_SITES.length]);
    // And falls back to the measured leftovers when there is no surplus.
    expect(sponsorSpotFor(0, plots.slice(0, 11))).toEqual(SPONSOR_PLATE_SPOTS[0]);
  });

  it("puts no two sponsors in the same doorway", () => {
    const seen = new Set<string>();
    for (let i = 0; i < SPONSOR_PLATE_SPOTS.length; i += 1) {
      const at = sponsorSpotFor(i)!;
      const key = `${at.u},${at.v}`;
      expect(seen.has(key), "two sponsors share a frontage").toBe(false);
      seen.add(key);
    }
  });
});
