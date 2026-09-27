/**
 * THE PRICE FOLLOWS WHAT YOU CHOSE.
 *
 * Amit: *"יש כל מיני מקצועות שהמחיר לא משתנה לא משנה מה אני בוחר —
 * לדוגמא באיפור היה 350 שקל לא משנה מה בחרתי."* A wedding look for three
 * with hair and a quick day look for one were the same ₪350, which no
 * make-up artist on earth charges and which tells the customer that the
 * questions they just answered were for show.
 *
 * So a fixed or hourly service carries a price table keyed by its own
 * intake answers: the kind of job sets the price, extras add to it, and
 * "how many" multiplies it. For hourly work the answers estimate the hours
 * and may move the rate (a large dog, stairs only).
 *
 * WHOSE PRICES THESE ARE. Professionals set their own prices (Amit,
 * 2026-09-27; /docs/18-ROADMAP.md). These tables are the preview's EXAMPLE
 * price list — the same standing as `previewPrices` beside them — and a
 * professional who set his own figure for the service scales the whole
 * table by it (`scaleTo`). Nothing here is a platform tariff.
 *
 * A visit-and-quote service has no table on purpose: its only price before
 * the visit is the visit fee, and answers do not change a fee for coming
 * to look.
 */
import type { IntakeAnswer } from "@pro-now/types";

export interface PriceEffect {
  /** This answer IS the job: its price replaces the base (several are summed). */
  set?: number;
  /** An extra on top, once. May be negative (you already have the part). */
  add?: number;
  /** How many of it, or how much harder: multiplies the price (or the hourly rate). */
  times?: number;
  /** Hourly work: how long this answer means it will take. */
  hours?: number;
}

/** question id → option id ("yes"/"no" for yes-no questions) → effect. */
export type ChoicePriceTable = Record<string, Record<string, PriceEffect>>;

/** For numeric answers: hours per unit (rooms), or the number IS the hours. */
export type NumberEffect = { hoursPer?: number; isHours?: true };

export interface ServiceChoicePrices {
  options: ChoicePriceTable;
  numbers?: Record<string, NumberEffect>;
}

const ils = (n: number) => n * 100;

/* Shekels below, converted once — a table of five-digit agorot is unreadable. */
function t(options: Record<string, Record<string, { set?: number; add?: number; times?: number; hours?: number }>>, numbers?: Record<string, NumberEffect>): ServiceChoicePrices {
  const out: ChoicePriceTable = {};
  for (const [q, opts] of Object.entries(options)) {
    out[q] = {};
    for (const [o, e] of Object.entries(opts)) {
      out[q]![o] = {
        ...(e.set !== undefined ? { set: ils(e.set) } : {}),
        ...(e.add !== undefined ? { add: ils(e.add) } : {}),
        ...(e.times !== undefined ? { times: e.times } : {}),
        ...(e.hours !== undefined ? { hours: e.hours } : {}),
      };
    }
  }
  return numbers ? { options: out, numbers } : { options: out };
}

