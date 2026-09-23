# 20 — Sponsored shops in the world

## What this is

A brand rents a building in the neighbourhood the customer walks while
they wait for a professional. Entering it shows the inside of that
brand's shop; one button leaves PRO NOW for the brand's own site, where
the order, the payment and the delivery belong to them.

Amit, 2026-09-23:

> *"תחשוב שבעתיד אני רוצה שכל ספונסר שמשקיע בי יקבל בית עסק, עם עיצוב שלו
> לפי סוג העסק, ואז לקוח בזמן ההמתנה למקצוען יכול להיכנס לחנויות ואז ייפתח
> האתר של המותג שיוכלו להזמין ממנו. ככה אגייס שיווק וכסף."*

It is the first thing in this product that is paid to be seen, which is
why it has rules rather than a component.

## The four rules

Encoded in `packages/types/src/sponsor-shops.ts`, each with a test that
fails if it is relaxed.

1. **Never mistakable for a professional.** The word `בחסות` appears on
   the shopfront card, over the interior, and inside the accessible name
   of the control that opens it. `SponsorShop` carries no rating, no
   distance, no ETA and no availability — a field that does not exist
   cannot be filled in later by a screen in a hurry (/CLAUDE.md §3).
2. **Not dispatchable.** No department, never returned by `districtFor`,
   and `sponsorShopViolations` rejects a sponsor wearing a trade's
   `venueAssetId` or borrowing its interior.
3. **Leaving is announced.** `sponsorLeaveHe` says whose site it is and
   that the order, payment and delivery are theirs, before the handoff.
   Same posture as `maps-handoff.ts`: we hand over a link and claim
   nothing about the other side.
4. **Never competes with the job.** `SPONSOR_VISIBLE_STATES` is
   SEARCHING, OFFERING, PRO_ASSIGNED, PRO_EN_ROUTE. From `PRO_ARRIVED`
   onward somebody is in the customer's home and money is in play, and
   the row removes itself. This is the rule most likely to be quietly
   widened for revenue; that is why it is a function with a test.

## What is built

| piece | where |
|---|---|
| rules, vocabulary, violations | `packages/types/src/sponsor-shops.ts` |
| the street of paid shops | `packages/ui/src/components/SponsorRow.tsx` |
| standing inside one | `packages/ui/src/screens/SponsorShopBody.tsx` |
| the page for a business owner | `packages/ui/src/screens/AdvertiseBody.tsx` |
| the door to that page | `CustomerHomeBody` — `onAdvertise`, last row |
| the demo registry | `tools/design-preview/src/sponsors.ts` |

Art convention: `sponsor_<brand>_venue` is the building from the street,
`sponsor_<brand>_hero` is the inside. `art-delivery.test.ts` checks the
convention rather than a list, because the list is commercial and does
not belong in `packages/ui`; it fails on an interior delivered for a
brand with no shopfront.

## What is NOT decided

Per /CLAUDE.md §4, all of this stays with Amit:

- **What a sponsorship costs**, and whether it is cash or investment.
- **Who is accepted.** The audience is people with a burst pipe at
  eleven at night; the wrong brand in that street costs more than it
  pays.
- **Whether sponsored shops ship in the customer app at all.** The
  mechanism ships; the list does not. `PREVIEW_SPONSORS` lives in the
  developer gallery precisely so that the demonstration is complete and
  nothing has been decided.
- **App-store age rating.** A brand's own `minimumAge` is repeated to
  the customer before the handoff, but what a given brand does to PRO
  NOW's rating on the App Store and Google Play is a question for the
  stores' own policies and for Amit, not for this repository.

## Measurement — deliberately absent

`AdvertiseBody` promises no audience size, no impressions and no price,
because none has been measured (/CLAUDE.md §3). The page says so. A
sponsor is entitled to know how many people entered their shop and how
many left for their site, and neither number exists yet — when it does,
it comes from the server, like every other number in this product.

## The first brand

`Lust` (mylustshop.com), a licensed Israeli pheromone-perfume brand, is
Amit's family's business and the worked example. Its art is a shopfront
the brand supplied, cut out of its background and cropped to an interior
by `tools/design-preview/knockout-white.mjs` and `crop-interior.mjs`.
Its `minimumAge: 18` is the brand's own statement about its own site,
repeated and not interpreted.
