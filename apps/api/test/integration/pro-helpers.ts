import type { PrismaClient } from "@prisma/client";
import { credentialTypeFor } from "@pro-now/types";

/**
 * A professional dispatch will offer a job to: approved account, the
 * service approved with their own visit fee, its documents current,
 * available, and a fresh location near (lat, lng).
 */
export async function dispatchablePro(db: PrismaClient, email: string, serviceId: string, lat: number, lng: number) {
  const user = await db.user.create({ data: { email, emailVerified: true, name: "Pat Pro" } });
  await db.userRole.create({ data: { userId: user.id, role: "PROFESSIONAL" } });
  const profile = await db.professionalProfile.create({
    data: { userId: user.id, legalName: "Pat Pro", displayName: "Pat", verificationStatus: "APPROVED", presenceState: "AVAILABLE" },
  });
  await db.professionalService.create({
    data: { professionalId: profile.id, serviceId, status: "APPROVED", basePriceMinorUnits: 25000 },
  });
  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId }, include: { requirements: true } });
  for (const r of service.requirements) {
    const type = credentialTypeFor(r.requirement);
    if (!type) continue;
    await db.professionalCredential.create({
      data: {
        professionalId: profile.id, serviceId, type, number: `T-${r.requirement}`, issuer: "test",
        status: "VERIFIED", expiresAt: new Date(Date.now() + 365 * 86400_000),
      },
    });
  }
  await db.professionalLocation.create({
    data: { professionalId: profile.id, lat: lat + 0.01, lng, accuracyMeters: 10, capturedAt: new Date(), receivedAt: new Date() },
  });
  return profile;
}

/** Offline, so the next file's job is never offered to this professional. */
export async function takeOffline(db: PrismaClient, professionalId: string | undefined) {
  if (professionalId) await db.professionalProfile.update({ where: { id: professionalId }, data: { presenceState: "OFFLINE" } });
}