export const previewChoicePrices: Readonly<Record<string, ServiceChoicePrices>> = {
  "svc-tap": t({
    item: { kitchen_tap: { set: 320 }, bath_tap: { set: 350 }, cistern: { set: 280 }, shower: { set: 260 } },
    has_part: { yes: { add: -80 } },
  }),
  "svc-socket": t({
    item: { socket: { set: 220 }, light_point: { set: 260 }, fixture: { set: 280 }, switch: { set: 180 } },
    work: { new: { add: 100 } },
    height: { yes: { add: 80 } },
  }),
  "svc-lock": t({
    situation: { inside: { set: 250 }, broken: { set: 320 }, lost: { set: 350 }, stuck: { set: 300 } },
    door: { security: { add: 150 } },
  }),
  "svc-cylinder": t({
    door: { interior: { add: -140 }, security: { add: 250 } },
    why: { burglary: { add: 60 } },
  }),
  "svc-pest": t({
    pest: { roaches: { set: 350 }, ants: { set: 350 }, mosquitos: { set: 400 }, rodents: { set: 650 }, other: { set: 450 } },
    where: { bath: { add: 50 }, bedroom: { add: 80 }, outside: { add: 100 } },
  }),
  "svc-haircut": t({
    who: { man: { set: 90 }, woman: { set: 160 }, kid: { set: 70 }, few: { set: 240 } },
    what: { beard: { add: 40 }, blow: { add: 60 }, color: { add: 180 } },
  }),
  "svc-nails": t({
    what: { manicure: { set: 120 }, pedicure: { set: 150 }, both: { set: 240 } },
    style: { gel: { add: 60 }, build: { add: 130 }, remove: { add: -40 } },
  }),
  "svc-makeup": t({
    event: { evening: { set: 450 }, wedding: { set: 900 }, photo: { set: 400 }, day: { set: 300 } },
    people: { "2": { times: 2 }, more: { times: 3 } },
    hair: { yes: { add: 250 } },
  }),
  "svc-trainer": t({
    where: { home: { set: 220 }, park: { set: 200 }, gym: { set: 250 } },
  }),
  "svc-massage": t({
    type: { swedish: { set: 300 }, deep: { set: 360 }, sport: { set: 340 }, relax: { set: 280 } },
    length: { "45": { times: 0.8 }, "90": { times: 1.45 } },
  }),
  "svc-dog-walk": t({
    length: { "20": { set: 45 }, "40": { set: 70 }, "60": { set: 95 } },
    size: { medium: { add: 10 }, large: { add: 20 } },
  }),
  "svc-pet-groom": t({
    work: { wash: { set: 150 }, cut: { set: 200 }, nails: { set: 60 }, ears: { set: 50 } },
    size: { medium: { times: 1.25 }, large: { times: 1.6 } },
    temperament: { yes: { add: 50 } },
    mats: { yes: { add: 80 } },
  }),
  "svc-jump-start": t({
    where: { underground: { add: 40 } },
  }),
  "svc-flat-tyre": t({
    spare: { full: { set: 180 }, unknown: { set: 200 }, none: { set: 280 } },
    where: { highway: { add: 80 } },
    lock: { yes: { add: 50 } },
  }),
  "svc-car-lockout": t({
    keys: { inside: { set: 250 }, lost: { set: 550 }, broken: { set: 350 } },
  }),
  "svc-phone-fix": t({
    fault: { screen: { set: 450 }, battery: { set: 250 }, charging: { set: 200 }, water: { set: 300 } },
    brand: { iphone: { times: 1.3 }, samsung: { times: 1.15 } },
  }),
  "svc-furniture": t({
    item: { wardrobe: { set: 350 }, bed: { set: 250 }, table: { set: 180 }, desk: { set: 200 }, other: { set: 250 } },
    count: { "2": { times: 1.8 }, more: { times: 2.6 } },
    wall: { yes: { add: 80 } },
  }),
  "svc-tv": t({
    size: { small: { set: 250 }, medium: { set: 300 }, large: { set: 400 } },
    wall: { concrete: { add: 40 }, drywall: { add: 60 } },
    bracket: { no: { add: 150 } },
    cables: { yes: { add: 150 } },
  }),
  "svc-curtains": t({
    work: { install: { set: 200 }, replace: { set: 180 }, fix: { set: 150 } },
    count: { "2": { times: 2.2 }, more: { times: 3.5 } },
    height: { yes: { add: 60 } },
  }),
  /* ---- hourly: the answers estimate the hours, and may move the rate ---- */
  "svc-clean": t(
    { occasion: { event: { hours: 4 }, renovation: { hours: 6 }, movein: { hours: 5 }, general: { hours: 3 } } },
    { rooms: { hoursPer: 1 }, hours: { isHours: true } }
  ),
  "svc-pet-sit": t({
    hours: { "2": { hours: 2 }, half: { hours: 5 }, day: { hours: 9 }, night: { hours: 14 } },
    animal: { both: { times: 1.3 } },
  }),
  "svc-tutor": t({
    grade: { primary: { times: 0.8 }, middle: { times: 0.9 }, bagrut: { times: 1.2 } },
    mode: { online: { times: 0.85 } },
  }),
  "svc-handyman": t({
    hours: { "1": { hours: 1 }, "2": { hours: 2 }, half: { hours: 4 } },
  }),
  "svc-hands": t({
    hours: { "1": { hours: 1 }, "2": { hours: 2 }, more: { hours: 3 } },
    heavy: { yes: { times: 1.2 } },
    stairs: { stairs: { times: 1.15 } },
  }),
};

