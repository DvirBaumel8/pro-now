/**
 * Maps/address/ETA — see /docs/04-TECH-ARCHITECTURE.md and
 * /docs/08-DISPATCH-ENGINE.md. Production adapter wraps Google Maps
 * Platform (Places Autocomplete + Routes/Route Matrix). The sandbox
 * adapter uses haversine distance and a fixed average speed — this is a
 * coarse approximation clearly labeled as such, never presented to a user
 * as a real route ETA in production.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

export interface EtaResult {
  originId: string;
  etaSeconds: number;
  distanceMeters: number;
  isRouteBased: boolean; // false when this came from a coarse fallback, not a real route
}

export interface MapsRoutingProvider {
  readonly vendorName: string;
  readonly isSandbox: boolean;
  getEtaBatch(destination: LatLng, origins: Array<{ id: string; location: LatLng }>): Promise<EtaResult[]>;
  geocodeAddress(freeText: string): Promise<{ location: LatLng; formattedAddress: string; placeId: string } | null>;
}
