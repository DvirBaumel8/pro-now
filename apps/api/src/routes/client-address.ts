import type { FastifyInstance } from "fastify";

/**
 * GET /v1/client-address — the caller's own address, as this server
 * resolves it (TRUST_PROXY_HOPS), and the X-Forwarded-For chain their own
 * request arrived with. Only ever the caller's own data.
 *
 * It exists so the hop count can be measured rather than guessed
 * (docs/16 §Client address): `npm run smoke:prod` compares `address` with
 * the machine's public IP. If they differ, `forwardedFor` shows how many
 * proxies appended an address, which is the value TRUST_PROXY_HOPS needs.
 * A wrong count either makes every per-person limit site-wide, or lets a
 * client choose its own address.
 */
export default async function clientAddressRoutes(app: FastifyInstance) {
  app.get("/v1/client-address", async (req, reply) => {
    const forwarded = req.headers["x-forwarded-for"];
    reply.header("cache-control", "no-store");
    return {
      address: req.ip,
      trustedHops: app.config.TRUST_PROXY_HOPS,
      forwardedFor: (Array.isArray(forwarded) ? forwarded.join(",") : forwarded ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
  });
}
