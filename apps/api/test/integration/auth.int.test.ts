import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";

import { startApp } from "./harness.js";
import { createPrisma } from "../../src/db/prisma-client.js";
import {
  CookieJar,
  latestEmailTo,
  requestMagicLink,
  signInByEmail,
  signInWithGoogle,
  uniqueEmail,
  whoAmI,
} from "./auth-helpers.js";

const ADMIN = uniqueEmail("admin");
process.env.ADMIN_EMAILS = ADMIN;

let app: FastifyInstance;
let db: PrismaClient;

beforeAll(async () => {
  app = await startApp();
  db = createPrisma();
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const sessionCookieOf = (res: { cookies: Array<{ name: string }> }) =>
  res.cookies.find((c) => c.name.endsWith("session_token"));

describe("sign-in by email link", () => {
  it("sends a Hebrew email whose link signs the person in", async () => {
    const email = uniqueEmail("customer");
    const link = await requestMagicLink(app, email);
    const mail = await latestEmailTo(email);
    expect(mail.subject).toContain("PRO NOW");
    expect(mail.text).toContain("15 דקות");

    const res = await app.inject({ method: "GET", url: link.pathname + link.search });
    expect(res.statusCode).toBe(302);
    const jar = new CookieJar();
    jar.store(res);

    const me = await whoAmI(app, jar);
    expect(me?.user.email).toBe(email);
    expect(me?.user.emailVerified).toBe(true);
  });

  it("sets the session cookie httpOnly, SameSite=Lax, for the whole site", async () => {
    const link = await requestMagicLink(app, uniqueEmail("cookie"));
    const res = await app.inject({ method: "GET", url: link.pathname + link.search });
    const cookie = sessionCookieOf(res);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });
  });

  it("a link works once", async () => {
    const link = await requestMagicLink(app, uniqueEmail("once"));
    const first = await app.inject({ method: "GET", url: link.pathname + link.search });
    expect(sessionCookieOf(first)).toBeDefined();
    const second = await app.inject({ method: "GET", url: link.pathname + link.search });
    expect(sessionCookieOf(second)).toBeUndefined();
  });

  it("an expired link signs nobody in", async () => {
    const email = uniqueEmail("expired");
    const link = await requestMagicLink(app, email);
    await db.verification.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await app.inject({ method: "GET", url: link.pathname + link.search });
    expect(sessionCookieOf(res)).toBeUndefined();
  });

  it("stores the token hashed, never as sent", async () => {
    const link = await requestMagicLink(app, uniqueEmail("hashed"));
    const token = link.searchParams.get("token")!;
    const rows = await db.verification.findMany({ where: { OR: [{ identifier: token }, { value: { contains: token } }] } });
    expect(rows).toHaveLength(0);
  });

  it("a new user is a CUSTOMER", async () => {
    const email = uniqueEmail("roles");
    const jar = await signInByEmail(app, email);
    const me = await whoAmI(app, jar);
    const roles = await db.userRole.findMany({ where: { userId: me!.user.id } });
    expect(roles.map((r) => r.role)).toEqual(["CUSTOMER"]);
  });
});

describe("the session guards the API", () => {
  it("a signed-in person reaches a protected route; nobody else does", async () => {
    const jar = await signInByEmail(app, uniqueEmail("guard"));
    const signedIn = await app.inject({ method: "GET", url: "/api/v1/me/addresses", headers: { cookie: jar.header() } });
    expect(signedIn.statusCode).toBe(200);

    const anonymous = await app.inject({ method: "GET", url: "/api/v1/me/addresses" });
    expect(anonymous.statusCode).toBe(401);

    const forged = await app.inject({
      method: "GET",
      url: "/api/v1/me/addresses",
      headers: { cookie: "better-auth.session_token=forged.value" },
    });
    expect(forged.statusCode).toBe(401);
  });

  it("a bearer token is not a way in any more", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me/addresses",
      headers: { authorization: "Bearer anything" },
    });
    expect(res.statusCode).toBe(401);
    const otp = await app.inject({ method: "POST", url: "/api/v1/auth/otp/request", payload: { phone: "+972500000000" } });
    expect(otp.statusCode).toBe(404);
  });

  it("signing out ends the session", async () => {
    const jar = await signInByEmail(app, uniqueEmail("signout"));
    const out = await app.inject({
      method: "POST",
      url: "/api/auth/sign-out",
      headers: { cookie: jar.header(), origin: "http://localhost:4000" },
      payload: {},
    });
    expect(out.statusCode, out.body).toBe(200);
    const after = await app.inject({ method: "GET", url: "/api/v1/me/addresses", headers: { cookie: jar.header() } });
    expect(after.statusCode).toBe(401);
  });
});

