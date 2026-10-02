/**
 * BROWSERS ASKING FROM SOMEWHERE ELSE.
 *
 * The mobile apps are not browsers and have never needed this. The design
 * preview is — it runs on `127.0.0.1:4421` on a laptop and on
 * `<lan-ip>:4421` on a phone, and when it reads the real API instead of
 * its fixtures those are cross-origin requests that a browser will refuse
 * before the server ever sees them.
 *
 * The allowed origins are a list, never a wildcard-with-credentials, and
 * the list is empty unless something puts an origin in it:
 *
 *   - `CORS_ORIGINS`, comma-separated, is the answer everywhere that
 *     matters. A deployment names its own front ends.
 *   - In `local` only, and only then, private-network origins are allowed
 *     as well — `localhost`, `127.0.0.1`, and the RFC1918 ranges a phone
 *     on the same Wi-Fi comes from. That address changes with the
 *     network, so pinning it in a file would mean editing the file every
 *     time somebody joins a different one.
 *
 * What is NOT here: `origin: true`. Reflecting whatever origin asked,
 * with credentials enabled, is how a page on someone else's domain reads
 * a signed-in customer's address book.
 */
import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

/** localhost, 127.0.0.1, ::1, and the three private IPv4 ranges. */
const PRIVATE_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function isOriginAllowed(
  origin: string,
  allowList: readonly string[],
  isLocal: boolean
): boolean {
  if (allowList.includes(origin)) return true;
  return isLocal && PRIVATE_ORIGIN.test(origin);
}

export default fp(async function corsPlugin(app: FastifyInstance) {
  const allowList = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isLocal = app.config.NODE_ENV === "local";

  await app.register(cors, {
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "idempotency-key", "x-request-id"],
    origin(origin, done) {
      // A request with no Origin header is not a browser — curl, the
      // mobile apps, server-to-server. CORS has nothing to say about it.
      if (!origin) return done(null, true);
      if (isOriginAllowed(origin, allowList, isLocal)) return done(null, true);
      app.log.warn({ origin }, "CORS: origin refused");
      done(null, false);
    },
  });

  app.log.info(
    { allowList, privateNetworkAllowed: isLocal },
    "CORS configured"
  );
});
