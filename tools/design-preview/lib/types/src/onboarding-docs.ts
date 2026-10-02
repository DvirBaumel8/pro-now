/**
 * ---------------------------------------------------------------------
 * WHAT A PROFESSIONAL UPLOADS TO JOIN, PER TRADE
 * ---------------------------------------------------------------------
 * From the research report `tools/design-preview/research/reports/מסמכים
 * נדרשים לבעלי מקצוע.md` (2026-09-29). Amit asked for it to be researched
 * before anything was decided, and decided the rule it serves: a
 * professional receives work only after PRO NOW has reviewed his documents,
 * his details and his reputation online.
 *
 * Three levels, said to the professional in plain words:
 *   LAW          — Israeli law requires it for this work.
 *   PLATFORM     — PRO NOW asks everyone for it (identity, a face to match).
 *   RECOMMENDED  — customary, speeds up approval, not required.
 *
 * What is deliberately NOT here: a criminal-record certificate (תעודת
 * יושר). Demanding one is an offence under Israeli law even with consent
 * (see the report, "מה מותר לבקש"). The one open exception — police
 * approval for tutors of minors — is a question for a lawyer and is
 * recorded in docs/18-ROADMAP.md, not asked here.
 */
export type OnboardingDocId =
  | "ID"
  | "SELFIE"
  | "BUSINESS"
  | "INSURANCE"
  | "ELECTRICIAN"
  | "GAS"
  | "AC"
  | "PEST"
  | "VET"
  | "MEDICAL"
  | "DRIVING"
  | "VEHICLE_INSURANCE"
  | "RECOVERY_VEHICLE"
  | "MOBILE_GARAGE"
  | "WORK_AT_HEIGHT"
  | "TRADE_CERT";

export type OnboardingDocLevel = "LAW" | "PLATFORM" | "RECOMMENDED";

export interface OnboardingDoc {
  id: OnboardingDocId;
  nameHe: string;
  level: OnboardingDocLevel;
  /** Only in some cases — "אם העבודה בגובה מעל 2 מ׳". */
  whenHe?: string;
  /** How PRO NOW checks it, in one line. */
  checkHe: string;
  /** A licence number field, when the registry can be searched by it. */
  numberLabelHe?: string;
}

const DOC: Record<OnboardingDocId, Omit<OnboardingDoc, "level" | "whenHe">> = {
  ID: { id: "ID", nameHe: "תעודת זהות", checkHe: "משווים לתמונת הפנים שלך" },
  SELFIE: { id: "SELFIE", nameHe: "תמונת פנים", checkHe: "צילום עכשיו, מול המצלמה" },
  BUSINESS: { id: "BUSINESS", nameHe: "תעודת עוסק (פטור או מורשה)", checkHe: "נבדק מול אישור רשות המסים" },
  INSURANCE: { id: "INSURANCE", nameHe: "ביטוח צד ג׳", checkHe: "בודקים שהפוליסה בתוקף" },
  ELECTRICIAN: { id: "ELECTRICIAN", nameHe: "רישיון חשמלאי", checkHe: "נבדק מול מאגר החשמלאים של משרד העבודה", numberLabelHe: "מספר רישיון" },
  GAS: { id: "GAS", nameHe: "רישיון גזאי (מתקין גפ״מ)", checkHe: "נבדק מול מאגר הגזאים של משרד האנרגיה", numberLabelHe: "מספר רישיון" },
  AC: { id: "AC", nameHe: "רישיון טכנאי מיזוג אוויר", checkHe: "רישיון חדש לפי חוק 2025 · נבדק מול משרד העבודה", numberLabelHe: "מספר רישיון" },
  PEST: { id: "PEST", nameHe: "היתר מדביר", checkHe: "נבדק אוטומטית במאגר המדבירים, לפני כל עבודה", numberLabelHe: "מספר היתר" },
  VET: { id: "VET", nameHe: "רישיון וטרינר", checkHe: "נבדק אוטומטית במאגר הווטרינרים", numberLabelHe: "מספר רישיון" },
  MEDICAL: { id: "MEDICAL", nameHe: "רישיון לעסוק ברפואה", checkHe: "נבדק אוטומטית במאגר משרד הבריאות", numberLabelHe: "מספר רישיון" },
  DRIVING: { id: "DRIVING", nameHe: "רישיון נהיגה", checkHe: "סוג הרישיון מתאים לרכב" },
  VEHICLE_INSURANCE: { id: "VEHICLE_INSURANCE", nameHe: "ביטוח רכב (חובה)", checkHe: "בודקים שהפוליסה בתוקף" },
  RECOVERY_VEHICLE: { id: "RECOVERY_VEHICLE", nameHe: "רישיון רכב חילוץ + היתר נהג גרר", checkHe: "הרכב רשום כ״רכב חילוץ״ במשרד התחבורה", numberLabelHe: "מספר רכב" },
  MOBILE_GARAGE: { id: "MOBILE_GARAGE", nameHe: "רישיון מוסך נייד", checkHe: "נבדק אוטומטית במאגר המוסכים", numberLabelHe: "מספר רישיון" },
  WORK_AT_HEIGHT: { id: "WORK_AT_HEIGHT", nameHe: "הסמכה לעבודה בגובה", checkHe: "בודקים תוקף (עד שנתיים)" },
  TRADE_CERT: { id: "TRADE_CERT", nameHe: "תעודה מקצועית", checkHe: "תעודת לימודים, הסמכה או מורשה יצרן" },
};