describe("cross-site requests", () => {
  it("refuses an auth request from another site (CSRF)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/magic-link",
      headers: { origin: "https://evil.example" },
      payload: { email: uniqueEmail("csrf"), callbackURL: "/" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("refuses a sign-in link that would send the person to another site", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/magic-link",
      payload: { email: uniqueEmail("redirect"), callbackURL: "https://evil.example/steal" },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe("sign-in with Google (mock issuer)", () => {
  it("creates a verified user from a verified Google email", async () => {
    const email = uniqueEmail("google");
    const { jar, callback } = await signInWithGoogle(app, { email, email_verified: true });
    expect(callback.statusCode).toBe(302);
    const me = await whoAmI(app, jar);
    expect(me?.user.email).toBe(email);
    expect(me?.user.emailVerified).toBe(true);
  });

  it("links Google to an existing user only when both emails are verified", async () => {
    const email = uniqueEmail("link");
    const byEmail = await whoAmI(app, await signInByEmail(app, email));
    const { jar } = await signInWithGoogle(app, { email, email_verified: true });
    const byGoogle = await whoAmI(app, jar);
    expect(byGoogle?.user.id).toBe(byEmail?.user.id);
    const accounts = await db.account.findMany({ where: { userId: byEmail!.user.id } });
    expect(accounts.map((a) => a.providerId).sort()).toContain("google");
  });

  it("refuses to link an unverified Google email to an existing user", async () => {
    const email = uniqueEmail("takeover");
    const victim = await whoAmI(app, await signInByEmail(app, email));
    const { jar } = await signInWithGoogle(app, { email, email_verified: false });
    const attacker = await whoAmI(app, jar);
    expect(attacker?.user.id ?? null).not.toBe(victim!.user.id);
    const accounts = await db.account.findMany({ where: { userId: victim!.user.id, providerId: "google" } });
    expect(accounts).toHaveLength(0);
  });
});

describe("admin bootstrap", () => {
  it("grants ADMIN to an allowlisted, verified email, once, and audits it", async () => {
    const jar = await signInByEmail(app, ADMIN);
    const me = await whoAmI(app, jar);
    await signInByEmail(app, ADMIN);
    const roles = await db.userRole.findMany({ where: { userId: me!.user.id } });
    expect(roles.map((r) => r.role).sort()).toEqual(["ADMIN", "CUSTOMER"]);
    const audits = await db.auditLog.findMany({ where: { targetId: me!.user.id, action: "ROLE_GRANTED" } });
    expect(audits).toHaveLength(1);
  });

  it("does not grant ADMIN to anyone else", async () => {
    const jar = await signInByEmail(app, uniqueEmail("notadmin"));
    const me = await whoAmI(app, jar);
    const roles = await db.userRole.findMany({ where: { userId: me!.user.id, role: "ADMIN" } });
    expect(roles).toHaveLength(0);
  });
});

describe("cookies on https", () => {
  it("are Secure when PUBLIC_URL is https", async () => {
    const saved = process.env.PUBLIC_URL;
    process.env.PUBLIC_URL = "https://pro-now.example";
    const secureApp = await startApp();
    try {
      const email = uniqueEmail("secure");
      const res = await secureApp.inject({
        method: "POST",
        url: "/api/auth/sign-in/magic-link",
        payload: { email, callbackURL: "/" },
      });
      expect(res.statusCode, res.body).toBe(200);
      const link = new URL((await latestEmailTo(email)).text.match(/https?:\/\/\S+/)![0]);
      const verified = await secureApp.inject({ method: "GET", url: link.pathname + link.search });
      const cookie = sessionCookieOf(verified);
      expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax" });
      expect(cookie!.name.startsWith("__Secure-")).toBe(true);
    } finally {
      await secureApp.close();
      process.env.PUBLIC_URL = saved;
    }
  });
});
