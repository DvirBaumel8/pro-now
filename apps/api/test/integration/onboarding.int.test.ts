import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { AVATARS } from "@pro-now/types";

import { startApp } from "./harness.js";
import { signInByEmail, uniqueEmail, type CookieJar } from "./auth-helpers.js";
import { createPrisma } from "../../src/db/prisma-client.js";

let app: FastifyInstance;
const db = createPrisma();

beforeAll(async () => {
  app = await startApp();
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const headers = (jar: CookieJar) => ({ cookie: jar.header(), origin: "http://localhost:4000" });
const me = async (jar: CookieJar) => (await app.inject({ method: "GET", url: "/api/v1/me", headers: headers(jar) })).json();
const answer = (jar: CookieJar, payload: object) =>
  app.inject({ method: "PATCH", url: "/api/v1/me/customer", headers: headers(jar), payload });

describe("first-run answers (intro, avatar)", () => {
  it("a new customer has seen nothing and answered nothing", async () => {
    const jar = await signInByEmail(app, uniqueEmail("fresh"));
    const body = await me(jar);
    expect(body.roles).toContain("CUSTOMER");
    expect(body.customer).toEqual({ introSeen: false, avatarId: null, avatarAnswered: false });
  });

  it("remembers the intro and the chosen character, on the server", async () => {
    const jar = await signInByEmail(app, uniqueEmail("chooser"));
    expect((await answer(jar, { introSeen: true })).statusCode).toBe(200);
    expect((await answer(jar, { avatarId: AVATARS[0]!.id })).statusCode).toBe(200);
    expect((await me(jar)).customer).toEqual({ introSeen: true, avatarId: AVATARS[0]!.id, avatarAnswered: true });
  });

  it("skipping the character is an answer", async () => {
    const jar = await signInByEmail(app, uniqueEmail("skipper"));
    expect((await answer(jar, { avatarId: null })).statusCode).toBe(200);
    expect((await me(jar)).customer).toMatchObject({ avatarId: null, avatarAnswered: true });
  });

  it("refuses an unknown character and unknown fields", async () => {
    const jar = await signInByEmail(app, uniqueEmail("strict"));
    expect((await answer(jar, { avatarId: "not-a-character" })).statusCode).toBe(400);
    expect((await answer(jar, { introSeen: true, isAdmin: true })).statusCode).toBe(400);
    expect((await me(jar)).customer).toMatchObject({ introSeen: false, avatarAnswered: false });
  });

  it("is only for a signed-in customer", async () => {
    expect((await app.inject({ method: "GET", url: "/api/v1/me" })).statusCode).toBe(401);
    const proEmail = uniqueEmail("pro-only");
    const user = await db.user.create({ data: { email: proEmail, emailVerified: true } });
    await db.userRole.create({ data: { userId: user.id, role: "PROFESSIONAL" } });
    const jar = await signInByEmail(app, proEmail);
    expect((await me(jar)).customer).toBeNull();
    expect((await answer(jar, { introSeen: true })).statusCode).toBe(403);
  });
});