const d = (id: OnboardingDocId, level: OnboardingDocLevel, whenHe?: string): OnboardingDoc => ({ ...DOC[id], level, ...(whenHe ? { whenHe } : {}) });

const HEIGHT = "אם עובדים בגובה מעל 2 מ׳";

/** Per service: the documents beyond the ones everybody gives. */
const BY_SERVICE: Readonly<Record<string, OnboardingDoc[]>> = {
  "svc-electric": [d("ELECTRICIAN", "LAW")],
  "svc-socket": [d("ELECTRICIAN", "LAW")],
  "svc-alarm": [d("ELECTRICIAN", "LAW", "כשמתחברים לחשמל 230V")],
  "svc-solar": [d("ELECTRICIAN", "LAW", "לעבודה על הגוף, התרמוסטט או החיבור"), d("WORK_AT_HEIGHT", "LAW", HEIGHT)],
  "svc-gas": [d("GAS", "LAW")],
  "svc-ac": [d("AC", "LAW"), d("WORK_AT_HEIGHT", "LAW", "ליחידה חיצונית בגובה")],
  "svc-pest": [d("PEST", "LAW")],
  "svc-vet": [d("VET", "LAW")],
  "svc-doctor": [d("MEDICAL", "LAW")],
  "svc-towing": [d("DRIVING", "LAW"), d("RECOVERY_VEHICLE", "LAW"), d("VEHICLE_INSURANCE", "LAW")],
  "svc-courier": [d("DRIVING", "LAW"), d("VEHICLE_INSURANCE", "LAW")],
  "svc-moving": [d("DRIVING", "LAW"), d("VEHICLE_INSURANCE", "LAW")],
  "svc-jump-start": [d("DRIVING", "LAW"), d("VEHICLE_INSURANCE", "LAW")],
  "svc-flat-tyre": [d("DRIVING", "LAW"), d("VEHICLE_INSURANCE", "LAW"), d("MOBILE_GARAGE", "LAW", "אם מתקנים את הצמיג במקום")],
  "svc-paint": [d("WORK_AT_HEIGHT", "LAW", HEIGHT)],
  "svc-glass": [d("WORK_AT_HEIGHT", "LAW", HEIGHT), d("TRADE_CERT", "RECOMMENDED")],
  "svc-sealing": [d("WORK_AT_HEIGHT", "LAW", HEIGHT), d("TRADE_CERT", "RECOMMENDED")],
  "svc-fridge": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-washer": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-trainer": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-massage": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-haircut": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-nails": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-makeup": [d("TRADE_CERT", "RECOMMENDED")],
  "svc-tutor": [d("TRADE_CERT", "RECOMMENDED")],
};

/** Work done inside the customer's home, where liability insurance is customary. */
const NO_HOME_INSURANCE = new Set(["svc-courier", "svc-dog-walk", "svc-tutor", "svc-trainer"]);

/**
 * Everything a professional who offers these services is asked for, each
 * document once, the strictest level winning, legal ones first.
 */
export function onboardingDocsFor(serviceIds: readonly string[]): OnboardingDoc[] {
  const out = new Map<OnboardingDocId, OnboardingDoc>();
  const put = (doc: OnboardingDoc) => {
    const cur = out.get(doc.id);
    const rank = (l: OnboardingDocLevel) => (l === "LAW" ? 0 : l === "PLATFORM" ? 1 : 2);
    if (!cur || rank(doc.level) < rank(cur.level) || (rank(doc.level) === rank(cur.level) && cur.whenHe && !doc.whenHe)) out.set(doc.id, doc);
  };
  put(d("ID", "PLATFORM"));
  put(d("SELFIE", "PLATFORM"));
  put(d("BUSINESS", "LAW"));
  for (const id of serviceIds) for (const doc of BY_SERVICE[id] ?? []) put(doc);
  if (serviceIds.some((id) => !NO_HOME_INSURANCE.has(id))) put(d("INSURANCE", "RECOMMENDED"));
  const order = (x: OnboardingDoc) => (x.level === "PLATFORM" ? 0 : x.level === "LAW" ? 1 : 2);
  return [...out.values()].sort((a, b) => order(a) - order(b));
}

/** What the review after sending checks — Amit, 2026-09-29. */
export const APPROVAL_STEPS_HE = [
  "המסמכים שהעלית",
  "רישיונות מול המאגרים הממשלתיים",
  "ביקורות ודירוגים ברשת",
  "אישור PRO NOW — ורק אז מקבלים עבודות",
] as const;
