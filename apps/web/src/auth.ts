import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

/**
 * Better Auth's client (docs/21 W1). Same origin: the dev server proxies
 * /api to Fastify, and in production Fastify serves this app itself, so the
 * session cookie is first-party and never readable from JavaScript.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [magicLinkClient()],
});

export const useSession = authClient.useSession;
