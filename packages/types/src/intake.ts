/**
 * SERVICE INTAKE — the questions a service asks, instead of one blank box.
 *
 * THE PROBLEM THIS SOLVES IS NOT DATA COLLECTION. It is that a customer in
 * trouble does not know what a professional needs to hear. Asked "תאר את
 * התקלה", they write "יש בעיה במקרר" — and the professional accepts a job
 * knowing nothing, arrives without the right part, and the visit turns into
 * a second visit. The same person, asked "לא מקרר, מקפיא, מרעיש או נוזל?"
 * and "איזה מותג?", answers both in four seconds.
 *
 * So the value flows to BOTH sides from the same three taps: the customer is
 * never asked to be articulate about a trade they do not know, and the
 * professional gets an offer they can judge in two seconds instead of a
 * sentence they have to interpret.
 *
 * FOUR RULES THIS FILE ENFORCES:
 *
 * 1. Every question is OPTIONAL to the flow. A person standing in water must
 *    be able to skip everything and still get help. `required` exists, but
 *    the flow is built to let the whole intake be abandoned — an intake that
 *    can block a request in an emergency is worse than no intake.
 *
 * 2. No question is diagnostic. "המים עולים?" is an observation the customer
 *    can make. "האם הסיפון סדוק?" is a diagnosis, and asking it invites a
 *    wrong answer that the professional will then plan around.
 *
 * 3. No question is a promise. Asking "יש חניה?" does not commit anyone to
 *    anything; it is context on the offer card. Nothing here feeds pricing.
 *
 * 4. The answers are shown to the professional VERBATIM, as the customer's
 *    own words and choices. Nothing summarises, infers or "understands"
 *    them — a lookup table dressed up as comprehension is a mocked
 *    capability (/CLAUDE.md §3).
 */

export type IntakeQuestionKind =
  /** Pick exactly one. The common case. */
  | "SINGLE"
  /** Pick any number. */
  | "MULTI"
  /** Yes / no / "לא יודע" — which is a real answer, not a missing one. */
  | "YESNO"
  /** A number with a unit, e.g. rooms or floors. */
  | "NUMBER"
  /** Short free text, for what the options could not cover. */
  | "TEXT";

export interface IntakeOption {
  id: string;
  labelHe: string;
}

export interface IntakeQuestion {
  id: string;
  /** Asked the way a person would ask it out loud. */
  promptHe: string;
  kind: IntakeQuestionKind;
  options?: IntakeOption[];
  /** For NUMBER. */
  unitHe?: string;
  min?: number;
  max?: number;
  /** For TEXT. */
  placeholderHe?: string;
  /**
   * Marks a question whose answer changes what the professional brings.
   * Used to order the offer card, never to gate the request.
   */
  mattersToPro?: boolean;
  required?: boolean;
}

export interface ServiceIntake {
  serviceId: string;
  /** Three to five. Past five, people abandon and we learn nothing. */
  questions: IntakeQuestion[];
}

export interface IntakeAnswer {
  questionId: string;
  /** Option ids for SINGLE/MULTI, "yes"/"no"/"unknown" for YESNO. */
  optionIds?: string[];
  numberValue?: number;
  textValue?: string;
}

/** One line on the professional's offer card: what was asked, what was said. */
export interface IntakeBriefLine {
  questionId: string;
  promptHe: string;
  answerHe: string;
  mattersToPro: boolean;
}

const YESNO: IntakeOption[] = [
  { id: "yes", labelHe: "כן" },
  { id: "no", labelHe: "לא" },
  { id: "unknown", labelHe: "לא יודע" },
];

/**
 * Renders answers for the professional.
 *
 * UNANSWERED QUESTIONS ARE DROPPED, NOT SHOWN AS "—". A card with four
 * dashes on it reads as a broken feed; a card with two facts on it reads as
 * two facts. And "לא יודע" is KEPT, because a customer who said they do not
 * know has told the professional something real — it is the silence that
 * carries no information, not the admission.
 */
