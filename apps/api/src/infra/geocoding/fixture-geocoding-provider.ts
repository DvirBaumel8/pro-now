import type { GeocodingProvider, GeocodingResult, LatLng, StructuredAddressQuery } from "@pro-now/types";

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

  /** Matches on `parts`: the same street and locality, and the house number when one is asked for. */
  async searchStructured(query: StructuredAddressQuery): Promise<GeocodingResult[]> {
    return this.fixtures
      .filter(({ parts }) => {
        if (!parts || !parts.localities.some((l) => letters(l) === letters(query.locality))) return false;
        if (!query.street) return parts.road === null;
        if (letters(parts.road ?? "") !== letters(query.street)) return false;
        return query.houseNumber ? parts.houseNumber === query.houseNumber : parts.houseNumber === null;
      })
      .map(toResult);
  }
}

/** Letters and digits only: "תל־אביב–יפו" is "תל אביב - יפו". */
function letters(value: string): string {
  return value.replace(/[^\p{L}\p{N}]/gu, "");
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

function toResult(fixture: GeocodingFixture): GeocodingResult {
  const { queries: _queries, ...result } = fixture;
  return result;
}
