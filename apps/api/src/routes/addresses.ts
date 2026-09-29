import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/access.js";
import { createAddressSchema } from "@pro-now/validation";

/**
 * The customer's saved places.
 *
 * ---------------------------------------------------------------------
 * WHY THIS FILE WAS MISSING AND WHAT THAT MEANT
 * ---------------------------------------------------------------------
 * `POST /v1/jobs` requires an `addressId` and checks that the address
 * belongs to the caller — correctly, because dispatching somebody to a
 * stranger's door is the worst failure this product has. But nothing in
 * the API could CREATE an address, and nothing could list one.
 *
 * So a customer who installed the app could not request a professional at
 * all: every job creation failed with ADDRESS_NOT_FOUND unless a row had
 * been put in the database by the seed script. The customer app hid this
 * by sending the literal string `"demo-address"`, which worked against a
 * seeded development database and against nothing else. The gap was
 * invisible precisely because both halves were confident.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS DOES NOT DO
 * ---------------------------------------------------------------------
 * No geocoding. Turning "רחוב הרצל 5" into a coordinate needs a maps
 * vendor, and choosing one is an open business decision (/CLAUDE.md §4 —
 * cost, licensing, privacy). The client sends coordinates it already has
 * — from the device's own location, which needs no vendor — together with
 * the text the customer typed or the device reverse-geocoded locally.
 *
 * No deletion, yet. An address referenced by a job cannot simply
 * disappear, because the job's history points at it; the right shape is a
 * soft archive, and that is a schema change rather than a route.
 */
export default async function addressesRoutes(app: FastifyInstance) {
  /**
   * The caller's own customer profile, created on first use.
   *
   * Same upsert `POST /v1/jobs` does, for the same reason: a customer
   * profile is not a thing anybody signs up for, it is the row that
   * appears the first time somebody acts as a customer.
   */
  async function customerFor(userId: string) {
    return app.prisma.customerProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  app.get("/v1/me/addresses", { onRequest: requireRole("CUSTOMER") }, async (req) => {
    const customer = await customerFor(req.user!.userId);
    const addresses = await app.prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
    });
    return { addresses };
  });

  app.post("/v1/me/addresses", { onRequest: requireRole("CUSTOMER") }, async (req, reply) => {
    const body = createAddressSchema.parse(req.body);
    const customer = await customerFor(req.user!.userId);

    /*
     * The same place saved twice is a list that grows every time somebody
     * requests from home. Matched on the text rather than on the
     * coordinate: two GPS fixes at one doorstep differ by metres, and
     * rounding them to decide sameness invents a tolerance nobody chose.
     */
    const existing = await app.prisma.address.findFirst({
      where: { customerId: customer.id, formatted: body.formatted },
    });
    if (existing) return reply.send({ address: existing });

    const address = await app.prisma.address.create({
      data: {
        customerId: customer.id,
        formatted: body.formatted,
        lat: body.lat,
        lng: body.lng,
        label: body.label ?? null,
        placeId: body.placeId ?? null,
      },
    });
    return reply.status(201).send({ address });
  });
}
