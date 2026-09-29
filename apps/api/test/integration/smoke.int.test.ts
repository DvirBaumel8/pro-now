import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { startApp } from "./harness";

describe("integration harness", () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await startApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("boots every plugin and route against a fresh, migrated database", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });

  it("serves the seeded catalogue", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/catalog" });
    expect(res.statusCode).toBe(200);
    expect(res.json().departments.length).toBeGreaterThan(0);
  });
});