export function buildIntakeBrief(
  intake: ServiceIntake | undefined,
  answers: IntakeAnswer[]
): IntakeBriefLine[] {
  if (!intake) return [];
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const out: IntakeBriefLine[] = [];

  for (const q of intake.questions) {
    const a = byId.get(q.id);
    if (!a) continue;
    const answerHe = renderAnswer(q, a);
    if (!answerHe) continue;
    out.push({
      questionId: q.id,
      promptHe: q.promptHe,
      answerHe,
      mattersToPro: q.mattersToPro === true,
    });
  }

  // What changes what he packs goes first. Ordering is the only inference
  // this module performs, and it never alters a word of what was said.
  return [...out.filter((l) => l.mattersToPro), ...out.filter((l) => !l.mattersToPro)];
}

function renderAnswer(q: IntakeQuestion, a: IntakeAnswer): string | null {
  switch (q.kind) {
    case "SINGLE":
    case "MULTI":
    case "YESNO": {
      const ids = a.optionIds ?? [];
      if (ids.length === 0) return null;
      const opts = q.kind === "YESNO" ? YESNO : (q.options ?? []);
      const labels = ids
        .map((id) => opts.find((o) => o.id === id)?.labelHe)
        .filter((l): l is string => Boolean(l));
      return labels.length ? labels.join(" · ") : null;
    }
    case "NUMBER": {
      if (a.numberValue === undefined || !Number.isFinite(a.numberValue)) return null;
      return q.unitHe ? `${a.numberValue} ${q.unitHe}` : String(a.numberValue);
    }
    case "TEXT": {
      const t = (a.textValue ?? "").trim();
      return t.length ? t : null;
    }
    default:
      return null;
  }
}

/** How complete the intake is, for a progress hint. Never a gate. */
export function intakeProgress(
  intake: ServiceIntake | undefined,
  answers: IntakeAnswer[]
): { answered: number; total: number } {
  if (!intake) return { answered: 0, total: 0 };
  const brief = buildIntakeBrief(intake, answers);
  return { answered: brief.length, total: intake.questions.length };
}

// ---------------------------------------------------------------------
// The pilot intakes
// ---------------------------------------------------------------------

