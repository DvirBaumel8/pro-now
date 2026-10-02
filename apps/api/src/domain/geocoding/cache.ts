import type { LatLng } from "@pro-now/types";

const COORDINATE_PRECISION = 5;

export function normalizeSearchQuery(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("he");
}

export function cacheKeyForReverse(location: LatLng): string {
  const lat = roundCoordinate(location.lat);
  const lng = roundCoordinate(location.lng);
  return `reverse:${lat}:${lng}`;
}

export function cacheKeyForSearch(query: string): string | null {
  const normalized = normalizeSearchQuery(query);
  return normalized.length >= 3 ? `search:${normalized}` : null;
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(COORDINATE_PRECISION));
}
