/**
 * Seed script — converts the checked-in seed-data arrays (themselves
 * converted from the Service Catalog & Pilot Matrix sheet, see
 * /docs/09b-SERVICE-CATALOG.md) into database rows. Idempotent: safe to
 * run repeatedly against the same database.
 */
import { PrismaClient } from "@prisma/client";
import { departments, categories, services, PILOT_MARKET_CODE } from "./seed-data/services";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding PRO NOW taxonomy from /docs/09b-SERVICE-CATALOG.md seed data...");

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: { nameHe: dept.nameHe, nameEn: dept.nameEn, sortOrder: dept.sortOrder },
      create: dept,
    });
  }
  console.log(`  departments: ${departments.length}`);

  const departmentIdByCode = new Map(
    (await prisma.department.findMany()).map((d) => [d.code, d.id])
  );

  for (const cat of categories) {
    const departmentId = departmentIdByCode.get(cat.departmentCode);
    if (!departmentId) throw new Error(`Unknown department code ${cat.departmentCode}`);
    await prisma.category.upsert({
      where: { code: cat.code },
      update: { nameHe: cat.nameHe, nameEn: cat.nameEn, departmentId },
      create: { code: cat.code, nameHe: cat.nameHe, nameEn: cat.nameEn, departmentId },
    });
  }
  console.log(`  categories: ${categories.length}`);

  const categoryIdByCode = new Map(
    (await prisma.category.findMany()).map((c) => [c.code, c.id])
  );

  for (const svc of services) {
    const categoryId = categoryIdByCode.get(svc.categoryCode);
    if (!categoryId) throw new Error(`Unknown category code ${svc.categoryCode}`);
    const created = await prisma.service.upsert({
      where: { code: svc.code },
      update: {
        nameHe: svc.nameHe,
        nameEn: svc.nameEn,
        priceModel: svc.priceModel,
        typicalDurationMinutesMin: svc.durationMinMinutes ?? undefined,
        typicalDurationMinutesMax: svc.durationMaxMinutes ?? undefined,
        trustTier: svc.trustTier,
        categoryId,
      },
      create: {
        code: svc.code,
        nameHe: svc.nameHe,
        nameEn: svc.nameEn,
        priceModel: svc.priceModel,
        bookingMode: "NOW",
        typicalDurationMinutesMin: svc.durationMinMinutes ?? undefined,
        typicalDurationMinutesMax: svc.durationMaxMinutes ?? undefined,
        trustTier: svc.trustTier,
        categoryId,
      },
    });

    // Only PILOT_CANDIDATE rows are customer-visible/dispatch-enabled in the
    // dev pilot market. VALIDATE rows exist in the taxonomy but stay hidden
    // until a human approves them — see /docs/05-DATABASE.md §Market activation.
    const isPilotCandidate = svc.launchStatus === "PILOT_CANDIDATE";
    await prisma.marketActivation.upsert({
      where: { marketCode_serviceId: { marketCode: PILOT_MARKET_CODE, serviceId: created.id } },
      update: {
        customerVisible: isPilotCandidate,
        providerOnboardingEnabled: isPilotCandidate,
        dispatchEnabled: isPilotCandidate,
      },
      create: {
        marketCode: PILOT_MARKET_CODE,
        serviceId: created.id,
        customerVisible: isPilotCandidate,
        providerOnboardingEnabled: isPilotCandidate,
        dispatchEnabled: isPilotCandidate,
      },
    });
  }
  console.log(`  services: ${services.length} (pilot-active: ${services.filter(s => s.launchStatus === "PILOT_CANDIDATE").length})`);

  // Seed default dispatch scoring weights into app_config — see
  // /docs/08-DISPATCH-ENGINE.md §Scoring. Admin-editable, never hard-coded
  // into application logic.
  await prisma.appConfig.upsert({
    where: { key: "dispatch.scoring.weights" },
    update: {},
    create: {
      key: "dispatch.scoring.weights",
      value: {
        etaWeight: 0.4,
        serviceFitWeight: 0.25,
        ratingWeight: 0.15,
        acceptanceWeight: 0.1,
        completionWeight: 0.1,
      },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
