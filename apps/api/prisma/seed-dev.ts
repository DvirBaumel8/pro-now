/**
 * DEVELOPMENT SEED — professionals to dispatch to.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * `seed.ts` seeds the taxonomy: departments, categories, services, market
 * activation. That is the catalogue, and it is real — it comes from
 * /docs/09b-SERVICE-CATALOG.md.
 *
 * What it does not seed is PEOPLE, and without people the product cannot
 * be walked. A customer picks a service, gives an address, taps request,
 * and dispatch answers NO_ELIGIBLE_CANDIDATES — correctly, because there
 * is nobody there. Every screen after that point is unreachable, which
 * means the first end-to-end run of this product could not happen.
 *
 * ---------------------------------------------------------------------
 * WHAT THESE ROWS ARE, AND WHAT THEY ARE NOT
 * ---------------------------------------------------------------------
 * They are demonstration data for a local machine. They are NOT:
 *
 *   - a pricing recommendation. `ProfessionalService` says it plainly:
 *     actual prices are a professional's own commercial decision and the
 *     pilot price points are a business decision (/CLAUDE.md §4). The
 *     amounts below are round numbers chosen so the screens have
 *     something to render. Nobody should read a strategy into ₪180.
 *
 *   - real supply. /CLAUDE.md §3 forbids fabricating availability, and
 *     this file would do exactly that if it ever ran against a shared
 *     database. So it refuses to: NODE_ENV must be `local` AND
 *     DATABASE_URL must point at this machine. Both, not either.
 *
 * ---------------------------------------------------------------------
 * LOCATION FRESHNESS IS NOT FAKED
 * ---------------------------------------------------------------------
 * Dispatch rejects a professional whose last position is older than
 * LOCATION_FRESHNESS_THRESHOLD_SECONDS (90 by default), and that rule is
 * the product working: a position from an hour ago is not a position.
 *
 * This seed writes one position per professional, so they are eligible
 * for ninety seconds and then, correctly, are not. `npm run dev:pulse`
 * keeps them alive the way a real phone does — by reporting a new
 * position on a timer — rather than by moving the threshold.
 *
 * Idempotent: re-running updates the same rows, keyed by phone.
 */
import "../src/load-env";

import { PrismaClient, type PrismaClient as PrismaClientType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * The refusal. Demonstration supply in a real database is the exact thing
 * /CLAUDE.md §3 calls out, so this is a hard stop and not a warning.
 */
function assertLocalOnly(): void {
  const env = process.env.NODE_ENV ?? "";
  const url = process.env.DATABASE_URL ?? "";
  const isLocalEnv = env === "local" || env === "test";
  const isLocalHost = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);

  if (!isLocalEnv || !isLocalHost) {
    console.error(
      [
        "seed-dev refuses to run here.",
        "",
        `  NODE_ENV      = ${env || "(unset)"}        (must be local or test)`,
        `  DATABASE_URL  = ${url ? "points at " + (url.match(/@([^/:]+)/)?.[1] ?? "?") : "(unset)"}   (must be this machine)`,
        "",
        "It inserts professionals who are AVAILABLE and carry a current",
        "position. Against a shared database that is fabricated supply,",
        "which /CLAUDE.md §3 forbids outright.",
      ].join("\n")
    );
    process.exit(1);
  }
}

/**
 * Central Tel Aviv, spread over roughly two kilometres. The bounding-box
 * pre-filter in dispatch-service.ts is generous (±0.15°), so what matters
 * here is not being *precisely* beside the customer — it is being close
 * enough that the ETA the maps adapter returns is not absurd.
 */
