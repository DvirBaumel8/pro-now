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
  s: Omit<CatalogServiceDef, "fulfillmentProfile" | "activationStatus" | "trustProfile" | "requiredCredentials"> &
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
    code: "HOME_CARE",
    nameHe: "תחזוקת הבית",
    categories: [
      { code: "CLEANING", nameHe: "ניקיון", mark: "cleaning", services: [cleanNow] },
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
