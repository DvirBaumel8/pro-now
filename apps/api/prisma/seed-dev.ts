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
import { credentialTypeFor } from "@pro-now/types";

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
  /**
   * Set for the one professional who exists to be REFUSED. Their services
   * are approved and their account is verified, and the documents those
   * services require are deliberately not issued — so dispatch must
   * consider them and then rule them out.
   *
   * Without somebody in this shape, a walk that asks for a licensed trade
   * and finds nobody proves only that nobody offers it. The rule and an
   * empty market look identical from outside, and the rule is the one
   * carrying the promise.
   */
  withholdCredentials?: boolean;
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
  {
    phone: "+972500000107",
    legalName: "עומר בן-חיים",
    displayName: "עומר ב.",
    lat: 32.0744,
    lng: 34.7791,
    // Pest control requires LICENSE:PEST_CONTROL. He does not have one.
    serviceCodes: ["PEST_CONTROL"],
    withholdCredentials: true,
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

/** "+972500000101" -> "pro-0101@pronow.test"; the journey signs in with it. */
export function demoProfessionalEmail(phone: string): string {
  return `pro-${phone.slice(-4)}@pronow.test`;
}

async function seedProfessional(
  db: PrismaClientType,
  spec: (typeof DEMO_PROFESSIONALS)[number],
  now: Date
): Promise<{ displayName: string; services: number; credentials: number }> {
  // Sign-in is by email (docs/21 W1): each demo professional can be
  // signed in as, locally, by magic link through Mailpit.
  const email = demoProfessionalEmail(spec.phone);
  const user = await db.user.upsert({
    where: { phone: spec.phone },
    update: { email, emailVerified: true, name: spec.displayName },
    create: { phone: spec.phone, email, emailVerified: true, name: spec.displayName },
  });
  await db.userRole.createMany({ data: [{ userId: user.id, role: "PROFESSIONAL" }], skipDuplicates: true });

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
  let credentials = 0;
  for (const code of spec.serviceCodes) {
    const service = await db.service.findUnique({
      where: { code },
      include: { requirements: true },
    });
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

    /*
     * THE DOCUMENTS AN APPROVED PROFESSIONAL WOULD ACTUALLY HAVE.
     *
     * Service requirements exist now, which means the credential engine
     * finally has something to check — and it correctly refuses everybody
     * in this file, because none of them had a single document on file.
     * A professional the seed calls APPROVED and sends to a customer's
     * home must carry what that service demands, or the seed is claiming
     * an approval nobody granted.
     *
     * Only the document-shaped requirements. IDENTITY and BUSINESS are
     * account-level and are settled by `verificationStatus: APPROVED`
     * above, which is where the engine looks for them.
     */
    if (spec.withholdCredentials) continue;

    for (const requirement of service.requirements) {
      const type = credentialTypeFor(requirement.requirement);
      if (!type) continue;

      const existing = await db.professionalCredential.findFirst({
        where: { professionalId: pro.id, serviceId: service.id, type },
      });
      const data = {
        professionalId: pro.id,
        serviceId: service.id,
        type,
        number: `DEMO-${requirement.requirement.replace(/[^A-Z]/g, "")}-${spec.phone.slice(-4)}`,
        issuer: "רשות הדגמה",
        status: "VERIFIED",
        // A year out, so a demonstration does not quietly expire mid-week
        // and leave somebody debugging dispatch.
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      };
      if (existing) {
        await db.professionalCredential.update({ where: { id: existing.id }, data });
      } else {
        await db.professionalCredential.create({ data });
      }
      credentials += 1;
    }
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

  return { displayName: spec.displayName, services: approved, credentials };
}

/**
 * Put the demonstration cohort back on the shelf, out loud.
 *
 * The profile upsert below sets `presenceState: AVAILABLE`, and on a
 * re-run that can catch a professional who is holding a LIVE offer or is
 * partway through a job. Flipping them to AVAILABLE underneath it is
 * fabricated availability — the one thing the header of this file says it
 * will not do — and it produces exactly the symptom it deserves: the next
 * dispatch hands their job to them again while the first offer is still
 * open, and the accept fails against an offer that is no longer the
 * current one.
 *
 * So a re-run ENDS what is open first, rather than pretending it was
 * never there. The offers are marked EXPIRED, which is what they are
 * about to become anyway, and the jobs behind them are left to the
 * dispatch sweep — which will re-offer them to somebody else or, past the
 * search deadline, tell the customer nobody is coming. Neither outcome is
 * invented here.
 *
 * Only the demonstration phones. A real professional's presence is theirs.
 */
async function releaseDemoCohort(db: PrismaClientType): Promise<{ offers: number; busy: number }> {
  const pros = await db.professionalProfile.findMany({
    where: { user: { phone: { in: DEMO_PROFESSIONALS.map((p) => p.phone) } } },
    select: { id: true, presenceState: true },
  });
  if (pros.length === 0) return { offers: 0, busy: 0 };

  const ids = pros.map((p) => p.id);
  const { count } = await db.dispatchOffer.updateMany({
    where: { professionalId: { in: ids }, status: { in: ["CREATED", "SENT", "VIEWED"] } },
    data: { status: "EXPIRED" },
  });

  const busy = pros.filter((p) => p.presenceState !== "OFFLINE" && p.presenceState !== "AVAILABLE").length;
  return { offers: count, busy };
}

async function main(): Promise<void> {
  assertLocalOnly();

  console.log("Seeding DEVELOPMENT professionals — local database only.");
  const now = new Date();

  const released = await releaseDemoCohort(prisma);
  if (released.offers > 0 || released.busy > 0) {
    console.log(
      `  reset: ${released.offers} live offer(s) expired, ${released.busy} professional(s) were mid-flight`
    );
  }

  for (const spec of DEMO_PROFESSIONALS) {
    const result = await seedProfessional(prisma, spec, now);
    console.log(
      `  ${result.displayName.padEnd(10)} ${result.services} service(s), ${result.credentials} credential(s)`
    );
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
