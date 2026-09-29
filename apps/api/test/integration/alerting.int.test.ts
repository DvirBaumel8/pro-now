import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

import { startApp } from "./harness.js";
import { signInByEmail, uniqueEmail, whoAmI } from "./auth-helpers.js";

/**
 * The alert path through the real server (docs/23-OBSERVABILITY.md): a 5xx
 * reaches the monitor with its request, a refusal does not, and the web
 * app's crash reports are accepted from anybody.
 */
const ADMIN = uniqueEmail("alerts-admin");
process.env.ADMIN_EMAILS = ADMIN;

let app: FastifyInstance;
let report: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  app = await startApp();
  report = vi.spyOn(app.monitor, "report");
});
afterAll(async () => {
  await app.close();
});

describe("error alerts", () => {
  it("reports a 5xx with its route, request and user, and answers with the requestId", async () => {
    const jar = await signInByEmail(app, ADMIN);
    const me = await whoAmI(app, jar);
    report.mockClear();

    const res = await app.inject({ method: "POST", url: "/api/v1/admin/debug/boom", headers: { cookie: jar.header() } });

    expect(res.statusCode).toBe(500);
    const body = res.json() as { code: string; message: string; requestId: string };
    expect(body).toMatchObject({ code: "INTERNAL_ERROR", message: "Internal server error" });
    expect(report).toHaveBeenCalledTimes(1);
    expect(report.mock.calls[0]![0]).toMatchObject({
      source: "api",
      method: "POST",
      route: "/api/v1/admin/debug/boom",
      requestId: body.requestId,
      userId: me!.user.id,
    });
  });

  it("does not report a refusal", async () => {
    const jar = await signInByEmail(app, uniqueEmail("alerts-customer"));
    report.mockClear();

    const res = await app.inject({ method: "POST", url: "/api/v1/admin/debug/boom", headers: { cookie: jar.header() } });

    expect(res.statusCode).toBe(403);
    expect(report).not.toHaveBeenCalled();
  });

  it("does not report a malformed request", async () => {
    report.mockClear();
    const res = await app.inject({ method: "POST", url: "/api/v1/client-errors", payload: { kind: "nope" } });
    expect(res.statusCode).toBe(400);
    expect(report).not.toHaveBeenCalled();
  });

  it("accepts a crash report from a browser that is not signed in", async () => {
    report.mockClear();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/client-errors",
      payload: { kind: "render", name: "TypeError", message: "x is undefined", path: "/" },
    });
    expect(res.statusCode).toBe(204);
    expect(report).toHaveBeenCalledWith(expect.objectContaining({ source: "web", kind: "render", userId: undefined }));
  });
});
