import type { LatLng } from "./maps-routing-provider";

/** A place a customer can confirm as the destination of a request. */
export interface GeocodingResult extends LatLng {
  formattedAddress: string;
  /** Stable provider identifier, when the provider supplies one. */
  placeId: string | null;
  /**
   * What the provider says it found, field by field, when it says. A caller
   * that asked for a particular street checks these rather than trusting
   * the first hit: a geocoder that cannot find "הרצל 999" happily answers
   * with some other street nearby.
   */
  parts?: GeocodingParts;
}

export interface GeocodingParts {
  houseNumber: string | null;
  road: string | null;
  /**
   * Every locality-level name the provider gave: city, town, village. A
   * village's "city" is often its regional council, so all of them count.
   */
  localities: string[];
}

/** A structured lookup: the fields of an address, not a sentence to parse. */
export interface StructuredAddressQuery {
  /** Absent when only the locality is being located. */
  street?: string;
  houseNumber?: string;
  locality: string;
}

/**
 * Address lookup is separate from routing because it has a different vendor,
 * privacy and rate-limit policy. Routing callers must never need to know how
 * a typed address became coordinates.
 */
export interface GeocodingProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  reverseGeocode(location: LatLng): Promise<GeocodingResult | null>;
  searchAddress(query: string): Promise<GeocodingResult[]>;
  /** At most a few candidates for one address, each with `parts`. */
  searchStructured(query: StructuredAddressQuery): Promise<GeocodingResult[]>;
}
