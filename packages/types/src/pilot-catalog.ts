import type {
  CatalogDepartmentDef,
  CatalogServiceDef,
} from "./catalog";

/**
 * The pilot catalogue: the actual services PRO NOW opens with, as data.
 *
 * WHY THIS IS A FILE AND NOT A LIST INSIDE A SCREEN. Every screen that
 * hard-codes a service becomes a place the catalogue can disagree with
 * itself. The home grid would say a service is live, the matcher would route
 * a sentence to a service the home grid dropped, and the professional's
 * eligibility list would name a trade the customer cannot request. One
 * source, read by all three, is the only version of this that stays true
 * after the third edit.
 *
 * HOW THE PILOT WAS SIZED. Not by listing what a home needs — that list is
 * enormous and would produce a marketplace where nine taps in ten find
 * nobody. It was sized by asking which problems (a) hurt enough that a
 * person wants someone NOW rather than a quote by Thursday, and (b) have
 * enough working professionals in one city that "now" can actually be
 * answered. Fourteen services clear both bars. Everything else in this file
 * is modelled so the taxonomy is ready, and switched off so the pilot is not
 * diluted.
 *
 * THE THREE SWITCHES, AND WHY THEY ARE SEPARATE:
 *
 *   activationStatus   — do we offer it at all?
 *   fulfillmentProfile — is NOW a sane promise for this kind of work?
 *   trustProfile       — what must be verified before a stranger is sent?
 *
 * Collapsing any two of these loses something real. Painting is ACTIVE-able
 * and entirely legitimate, but it is SCHEDULED_ONLY: nobody stands beside a
 * wall hoping a painter arrives in nine minutes. Gas work is URGENT_NOW by
 * nature and is nonetheless INACTIVE here, because the licence question is a
 * legal decision this codebase must not invent (/CLAUDE.md §4). A locksmith
 * lockout is ordinary work with an extraordinary trust profile: the one job
 * in the catalogue whose whole purpose is opening a door for someone who
 * cannot prove, at that moment, that the door is theirs.
 *
 * WHAT IS DELIBERATELY ABSENT. No prices. Ranges belong to the pricing
 * engine and to the professional's quote, and a number written here would be
 * read as a promise the server never made. `pricingModel` says HOW a service
 * is priced; it never says how much.
 */

const IDENTITY = "IDENTITY" as const;

function plumbing(s: Omit<CatalogServiceDef, "mark">): CatalogServiceDef {
  return { ...s, mark: "plumbing" };
}

// ---------------------------------------------------------------------
// אינסטלציה — the archetype of NOW. Water is already doing damage.
// ---------------------------------------------------------------------