export interface ChoicePrice {
  /** FIXED: the price for the job. HOURLY: the rate per hour. */
  amountMinorUnits: number;
  /** HOURLY only: the estimated hours, when the answers say. */
  hours: number | null;
  /** HOURLY only: rate × hours, when there is an estimate. */
  estimateMinorUnits: number | null;
  /** True when at least one answer moved the price. */
  fromChoices: boolean;
}

/** Whole shekels to the nearest ten — a price list does not say ₪287.50. */
const round10 = (minor: number) => Math.round(minor / 1000) * 1000;

/**
 * The price for these answers. `base` is the service's single figure (the
 * professional's own, or the catalogue example); `catalogBase` is the
 * catalogue figure the table was written against, so a professional who
 * charges more than the example charges more across the whole table.
 */
export function priceForChoices(
  serviceId: string,
  priceModel: string,
  base: number,
  answers: ReadonlyArray<IntakeAnswer>,
  catalogBase: number = base
): ChoicePrice {
  const table = previewChoicePrices[serviceId];
  const plain: ChoicePrice = { amountMinorUnits: base, hours: null, estimateMinorUnits: null, fromChoices: false };
  if (!table || (priceModel !== "FIXED" && priceModel !== "HOURLY")) return plain;

  const scale = catalogBase > 0 ? base / catalogBase : 1;
  let setSum = 0;
  let sets = 0;
  let add = 0;
  let times = 1;
  let hours: number | null = null;
  let moved = false;

  for (const a of answers) {
    const opts = table.options[a.questionId];
    if (opts) {
      for (const id of a.optionIds ?? []) {
        const e = opts[id];
        if (!e) continue;
        moved = true;
        if (e.set !== undefined) { setSum += e.set; sets += 1; }
        if (e.add !== undefined) add += e.add;
        if (e.times !== undefined) times *= e.times;
        if (e.hours !== undefined) hours = Math.max(hours ?? 0, e.hours);
      }
    }
    const num = table.numbers?.[a.questionId];
    if (num && typeof a.numberValue === "number" && a.numberValue > 0) {
      moved = true;
      const h = num.isHours ? a.numberValue : a.numberValue * (num.hoursPer ?? 0);
      hours = num.isHours ? h : Math.max(hours ?? 0, h);
    }
  }

  if (priceModel === "FIXED") {
    const job = sets > 0 ? setSum * scale : base;
    const amount = Math.max(ils(20), round10((job + add * scale) * times));
    return { amountMinorUnits: amount, hours: null, estimateMinorUnits: null, fromChoices: moved };
  }
  const rate = round10(base * times);
  return {
    amountMinorUnits: rate,
    hours,
    estimateMinorUnits: hours ? round10(rate * hours) : null,
    fromChoices: moved,
  };
}

/** The lowest a fixed service can come to — "החל מ־₪X" before anything is chosen. */
export function lowestChoicePrice(serviceId: string, base: number): number {
  const table = previewChoicePrices[serviceId];
  if (!table) return base;
  const sets = Object.values(table.options).flatMap((o) => Object.values(o).map((e) => e.set).filter((v): v is number => v !== undefined));
  return sets.length ? Math.min(...sets) : base;
}
