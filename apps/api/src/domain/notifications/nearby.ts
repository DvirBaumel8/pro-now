import type { FastifyInstance } from "fastify";

/**
 * "HE'S NEAR", ONCE (the demo's on-the-way screen: "נקרא לכם כשהוא מתקרב",
 * and its "מתקרב" when three minutes are left).
 *
 * On each location ping from a professional who is on the way, their ETA to
 * the job's address is computed from that position by the same maps
 * provider dispatch and the match card use. When it is three minutes or less
 * a PRO_NEARBY job event is written, and the notifications policy tells the
 * customer. The database lets the event exist once per job (migration
 * 20261006a), so two pings at once cannot send it twice, and once it exists
 * no ETA is computed again for that job.
 */
export const NEARBY_SECONDS = 180;

export function isNearby(etaSeconds: number | null | undefined): boolean {
  return typeof etaSeconds === "number" && Number.isFinite(etaSeconds) && etaSeconds >= 0 && etaSeconds <= NEARBY_SECONDS;
}

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === "P2002";

/** Write PRO_NEARBY for the professional's job on the way, if they are near now. True when it was written. */
export async function noticeNearby(
  app: FastifyInstance,
  professionalId: string,
  at: { lat: number; lng: number },
): Promise<boolean> {
  const job = await app.prisma.job.findFirst({
    where: { assignedProfessionalId: professionalId, status: "PRO_EN_ROUTE" },
    select: { id: true, address: { select: { lat: true, lng: true } } },
  });
  if (!job?.address) return false;
  const already = await app.prisma.jobEvent.findFirst({ where: { jobId: job.id, type: "PRO_NEARBY" }, select: { id: true } });
  if (already) return false;
  const [eta] = await app.providers.maps.getEtaBatch(
    { lat: job.address.lat, lng: job.address.lng },
    [{ id: professionalId, location: at }],
  );
  if (!isNearby(eta?.etaSeconds)) return false;
  try {
    await app.prisma.jobEvent.create({
      data: { jobId: job.id, type: "PRO_NEARBY", actor: "SYSTEM", metadata: { etaSeconds: eta!.etaSeconds } },
    });
    return true;
  } catch (e) {
    if (isUniqueViolation(e)) return false;
    throw e;
  }
}