const DEMO_PROFESSIONALS: ReadonlyArray<{
  phone: string;
  legalName: string;
  displayName: string;
  lat: number;
  lng: number;
  serviceCodes: readonly string[];
}> = [
  {
    phone: "+972500000101",
    legalName: "דוד כהן",
    displayName: "דוד כ.",
    lat: 32.0789,
    lng: 34.7801,
    serviceCodes: ["HOME_PLUMB_LEAK", "HOME_PLUMB_BLOCK", "HOME_HANDYMAN"],
  },
  {
    phone: "+972500000102",
    legalName: "מירי לוי",
    displayName: "מירי ל.",
    lat: 32.0755,
    lng: 34.7745,
    serviceCodes: ["BEAUTY_HAIR_BLOWDRY", "BEAUTY_NAIL_GEL", "BEAUTY_NAIL_MANICURE"],
  },
  {
    phone: "+972500000103",
    legalName: "אבי מזרחי",
    displayName: "אבי מ.",
    lat: 32.0832,
    lng: 34.7789,
    serviceCodes: ["HOME_ELECT_FAULT", "HOME_ELECT_INSTALL"],
  },
  {
    phone: "+972500000104",
    legalName: "נטלי אברהם",
    displayName: "נטלי א.",
    lat: 32.0712,
    lng: 34.7822,
    serviceCodes: ["CLEAN_BASIC", "CLEAN_URGENT"],
  },
  {
    phone: "+972500000105",
    legalName: "יוסי פרץ",
    displayName: "יוסי פ.",
    lat: 32.0801,
    lng: 34.7712,
    serviceCodes: ["COURIER_DOC", "COURIER_STORE"],
  },
  {
    phone: "+972500000106",
    legalName: "רונית שגב",
    displayName: "רונית ש.",
    lat: 32.0768,
    lng: 34.7856,
    serviceCodes: ["WELLNESS_MASSAGE60", "WELLNESS_MASSAGE90", "BEAUTY_HAIR_MEN"],
  },
];

/**
 * Round demonstration amounts, in minor units, keyed by the SERVICE's
 * price model rather than by service — because the model is what decides
 * which of these columns means anything (see ProfessionalService).
 *
 * These are not prices. They are numbers that let a screen render a
 * price-shaped thing.
 */
const DEMO_PRICING: Record<
  string,
  {
    basePriceMinorUnits: number;
    minimumBillableMinutes?: number;
    perKmMinorUnits?: number;
    minimumFareMinorUnits?: number;
  }
> = {
  FIXED: { basePriceMinorUnits: 18000 },
  VISIT_QUOTE: { basePriceMinorUnits: 15000 },
  HOURLY: { basePriceMinorUnits: 9000, minimumBillableMinutes: 120 },
  DISTANCE_TIME: {
    basePriceMinorUnits: 2000,
    perKmMinorUnits: 500,
    minimumFareMinorUnits: 3000,
  },
};

async function seedProfessional(
  db: PrismaClientType,
  spec: (typeof DEMO_PROFESSIONALS)[number],
  now: Date
): Promise<{ displayName: string; services: number }> {
  const user = await db.user.upsert({
    where: { phone: spec.phone },
    update: {},
    create: { phone: spec.phone },
  });

  const pro = await db.professionalProfile.upsert({
    where: { userId: user.id },
    update: {
      legalName: spec.legalName,
      displayName: spec.displayName,
      verificationStatus: "APPROVED",
      presenceState: "AVAILABLE",
    },
    create: {
      userId: user.id,
      legalName: spec.legalName,
      displayName: spec.displayName,
      verificationStatus: "APPROVED",
      presenceState: "AVAILABLE",
    },
  });

  let approved = 0;
  for (const code of spec.serviceCodes) {
    const service = await db.service.findUnique({ where: { code } });
    if (!service) {
      console.warn(`  ! service ${code} is not in the catalogue — skipped`);
      continue;
    }
    const pricing = DEMO_PRICING[service.priceModel] ?? DEMO_PRICING.FIXED!;
    await db.professionalService.upsert({
      where: { professionalId_serviceId: { professionalId: pro.id, serviceId: service.id } },
      update: { status: "APPROVED", ...pricing },
      create: { professionalId: pro.id, serviceId: service.id, status: "APPROVED", ...pricing },
    });
    approved += 1;
  }

  // One position, now. It ages out in ninety seconds exactly as a real
  // one would — see the note at the top of this file.
  await db.professionalLocation.create({
    data: {
      professionalId: pro.id,
      lat: spec.lat,
      lng: spec.lng,
      accuracyMeters: 12,
      capturedAt: now,
      receivedAt: now,
    },
  });

  return { displayName: spec.displayName, services: approved };
}

async function main(): Promise<void> {
  assertLocalOnly();

  console.log("Seeding DEVELOPMENT professionals — local database only.");
  const now = new Date();

  for (const spec of DEMO_PROFESSIONALS) {
    const result = await seedProfessional(prisma, spec, now);
    console.log(`  ${result.displayName.padEnd(10)} ${result.services} service(s) approved`);
  }

  const available = await prisma.professionalProfile.count({
    where: { presenceState: "AVAILABLE", verificationStatus: "APPROVED" },
  });
  console.log(`\n${available} professional(s) AVAILABLE and approved.`);
  console.log("Their positions are current for 90 seconds — run `npm run dev:pulse`");
  console.log("to keep them dispatch-eligible the way a phone would.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
