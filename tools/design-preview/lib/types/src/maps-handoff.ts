/**
 * HANDING AN ADDRESS TO WHATEVER MAPS APP THE PERSON ALREADY HAS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NOT THE OPEN DECISION IT LOOKS LIKE
 * ---------------------------------------------------------------------
 * Amit: *"איפה חיבור למפה? איפה הכתובת נפתחת במפות עם זמן מוערך
 * לנסיעה?"*
 *
 * The professional's navigation sheet carried a button reading "פתיחה
 * באפליקציית הניווט" that closed the sheet and did nothing else, under a
 * note explaining that the maps vendor is an open business decision
 * (/CLAUDE.md §4). The note is true and it was excusing the wrong thing.
 *
 * `MapsRoutingProvider` is about the product computing routes, distances
 * and ETAs — a vendor, a contract, a bill per request, and a number this
 * app would then present as its own. That decision is genuinely open and
 * nothing here touches it.
 *
 * Opening an address in the phone's own maps application is a different
 * act entirely. It chooses no vendor: it hands a string to whatever the
 * person has already installed and chosen for themselves, and the route
 * and the drive time are then THEIRS, computed by their app, presented
 * by their app, and never claimed by ours. It needs no key, no contract
 * and no integration — it is a link.
 *
 * A dead button excused by an unrelated decision is worse than no
 * button. A professional standing beside their van, looking at an
 * address they cannot open, is being told the app cannot do a thing that
 * every app does.
 *
 * ---------------------------------------------------------------------
 * WHY THE `geo:` SCHEME FIRST
 * ---------------------------------------------------------------------
 * `geo:` is the platform-neutral one: Android offers the person a choice
 * of every maps app they have. iOS does not register it, so Apple Maps
 * takes `maps://`, and a browser gets an ordinary web URL — which is the
 * only branch that names a company, and only because a browser has no
 * "your maps app" to defer to.
 */

export type MapsPlatform = "android" | "ios" | "web";

/**
 * Where to send somebody who wants to drive to `addressHe`.
 *
 * The address is used as a SEARCH string rather than as coordinates, on
 * purpose: we have not geocoded it, so handing over a lat/long would
 * mean inventing one. Their maps app does that job, and does it against
 * its own current data rather than against whatever we cached.
 */
export function mapsHandoffUrl(addressHe: string, platform: MapsPlatform): string {
  const q = encodeURIComponent(addressHe.trim());
  if (platform === "android") return `geo:0,0?q=${q}`;
  if (platform === "ios") return `maps://?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/** Nothing to hand over. An empty address must not open a maps app on "". */
export function canHandOffToMaps(addressHe: string | null | undefined): boolean {
  return typeof addressHe === "string" && addressHe.trim().length > 0;
}
