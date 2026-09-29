import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth, magicLink } from "better-auth/plugins";
import type { PrismaClient } from "@prisma/client";
import type { Env } from "@pro-now/config";

import type { EmailProvider } from "../infra/email/email-provider.js";
import { magicLinkEmail } from "./magic-link-email.js";
import { grantAdminIfAllowlisted, grantRole } from "./roles.js";

export const AUTH_BASE_PATH = "/api/auth";
export const DEMO_AUTH_EMAIL = "demo@pronow.test";
const MAGIC_LINK_TTL_SECONDS = 15 * 60;

/**
 * Sign-in for the web app (docs/21 W1): Google, or a one-time email link.
 * No passwords. Sessions are httpOnly cookies, Secure whenever PUBLIC_URL
 * is https.
 *
 * Google goes through the generic OIDC plugin with a discovery URL, so the
 * same code talks to the local mock issuer (GOOGLE_ISSUER_URL) and to
 * Google itself (no override). Accounts are linked only on a verified
 * email: Google is deliberately NOT a "trusted provider", which would skip
 * that check.
 */
export function createAuth(deps: { config: Env; prisma: PrismaClient; email: EmailProvider }) {
  const { config, prisma, email } = deps;
  let demoMagicLink: string | undefined;

  // The demo user must receive a real Better Auth session, but must never
  // receive an actual email. Capture only this fixed tester address; every
  // normal sign-in still uses the configured provider unchanged.
  const emailProvider: EmailProvider = {
    async send(message) {
      if (message.to === DEMO_AUTH_EMAIL) {
        demoMagicLink = message.text.match(/https?:\/\/\S+/)?.[0];
        return;
      }
      await email.send(message);
    },
  };

  const oidc =
    config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? [
          genericOAuth({
            config: [
              {
                providerId: "google",
                clientId: config.GOOGLE_CLIENT_ID,
                clientSecret: config.GOOGLE_CLIENT_SECRET,
                discoveryUrl: `${(config.GOOGLE_ISSUER_URL ?? "https://accounts.google.com").replace(/\/$/, "")}/.well-known/openid-configuration`,
                scopes: ["openid", "email", "profile"],
                pkce: true,
              },
            ],
          }),
        ]
      : [];

  const auth = betterAuth({
    appName: "PRO NOW",
    baseURL: config.PUBLIC_URL,
    basePath: AUTH_BASE_PATH,
    secret: config.AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    trustedOrigins: [config.PUBLIC_URL],
    advanced: {
      // Ids come from the Prisma schema (cuid), like every other table.
      database: { generateId: false },
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      // Better Auth silently turns both off under NODE_ENV=test. Pinned on,
      // so the tests exercise the server that ships.
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    account: { accountLinking: { enabled: true } },
    plugins: [
      magicLink({
        expiresIn: MAGIC_LINK_TTL_SECONDS,
        allowedAttempts: 1,
        storeToken: "hashed",
        sendMagicLink: async ({ email: to, url }) => {
          await emailProvider.send(magicLinkEmail(to, url));
        },
      }),
      ...oidc,
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await grantRole(prisma, user.id, "CUSTOMER");
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { deletedAt: true } });
            if (!user || user.deletedAt) return false;
          },
          after: async (session) => {
            const user = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { id: true, email: true, emailVerified: true },
            });
            if (user) await grantAdminIfAllowlisted(prisma, user, config.ADMIN_EMAILS);
          },
        },
      },
    },
  });

  return Object.assign(auth, {
    async createDemoSession(headers: Headers): Promise<Response> {
      demoMagicLink = undefined;
      await auth.api.signInMagicLink({
        body: { email: DEMO_AUTH_EMAIL },
        headers,
      });
      if (!demoMagicLink) throw new Error("Demo magic link was not captured");

      return auth.handler(new Request(demoMagicLink, { method: "GET", headers }));
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
