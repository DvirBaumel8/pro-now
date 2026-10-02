import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { expect } from "vitest";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** A cookie jar for app.inject: remembers what the server set, sends it back. */
export class CookieJar {
  private cookies = new Map<string, string>();

  store(res: LightMyRequestResponse): void {
    for (const c of res.cookies) {
      if (c.value === "" || (c.maxAge !== undefined && c.maxAge <= 0)) this.cookies.delete(c.name);
      else this.cookies.set(c.name, c.value);
    }
  }

  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  has(name: string): boolean {
    return [...this.cookies.keys()].some((k) => k.endsWith(name));
  }
}

export function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@pronow.test`;
}

/** The newest email Mailpit caught for this address, polled briefly. */
export async function latestEmailTo(address: string): Promise<{ subject: string; text: string }> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const search = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`);
    const found = (await search.json()) as { messages: Array<{ ID: string }> };
    const first = found.messages[0];
    if (first) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${first.ID}`)).json()) as {
        Subject: string;
        Text: string;
      };
      return { subject: msg.Subject, text: msg.Text };
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`No email reached ${address} (is Mailpit running? docker compose up -d)`);
}

export function linkIn(text: string): URL {
  const match = text.match(/https?:\/\/\S+/);
  if (!match) throw new Error(`No link in email:\n${text}`);
  return new URL(match[0]);
}

export async function requestMagicLink(app: FastifyInstance, email: string): Promise<URL> {
  const res = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/magic-link",
    payload: { email, callbackURL: "/" },
  });
  expect(res.statusCode, res.body).toBe(200);
  return linkIn((await latestEmailTo(email)).text);
}

/** Signs in by email link, the way a person would. Returns the signed-in jar. */
export async function signInByEmail(app: FastifyInstance, email: string): Promise<CookieJar> {
  const link = await requestMagicLink(app, email);
  const jar = new CookieJar();
  const res = await app.inject({ method: "GET", url: link.pathname + link.search });
  expect(res.statusCode, res.body).toBe(302);
  jar.store(res);
  return jar;
}

/**
 * Signs in with "Google" through the local mock issuer: start the flow,
 * submit the issuer's login form with the given claims, follow the
 * callback back into the app.
 */
export async function signInWithGoogle(
  app: FastifyInstance,
  claims: { email: string; email_verified: boolean; name?: string }
): Promise<{ jar: CookieJar; callback: LightMyRequestResponse }> {
  const jar = new CookieJar();
  const start = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/social",
    payload: { provider: "google", callbackURL: "/" },
  });
  expect(start.statusCode, start.body).toBe(200);
  jar.store(start);
  const authorizeUrl = (start.json() as { url: string }).url;

  const login = await fetch(authorizeUrl, {
    method: "POST",
    redirect: "manual",
    body: new URLSearchParams({ username: claims.email, claims: JSON.stringify({ name: "Test Person", ...claims }) }),
  });
  const back = new URL(login.headers.get("location")!);

  const callback = await app.inject({
    method: "GET",
    url: back.pathname + back.search,
    headers: { cookie: jar.header() },
  });
  jar.store(callback);
  return { jar, callback };
}

export async function whoAmI(app: FastifyInstance, jar: CookieJar) {
  const res = await app.inject({ method: "GET", url: "/api/auth/get-session", headers: { cookie: jar.header() } });
  return res.json() as { user: { id: string; email: string; emailVerified: boolean } } | null;
}
