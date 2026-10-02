import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

import demoAuthRoutes from "../src/routes/demo-auth.js";

describe("temporary demo authentication", () => {
  it("does not expose the demo session endpoint when disabled", async () => {
    const app = Fastify();
    const createDemoSession = vi.fn();
    app.decorate("config", { DEMO_AUTH_ENABLED: "0" });
    app.decorate("auth", { createDemoSession });
    await app.register(demoAuthRoutes);

    const response = await app.inject({ method: "POST", url: "/api/v1/demo-auth" });

    expect(response.statusCode).toBe(404);
    expect(createDemoSession).not.toHaveBeenCalled();
    await app.close();
  });

  it("forwards the Better Auth demo session response when enabled", async () => {
    const app = Fastify();
    app.decorate("config", { DEMO_AUTH_ENABLED: "1" });
    app.decorate("auth", {
      createDemoSession: vi.fn(async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": "session=test" },
        })
      ),
    });
    await app.register(demoAuthRoutes);

    const response = await app.inject({ method: "POST", url: "/api/v1/demo-auth" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("session=test");
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });
});
