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

  /*
   * ---------------------------------------------------------------------
   * THE REST OF THE CATALOGUE
   * ---------------------------------------------------------------------
   * Eight services had questions and thirty-five did not. Amit: *"שכל
   * השדות מלאים."* He is right that it is a content gap and not a code
   * one — every one of those thirty-five opened the describe screen with
   * nothing to ask, so the customer got a bare text box and the
   * professional got a job with no brief.
   *
   * Every question below earns its place against one test: does the
   * ANSWER change what the professional brings, how long they book, or
   * whether they can take the job at all? A question whose answer changes
   * nothing is a question that costs the customer time while their kitchen
   * floods, and `mattersToPro` is false for the few kept for the
   * customer's own sake rather than the professional's.
   *
   * Three to five each, never more. Past five people abandon and we learn
   * nothing — which is worse than not asking.
   */
  {
    serviceId: "svc-cylinder",
    questions: [
      {
        id: "why",
        promptHe: "מה קרה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "lost", labelHe: "אבד המפתח" },
          { id: "moved", labelHe: "מעבר דירה" },
          { id: "broken", labelHe: "המנעול נשבר או תקוע" },
          { id: "burglary", labelHe: "אחרי פריצה" },
        ],
      },
      { id: "inside", promptHe: "אתם בתוך הבית כרגע?", kind: "YESNO", mattersToPro: true },
      {
        id: "door",
        promptHe: "איזו דלת?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "entry", labelHe: "דלת כניסה" },
          { id: "interior", labelHe: "דלת פנימית" },
          { id: "security", labelHe: "דלת פלדה / רב־בריח" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-handyman",
    questions: [
      {
        id: "tasks",
        promptHe: "מה צריך לעשות?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "hang", labelHe: "לתלות מדף או תמונה" },
          { id: "fix", labelHe: "לתקן משהו שנשבר" },
          { id: "assemble", labelHe: "להרכיב רהיט" },
          { id: "door", labelHe: "דלת או ארון שלא נסגרים" },
          { id: "other", labelHe: "משהו אחר" },
        ],
      },
      {
        id: "hours",
        promptHe: "כמה שעות בערך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "1", labelHe: "שעה" },
          { id: "2", labelHe: "שעתיים" },
          { id: "half", labelHe: "חצי יום" },
          { id: "unknown", labelHe: "לא יודע" },
        ],
      },
      { id: "tools", promptHe: "יש כלים בבית?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-hands",
    questions: [
      {
        id: "what",
        promptHe: "במה צריך עזרה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "lift", labelHe: "להרים ולהזיז" },
          { id: "pack", labelHe: "לארוז" },
          { id: "clear", labelHe: "לפנות ולזרוק" },
          { id: "sort", labelHe: "לסדר" },
        ],
      },
      { id: "heavy", promptHe: "יש משהו כבד מ-30 קילו?", kind: "YESNO", mattersToPro: true },
      {
        id: "stairs",
        promptHe: "יש מעלית?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "lift", labelHe: "כן" },
          { id: "ground", labelHe: "קומת קרקע" },
          { id: "stairs", labelHe: "רק מדרגות" },
        ],
      },
      {
        id: "hours",
        promptHe: "כמה שעות בערך?",
        kind: "SINGLE",
        options: [
          { id: "1", labelHe: "שעה" },
          { id: "2", labelHe: "שעתיים" },
          { id: "more", labelHe: "יותר" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-tap",
    questions: [
      {
        id: "item",
        promptHe: "מה מחליפים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "kitchen_tap", labelHe: "ברז מטבח" },
          { id: "bath_tap", labelHe: "ברז אמבטיה" },
          { id: "cistern", labelHe: "מיכל הדחה / ניאגרה" },
          { id: "shower", labelHe: "מקלחון או ראש מקלחת" },
        ],
      },
      { id: "has_part", promptHe: "החלק כבר אצלכם?", kind: "YESNO", mattersToPro: true },
      { id: "leaking", promptHe: "יש נזילה עכשיו?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-socket",
    questions: [
      {
        id: "item",
        promptHe: "מה צריך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "socket", labelHe: "שקע" },
          { id: "light_point", labelHe: "נקודת אור" },
          { id: "fixture", labelHe: "גוף תאורה" },
          { id: "switch", labelHe: "מפסק" },
        ],
      },
      {
        id: "work",
        promptHe: "התקנה חדשה או תיקון?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "new", labelHe: "התקנה חדשה" },
          { id: "replace", labelHe: "החלפה של קיים" },
          { id: "repair", labelHe: "משהו הפסיק לעבוד" },
        ],
      },
      { id: "has_item", promptHe: "הפריט כבר אצלכם?", kind: "YESNO", mattersToPro: true },
      { id: "height", promptHe: "זה גבוה — תקרה או מדרגות?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-washer",
    questions: [
      {
        id: "machine",
        promptHe: "איזו מכונה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "washer", labelHe: "מכונת כביסה" },
          { id: "dryer", labelHe: "מייבש" },
          { id: "combo", labelHe: "משולבת" },
        ],
      },
      {
        id: "fault",
        promptHe: "מה קורה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "no_drain", labelHe: "לא מנקזת מים" },
          { id: "no_spin", labelHe: "לא מסתובבת" },
          { id: "flood", labelHe: "מציפה" },
          { id: "dead", labelHe: "לא נדלקת" },
          { id: "noise", labelHe: "רעש חזק" },
        ],
      },
      { id: "error", promptHe: "מופיע קוד שגיאה בתצוגה?", kind: "YESNO", mattersToPro: true },
      { id: "model", promptHe: "אפשר לצלם את מדבקת הדגם?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-clean-reno",
    questions: [
      {
        id: "size",
        promptHe: "כמה גדול?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "room", labelHe: "חדר אחד" },
          { id: "apartment", labelHe: "דירה שלמה" },
          { id: "house", labelHe: "בית פרטי" },
        ],
      },
      {
        id: "what",
        promptHe: "מה השאיר השיפוץ?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "dust", labelHe: "אבק בנייה" },
          { id: "paint", labelHe: "שאריות צבע" },
          { id: "grout", labelHe: "שאריות רובה ודבק" },
          { id: "debris", labelHe: "פסולת לפינוי" },
        ],
      },
      { id: "windows", promptHe: "כולל חלונות ומסגרות?", kind: "YESNO", mattersToPro: true },
      { id: "water", promptHe: "יש מים וחשמל במקום?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-pest",
    questions: [
      {
        id: "pest",
        promptHe: "מה ראיתם?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "roaches", labelHe: "ג׳וקים" },
          { id: "ants", labelHe: "נמלים" },
          { id: "mosquitos", labelHe: "יתושים" },
          { id: "rodents", labelHe: "מכרסמים" },
          { id: "other", labelHe: "משהו אחר" },
        ],
      },
      {
        id: "where",
        promptHe: "איפה?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "kitchen", labelHe: "מטבח" },
          { id: "bath", labelHe: "חדר רחצה" },
          { id: "bedroom", labelHe: "חדרי שינה" },
          { id: "outside", labelHe: "חצר או מרפסת" },
        ],
      },
      {
        id: "household",
        promptHe: "מי נמצא בבית?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "kids", labelHe: "ילדים קטנים" },
          { id: "pets", labelHe: "בעלי חיים" },
          { id: "pregnant", labelHe: "אישה בהיריון" },
          { id: "none", labelHe: "אף אחד מאלה" },
        ],
      },
    ],
  },
  {
    serviceId: "svc-moving",
    questions: [
      {
        id: "what",
        promptHe: "מה מעבירים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "single", labelHe: "פריט בודד" },
          { id: "boxes", labelHe: "כמה ארגזים" },
          { id: "studio", labelHe: "דירת סטודיו" },
          { id: "room", labelHe: "חדר שלם" },
        ],
      },
      {
        id: "from_floor",
        promptHe: "מאיזו קומה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "ground", labelHe: "קרקע" },
          { id: "lift", labelHe: "קומה עם מעלית" },
          { id: "stairs", labelHe: "קומה בלי מעלית" },
        ],
      },
      {
        id: "to_floor",
        promptHe: "לאיזו קומה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "ground", labelHe: "קרקע" },
          { id: "lift", labelHe: "קומה עם מעלית" },
          { id: "stairs", labelHe: "קומה בלי מעלית" },
        ],
      },
      { id: "help", promptHe: "צריך גם עזרה בהרמה ואריזה?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-garden",
    questions: [
      {
        id: "work",
        promptHe: "מה צריך בגינה?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "mow", labelHe: "כיסוח דשא" },
          { id: "prune", labelHe: "גיזום" },
          { id: "irrigation", labelHe: "השקיה" },
          { id: "clear", labelHe: "פינוי וניקיון" },
        ],
      },
      {
        id: "size",
        promptHe: "כמה גדולה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "balcony", labelHe: "מרפסת" },
          { id: "small", labelHe: "גינה קטנה" },
          { id: "large", labelHe: "גינה גדולה" },
        ],
      },
      { id: "waste", promptHe: "צריך לפנות את הגזם?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-haircut",
    questions: [
      {
        id: "who",
        promptHe: "למי התספורת?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "man", labelHe: "גבר" },
          { id: "woman", labelHe: "אישה" },
          { id: "kid", labelHe: "ילד או ילדה" },
          { id: "few", labelHe: "כמה אנשים בבית" },
        ],
      },
      {
        id: "what",
        promptHe: "מה עושים?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "cut", labelHe: "תספורת" },
          { id: "beard", labelHe: "עיצוב זקן" },
          { id: "blow", labelHe: "פן" },
          { id: "color", labelHe: "צבע" },
        ],
      },
      { id: "chair", promptHe: "יש כיסא וכיור שאפשר לעבוד לידם?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-nails",
    questions: [
      {
        id: "what",
        promptHe: "מה עושים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "manicure", labelHe: "מניקור" },
          { id: "pedicure", labelHe: "פדיקור" },
          { id: "both", labelHe: "שניהם" },
        ],
      },
      {
        id: "style",
        promptHe: "איזה סוג?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "natural", labelHe: "טבעי" },
          { id: "gel", labelHe: "לק ג׳ל" },
          { id: "build", labelHe: "בנייה" },
          { id: "remove", labelHe: "הסרה בלבד" },
        ],
      },
      { id: "existing", promptHe: "יש לק או בנייה קיימים להסרה?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-makeup",
    questions: [
      {
        id: "event",
        promptHe: "לאיזה אירוע?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "evening", labelHe: "ערב" },
          { id: "wedding", labelHe: "חתונה" },
          { id: "photo", labelHe: "צילומים" },
          { id: "day", labelHe: "יומיומי" },
        ],
      },
      {
        id: "people",
        promptHe: "כמה אנשים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "1", labelHe: "אחד" },
          { id: "2", labelHe: "שניים" },
          { id: "more", labelHe: "שלושה או יותר" },
        ],
      },
      { id: "hair", promptHe: "צריך גם שיער?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-trainer",
    questions: [
      {
        id: "where",
        promptHe: "איפה מתאמנים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "home", labelHe: "בבית" },
          { id: "park", labelHe: "בפארק" },
          { id: "gym", labelHe: "בחדר כושר" },
        ],
      },
      {
        id: "goal",
        promptHe: "מה המטרה?",
        kind: "SINGLE",
        options: [
          { id: "strength", labelHe: "כוח" },
          { id: "weight", labelHe: "ירידה במשקל" },
          { id: "rehab", labelHe: "חזרה אחרי פציעה" },
          { id: "general", labelHe: "כושר כללי" },
        ],
      },
      { id: "equipment", promptHe: "יש ציוד במקום?", kind: "YESNO", mattersToPro: true },
      { id: "injury", promptHe: "יש פציעה או מגבלה שכדאי שידע עליה?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-massage",
    questions: [
      {
        id: "type",
        promptHe: "איזה עיסוי?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "swedish", labelHe: "שוודי" },
          { id: "deep", labelHe: "רקמות עמוק" },
          { id: "sport", labelHe: "ספורטיבי" },
          { id: "relax", labelHe: "רגיעה" },
        ],
      },
      {
        id: "length",
        promptHe: "כמה זמן?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "45", labelHe: "45 דקות" },
          { id: "60", labelHe: "שעה" },
          { id: "90", labelHe: "שעה וחצי" },
        ],
      },
      { id: "room", promptHe: "יש חדר שאפשר לפרוס בו מיטת טיפולים?", kind: "YESNO", mattersToPro: true },
      { id: "medical", promptHe: "יש מצב רפואי שכדאי שידע עליו?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-dog-walk",
    questions: [
      {
        id: "size",
        promptHe: "איזה גודל כלב?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "small", labelHe: "קטן" },
          { id: "medium", labelHe: "בינוני" },
          { id: "large", labelHe: "גדול" },
        ],
      },
      {
        id: "length",
        promptHe: "כמה זמן טיול?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "20", labelHe: "20 דקות" },
          { id: "40", labelHe: "40 דקות" },
          { id: "60", labelHe: "שעה" },
        ],
      },
      { id: "leash", promptHe: "הכלב מושך ברצועה?", kind: "YESNO", mattersToPro: true },
      { id: "key", promptHe: "מישהו יהיה בבית לפתוח?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-pet-sit",
    questions: [
      {
        id: "animal",
        promptHe: "איזו חיה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "dog", labelHe: "כלב" },
          { id: "cat", labelHe: "חתול" },
          { id: "both", labelHe: "יותר מאחת" },
          { id: "other", labelHe: "אחר" },
        ],
      },
      {
        id: "hours",
        promptHe: "לכמה זמן?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "2", labelHe: "שעתיים" },
          { id: "half", labelHe: "חצי יום" },
          { id: "day", labelHe: "יום שלם" },
          { id: "night", labelHe: "כולל לילה" },
        ],
      },
      { id: "meds", promptHe: "צריך לתת תרופות?", kind: "YESNO", mattersToPro: true },
      { id: "walk", promptHe: "צריך גם להוציא לטיול?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-pet-groom",
    questions: [
      {
        id: "size",
        promptHe: "איזה גודל כלב?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "small", labelHe: "קטן" },
          { id: "medium", labelHe: "בינוני" },
          { id: "large", labelHe: "גדול" },
        ],
      },
      {
        id: "work",
        promptHe: "מה עושים?",
        kind: "MULTI",
        mattersToPro: true,
        options: [
          { id: "wash", labelHe: "רחצה" },
          { id: "cut", labelHe: "גזירה" },
          { id: "nails", labelHe: "ציפורניים" },
          { id: "ears", labelHe: "אוזניים" },
        ],
      },
      { id: "temperament", promptHe: "הכלב רגוע עם זרים?", kind: "YESNO", mattersToPro: true },
      { id: "mats", promptHe: "יש קשרים או פרווה מסובכת?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-jump-start",
    questions: [
      {
        id: "symptom",
        promptHe: "מה קורה כשמסובבים את המפתח?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "click", labelHe: "קליקים ולא מתניע" },
          { id: "silent", labelHe: "שקט מוחלט" },
          { id: "weak", labelHe: "מנסה ונחלש" },
          { id: "lights_off", labelHe: "גם האורות לא נדלקים" },
        ],
      },
      {
        id: "where",
        promptHe: "איפה הרכב?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "street", labelHe: "ברחוב" },
          { id: "parking", labelHe: "בחניון" },
          { id: "underground", labelHe: "בחניון תת־קרקעי" },
        ],
      },
      { id: "lights_left", promptHe: "נשארו אורות או משהו דלוק?", kind: "YESNO", mattersToPro: true },
      { id: "safe", promptHe: "הרכב במקום בטוח לעצור לידו?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-flat-tyre",
    questions: [
      {
        id: "spare",
        promptHe: "יש גלגל חלופי ברכב?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "full", labelHe: "כן, מלא" },
          { id: "unknown", labelHe: "יש, לא בטוח באיזה מצב" },
          { id: "none", labelHe: "אין" },
        ],
      },
      {
        id: "where",
        promptHe: "איפה הרכב?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "street", labelHe: "ברחוב" },
          { id: "highway", labelHe: "בכביש מהיר" },
          { id: "parking", labelHe: "בחניה" },
        ],
      },
      { id: "driveable", promptHe: "הצמיג ריק לגמרי?", kind: "YESNO", mattersToPro: true },
      { id: "lock", promptHe: "יש מפתח מיוחד לברגים?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-car-lockout",
    questions: [
      {
        id: "keys",
        promptHe: "איפה המפתחות?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "inside", labelHe: "בתוך הרכב" },
          { id: "lost", labelHe: "אבדו" },
          { id: "broken", labelHe: "נשברו במנעול" },
        ],
      },
      { id: "running", promptHe: "המנוע דולק?", kind: "YESNO", mattersToPro: true },
      { id: "child", promptHe: "יש ילד או חיה בתוך הרכב?", kind: "YESNO", mattersToPro: true },
      { id: "papers", promptHe: "יש רישיון רכב זמין להוכחת בעלות?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-computer",
    questions: [
      {
        id: "device",
        promptHe: "איזה מכשיר?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "laptop", labelHe: "מחשב נייד" },
          { id: "desktop", labelHe: "מחשב נייח" },
          { id: "mac", labelHe: "מק" },
        ],
      },
      {
        id: "fault",
        promptHe: "מה הבעיה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "no_boot", labelHe: "לא עולה" },
          { id: "slow", labelHe: "איטי מאוד" },
          { id: "network", labelHe: "בלי אינטרנט" },
          { id: "virus", labelHe: "חשד לווירוס" },
          { id: "screen", labelHe: "בעיה במסך" },
        ],
      },
      { id: "backup", promptHe: "יש קבצים שחייבים להציל?", kind: "YESNO", mattersToPro: true },
      { id: "password", promptHe: "יש סיסמה למחשב שתוכלו להקליד בעצמכם?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-phone-fix",
    questions: [
      {
        id: "brand",
        promptHe: "איזה מכשיר?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "iphone", labelHe: "אייפון" },
          { id: "samsung", labelHe: "סמסונג" },
          { id: "other", labelHe: "אחר" },
        ],
      },
      {
        id: "fault",
        promptHe: "מה צריך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "screen", labelHe: "מסך שבור" },
          { id: "battery", labelHe: "סוללה" },
          { id: "charging", labelHe: "לא נטען" },
          { id: "water", labelHe: "נפל למים" },
        ],
      },
      { id: "working", promptHe: "המסך עדיין מגיב למגע?", kind: "YESNO", mattersToPro: true },
      { id: "backup", promptHe: "יש גיבוי למכשיר?", kind: "YESNO" },
    ],
  },
  {
    serviceId: "svc-tutor",
    questions: [
      {
        id: "subject",
        promptHe: "איזה מקצוע?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "math", labelHe: "מתמטיקה" },
          { id: "english", labelHe: "אנגלית" },
          { id: "physics", labelHe: "פיזיקה" },
          { id: "hebrew", labelHe: "לשון" },
          { id: "other", labelHe: "אחר" },
        ],
      },
      {
        id: "grade",
        promptHe: "איזו כיתה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "primary", labelHe: "יסודי" },
          { id: "middle", labelHe: "חטיבה" },
          { id: "high", labelHe: "תיכון" },
          { id: "bagrut", labelHe: "בגרות" },
        ],
      },
      {
        id: "mode",
        promptHe: "איפה השיעור?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "home", labelHe: "בבית" },
          { id: "online", labelHe: "אונליין" },
        ],
      },
      { id: "exam", promptHe: "יש מבחן קרוב?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-paint",
    questions: [
      {
        id: "scope",
        promptHe: "מה צובעים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "wall", labelHe: "קיר אחד" },
          { id: "room", labelHe: "חדר" },
          { id: "apartment", labelHe: "דירה" },
          { id: "touch", labelHe: "תיקוני צבע" },
        ],
      },
      { id: "damage", promptHe: "יש נזק מנזילה או עובש?", kind: "YESNO", mattersToPro: true },
      { id: "furniture", promptHe: "צריך לכסות או להזיז רהיטים?", kind: "YESNO", mattersToPro: true },
      { id: "color", promptHe: "יודעים כבר איזה גוון?", kind: "YESNO" },
    ],
  },
  {
    serviceId: "svc-tiling",
    questions: [
      {
        id: "work",
        promptHe: "מה צריך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "broken", labelHe: "אריחים שבורים" },
          { id: "grout", labelHe: "רובה" },
          { id: "kitchen", labelHe: "חיפוי מטבח" },
          { id: "floor", labelHe: "ריצוף חדש" },
        ],
      },
      {
        id: "area",
        promptHe: "כמה שטח בערך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "few", labelHe: "כמה אריחים" },
          { id: "small", labelHe: "עד 5 מ״ר" },
          { id: "room", labelHe: "חדר שלם" },
        ],
      },
      { id: "has_tiles", promptHe: "האריחים כבר אצלכם?", kind: "YESNO", mattersToPro: true },
      { id: "wet", promptHe: "זה חדר רטוב?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-drywall",
    questions: [
      {
        id: "work",
        promptHe: "מה בונים או מתקנים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "hole", labelHe: "חור בקיר" },
          { id: "partition", labelHe: "מחיצה" },
          { id: "ceiling", labelHe: "תקרה" },
          { id: "niche", labelHe: "נישה או מדף גבס" },
        ],
      },
      { id: "paint", promptHe: "צריך גם צבע בסוף?", kind: "YESNO", mattersToPro: true },
      { id: "electric", promptHe: "עובר שם חשמל או צנרת?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-carpentry",
    questions: [
      {
        id: "item",
        promptHe: "מה העבודה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "door", labelHe: "דלת" },
          { id: "kitchen", labelHe: "ארון מטבח" },
          { id: "shelf", labelHe: "מדפים" },
          { id: "repair", labelHe: "תיקון רהיט" },
        ],
      },
      {
        id: "type",
        promptHe: "תיקון או משהו חדש?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "repair", labelHe: "תיקון" },
          { id: "new", labelHe: "בנייה או התקנה חדשה" },
        ],
      },
      { id: "material", promptHe: "החומר כבר אצלכם?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-furniture",
    questions: [
      {
        id: "item",
        promptHe: "מה מרכיבים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "wardrobe", labelHe: "ארון" },
          { id: "bed", labelHe: "מיטה" },
          { id: "table", labelHe: "שולחן או כיסאות" },
          { id: "desk", labelHe: "שולחן עבודה" },
          { id: "other", labelHe: "אחר" },
        ],
      },
      {
        id: "count",
        promptHe: "כמה פריטים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "1", labelHe: "אחד" },
          { id: "2", labelHe: "שניים" },
          { id: "more", labelHe: "שלושה או יותר" },
        ],
      },
      { id: "instructions", promptHe: "יש הוראות הרכבה וכל הברגים?", kind: "YESNO", mattersToPro: true },
      { id: "wall", promptHe: "צריך לעגן לקיר?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-tv",
    questions: [
      {
        id: "size",
        promptHe: "איזה גודל מסך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "small", labelHe: "עד 50 אינץ׳" },
          { id: "medium", labelHe: "50 עד 65" },
          { id: "large", labelHe: "מעל 65" },
        ],
      },
      {
        id: "wall",
        promptHe: "איזה קיר?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "concrete", labelHe: "בטון" },
          { id: "block", labelHe: "בלוק" },
          { id: "drywall", labelHe: "גבס" },
          { id: "unknown", labelHe: "לא יודע" },
        ],
      },
      { id: "bracket", promptHe: "יש זרוע או מתקן תלייה?", kind: "YESNO", mattersToPro: true },
      { id: "cables", promptHe: "צריך להסתיר כבלים?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-curtains",
    questions: [
      {
        id: "work",
        promptHe: "מה צריך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "install", labelHe: "התקנה חדשה" },
          { id: "replace", labelHe: "החלפה" },
          { id: "fix", labelHe: "מסילה תקועה" },
        ],
      },
      {
        id: "count",
        promptHe: "כמה חלונות?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "1", labelHe: "אחד" },
          { id: "2", labelHe: "שניים או שלושה" },
          { id: "more", labelHe: "יותר" },
        ],
      },
      { id: "has_item", promptHe: "הווילונות והמסילות כבר אצלכם?", kind: "YESNO", mattersToPro: true },
      { id: "height", promptHe: "התקרה גבוהה מ-3 מטר?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-glass",
    questions: [
      {
        id: "item",
        promptHe: "מה שבור או תקוע?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "window", labelHe: "חלון" },
          { id: "shower", labelHe: "מקלחון" },
          { id: "screen", labelHe: "רשת" },
          { id: "shutter", labelHe: "תריס" },
        ],
      },
      { id: "broken_now", promptHe: "יש זכוכית שבורה במקום עכשיו?", kind: "YESNO", mattersToPro: true },
      { id: "measured", promptHe: "יש לכם מידות?", kind: "YESNO", mattersToPro: true },
      { id: "floor", promptHe: "זה מעל קומה שלישית?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-alarm",
    questions: [
      {
        id: "work",
        promptHe: "מה צריך?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "install", labelHe: "התקנה חדשה" },
          { id: "repair", labelHe: "תיקון מערכת קיימת" },
          { id: "add", labelHe: "הוספת מצלמות" },
        ],
      },
      {
        id: "what",
        promptHe: "מה מאבטחים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "apartment", labelHe: "דירה" },
          { id: "house", labelHe: "בית פרטי" },
          { id: "business", labelHe: "עסק" },
        ],
      },
      { id: "internet", promptHe: "יש אינטרנט וראוטר במקום?", kind: "YESNO", mattersToPro: true },
      { id: "existing", promptHe: "יש כבר מערכת מותקנת?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-sealing",
    questions: [
      {
        id: "where",
        promptHe: "איפה מאטמים?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "roof", labelHe: "גג" },
          { id: "balcony", labelHe: "מרפסת" },
          { id: "bath", labelHe: "חדר רחצה" },
          { id: "wall", labelHe: "קיר חיצוני" },
        ],
      },
      { id: "leaking", promptHe: "יש נזילה פעילה עכשיו?", kind: "YESNO", mattersToPro: true },
      { id: "damage", promptHe: "יש כתמים או עובש בפנים?", kind: "YESNO", mattersToPro: true },
      { id: "access", promptHe: "יש גישה בטוחה למקום?", kind: "YESNO", mattersToPro: true },
    ],
  },
  {
    serviceId: "svc-solar",
    questions: [
      {
        id: "fault",
        promptHe: "מה הבעיה?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "no_hot", labelHe: "אין מים חמים" },
          { id: "leak", labelHe: "נזילה מהדוד" },
          { id: "element", labelHe: "הגוף חימום לא עובד" },
          { id: "service", labelHe: "ניקוי ותחזוקה" },
        ],
      },
      {
        id: "where",
        promptHe: "איפה הדוד?",
        kind: "SINGLE",
        mattersToPro: true,
        options: [
          { id: "roof", labelHe: "על הגג" },
          { id: "balcony", labelHe: "במרפסת שירות" },
          { id: "shared", labelHe: "בגג משותף" },
        ],
      },
      { id: "age", promptHe: "המערכת בת יותר מעשר שנים?", kind: "YESNO", mattersToPro: true },
      { id: "access", promptHe: "יש גישה בטוחה לגג?", kind: "YESNO", mattersToPro: true },
    ],
  },
];

export const pilotIntakeByService: Record<string, ServiceIntake> = Object.fromEntries(
  pilotIntakes.map((i) => [i.serviceId, i])
);