const blockage: CatalogServiceDef = plumbing({
  id: "svc-blockage",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הכיור או האסלה הסתומים",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "PLUMB_BLOCKAGE",
  nameHe: "פתיחת סתימה",
  descriptionHe: "כיור, אסלה, מקלחת או ביוב שחוזר.",
  keywordsHe: ["סתימה", "סתום", "לא יורד", "ביוב", "מים עולים", "אסלה", "כיור", "מקלחת", "ניקוז"],
  symptomsHe: ["המים לא יורדים בכיור", "אסלה סתומה", "מים עולים במקלחת", "ריח ביוב"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "ידיים עם כלי ניקוז מעל סיפון פתוח",
  typicalMinutes: [40, 90],
});

const leak: CatalogServiceDef = plumbing({
  id: "svc-leak",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של המקום שבו מופיעים המים",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "PLUMB_LEAK",
  nameHe: "נזילה או דליפת מים",
  descriptionHe: "מים שמופיעים איפה שהם לא אמורים.",
  keywordsHe: ["נזילה", "נוזל", "דולף", "מטפטף", "מים", "רטוב", "צינור", "סיפון", "כתם"],
  symptomsHe: ["מים מתחת לכיור", "כתם רטוב בקיר", "טפטוף מהתקרה", "מים ליד הדוד"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "ארון מתחת לכיור פתוח, פנס על צינור",
  typicalMinutes: [45, 120],
});

const tap: CatalogServiceDef = plumbing({
  id: "svc-tap",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של הברז או המיכל הקיים",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "PLUMB_FIXTURE",
  nameHe: "החלפת ברז או מיכל הדחה",
  descriptionHe: "ברז, ניאגרה, מקלחון או צנרת גלויה.",
  keywordsHe: ["ברז", "ניאגרה", "מיכל הדחה", "להחליף ברז", "מקלחון", "ראש מקלחת"],
  symptomsHe: ["ברז מטפטף", "הניאגרה לא נעצרת", "צריך להחליף ברז", "לחץ מים חלש"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "ברז חדש באריזה לצד מפתח שוודי",
  typicalMinutes: [30, 75],
});

// ---------------------------------------------------------------------
// חשמל — licensed work. The catalogue says so structurally; which licence
// is mandatory is counsel's answer, not ours (/CLAUDE.md §4).
// ---------------------------------------------------------------------

const powerOut: CatalogServiceDef = {
  id: "svc-electric",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של לוח החשמל",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "ELEC_OUTAGE",
  nameHe: "הפסקת חשמל בדירה",
  descriptionHe: "פחת שקופץ, חושך בחלק מהבית, ריח שרוף.",
  mark: "electrical",
  keywordsHe: ["חשמל", "הפסקת חשמל", "פחת", "קצר", "לוח חשמל", "מפסק", "חושך", "ריח שרוף", "ניצוץ"],
  symptomsHe: ["הפחת קופץ שוב ושוב", "אין חשמל בחלק מהבית", "ריח שרוף מהלוח", "ניצוצות משקע"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "LICENSE_REQUIRED",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE", "ELECTRICIAN_LICENSE"],
  photoSubjectHe: "לוח חשמל פתוח עם בודק מתח ביד",
  typicalMinutes: [40, 120],
};

const socket: CatalogServiceDef = {
  id: "svc-socket",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של השקע או נקודת האור",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "ELEC_POINT",
  nameHe: "שקע, נקודת אור או גוף תאורה",
  descriptionHe: "התקנה או תיקון של נקודה בודדת.",
  mark: "electrical",
  keywordsHe: ["שקע", "נורה", "אור", "גוף תאורה", "מנורה", "נקודת חשמל", "להתקין שקע", "לוסטרה"],
  symptomsHe: ["שקע לא עובד", "להתקין גוף תאורה", "מתג לא מדליק", "צריך שקע נוסף"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "LICENSE_REQUIRED",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE", "ELECTRICIAN_LICENSE"],
  photoSubjectHe: "ידיים מחברות שקע בקיר, מברג מבודד",
  typicalMinutes: [25, 60],
};

// ---------------------------------------------------------------------
// מנעולנות — ordinary work, extraordinary trust.
// ---------------------------------------------------------------------

const lockout: CatalogServiceDef = {
  id: "svc-lock",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הדלת והמנעול",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "LOCK_LOCKOUT",
  nameHe: "ננעלתי בחוץ",
  descriptionHe: "פתיחת דלת כשאין מפתח.",
  mark: "locksmith",
  keywordsHe: ["ננעלתי", "נעול", "מפתח", "נשאר בפנים", "לא נכנס", "דלת נעולה", "פריצת דלת"],
  symptomsHe: ["המפתח נשאר בפנים", "המפתח נשבר במנעול", "הדלת ננעלה מאחוריי", "ננעלתי מחוץ לרכב"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "ENHANCED",
  requiredCredentials: [
    "IDENTITY_ENHANCED",
    "BUSINESS",
    "LIABILITY_INSURANCE",
    "PROPERTY_LINK_POLICY",
  ],
  photoSubjectHe: "ידיים עם כלי פתיחה ליד צילינדר, דלת סגורה",
  typicalMinutes: [15, 45],
};

const cylinder: CatalogServiceDef = {
  id: "svc-cylinder",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של הצילינדר או המנעול",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "LOCK_CYLINDER",
  nameHe: "החלפת צילינדר או מנעול",
  descriptionHe: "החלפה אחרי אובדן מפתח, מעבר דירה או פריצה.",
  mark: "locksmith",
  keywordsHe: ["צילינדר", "להחליף מנעול", "מנעול", "איבדתי מפתח", "מעבר דירה", "אחרי פריצה"],
  symptomsHe: ["איבדתי מפתח", "נכנסתי לדירה חדשה", "המנעול תקוע", "אחרי פריצה"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "ENHANCED",
  requiredCredentials: ["IDENTITY_ENHANCED", "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "צילינדר חדש ביד מול דלת פתוחה",
  typicalMinutes: [20, 50],
};

// ---------------------------------------------------------------------
// מיזוג ומכשירי חשמל — "today", almost never "this minute".
// ---------------------------------------------------------------------

const acFix: CatalogServiceDef = {
  id: "svc-ac",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של המזגן והיחידה החיצונית",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "HVAC_REPAIR",
  nameHe: "מזגן לא מקרר או מטפטף",
  descriptionHe: "תיקון, ניקוי או בדיקת גז למזגן קיים.",
  mark: "climate",
  keywordsHe: ["מזגן", "מיזוג", "לא מקרר", "לא מחמם", "מטפטף מהמזגן", "מזגן רועש", "ניקוי מזגן"],
  symptomsHe: ["המזגן לא מקרר", "מטפטף מים מהמזגן", "רעש חזק מהמזגן", "ריח מהמזגן"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "מזגן עילי פתוח עם מסנן ביד",
  typicalMinutes: [45, 100],
};

const fridge: CatalogServiceDef = {
  id: "svc-fridge",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של המקרר ושל מדבקת הדגם",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "APPL_FRIDGE",
  nameHe: "מקרר או מקפיא",
  descriptionHe: "מקרר שלא מקרר, מקפיא שמפשיר, מים מתחת.",
  mark: "appliance",
  keywordsHe: ["מקרר", "מקפיא", "לא מקרר", "הפשיר", "פריזר", "מים במקרר"],
  symptomsHe: ["המקרר לא מקרר", "המקפיא הפשיר", "מים בתחתית המקרר", "המקרר לא נדלק"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "גב מקרר מוסט מהקיר, מד חום ביד",
  typicalMinutes: [40, 90],
};

const washer: CatalogServiceDef = {
  id: "svc-washer",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של המכונה ושל מדבקת הדגם",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "APPL_WASHER",
  nameHe: "מכונת כביסה או מייבש",
  descriptionHe: "לא מנקזת, לא מסתובבת, מציפה או לא נדלקת.",
  mark: "appliance",
  keywordsHe: ["מכונת כביסה", "כביסה", "מייבש", "לא מנקזת", "מציפה", "לא מסתובבת", "מדיח"],
  symptomsHe: ["המכונה מציפה מים", "לא מנקזת", "לא מסתובבת", "רעש חזק בסחיטה"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "מכונת כביסה פתוחה עם מסנן שאוב ביד",
  typicalMinutes: [40, 90],
};

// ---------------------------------------------------------------------
// ניקיון והדברה
// ---------------------------------------------------------------------

const cleanNow: CatalogServiceDef = {
  id: "svc-clean",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של השטח, אם נוח לך",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "CLEAN_URGENT",
  nameHe: "ניקיון דחוף",
  descriptionHe: "אחרי אירוע, אחרי שיפוץ, או לפני שמגיעים אורחים.",
  mark: "cleaning",
  keywordsHe: ["ניקיון", "לנקות", "אחרי שיפוץ", "אחרי אירוע", "מנקה", "ניקוי דירה"],
  symptomsHe: ["אחרי אירוע בבית", "אחרי שיפוץ", "לפני כניסה לדירה", "ניקוי כללי דחוף"],
  pricingModel: "HOURLY",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS"],
  photoSubjectHe: "סלון נקי עם ציוד ניקיון בפינה",
  typicalMinutes: [120, 300],
};

const pest: CatalogServiceDef = {
  id: "svc-pest",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של המקום שבו ראית אותם",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "PEST_CONTROL",
  nameHe: "הדברה",
  descriptionHe: "טיפול בג׳וקים, נמלים, יתושים או מכרסמים.",
  mark: "pest",
  keywordsHe: ["הדברה", "ג׳וקים", "גוקים", "נמלים", "מכרסמים", "עכברים", "פשפשים", "יתושים"],
  symptomsHe: ["ג׳וקים במטבח", "נמלים בכל הבית", "רעשים בקיר", "פשפשי מיטה"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "LICENSE_REQUIRED",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE", "PEST_CONTROL_LICENSE"],
  photoSubjectHe: "מדביר עם ציוד מגן ומרסס, ללא חרקים בתמונה",
  typicalMinutes: [45, 90],
};

// ---------------------------------------------------------------------
// שינוע — the two services where the vehicle is the tool.
// ---------------------------------------------------------------------

const courier: CatalogServiceDef = {
  id: "svc-courier",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של מה שצריך להעביר",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "LOG_COURIER",
  nameHe: "שליחות עכשיו",
  descriptionHe: "איסוף ומסירה של חבילה, מסמך או מפתח.",
  mark: "moving",
  keywordsHe: ["שליחות", "שליח", "להביא", "לאסוף", "חבילה", "מסמכים", "מפתח", "לשלוח"],
  symptomsHe: ["לאסוף חבילה", "להעביר מפתח", "מסמכים למשרד", "לשכוח משהו ולהביא"],
  pricingModel: "DISTANCE_TIME",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "DRIVING_LICENSE", "VEHICLE_INSURANCE"],
  photoSubjectHe: "תיק שליחים ליד קטנוע, חבילה קטנה ביד",
  typicalMinutes: [20, 60],
};

const smallMove: CatalogServiceDef = {
  id: "svc-moving",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של הפריטים ושל הכניסה לבניין",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "LOG_SMALL_MOVE",
  nameHe: "הובלה קטנה",
  descriptionHe: "פריט בודד, כמה ארגזים, או דירת סטודיו.",
  mark: "moving",
  keywordsHe: ["הובלה", "להעביר", "ארגזים", "מעבר דירה", "משאית", "ספה", "מקרר להעביר", "פינוי"],
  symptomsHe: ["ספה או מיטה בודדת", "כמה ארגזים", "פינוי פריט ישן", "מעבר בתוך הבניין"],
  pricingModel: "DISTANCE_TIME",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "DRIVING_LICENSE", "VEHICLE_INSURANCE"],
  photoSubjectHe: "שני אנשים מרימים ארגז ליד רכב מסחרי פתוח",
  typicalMinutes: [60, 180],
};

// ---------------------------------------------------------------------
// Modelled, not offered.
//
// These are not placeholders. They carry the same required fields as the
// live services, so switching one on is a data change and not a development
// task — and so the professional-side verification flow can already be
// tested against a licence we do not yet accept.
// ---------------------------------------------------------------------

function scheduled(
  s: Omit<
    CatalogServiceDef,
    "fulfillmentProfile" | "activationStatus" | "trustProfile" | "requiredCredentials"
  > &
    Partial<Pick<CatalogServiceDef, "trustProfile" | "requiredCredentials">>
): CatalogServiceDef {
  return {
    fulfillmentProfile: "SCHEDULED_ONLY",
    activationStatus: "PILOT",
    trustProfile: "STANDARD",
    requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
    ...s,
  };
}

const painting = scheduled({
  id: "svc-paint",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הקיר או החדר",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "FINISH_PAINT",
  nameHe: "צביעה",
  descriptionHe: "חדר, קיר או תיקוני צבע אחרי נזילה.",
  mark: "painting",
  keywordsHe: ["צביעה", "לצבוע", "צבע", "קיר", "טיח", "סיד"],
  symptomsHe: ["לצבוע חדר", "כתם אחרי נזילה", "תיקוני צבע", "קילופים בתקרה"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "רולר צבע על קיר לבן, יריעת הגנה על הרצפה",
});

const furniture = scheduled({
  id: "svc-furniture",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של הרהיט או של הקופסה",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "ASSEMBLE_FURNITURE",
  nameHe: "הרכבת רהיטים",
  descriptionHe: "ארון, מיטה, שולחן או ריהוט מהקופסה.",
  mark: "furniture",
  keywordsHe: ["הרכבה", "להרכיב", "ארון", "מיטה", "איקאה", "רהיט", "קומודה"],
  symptomsHe: ["ארון מהקופסה", "מיטה להרכבה", "שולחן ומדפים", "פירוק והרכבה במעבר"],
  pricingModel: "FIXED",
  photoSubjectHe: "חלקי ארון על הרצפה עם מברגה",
});

const tvMount = scheduled({
  id: "svc-tv",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של הקיר ושל המסך",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "INSTALL_TV",
  nameHe: "תליית טלוויזיה ומסכים",
  descriptionHe: "התקנה על הקיר והסתרת כבלים.",
  mark: "tv",
  keywordsHe: ["טלוויזיה", "מסך", "לתלות", "זרוע", "מתקן לטלוויזיה", "כבלים"],
  symptomsHe: ["לתלות טלוויזיה", "להזיז מסך קיים", "להסתיר כבלים", "התקנת מקרן"],
  pricingModel: "FIXED",
  photoSubjectHe: "מסך על קיר עם פלס ומתקן קיר",
});

const garden = scheduled({
  id: "svc-garden",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הגינה",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "GARDEN_CARE",
  nameHe: "גינון",
  descriptionHe: "גיזום, כיסוח, השקיה ותחזוקת גינה.",
  mark: "garden",
  keywordsHe: ["גינון", "גינה", "גיזום", "דשא", "עצים", "השקיה", "גנן"],
  symptomsHe: ["דשא גבוה", "עץ שצריך גיזום", "מערכת השקיה", "סידור גינה"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "מספרי גיזום וענפים גזומים על דשא",
});

const glass = scheduled({
  id: "svc-glass",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של החלון או המסגרת",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "GLASS_WORK",
  nameHe: "זכוכית ואלומיניום",
  descriptionHe: "חלון שבור, מקלחון, רשת או תריס.",
  mark: "glass",
  keywordsHe: ["זכוכית", "חלון", "שבר", "מקלחון", "רשת", "תריס", "אלומיניום"],
  symptomsHe: ["חלון שבור", "תריס תקוע", "רשת קרועה", "מקלחון זזה"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "ידיים בכפפות מחזיקות לוח זכוכית ליד מסגרת אלומיניום",
});

const sealing = scheduled({
  id: "svc-sealing",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הרטיבות",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "SEALING_WORK",
  nameHe: "איטום",
  descriptionHe: "גג, מרפסת, חדר רחצה או קיר חיצוני.",
  mark: "sealing",
  keywordsHe: ["איטום", "רטיבות", "גג", "מרפסת", "עובש", "קיר רטוב"],
  symptomsHe: ["רטיבות בקיר", "מים מהגג", "עובש בפינה", "מרפסת מחלחלת"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "מריחת חומר איטום על מרפסת בטון",
});

const carpentry = scheduled({
  id: "svc-carpentry",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הרהיט או הדלת",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "CARPENTRY",
  nameHe: "נגרות",
  descriptionHe: "דלתות, מטבח, מדפים ותיקוני עץ.",
  mark: "carpentry",
  keywordsHe: ["נגר", "נגרות", "עץ", "דלת", "מטבח", "מדף", "צירים", "מגירה"],
  symptomsHe: ["דלת ארון נפלה", "מגירה לא נסגרת", "מדף להתקנה", "תיקון דלת עץ"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "ידיים מכווננות ציר של דלת ארון עץ",
});

const tiling = scheduled({
  id: "svc-tiling",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של האריחים",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "TILING",
  nameHe: "ריצוף וחיפוי",
  descriptionHe: "אריחים שבורים, רובה, וחיפוי מטבח.",
  mark: "tiling",
  keywordsHe: ["ריצוף", "אריח", "רובה", "קרמיקה", "חיפוי", "מרצף"],
  symptomsHe: ["אריח שבור", "רובה מתפוררת", "אריח מתנפח", "חיפוי מאחורי המטבח"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "אריח נקי ומרית רובה על רצפה",
});

const drywall = scheduled({
  id: "svc-drywall",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הקיר או התקרה",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "DRYWALL",
  nameHe: "גבס וטיח",
  descriptionHe: "מחיצות, תקרות, ותיקון חורים בקיר.",
  mark: "drywall",
  keywordsHe: ["גבס", "טיח", "מחיצה", "תקרה", "חור בקיר", "שפכטל"],
  symptomsHe: ["חור בקיר", "תקרת גבס", "מחיצה חדשה", "סדק בטיח"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "שפכטל על לוח גבס עם סרגל",
});

const curtains = scheduled({
  id: "svc-curtains",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של החלון",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "INSTALL_CURTAINS",
  nameHe: "וילונות ומסילות",
  descriptionHe: "התקנה, החלפה וכיוון של מסילות.",
  mark: "curtains",
  keywordsHe: ["וילון", "וילונות", "מסילה", "לתלות וילון", "רולר"],
  symptomsHe: ["להתקין וילון", "מסילה נפלה", "וילון רולר חדש", "לקצר וילון"],
  pricingModel: "FIXED",
  photoSubjectHe: "מסילת וילון על קיר עם מברגה ופלס",
});

const alarm = scheduled({
  id: "svc-alarm",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של המערכת הקיימת",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "SECURITY_ALARM",
  nameHe: "אזעקה ומצלמות",
  descriptionHe: "התקנה ותיקון של מערכות אבטחה ביתיות.",
  mark: "alarm",
  keywordsHe: ["אזעקה", "מצלמה", "מצלמות", "אבטחה", "אינטרקום", "חיישן"],
  symptomsHe: ["אזעקה מצפצפת", "להתקין מצלמות", "אינטרקום לא עובד", "חיישן תקול"],
  pricingModel: "VISIT_QUOTE",
  trustProfile: "ENHANCED",
  requiredCredentials: ["IDENTITY_ENHANCED", "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "מצלמת אבטחה קטנה על קיר חוץ",
});

const solar = scheduled({
  id: "svc-solar",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הדוד והקולטים",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "SOLAR_WATER",
  nameHe: "דוד שמש וקולטים",
  descriptionHe: "תיקון, החלפה וניקוי של מערכת חימום מים.",
  mark: "solar",
  keywordsHe: ["דוד", "דוד שמש", "קולט", "מים חמים", "אין מים חמים", "גופי חימום"],
  symptomsHe: ["אין מים חמים", "נזילה מהדוד", "קולט שבור", "להחליף דוד"],
  pricingModel: "VISIT_QUOTE",
  photoSubjectHe: "דוד שמש וקולטים על גג, מפתח צינורות",
});

/**
 * Gas. Modelled in full and switched OFF.
 *
 * This is the clearest case in the file of §4 doing its job. Gas work is
 * urgent by nature — a smell of gas is the most NOW request a person can
 * make — and that is exactly why it cannot be switched on by an engineering
 * judgement call. Which licence is mandatory, what insurance must be in
 * force, and what the platform's liability is when it dispatches someone to
 * a gas fault are legal answers. The service sits here INACTIVE so that the
 * day those answers arrive, the change is one field.
 */
const gas: CatalogServiceDef = {
  id: "svc-gas",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של הכיריים או של חיבור הגז",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "GAS_WORK",
  nameHe: "גז",
  descriptionHe: "חיבור, תיקון ובדיקת מערכת גז ביתית.",
  mark: "gas",
  keywordsHe: ["גז", "ריח גז", "בלון גז", "כיריים", "תנור גז", "צנרת גז"],
  symptomsHe: ["ריח גז", "כיריים לא נדלקות", "חיבור תנור", "בדיקת מערכת"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "URGENT_NOW",
  activationStatus: "INACTIVE",
  trustProfile: "LICENSE_REQUIRED",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE", "GAS_LICENSE"],
  photoSubjectHe: "מד לחץ על צנרת גז, ידיים בכפפות",
  typicalMinutes: [30, 90],
};


// ---------------------------------------------------------------------
// אנשים שמגיעים אליך
//
// THE DEPARTMENT THAT DECIDES WHAT THIS COMPANY IS.
//
// Without it, PRO NOW is an app for home repairs with a marketplace
// underneath. With it, it is what Amit described: a network of independent
// professionals who can be at your door within the hour, whether they carry
// a tool bag, a folding table, or nothing at all.
//
// And this is not a branding preference — it is a supply argument. The
// hardest thing to buy in a NOW marketplace is a professional sitting online
// with an hour free. A personal trainer between clients, a masseur with a
// cancellation, a tutor with a gap before evening: these people ALREADY have
// the shape the product needs, and unlike a plumber they need no van, no
// parts and no parking. They are the cheapest liquidity a new city can have.
//
// TWO THINGS THAT CHANGE HERE, AND THEY ARE NOT COSMETIC:
//
// 1. There is no fault. Nobody's body is broken because they booked a
//    massage, and a product that asks "מה התקלה?" before a training session
//    has told the customer it was not built for them. Copy that assumes a
//    fault has to stay out of these flows.
//
// 2. The person IS the risk surface. A plumber is alone with a pipe; a
//    massage therapist is alone with a person, often for an hour, often
//    touching them. That is `PERSONAL_CONTACT`, and it is a different
//    question from `ENHANCED`, not a louder version of it. Which checks the
//    platform actually requires is a §4 decision — these services stay PILOT
//    until it is made, and the record carries the requirement so the
//    decision cannot be skipped by accident.
// ---------------------------------------------------------------------

/** Someone comes to you, as themselves, for an hour. */
function personal(
  s: Omit<CatalogServiceDef, "trustProfile" | "requiredCredentials" | "activationStatus"> &
    Partial<Pick<CatalogServiceDef, "trustProfile" | "requiredCredentials" | "activationStatus">>
): CatalogServiceDef {
  return {
    // PILOT, not ACTIVE, and the reason is in the comment above: the
    // verification policy for being alone with a person has not been decided
    // (/CLAUDE.md §4). Flipping this field without that decision is exactly
    // the mistake the field exists to prevent.
    activationStatus: "PILOT",
    trustProfile: "PERSONAL_CONTACT",
    requiredCredentials: ["IDENTITY_ENHANCED", "BACKGROUND_CHECK", "PROFESSIONAL_CERTIFICATE"],
    ...s,
  };
}

const trainer = personal({
  id: "svc-trainer",
  matchingMode: "PERSON_FIT",
  mediaIntent: "NONE",
  customerPhotoPromptHe: null,
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "FIT_TRAINER",
  nameHe: "אימון אישי",
  descriptionHe: "מאמן מגיע אליך — לבית, לפארק או לחדר הכושר.",
  mark: "fitness",
  keywordsHe: ["מאמן", "אימון", "כושר", "מאמן אישי", "להתאמן", "ספורט", "פילאטיס"],
  symptomsHe: ["אימון ראשון להתנסות", "אימון בבית", "אימון בפארק", "חזרה אחרי הפסקה"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  photoSubjectHe: "מאמן עם מזרן וגומיות בסלון או בפארק",
  typicalMinutes: [45, 60],
});

const massage = personal({
  id: "svc-massage",
  matchingMode: "PERSON_FIT",
  mediaIntent: "NONE",
  customerPhotoPromptHe: null,
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "WELL_MASSAGE",
  nameHe: "עיסוי עד הבית",
  descriptionHe: "מטפל מגיע עם מיטת טיפולים.",
  mark: "wellness",
  keywordsHe: ["עיסוי", "מסאז", "מסאג׳", "מטפל", "כאבי גב", "שחרור שרירים", "רפלקסולוגיה"],
  symptomsHe: ["כאבי גב או צוואר", "אחרי אימון", "עיסוי רקמות עמוק", "עיסוי מרגיע"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  photoSubjectHe: "מיטת טיפולים מקופלת לצד תיק מטפל",
  typicalMinutes: [50, 90],
});

const haircut = personal({
  id: "svc-haircut",
  matchingMode: "PERSON_FIT",
  mediaIntent: "INSPIRATION",
  customerPhotoPromptHe: "אפשר לצרף תמונה של תסרוקת שאהבת",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "GROOM_HAIR",
  nameHe: "תספורת עד הבית",
  descriptionHe: "ספר או ספרית מגיעים עם הציוד.",
  mark: "grooming",
  keywordsHe: ["תספורת", "ספר", "ספרית", "להסתפר", "זקן", "צבע שיער", "פן"],
  symptomsHe: ["תספורת גבר", "תספורת אישה", "תספורת לילד", "עיצוב זקן"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  photoSubjectHe: "מספריים ומכונת תספורת על מגבת",
  typicalMinutes: [30, 60],
});

const nails = personal({
  id: "svc-nails",
  matchingMode: "PERSON_FIT",
  mediaIntent: "INSPIRATION",
  customerPhotoPromptHe: "אפשר לצרף תמונה של לק או עיצוב שאהבת",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "GROOM_NAILS",
  nameHe: "מניקור ופדיקור",
  descriptionHe: "טיפול ציפורניים אצלך בבית.",
  mark: "grooming",
  keywordsHe: ["מניקור", "פדיקור", "ציפורניים", "לק", "ג׳ל", "בניית ציפורניים"],
  symptomsHe: ["מניקור", "פדיקור", "לק ג׳ל", "הסרה ובנייה"],
  pricingModel: "FIXED",
  fulfillmentProfile: "SAME_DAY_NOW",
  photoSubjectHe: "ערכת טיפוח ציפורניים פתוחה על שולחן",
  typicalMinutes: [45, 90],
});

const tutor = personal({
  id: "svc-tutor",
  matchingMode: "PERSON_FIT",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של החומר או של המבחן",
  mobilityProfile: "CARRIES_NOTHING",
  code: "LEARN_TUTOR",
  nameHe: "שיעור פרטי",
  descriptionHe: "מורה מגיע אליך — או מתחבר עכשיו.",
  mark: "learning",
  keywordsHe: ["שיעור", "מורה", "שיעור פרטי", "מתמטיקה", "אנגלית", "בגרות", "מבחן"],
  symptomsHe: ["מבחן מחר", "עזרה בשיעורי בית", "הכנה לבגרות", "שיעור קבוע"],
  pricingModel: "HOURLY",
  fulfillmentProfile: "SAME_DAY_NOW",
  // The one service here with no physical contact at all, which is why it
  // does not carry a background check by default — the trust question is
  // real but different, and it is a §4 decision like the rest.
  trustProfile: "ENHANCED",
  requiredCredentials: ["IDENTITY_ENHANCED", "PROFESSIONAL_CERTIFICATE"],
  photoSubjectHe: "מחברת ומחשבון על שולחן מטבח",
  typicalMinutes: [45, 90],
});

/**
 * הנדימן לשעה — the service that proves the model.
 *
 * It is not a trade. It is an hour of a capable person with a bag of tools,
 * and it absorbs every small job the catalogue will never have a name for: a
 * shelf, a curtain rod, a door that sticks, a box that needs carrying down.
 * A taxonomy can grow forever and still miss what someone actually needs at
 * eight in the evening; this is how the product answers anyway.
 */
const handymanHour: CatalogServiceDef = {
  id: "svc-handyman",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של מה שצריך לתקן",
  mobilityProfile: "CARRIES_ON_PERSON",
  code: "ASSIST_HANDYMAN",
  nameHe: "הנדימן לשעה",
  descriptionHe: "עבודות קטנות בבית — לפי שעה, בלי להגדיר מראש בדיוק מה.",
  mark: "handyman",
  keywordsHe: ["הנדימן", "תיקונים קטנים", "לתלות", "לקדוח", "מדף", "להרכיב", "עזרה בבית", "בעל מקצוע כללי"],
  symptomsHe: ["לתלות מדף או תמונה", "דלת שנתקעת", "כמה תיקונים קטנים", "לא בטוח מה צריך"],
  pricingModel: "HOURLY",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS", "LIABILITY_INSURANCE"],
  photoSubjectHe: "תיק כלים פתוח עם מברגה ופלס",
  typicalMinutes: [60, 180],
};

/** עזרה בהרמה וסידור — a pair of hands, no trade required. */
const helpingHands: CatalogServiceDef = {
  id: "svc-hands",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "ITEM_REFERENCE",
  customerPhotoPromptHe: "צילום של מה שצריך להזיז",
  mobilityProfile: "CARRIES_NOTHING",
  code: "ASSIST_HANDS",
  nameHe: "זוג ידיים לעזרה",
  descriptionHe: "להרים, לסדר, לפנות, לארוז — שעה או שתיים של עזרה.",
  mark: "moving",
  keywordsHe: ["עזרה", "להרים", "לסדר", "לארוז", "לפנות", "כוח אדם", "מישהו שיעזור"],
  symptomsHe: ["להרים משהו כבד", "לסדר מחסן", "לארוז לפני מעבר", "לפנות גרוטאות"],
  pricingModel: "HOURLY",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY],
  photoSubjectHe: "שני אנשים מרימים ארגז במסדרון",
  typicalMinutes: [60, 180],
};

/** ניקיון אחרי שיפוץ — named by Amit, and genuinely its own job. */
const renoClean: CatalogServiceDef = {
  id: "svc-clean-reno",
  matchingMode: "FASTEST_ELIGIBLE",
  mediaIntent: "PROBLEM_EVIDENCE",
  customerPhotoPromptHe: "צילום של השטח אחרי השיפוץ",
  mobilityProfile: "NEEDS_VEHICLE",
  code: "CLEAN_RENOVATION",
  nameHe: "ניקיון אחרי שיפוץ",
  descriptionHe: "אבק בנייה, שאריות צבע, חלונות ומסגרות.",
  mark: "cleaning",
  keywordsHe: ["ניקיון אחרי שיפוץ", "אבק בנייה", "שאריות צבע", "ניקיון עומק", "אחרי בנייה"],
  symptomsHe: ["אבק בכל הבית", "שאריות צבע וטיח", "חלונות ומסגרות", "לפני כניסה לדירה"],
  pricingModel: "VISIT_QUOTE",
  fulfillmentProfile: "SAME_DAY_NOW",
  activationStatus: "ACTIVE",
  trustProfile: "STANDARD",
  requiredCredentials: [IDENTITY, "BUSINESS"],
  photoSubjectHe: "שואב תעשייתי ודלי לצד חלון נקי",
  typicalMinutes: [180, 420],
};

// ---------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------

export const pilotCatalog: CatalogDepartmentDef[] = [
  {
    code: "HOME_URGENT",
    nameHe: "תקלות בבית",
    categories: [
      { code: "PLUMBING", nameHe: "אינסטלציה", mark: "plumbing", services: [blockage, leak, tap] },
      { code: "ELECTRICAL", nameHe: "חשמל", mark: "electrical", services: [powerOut, socket] },
      { code: "LOCKSMITH", nameHe: "מנעולנות", mark: "locksmith", services: [lockout, cylinder] },
      { code: "CLIMATE", nameHe: "מיזוג", mark: "climate", services: [acFix] },
      { code: "APPLIANCE", nameHe: "מכשירי חשמל", mark: "appliance", services: [fridge, washer] },
      { code: "GAS", nameHe: "גז", mark: "gas", services: [gas] },
    ],
  },
  {
    code: "PEOPLE",
    nameHe: "אנשים שמגיעים אליך",
    categories: [
      { code: "FITNESS", nameHe: "כושר ובריאות", mark: "fitness", services: [trainer, massage] },
      { code: "GROOMING", nameHe: "טיפוח", mark: "grooming", services: [haircut, nails] },
      { code: "LEARNING", nameHe: "לימודים", mark: "learning", services: [tutor] },
      {
        code: "ASSIST",
        nameHe: "עזרה כללית",
        mark: "handyman",
        services: [handymanHour, helpingHands],
      },
    ],
  },
  {
    code: "HOME_CARE",
    nameHe: "תחזוקת הבית",
    categories: [
      { code: "CLEANING", nameHe: "ניקיון", mark: "cleaning", services: [cleanNow, renoClean] },
      { code: "PEST", nameHe: "הדברה", mark: "pest", services: [pest] },
      { code: "GARDEN", nameHe: "גינון", mark: "garden", services: [garden] },
    ],
  },
  {
    code: "LOGISTICS",
    nameHe: "שינוע",
    categories: [
      { code: "COURIER", nameHe: "שליחויות", mark: "moving", services: [courier] },
      { code: "MOVING", nameHe: "הובלות", mark: "moving", services: [smallMove] },
    ],
  },
  {
    code: "IMPROVEMENT",
    nameHe: "שיפוץ והתקנות",
    categories: [
      { code: "FINISHES", nameHe: "גימור", mark: "painting", services: [painting, tiling, drywall] },
      { code: "CARPENTRY", nameHe: "נגרות", mark: "carpentry", services: [carpentry, furniture] },
      {
        code: "INSTALLATIONS",
        nameHe: "התקנות",
        mark: "tv",
        services: [tvMount, curtains, glass, alarm],
      },
      { code: "BUILDING", nameHe: "מעטפת הבית", mark: "sealing", services: [sealing, solar] },
    ],
  },
];

/** Every service, keyed by id. Screens look up, they do not re-declare. */
export const pilotServiceById: Record<string, CatalogServiceDef> = Object.fromEntries(
  pilotCatalog.flatMap((d) => d.categories.flatMap((c) => c.services)).map((s) => [s.id, s])
);
