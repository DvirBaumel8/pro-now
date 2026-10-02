/**
 * A PROFESSIONAL BRINGING THE REPUTATION THEY ALREADY HAVE.
 *
 * Somebody with four years of reviews on a public platform arrives here
 * with nothing, and the dispatch engine correctly scores them on an
 * unknown record (§22). Letting them connect what they already have is
 * the honest way to shorten that, and `/docs/10 §Reputation import` is
 * where the product asked for it.
 *
 * ---------------------------------------------------------------------
 * WHAT THESE ROUTES WILL NOT DO
 * ---------------------------------------------------------------------
 * They never fetch a rating themselves. Every number comes from
 * `ExternalReputationProvider`, whose own header says **"Never scrape"**,
 * and whose sandbox implementation returns nothing at all — which is
 * `/docs/10`'s "if the integration isn't ready, hide the block entirely",
 * enforced by the adapter rather than remembered by a caller.
 *
 * They never accept a rating from the professional. A link is a fact they
 * are entitled to state about themselves; a rating is not, and
 * `external-display.ts` withholds any number whose provenance is not an
 * integration.
 *
 * And linking is not verifying. A link claimed here is PENDING. Proving
 * that the profile belongs to this professional is an ownership check the
 * provider has to support, and no provider configured here does yet — so
 * nothing reaches LINKED by this route, and the card shows nothing.
 * Saying so is the point: the mechanism is complete and the seam is
 * visible, rather than a half-built flow that quietly promotes itself.
 */
import type { FastifyInstance } from "fastify";
import { requireRole } from "../auth/access.js";

export default async function proReputationRoutes(app: FastifyInstance) {
  /** The sources a professional could connect, and whether any is live. */
  app.get("/v1/pro/reputation/sources", { onRequest: requireRole("PROFESSIONAL") }, async (_req, reply) => {
    const sources = await app.prisma.externalReputationSource.findMany({
      orderBy: { code: "asc" },
    });
    return reply.send({
      sources: sources.map((s) => ({
        code: s.code,
        displayNameHe: s.displayNameHe || s.code,
        // False everywhere until an integration exists under a source's
        // terms. The professional's screen says "not available yet"
        // rather than offering a button that cannot work.
        integrationEnabled: s.integrationEnabled,
      })),
      providerName: app.providers.reputation.vendorName,
      providerIsSandbox: app.providers.reputation.isSandbox,
    });
  });

  /** What this professional has connected, and what is being shown of it. */
  app.get("/v1/pro/reputation", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!professional) {
      return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    }

    const profiles = await app.prisma.professionalExternalProfile.findMany({
      where: { professionalId: professional.id },
      include: { source: true, snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    return reply.send({
      profiles: profiles.map((p) => ({
        sourceCode: p.source.code,
        sourceDisplayNameHe: p.source.displayNameHe || p.source.code,
        profileUrl: p.profileUrl,
        linkStatus: p.linkStatus,
        dataProvenance: p.dataProvenance,
        syncStatus: p.syncStatus,
        lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
        /*
         * Told to the professional and not to the customer. Somebody who
         * connected their profile and sees nothing on their card deserves
         * to know it is waiting on an integration rather than on them.
         */
        visibleToCustomers: p.linkStatus === "LINKED" && p.source.integrationEnabled,
      })),
    });
  });

  /** Search the provider for a profile that might be theirs. */
  app.post("/v1/pro/reputation/search", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const body = (req.body ?? {}) as { query?: unknown };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (query.length < 2) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Request body failed validation",
        fields: [{ path: "query", message: "At least 2 characters" }],
      });
    }

    const results = await app.providers.reputation.findProfile(query);
    return reply.send({
      results,
      /*
       * An empty list from the sandbox adapter is not a failure and must
       * not be rendered as "no profiles found" — that would tell a
       * professional their public profile does not exist. It means we
       * have nowhere to look yet.
       */
      providerIsSandbox: app.providers.reputation.isSandbox,
    });
  });

  /** Claim a profile as theirs. Claiming is not proving. */
  app.post("/v1/pro/reputation/link", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const body = (req.body ?? {}) as {
      sourceCode?: unknown;
      externalProfileId?: unknown;
      profileUrl?: unknown;
    };
    const sourceCode = typeof body.sourceCode === "string" ? body.sourceCode : "";
    const externalProfileId =
      typeof body.externalProfileId === "string" ? body.externalProfileId : "";
    const profileUrl = typeof body.profileUrl === "string" ? body.profileUrl : null;

    if (!sourceCode || !externalProfileId) {
      return reply.status(400).send({
        code: "VALIDATION_FAILED",
        message: "Request body failed validation",
        fields: [
          ...(sourceCode ? [] : [{ path: "sourceCode", message: "Required" }]),
          ...(externalProfileId ? [] : [{ path: "externalProfileId", message: "Required" }]),
        ],
      });
    }

    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!professional) {
      return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    }

    const source = await app.prisma.externalReputationSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      return reply.status(404).send({ code: "SOURCE_NOT_FOUND", message: "Unknown reputation source" });
    }

    const profile = await app.prisma.professionalExternalProfile.upsert({
      where: {
        professionalId_sourceId: { professionalId: professional.id, sourceId: source.id },
      },
      update: {
        externalProfileId,
        profileUrl,
        /*
         * PENDING, always. A claim is not a proof, and there is no
         * ownership check to run: the configured provider is a sandbox
         * that finds nothing. Writing LINKED here would put a
         * VERIFIED-shaped badge on the customer's card on the strength of
         * somebody typing a URL.
         */
        linkStatus: "PENDING",
        dataProvenance: "PROFESSIONAL_DECLARED",
        allowedDisplayFields: [],
        syncStatus: "NEVER_SYNCED",
      },
      create: {
        professionalId: professional.id,
        sourceId: source.id,
        externalProfileId,
        profileUrl,
        linkStatus: "PENDING",
        dataProvenance: "PROFESSIONAL_DECLARED",
        allowedDisplayFields: [],
        syncStatus: "NEVER_SYNCED",
      },
    });

    return reply.send({
      ok: true,
      linkStatus: profile.linkStatus,
      /*
       * Said plainly, because the professional will otherwise wonder why
       * their card is unchanged. The honest answer is that we are not
       * connected to this source yet — not that their profile was
       * rejected.
       */
      messageHe: source.integrationEnabled
        ? "הקישור נשמר וממתין לאימות בעלות מול המקור."
        : "הקישור נשמר. עדיין אין לנו חיבור רשמי למקור הזה, אז הדירוג משם לא יוצג עד שיהיה.",
    });
  });

  /** Disconnect. Theirs to give, theirs to take back. */
  app.post("/v1/pro/reputation/unlink", { onRequest: requireRole("PROFESSIONAL") }, async (req, reply) => {
    const body = (req.body ?? {}) as { sourceCode?: unknown };
    const sourceCode = typeof body.sourceCode === "string" ? body.sourceCode : "";

    const professional = await app.prisma.professionalProfile.findUnique({
      where: { userId: req.user!.userId },
    });
    if (!professional) {
      return reply.status(404).send({ code: "PROFESSIONAL_NOT_FOUND", message: "No professional profile" });
    }
    const source = await app.prisma.externalReputationSource.findUnique({
      where: { code: sourceCode },
    });
    if (!source) {
      return reply.status(404).send({ code: "SOURCE_NOT_FOUND", message: "Unknown reputation source" });
    }

    await app.prisma.professionalExternalProfile.updateMany({
      where: { professionalId: professional.id, sourceId: source.id },
      data: { linkStatus: "UNLINKED" },
    });

    return reply.send({ ok: true });
  });
}
