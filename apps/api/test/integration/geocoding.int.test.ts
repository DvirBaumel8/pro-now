import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";

import { startApp } from "./harness.js";

describe("geocoding routes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects a forward lookup before contacting the provider for a short query", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/geo/search?q=אב" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("rejects coordinates outside the geographic bounds", async () => {
    const response = await app.inject({ method: "GET", url: "/api/v1/geo/reverse?lat=91&lng=34.8" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
