import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";

import { startApp } from "./harness.js";

/** The web app served by the API process (docs/21 W2), against a stand-in build. */
let app: FastifyInstance;
let dist: string;
const saved = process.env.WEB_DIST_DIR;

beforeAll(async () => {
  dist = mkdtempSync(path.join(tmpdir(), "pronow-web-"));
  mkdirSync(path.join(dist, "assets"));
  writeFileSync(path.join(dist, "index.html"), "<!doctype html><title>PRO NOW</title>");
  writeFileSync(path.join(dist, "assets", "index-abc123.js"), "console.log(1)");
  writeFileSync(path.join(dist, "sw.js"), "self.addEventListener('install',()=>{})");
  process.env.WEB_DIST_DIR = dist;
  app = await startApp();
});

afterAll(async () => {
  await app.close();
  rmSync(dist, { recursive: true, force: true });
  process.env.WEB_DIST_DIR = saved;
});

const page = (url: string) => app.inject({ method: "GET", url, headers: { accept: "text/html" } });

describe("the web app, from the API's own origin", () => {
  it("serves the app at / and at the app's own routes (history fallback)", async () => {
    for (const url of ["/", "/welcome", "/sign-in?side=pro", "/intro"]) {
      const res = await page(url);
      expect(res.statusCode, url).toBe(200);
      expect(res.body).toContain("PRO NOW");
      expect(res.headers["cache-control"]).toBe("no-cache");
    }
  });

  it("caches hashed build files for a year, and revalidates the service worker", async () => {
    const js = await app.inject({ method: "GET", url: "/assets/index-abc123.js" });
    expect(js.statusCode).toBe(200);
    expect(js.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    const sw = await app.inject({ method: "GET", url: "/sw.js" });
    expect(sw.headers["cache-control"]).toBe("no-cache");
  });

  it("never answers the API's paths with the app", async () => {
    const res = await page("/api/v1/does-not-exist");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ code: "NOT_FOUND" });
    expect((await app.inject({ method: "GET", url: "/api/v1/catalog" })).statusCode).toBe(200);
  });

  it("a missing file is a 404, not the app", async () => {
    const res = await page("/missing.png");
    expect(res.statusCode).toBe(404);
  });
});
