import type { GeocodingProvider, GeocodingResult, LatLng } from "@pro-now/types";

interface NominatimOptions {
  endpoint: string;
  userAgent: string;
  contactEmail?: string;
  fetchImpl?: typeof fetch;
  minIntervalMs?: number;
}

interface NominatimPlace {
  osm_type?: unknown;
  osm_id?: unknown;
  lat?: unknown;
  lon?: unknown;
  display_name?: unknown;
}

/**
 * OpenStreetMap Nominatim adapter. Requests are serialized and spaced so a
 * search box cannot accidentally turn a keystroke stream into API abuse.
 */
export class NominatimGeocodingProvider implements GeocodingProvider {
  readonly vendorName = "nominatim";
  readonly isSandbox = false;
  private queue = Promise.resolve();
  private lastRequestAt = 0;
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;
  private readonly endpoint: string;

  constructor(private readonly options: NominatimOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.minIntervalMs = options.minIntervalMs ?? 1000;
    this.endpoint = options.endpoint.replace(/\/+$/, "");
  }

  reverseGeocode(location: LatLng): Promise<GeocodingResult | null> {
    return this.enqueue(async () => {
      const params = new URLSearchParams({
        format: "jsonv2",
        lat: String(location.lat),
        lon: String(location.lng),
        addressdetails: "1",
        "accept-language": "he,en",
      });
      this.addContact(params);
      const place = await this.request<NominatimPlace>(`/reverse?${params}`);
      return toResult(place);
    });
  }

  searchAddress(query: string): Promise<GeocodingResult[]> {
    const normalized = query.trim();
    if (normalized.length < 3) return Promise.resolve([]);

    return this.enqueue(async () => {
      const params = new URLSearchParams({
        format: "jsonv2",
        q: normalized,
        addressdetails: "1",
        limit: "5",
        "accept-language": "he,en",
      });
      this.addContact(params);
      const places = await this.request<NominatimPlace[]>(`/search?${params}`);
      return places.map(toResult).filter((result): result is GeocodingResult => result !== null);
    });
  }

  private addContact(params: URLSearchParams): void {
    if (this.options.contactEmail) params.set("email", this.options.contactEmail);
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(`${this.endpoint}${path}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": this.options.contactEmail
          ? `${this.options.userAgent} (${this.options.contactEmail})`
          : this.options.userAgent,
      },
    });
    if (!response.ok) throw new Error(`Nominatim responded with ${response.status}`);
    return (await response.json()) as T;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const waitMs = Math.max(0, this.minIntervalMs - (Date.now() - this.lastRequestAt));
      if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.lastRequestAt = Date.now();
      return operation();
    });
    this.queue = run.then(() => undefined, () => undefined);
    return run;
  }
}

function toResult(place: NominatimPlace): GeocodingResult | null {
  const lat = typeof place.lat === "string" ? Number(place.lat) : place.lat;
  const lng = typeof place.lon === "string" ? Number(place.lon) : place.lon;
  const formattedAddress = typeof place.display_name === "string" ? place.display_name.trim() : "";
  if (typeof lat !== "number" || !Number.isFinite(lat) || typeof lng !== "number" || !Number.isFinite(lng) || !formattedAddress) {
    return null;
  }
  const placeId = typeof place.osm_type === "string" && typeof place.osm_id === "number" ? `${place.osm_type}:${place.osm_id}` : null;
  return { lat, lng, formattedAddress, placeId };
}
