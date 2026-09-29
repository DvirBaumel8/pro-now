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
    ]);
  }
  return new NominatimGeocodingProvider({
    endpoint: config.NOMINATIM_URL,
    userAgent: config.NOMINATIM_USER_AGENT,
    contactEmail: config.NOMINATIM_CONTACT_EMAIL,
  });
}
