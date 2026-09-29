import type { PrismaClient, Role } from "@prisma/client";

export type { Role };

export async function rolesOf(db: PrismaClient, userId: string): Promise<Role[]> {
  const rows = await db.userRole.findMany({ where: { userId }, select: { role: true } });
  return rows.map((r) => r.role);
}

/** Idempotent. Returns true only when the role was newly granted. */
export async function grantRole(db: PrismaClient, userId: string, role: Role): Promise<boolean> {
  const { count } = await db.userRole.createMany({ data: [{ userId, role }], skipDuplicates: true });
  return count === 1;
}

/**
 * ADMIN comes only from the ADMIN_EMAILS allowlist, only for a verified
 * address, and every grant is written to audit_logs (docs/21 W1).
 */
export async function grantAdminIfAllowlisted(
  db: PrismaClient,
  user: { id: string; email: string; emailVerified: boolean },
  allowlist: readonly string[]
): Promise<boolean> {
  if (!user.emailVerified || !allowlist.includes(user.email.toLowerCase())) return false;
  const granted = await grantRole(db, user.id, "ADMIN");
  if (granted) {
    await db.auditLog.create({
      data: {
        actorId: "system:admin-allowlist",
        action: "ROLE_GRANTED",
        targetType: "user",
        targetId: user.id,
        afterJson: { role: "ADMIN", via: "ADMIN_EMAILS" },
      },
    });
  }
  return granted;
}
