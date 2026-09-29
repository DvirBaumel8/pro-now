import type { GeocodingProvider, GeocodingResult, LatLng } from "@pro-now/types";

export interface GeocodingFixture extends GeocodingResult {
  queries?: string[];
}

/** Deterministic adapter used by tests; it never makes a network request. */
export class FixtureGeocodingProvider implements GeocodingProvider {
  readonly vendorName = "fixture-geocoding";
  readonly isSandbox = true;

  constructor(private readonly fixtures: readonly GeocodingFixture[] = []) {}

  async reverseGeocode(location: LatLng): Promise<GeocodingResult | null> {
    const match = this.fixtures.find(
      (fixture) => Math.abs(fixture.lat - location.lat) <= 0.00001 && Math.abs(fixture.lng - location.lng) <= 0.00001
    );
    return match ? toResult(match) : null;
  }

  async searchAddress(query: string): Promise<GeocodingResult[]> {
    const normalized = normalize(query);
    if (normalized.length < 3) return [];
    return this.fixtures.filter((fixture) => fixture.queries?.some((q) => normalize(q).includes(normalized))).map(toResult);
  }
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

function toResult(fixture: GeocodingFixture): GeocodingResult {
  const { queries: _queries, ...result } = fixture;
  return result;
}
