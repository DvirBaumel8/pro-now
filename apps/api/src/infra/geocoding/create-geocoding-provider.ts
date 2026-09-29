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
  if (config.GEOCODING_PROVIDER === "fixture") return new FixtureGeocodingProvider();
  return new NominatimGeocodingProvider({
    endpoint: config.NOMINATIM_URL,
    userAgent: config.NOMINATIM_USER_AGENT,
    contactEmail: config.NOMINATIM_CONTACT_EMAIL,
  });
}
