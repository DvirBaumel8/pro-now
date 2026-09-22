/**
 * WHAT THE PROFESSIONAL EARNED, ITEMISED.
 *
 * ---------------------------------------------------------------------
 * WHY FOUR NUMBERS WERE NOT ENOUGH
 * ---------------------------------------------------------------------
 * `/v1/pro/earnings` returned a lifetime net, a lifetime gross, a
 * currency and a count. `ProEarningsBody` — the screen that was designed
 * for this, audited by `verify:a11y`, and which the shipped app does not
 * currently render — needs a week of days and a list of jobs, each job
 * with **every deduction named**.
 *
 * Its own header says why, and it is the best argument in this codebase
 * for doing the work properly:
 *
 *   "A professional's relationship with a marketplace is mostly this
 *    screen: if the arithmetic is hard to follow, they assume they are
 *    being shaved, and they are often right somewhere else. So every
 *    deduction is named and shown, and the gross is shown beside the net.
 *    A platform that only displays take-home is hiding its own commission
 *    behind a friendly number."
 *
 * The ledger has held exactly that shape since §21. Nothing was reading
 * it.
 *
 * ---------------------------------------------------------------------
 * NET CAN BE UNKNOWN, AND UNKNOWN IS NOT ZERO
 * ---------------------------------------------------------------------
 * With no commission percentage configured, a captured payment writes
 * CUSTOMER_CHARGE and nothing else: the platform's cut and therefore the
 * professional's share are not computable, and §4 forbids guessing them.
 *
 * So `netMinorUnits` is nullable here and all the way to the screen.
 * Rendering ₪0.00 would tell somebody who worked all week that they
 * earned nothing, which is a worse falsehood than the one the nullable
 * type costs to carry.
 */
import type { PrismaClient } from "@prisma/client";

export interface EarningDeduction {
  code: string;
  labelHe: string;
  /** Positive magnitude. The screen renders the minus sign. */
  minorUnits: number;
}

export interface EarningJobLine {
  jobId: string;
  serviceCode: string;
  serviceNameHe: string;
  completedAt: string;
  grossMinorUnits: number;
  deductions: EarningDeduction[];
  /** Null when no commission is configured — see above. */
  netMinorUnits: number | null;
}

export interface EarningDayLine {
  /** Midnight of the day, ISO. The screen decides how to label it. */
  dateISO: string;
  netMinorUnits: number | null;
  jobs: number;
}

export interface EarningsSummary {
  currency: string;
  periodFromISO: string;
  periodToISO: string;
  periodGrossMinorUnits: number;
  periodNetMinorUnits: number | null;
  periodJobCount: number;
  days: EarningDayLine[];
  jobs: EarningJobLine[];
  /**
   * True when at least one captured payment has no payable row, which is
   * what an unset commission looks like from here. The screen says so
   * rather than leaving a professional to wonder about a dash.
   */
  awaitingCommissionDecision: boolean;
}

/** Hebrew for each ledger entry type a professional can be charged. */
const DEDUCTION_LABELS_HE: Readonly<Record<string, string>> = {
  PLATFORM_FEE: "עמלת פלטפורמה",
  REFUND: "החזר ללקוח",
};

const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function earningsFor(
  prisma: PrismaClient,
  professionalId: string,
  now: Date = new Date(),
  days = 7
): Promise<EarningsSummary> {
  const periodFrom = new Date(startOfDay(now).getTime() - (days - 1) * DAY_MS);

  const payments = await prisma.payment.findMany({
    where: {
      job: { assignedProfessionalId: professionalId },
      status: "CAPTURED",
      createdAt: { gte: periodFrom },
    },
    include: {
      ledgerEntries: true,
      job: { include: { service: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const jobs: EarningJobLine[] = payments.map((payment) => {
    const charge = payment.ledgerEntries
      .filter((e) => e.entryType === "CUSTOMER_CHARGE")
      .reduce((sum, e) => sum + e.amountMinorUnits, 0);

    const payableRows = payment.ledgerEntries.filter(
      (e) => e.entryType === "PROFESSIONAL_PAYABLE"
    );

    const deductions = payment.ledgerEntries
      .filter((e) => e.entryType !== "CUSTOMER_CHARGE" && e.entryType !== "PROFESSIONAL_PAYABLE")
      .map((e) => ({
        code: e.entryType,
        // An unlabelled deduction is exactly the "single fees lump" the
        // screen refuses, so an unknown type keeps its own name rather
        // than being folded into something vague.
        labelHe: DEDUCTION_LABELS_HE[e.entryType] ?? e.entryType,
        minorUnits: Math.abs(e.amountMinorUnits),
      }));

    return {
      jobId: payment.jobId,
      serviceCode: payment.job.service.code,
      serviceNameHe: payment.job.service.nameHe,
      completedAt: payment.createdAt.toISOString(),
      grossMinorUnits: charge,
      deductions,
      netMinorUnits:
        payableRows.length === 0
          ? null
          : payableRows.reduce((sum, e) => sum + e.amountMinorUnits, 0),
    };
  });

  const byDay = new Map<string, { net: number | null; jobs: number }>();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(periodFrom.getTime() + i * DAY_MS);
    byDay.set(day.toISOString(), { net: null, jobs: 0 });
  }
  for (const job of jobs) {
    const key = startOfDay(new Date(job.completedAt)).toISOString();
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.jobs += 1;
    if (job.netMinorUnits !== null) bucket.net = (bucket.net ?? 0) + job.netMinorUnits;
  }

  const anyNet = jobs.some((j) => j.netMinorUnits !== null);

  return {
    currency: "ILS",
    periodFromISO: periodFrom.toISOString(),
    periodToISO: now.toISOString(),
    periodGrossMinorUnits: jobs.reduce((sum, j) => sum + j.grossMinorUnits, 0),
    periodNetMinorUnits: anyNet
      ? jobs.reduce((sum, j) => sum + (j.netMinorUnits ?? 0), 0)
      : null,
    periodJobCount: jobs.length,
    days: [...byDay.entries()].map(([dateISO, v]) => ({
      dateISO,
      netMinorUnits: v.net,
      jobs: v.jobs,
    })),
    jobs,
    awaitingCommissionDecision: jobs.some((j) => j.netMinorUnits === null),
  };
}
