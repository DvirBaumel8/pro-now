import type { MapsRoutingProvider, LatLng, EtaResult } from "@pro-now/types";

/**
 * SANDBOX — coarse haversine-distance approximation, NOT a real route ETA.
 * See /docs/08-DISPATCH-ENGINE.md §Real ETA and
 * /docs/_source/01-master-product-bible.md §11: "never rank solely by
 * straight-line distance when route data materially changes ETA" — this
 * adapter exists only until the Google Maps Platform adapter is wired
 * behind the same interface; every EtaResult it returns has
 * `isRouteBased: false` so calling code can decide whether to trust it.
 */
const AVERAGE_URBAN_SPEED_METERS_PER_SECOND = 8.3; // ~30 km/h

function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export class SandboxMapsProvider implements MapsRoutingProvider {
  readonly vendorName = "sandbox-maps";
  readonly isSandbox = true;

  async getEtaBatch(
    destination: LatLng,
    origins: Array<{ id: string; location: LatLng }>
  ): Promise<EtaResult[]> {
    return origins.map((origin) => {
      const distanceMeters = haversineMeters(destination, origin.location);
      const etaSeconds = Math.round(distanceMeters / AVERAGE_URBAN_SPEED_METERS_PER_SECOND);
      return { originId: origin.id, etaSeconds, distanceMeters, isRouteBased: false };
    });
  }

  async geocodeAddress(freeText: string) {
    // Sandbox cannot geocode real addresses; callers in local/test seed a
    // known lat/lng directly rather than relying on this. Returning null
    // signals "not available" rather than fabricating a location.
    void freeText;
    return null;
  }
}
