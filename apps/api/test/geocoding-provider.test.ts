import { describe, expect, it, vi } from "vitest";

import { FixtureGeocodingProvider } from "../src/infra/geocoding/fixture-geocoding-provider.js";
import { NominatimGeocodingProvider } from "../src/infra/geocoding/nominatim-geocoding-provider.js";
import { createGeocodingProvider } from "../src/infra/geocoding/create-geocoding-provider.js";

describe("NominatimGeocodingProvider", () => {
  it("reverse-geocodes with the Hebrew language and a contactable user agent", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          osm_type: "way",
          osm_id: 123,
          lat: "32.0853",
          lon: "34.7818",
          display_name: "רחוב הרצל 5, תל אביב-יפו, ישראל",
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const provider = new NominatimGeocodingProvider({
      endpoint: "https://nominatim.example.test/",
      userAgent: "PRO NOW test",
      contactEmail: "dev@example.test",
      fetchImpl,
      minIntervalMs: 0,
    });

    await expect(provider.reverseGeocode({ lat: 32.0853, lng: 34.7818 })).resolves.toEqual({
      lat: 32.0853,
      lng: 34.7818,
      formattedAddress: "רחוב הרצל 5, תל אביב-יפו, ישראל",
      placeId: "way:123",
    });

    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toContain("/reverse?");
    expect(String(url)).toContain("accept-language=he%2Cen");
    expect(String(url)).toContain("email=dev%40example.test");
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      "User-Agent": "PRO NOW test (dev@example.test)",
    });
  });

  it("searches only after the caller provides a meaningful query and maps results", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          { osm_type: "node", osm_id: 7, lat: "32.1", lon: "34.8", display_name: "תל אביב, ישראל" },
          { osm_type: "way", osm_id: 8, lat: "bad", lon: "34.9", display_name: "לא תקין" },
        ]),
        { status: 200 }
      )
    );
    const provider = new NominatimGeocodingProvider({ endpoint: "https://nominatim.example.test", fetchImpl, minIntervalMs: 0 });

    await expect(provider.searchAddress("אב" )).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
    await expect(provider.searchAddress("תל אביב")).resolves.toEqual([
      { lat: 32.1, lng: 34.8, formattedAddress: "תל אביב, ישראל", placeId: "node:7" },
    ]);
    expect(String(fetchImpl.mock.calls[0]![0])).toContain("/search?");
  });
});

describe("FixtureGeocodingProvider", () => {
  it("supports deterministic forward and reverse lookups without network access", async () => {
    const provider = new FixtureGeocodingProvider([
      { lat: 32.0853, lng: 34.7818, formattedAddress: "רחוב הרצל 5, תל אביב", placeId: "fixture-herzl-5", queries: ["הרצל 5", "תל אביב"] },
    ]);

    await expect(provider.searchAddress("הרצל 5")).resolves.toEqual([
      { lat: 32.0853, lng: 34.7818, formattedAddress: "רחוב הרצל 5, תל אביב", placeId: "fixture-herzl-5" },
    ]);
    await expect(provider.reverseGeocode({ lat: 32.0853004, lng: 34.7817996 })).resolves.toEqual({
      lat: 32.0853,
      lng: 34.7818,
      formattedAddress: "רחוב הרצל 5, תל אביב",
      placeId: "fixture-herzl-5",
    });
  });
});

describe("createGeocodingProvider", () => {
  it("uses the deterministic fixture only when the environment asks for it", () => {
    expect(
      createGeocodingProvider({
        GEOCODING_PROVIDER: "fixture",
        NOMINATIM_URL: "https://nominatim.openstreetmap.org",
        NOMINATIM_USER_AGENT: "PRO NOW test",
        NOMINATIM_CONTACT_EMAIL: "dev@example.test",
      }).isSandbox
    ).toBe(true);
    expect(
      createGeocodingProvider({
        GEOCODING_PROVIDER: "nominatim",
        NOMINATIM_URL: "https://nominatim.openstreetmap.org",
        NOMINATIM_USER_AGENT: "PRO NOW test",
        NOMINATIM_CONTACT_EMAIL: "dev@example.test",
      }).isSandbox
    ).toBe(false);
  });
});
