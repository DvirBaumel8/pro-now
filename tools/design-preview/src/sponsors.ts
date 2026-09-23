import type { SponsorShop } from "@pro-now/types";

/**
 * THE BRANDS WITH A BUILDING IN THE WORLD — PREVIEW ONLY.
 *
 * ---------------------------------------------------------------------
 * WHY THIS LIST LIVES HERE AND NOT IN `packages/types`
 * ---------------------------------------------------------------------
 * Who advertises in PRO NOW is a commercial relationship, and a
 * commercial relationship is Amit's to make (/CLAUDE.md §4). The
 * MECHANISM is product — `sponsor-shops.ts`, `SponsorRow`,
 * `SponsorShopBody` — and ships. The LIST is a business fact, and the
 * day it is real it belongs to the server, not to a constant compiled
 * into a phone.
 *
 * Until then it sits in the developer gallery, where it can be walked
 * through and shown to an investor without anything being claimed about
 * the shipping app.
 *
 * ---------------------------------------------------------------------
 * ABOUT THIS PARTICULAR BRAND
 * ---------------------------------------------------------------------
 * Amit: *"יש לי עסק לדוגמה של משפחה שלי, mylustshop.com... אמרתי אולי
 * נעשה שהם יהיו העסק הראשון שאני מפרסם בעולם שלי."*
 *
 * It is a licensed Israeli cosmetics brand, and it is also an intimacy
 * product, which is a question about audience and app-store age rating
 * rather than about code. That question is Amit's and is open. Keeping
 * the entry here answers it the only way this repository is allowed to:
 * the demonstration is complete, and nothing has been decided about the
 * customer app.
 *
 * `minimumAge` is the brand's own statement about its own site,
 * repeated by `sponsorLeaveHe` before anybody is handed over. It is not
 * this file's judgement of anything.
 */
export const PREVIEW_SPONSORS: readonly SponsorShop[] = [
  {
    id: "lust",
    brandName: "Lust",
    categoryHe: "בושם",
    // The brand's own line, from their own site. Not written by us.
    taglineHe: "זו לא רק תחושה, זו אומנות המשיכה",
    siteUrl: "https://mylustshop.com",
    venueAssetId: "sponsor_lust_venue",
    interiorAssetId: "sponsor_lust_hero",
    minimumAge: 18,
    /*
     * WHAT IS ON THE SHELVES.
     *
     * Every name, every description and every price is READ OFF THE
     * BRAND'S OWN PAGE — mylustshop.com, on the day this was written.
     * Nothing here is written by us and nothing is computed: a price in
     * a shop window is a claim made on a brand's behalf, and an invented
     * one is the single thing a sponsor would never forgive.
     *
     * The positions are fractions of the interior picture, so they move
     * with the art rather than with a layout.
     */
    things: [
      {
        x: 0.8,
        y: 0.32,
        titleHe: "LUST FOR HER",
        bodyHe: "בושם פרומונים לאישה · אדמונית, ליצ׳י ופרזיה, לב של ורדים ומגנוליה, בסיס ארז וענבר.",
        priceHe: "₪168",
        wasPriceHe: "₪250",
      },
      {
        x: 0.58,
        y: 0.47,
        titleHe: "LUST FOR HIM",
        bodyHe: "בושם פרומונים לגבר · רעננות ימית והדרים, לב של עץ גויאק ופצ׳ולי, בסיס ענבר אפור.",
        priceHe: "₪198",
        wasPriceHe: "₪298",
      },
      {
        x: 0.27,
        y: 0.55,
        titleHe: "COUPLES PACK",
        bodyHe: "שני הבשמים יחד — לו ולה.",
        priceHe: "₪348",
        wasPriceHe: "₪499",
      },
      {
        /* Not a product. A shop that only sells is a vending machine. */
        x: 0.4,
        y: 0.24,
        titleHe: "למה שמן ולא תרסיס?",
        bodyHe:
          "שמן לא מייבש את העור, והניחוח נפתח בהדרגה לאורך היום. מחליקים על העור עם הרולר.",
      },
    ],
  },
];
