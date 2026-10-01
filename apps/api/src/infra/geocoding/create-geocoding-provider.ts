import type { GeocodingProvider } from "@pro-now/types";

import { FixtureGeocodingProvider } from "./fixture-geocoding-provider.js";
import { NominatimGeocodingProvider } from "./nominatim-geocoding-provider.js";

export interface GeocodingConfig {
  GEOCODING_PROVIDER: "nominatim" | "fixture";
  NOMINATIM_URL: string;
  NOMINATIM_USER_AGENT: string;
  NOMINATIM_CONTACT_EMAIL: string;
}

export function createGeocodingProvider(config: GeocodingConfig): GeocodingProvider {
  if (config.GEOCODING_PROVIDER === "fixture") {
    return new FixtureGeocodingProvider([
      {
        lat: 32.0853,
        lng: 34.7818,
        formattedAddress: "רחוב הרצל 5, תל אביב",
        placeId: "fixture-herzl-5",
        queries: ["הרצל 5", "תל אביב"],
      },
      // Street-list addresses the e2e and integration tests save: a house,
      // and a street known only as a whole.
      {
        lat: 32.0622,
        lng: 34.77,
        formattedAddress: "12, הרצל, תל־אביב–יפו",
        placeId: "fixture-herzl-12",
        parts: { road: "הרצל", houseNumber: "12", localities: ["תל־אביב–יפו"] },
      },
      {
        lat: 32.0472,
        lng: 34.7689,
        formattedAddress: "הרצל, תל־אביב–יפו",
        placeId: "fixture-herzl",
        parts: { road: "הרצל", houseNumber: null, localities: ["תל־אביב–יפו"] },
      },
    ]);
  }
  return new NominatimGeocodingProvider({
    endpoint: config.NOMINATIM_URL,
    userAgent: config.NOMINATIM_USER_AGENT,
    contactEmail: config.NOMINATIM_CONTACT_EMAIL,
  });
}
