/**
 * DEVELOPMENT — the heartbeat a phone would send.
 *
 * Dispatch refuses a professional whose last position is older than
 * LOCATION_FRESHNESS_THRESHOLD_SECONDS, and that rule is the product
 * being honest: a position from an hour ago is not a position, and
 * offering a job to a phone that stopped reporting is how a customer ends
 * up waiting for somebody who was never coming.
 *
 * So the demonstration professionals seeded by `prisma/seed-dev.ts` go
 * stale after ninety seconds, exactly as they should. There are two ways
 * to walk the product past that point:
 *
 *   1. Raise the threshold locally. This makes the walk work and quietly
 *      disables the rule being walked through.
 *   2. Report a position on a timer, which is what `expo-location` does
 *      on a real professional's phone every few seconds.
 *
 * This is (2). It writes the same rows `POST /v1/pro/location` writes,
 * and it drifts each position by a few metres so the map has something
 * to move — a professional standing at a mathematically identical
 * coordinate for an hour is its own kind of lie.
 *
 * Local database only, for the same reason as the seed: inserting live
 * positions for people who are not there is fabricated supply
 * (/CLAUDE.md §3).
 *
 * Run: npm run dev:pulse   (Ctrl-C to stop)
 */
import "../src/load-env";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INTERVAL_SECONDS = Number(process.env.DEV_PULSE_INTERVAL_SECONDS ?? 20);

/** Metres of drift per tick — a walking pace, not a teleport. */
const DRIFT_METRES = 8;
const METRES_PER_DEGREE_LAT = 111_320;

function assertLocalOnly(): void {
  const env = process.env.NODE_ENV ?? "";
  const url = process.env.DATABASE_URL ?? "";
  if (!(env === "local" || env === "test") || !/@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url)) {
    console.error(
      "dev:pulse refuses to run outside a local database — it writes live positions " +
        "for demonstration professionals, which is fabricated supply anywhere else."
    );
    process.exit(1);
  }
}

/**
 * The demonstration cohort, and only it. A pulse that found every
 * professional would also pulse real ones, and a real professional's
 * position must come from their own device or it is not theirs.
 */
const DEMO_PHONE_PREFIX = "+97250000010";

async function tick(): Promise<number> {
  const pros = await prisma.professionalProfile.findMany({
    where: { user: { phone: { startsWith: DEMO_PHONE_PREFIX } } },
    include: { locations: { orderBy: { receivedAt: "desc" }, take: 1 } },
  });

  const now = new Date();
  let written = 0;

  for (const pro of pros) {
    const last = pro.locations[0];
    if (!last) continue;

    const bearing = Math.random() * Math.PI * 2;
    const dLat = (Math.cos(bearing) * DRIFT_METRES) / METRES_PER_DEGREE_LAT;
    const dLng =
      (Math.sin(bearing) * DRIFT_METRES) /
      (METRES_PER_DEGREE_LAT * Math.cos((last.lat * Math.PI) / 180));

    await prisma.professionalLocation.create({
      data: {
        professionalId: pro.id,
        lat: last.lat + dLat,
        lng: last.lng + dLng,
        accuracyMeters: 10 + Math.random() * 8,
        headingDegrees: (bearing * 180) / Math.PI,
        speedMps: DRIFT_METRES / INTERVAL_SECONDS,
        capturedAt: now,
        receivedAt: now,
      },
    });
    written += 1;
  }

  return written;
}

async function main(): Promise<void> {
  assertLocalOnly();

  const first = await tick();
  if (first === 0) {
    console.error(
      "No demonstration professionals found. Run `npm run db:seed:dev -w apps/api` first."
    );
    process.exit(1);
  }

  console.log(
    `Pulsing ${first} demonstration professional(s) every ${INTERVAL_SECONDS}s. Ctrl-C to stop.`
  );

  let ticks = 1;
  const timer = setInterval(() => {
    void tick()
      .then((n) => {
        ticks += 1;
        if (ticks % 15 === 0) console.log(`  … ${ticks} ticks, ${n} position(s) per tick`);
      })
      .catch((e) => console.error("pulse failed:", e instanceof Error ? e.message : e));
  }, INTERVAL_SECONDS * 1000);

  const stop = () => {
    clearInterval(timer);
    void prisma.$disconnect().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
