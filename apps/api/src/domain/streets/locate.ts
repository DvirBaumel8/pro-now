import type { GeocodingProvider, GeocodingResult, StructuredAddressQuery } from "@pro-now/types";

import { sameNameKey, withoutStreetType } from "./normalize.js";

/** DEVICE is the phone's own fix, which this module never produces. */
export type GeoPrecision = "HOUSE" | "STREET" | "LOCALITY" | "DEVICE";

export interface StreetToLocate {
  streetCode: number;
  streetName: string;
  localityName: string;
  localityStreets: number;
  houseNumber: string | null;
}

export interface Located {
  lat: number;
  lng: number;
  placeId: string | null;
  precision: GeoPrecision;
}

/** The list's code for "the locality itself" starts here. */
export const WHOLE_LOCALITY_CODE = 9000;

/**
 * Up to this many named streets, a locality is a village: its centre is a
 * short walk from any door in it, so locating the place as a whole is
 * honest. A city's centre is not anybody's door.
 */
export const SMALL_LOCALITY_STREETS = 40;

/**
 * Where a street from the official list is, as precisely as the geocoder
 * can honestly say: the house, else the street, else — for a small place —
 * the place. Every answer is checked against what was asked, because a
 * geocoder that cannot find "הרצל 999" answers with some other street.
 *
 * Null means the map does not know the street; the caller says so rather
 * than guessing.
 */
export async function locateStreet(geocoder: GeocodingProvider, street: StreetToLocate): Promise<Located | null> {
  const locality = street.localityName;
  const wholeLocality = street.streetCode >= WHOLE_LOCALITY_CODE;

  if (wholeLocality && street.localityStreets > SMALL_LOCALITY_STREETS) return null;
  if (!wholeLocality) {
    const names = [...new Set([street.streetName, withoutStreetType(street.streetName)])];
    if (street.houseNumber) {
      for (const name of names) {
        const hit = await first(geocoder, { street: name, houseNumber: street.houseNumber, locality }, (r) =>
          sameLocality(r, locality) && sameStreet(r, street.streetName) && r.parts?.houseNumber === street.houseNumber
        );
        if (hit) return located(hit, "HOUSE");
      }
    }
    for (const name of names) {
      const hit = await first(geocoder, { street: name, locality }, (r) => sameLocality(r, locality) && sameStreet(r, street.streetName));
      if (hit) return located(hit, "STREET");
    }
    if (street.localityStreets > SMALL_LOCALITY_STREETS) return null;
  }

  const hit = await first(geocoder, { locality }, (r) => sameLocality(r, locality));
  return hit ? located(hit, "LOCALITY") : null;
}

async function first(
  geocoder: GeocodingProvider,
  query: StructuredAddressQuery,
  accept: (r: GeocodingResult) => boolean
): Promise<GeocodingResult | null> {
  return (await geocoder.searchStructured(query)).find(accept) ?? null;
}

function located(r: GeocodingResult, precision: GeoPrecision): Located {
  return { lat: r.lat, lng: r.lng, placeId: r.placeId, precision };
}

/** The same name once spelling is set aside, or one containing the other ("יהודה הלוי" in "רבי יהודה הלוי"). */
function similar(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  const x = sameNameKey(a);
  const y = sameNameKey(b);
  if (!x || !y) return false;
  return x === y || (Math.min(x.length, y.length) >= 3 && (x.includes(y) || y.includes(x)));
}

function sameLocality(r: GeocodingResult, locality: string): boolean {
  return (r.parts?.localities ?? []).some((name) => similar(name, locality));
}

function sameStreet(r: GeocodingResult, street: string): boolean {
  return similar(r.parts?.road, street);
}