export const pilotIntakes: ServiceIntake[] = [
  {
    serviceId: "svc-blockage",
    questions: [
      {
        id: "fixture",
        promptHe: "מה סתום?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "sink", labelHe: "כיור מטבח" },
          { id: "bath_sink", labelHe: "כיור אמבטיה" },
          { id: "toilet", labelHe: "אסלה" },
          { id: "shower", labelHe: "מקלחת" },
          { id: "main", labelHe: "ביוב ראשי / יותר ממקום אחד" },
        ],
      },
      { id: "rising", promptHe: "המים עולים כשמפעילים?", kind: "YESNO", mattersToPro: true },
      { id: "flood", promptHe: "יש כרגע הצפה על הרצפה?", kind: "YESNO", mattersToPro: true },
      {
        id: "tried",
        promptHe: "ניסית משהו לפני שהתקשרת?",
        kind: "MULTI",
        options: [
          { id: "plunger", labelHe: "פומפה" },
          { id: "chemical", labelHe: "חומר לפתיחת סתימות" },
          { id: "snake", labelHe: "ספירלה" },
          { id: "nothing", labelHe: "לא ניסיתי כלום" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-leak",
    questions: [
      {
        id: "where",
        promptHe: "מאיפה המים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "under_sink", labelHe: "מתחת לכיור" },
          { id: "tap", labelHe: "מהברז עצמו" },
          { id: "wall", labelHe: "מכתם בקיר או בתקרה" },
          { id: "boiler", labelHe: "ליד הדוד" },
          { id: "unknown", labelHe: "לא מצליח לאתר" },
        ],
      },
      {
        id: "rate",
        promptHe: "כמה מים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "drip", labelHe: "טפטוף" },
          { id: "stream", labelHe: "זרם קבוע" },
          { id: "burst", labelHe: "פיצוץ — מים בכמות גדולה" },
        ],
      },
      {
        id: "shutoff",
        promptHe: "סגרת את הברז הראשי?",
        kind: "YESNO",
        mattersToPro: true,
      },
      {
        id: "since",
        promptHe: "ממתי זה קורה?",
        kind: "SINGLE",
        options: [
          { id: "now", labelHe: "התחיל עכשיו" },
          { id: "today", labelHe: "מהיום" },
          { id: "days", labelHe: "כמה ימים" },
          { id: "longer", labelHe: "יותר מזה" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-electric",
    questions: [
      {
        id: "scope",
        promptHe: "איפה אין חשמל?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "one_room", labelHe: "בחדר אחד" },
          { id: "part", labelHe: "בחלק מהבית" },
          { id: "all", labelHe: "בכל הבית" },
          { id: "building", labelHe: "גם לשכנים" },
        ],
      },
      { id: "rcd", promptHe: "הפחת קופץ שוב אחרי שמעלים?", kind: "YESNO", mattersToPro: true },
      {
        id: "danger",
        promptHe: "יש ריח שרוף, עשן או ניצוצות?",
        kind: "YESNO",
        mattersToPro: true,
      },
      {
        id: "trigger",
        promptHe: "קרה משהו רגע לפני?",
        kind: "MULTI",
        options: [
          { id: "appliance", labelHe: "הפעלתי מכשיר" },
          { id: "water", labelHe: "היו מים בסביבה" },
          { id: "work", labelHe: "היו עבודות בבית" },
          { id: "nothing", labelHe: "כלום, זה קרה מעצמו" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-lock",
    questions: [
      {
        id: "situation",
        promptHe: "מה קרה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "inside", labelHe: "המפתח נשאר בפנים" },
          { id: "broken", labelHe: "המפתח נשבר במנעול" },
          { id: "lost", labelHe: "איבדתי את המפתח" },
          { id: "stuck", labelHe: "המנעול תקוע ולא מסתובב" },
        ],
      },
      {
        id: "door",
        promptHe: "איזו דלת?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "apartment", labelHe: "דלת כניסה לדירה" },
          { id: "security", labelHe: "דלת פלדלת / רב־בריח" },
          { id: "building", labelHe: "דלת בניין" },
          { id: "other", labelHe: "אחר" },
        ],
      },
      {
        id: "urgent_inside",
        promptHe: "יש מישהו או משהו בפנים שדורש כניסה דחופה?",
        kind: "YESNO",
        mattersToPro: true,
      },
      {
        // Not a legal check and not presented as one. The policy question —
        // what proof is required before a door is opened — is a business and
        // legal decision (/CLAUDE.md §4). This only tells the locksmith what
        // to expect on arrival.
        id: "proof",
        promptHe: "יש לך מסמך שמקשר אותך לכתובת (חוזה, חשבון, תעודה)?",
        kind: "YESNO",
        mattersToPro: true,
      },
    ],
  },
  {
    serviceId: "svc-ac",
    questions: [
      {
        id: "symptom",
        promptHe: "מה המזגן עושה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "no_cool", labelHe: "עובד אבל לא מקרר" },
          { id: "no_heat", labelHe: "עובד אבל לא מחמם" },
          { id: "dripping", labelHe: "מטפטף מים" },
          { id: "noise", labelHe: "משמיע רעש חזק" },
          { id: "dead", labelHe: "לא נדלק בכלל" },
        ],
      },
      {
        id: "type",
        promptHe: "איזה סוג מזגן?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "split", labelHe: "עילי (מפוצל)" },
          { id: "mini_central", labelHe: "מיני מרכזי" },
          { id: "window", labelHe: "חלון" },
          { id: "portable", labelHe: "נייד" },
        ],
      },
      {
        id: "access",
        promptHe: "היחידה החיצונית נגישה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "easy", labelHe: "כן, קל להגיע" },
          { id: "balcony", labelHe: "במרפסת שירות" },
          { id: "hard", labelHe: "צריך סולם או גישה מיוחדת" },
          { id: "unknown", labelHe: "לא יודע" },
        ],
      },
      { id: "cleaned", promptHe: "נוקה בשנה האחרונה?", kind: "YESNO" },
    ],
  },
  {
    serviceId: "svc-fridge",
    questions: [
      {
        id: "symptom",
        promptHe: "מה קורה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "fridge_warm", labelHe: "המקרר לא מקרר" },
          { id: "freezer_warm", labelHe: "המקפיא הפשיר" },
          { id: "both", labelHe: "שניהם" },
          { id: "noise", labelHe: "רעש חריג" },
          { id: "water", labelHe: "מים בתחתית או על הרצפה" },
          { id: "dead", labelHe: "לא נדלק בכלל" },
        ],
      },
      {
        id: "brand",
        promptHe: "איזה מותג?",
        kind: "TEXT",
        mattersToPro: true,
        placeholderHe: "למשל סמסונג, אלקטרה, בוש",
      },
      {
        id: "age",
        promptHe: "בן כמה המקרר בערך?",
        kind: "SINGLE",
        options: [
          { id: "lt2", labelHe: "עד שנתיים" },
          { id: "2to5", labelHe: "2–5 שנים" },
          { id: "5to10", labelHe: "5–10 שנים" },
          { id: "gt10", labelHe: "יותר מ־10" },
          { id: "unknown", labelHe: "לא יודע" },
        ],
      },
      { id: "moved", promptHe: "הוזז או הועבר לאחרונה?", kind: "YESNO" },
    ],
  },
  {
    serviceId: "svc-clean",
    questions: [
      {
        id: "occasion",
        promptHe: "מה הרקע?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "event", labelHe: "אחרי אירוע בבית" },
          { id: "renovation", labelHe: "אחרי שיפוץ" },
          { id: "movein", labelHe: "לפני כניסה לדירה" },
          { id: "general", labelHe: "ניקיון כללי דחוף" },
        ],
      },
      { id: "rooms", promptHe: "כמה חדרים?", kind: "NUMBER", unitHe: "חדרים", min: 1, max: 12, mattersToPro: true },
      { id: "hours", promptHe: "כמה שעות בערך?", kind: "NUMBER", unitHe: "שעות", min: 2, max: 12, mattersToPro: true },
      {
        id: "supplies",
        promptHe: "יש בבית חומרי ניקוי וציוד?",
        kind: "YESNO",
        mattersToPro: true,
      },
    ],
  },
  {
    serviceId: "svc-courier",
    questions: [
      {
        id: "what",
        promptHe: "מה צריך להעביר?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "docs", labelHe: "מסמכים" },
          { id: "keys", labelHe: "מפתח" },
          { id: "small", labelHe: "חבילה קטנה" },
          { id: "large", labelHe: "חבילה גדולה" },
          { id: "food", labelHe: "משהו שצריך להישאר קר" },
        ],
      },
      {
        id: "size",
        promptHe: "נכנס לתיק שליחים?",
        kind: "YESNO",
        mattersToPro: true,
      },
      {
        id: "pickup_ready",
        promptHe: "המשלוח כבר מוכן לאיסוף?",
        kind: "YESNO",
        mattersToPro: true,
      },
      {
        id: "notes",
        promptHe: "משהו שחשוב לדעת?",
        kind: "TEXT",
        placeholderHe: "למשל: לבקש בקבלה, שביר, לתאם טלפונית",
      },
    ],
  },
];

export const pilotIntakeByService: Record<string, ServiceIntake> = Object.fromEntries(
  pilotIntakes.map((i) => [i.serviceId, i])
);
