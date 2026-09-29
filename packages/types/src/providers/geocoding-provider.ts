import type { LatLng } from "./maps-routing-provider";

/** A place a customer can confirm as the destination of a request. */
export interface GeocodingResult extends LatLng {
  formattedAddress: string;
  /** Stable provider identifier, when the provider supplies one. */
  placeId: string | null;
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
}
