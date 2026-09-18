/**
 * Version-controlled seed data converted from
 * "PRO NOW — Service Catalog & Pilot Matrix v1.0" (Google Sheet, tab
 * "Services Master"). See /docs/09b-SERVICE-CATALOG.md for the full
 * transcribed table this was generated from.
 *
 * Rule (Final Pre-Development Decisions v1.0 §18): "Claude converts
 * approved seed rows into version-controlled database seed data. The
 * spreadsheet is not queried by production apps." This file is that
 * conversion — prisma/seed.ts reads only this array, never the sheet.
 */

export type PriceModel = "FIXED" | "HOURLY" | "VISIT_QUOTE" | "DISTANCE_TIME";
export type LaunchStatus = "PILOT_CANDIDATE" | "VALIDATE";

export interface SeedDepartment {
  code: string;
  nameHe: string;
  nameEn: string;
  sortOrder: number;
}

export interface SeedCategory {
  code: string;
  departmentCode: string;
  nameHe: string;
  nameEn: string;
}

export interface SeedService {
  code: string;
  categoryCode: string;
  nameHe: string;
  nameEn: string;
  priceModel: PriceModel;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  trustTier: string;
  launchStatus: LaunchStatus;
  notes: string;
}

export const departments: SeedDepartment[] = [
  { code: "BEAUTY", nameHe: "יופי וטיפוח", nameEn: "Beauty & Grooming", sortOrder: 1 },
  { code: "HOME_REPAIRS", nameHe: "בית ותיקונים", nameEn: "Home & Repairs", sortOrder: 2 },
  { code: "WELLNESS", nameHe: "Wellness", nameEn: "Wellness & Fitness", sortOrder: 3 },
  { code: "CLEANING", nameHe: "ניקיון ומשק בית", nameEn: "Cleaning & Household", sortOrder: 4 },
  { code: "DELIVERY", nameHe: "שליחויות וסידורים", nameEn: "Delivery & Errands", sortOrder: 5 },
  { code: "PETS", nameHe: "חיות", nameEn: "Pets", sortOrder: 6 },
  { code: "AUTO", nameHe: "רכב", nameEn: "Auto", sortOrder: 7 },
  { code: "TECH", nameHe: "טכנולוגיה", nameEn: "Tech", sortOrder: 8 },
  { code: "MOVING", nameHe: "מעבר והרכבה", nameEn: "Moving & Assembly", sortOrder: 9 },
];

export const categories: SeedCategory[] = [
  { code: "NAILS", departmentCode: "BEAUTY", nameHe: "ציפורניים", nameEn: "Nails" },
  { code: "HAIR", departmentCode: "BEAUTY", nameHe: "שיער", nameEn: "Hair" },
  { code: "MAKEUP", departmentCode: "BEAUTY", nameHe: "איפור", nameEn: "Makeup" },
  { code: "LASHES", departmentCode: "BEAUTY", nameHe: "ריסים", nameEn: "Lashes" },
  { code: "PLUMBING", departmentCode: "HOME_REPAIRS", nameHe: "אינסטלציה", nameEn: "Plumbing" },
  { code: "ELECTRICAL", departmentCode: "HOME_REPAIRS", nameHe: "חשמל", nameEn: "Electrical" },
  { code: "HANDYMAN", departmentCode: "HOME_REPAIRS", nameHe: "הנדימן", nameEn: "Handyman" },
  { code: "MASSAGE", departmentCode: "WELLNESS", nameHe: "מסאז'", nameEn: "Massage" },
  { code: "FITNESS", departmentCode: "WELLNESS", nameHe: "כושר", nameEn: "Fitness" },
  { code: "CLEAN", departmentCode: "CLEANING", nameHe: "ניקיון", nameEn: "Cleaning" },
  { code: "COURIER", departmentCode: "DELIVERY", nameHe: "שליח", nameEn: "Courier" },
  { code: "DOG_WALKING", departmentCode: "PETS", nameHe: "דוגווקר", nameEn: "Dog Walking" },
  { code: "MOBILE_AUTO", departmentCode: "AUTO", nameHe: "שירות רכב נייד", nameEn: "Mobile Auto Service" },
  { code: "TECH_SUPPORT", departmentCode: "TECH", nameHe: "תמיכה טכנית", nameEn: "Tech Support" },
  { code: "SMALL_MOVING", departmentCode: "MOVING", nameHe: "הובלה קטנה", nameEn: "Small Moving" },
];

export const services: SeedService[] = [
  { code: "BEAUTY_NAIL_GEL", categoryCode: "NAILS", nameHe: "מניקור ג'ל עד הבית", nameEn: "Gel manicure, at home", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 90, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Strong fixed-menu NOW example" },
  { code: "BEAUTY_NAIL_MANICURE", categoryCode: "NAILS", nameHe: "מניקור קלאסי", nameEn: "Classic manicure", priceModel: "FIXED", durationMinMinutes: 45, durationMaxMinutes: 60, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "" },
  { code: "BEAUTY_NAIL_PEDICURE", categoryCode: "NAILS", nameHe: "פדיקור קוסמטי", nameEn: "Cosmetic pedicure", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 90, trustTier: "B", launchStatus: "VALIDATE", notes: "Keep medical/therapeutic claims out unless approved" },
  { code: "BEAUTY_HAIR_MEN", categoryCode: "HAIR", nameHe: "תספורת גבר עד הבית", nameEn: "Men's haircut, at home", priceModel: "FIXED", durationMinMinutes: 30, durationMaxMinutes: 45, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "" },
  { code: "BEAUTY_HAIR_BLOWDRY", categoryCode: "HAIR", nameHe: "פן/עיצוב שיער עד הבית", nameEn: "Blow-dry / styling, at home", priceModel: "FIXED", durationMinMinutes: 45, durationMaxMinutes: 75, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "" },
  { code: "BEAUTY_MAKEUP", categoryCode: "MAKEUP", nameHe: "איפור עד הבית", nameEn: "Makeup, at home", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 90, trustTier: "B", launchStatus: "VALIDATE", notes: "Event/bridal may not fit NOW" },
  { code: "WELLNESS_MASSAGE60", categoryCode: "MASSAGE", nameHe: "מסאז' 60 דק' עד הבית", nameEn: "60-minute massage, at home", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 75, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "Avoid medical claims unless licensed scope" },
  { code: "WELLNESS_MASSAGE90", categoryCode: "MASSAGE", nameHe: "מסאז' 90 דק' עד הבית", nameEn: "90-minute massage, at home", priceModel: "FIXED", durationMinMinutes: 90, durationMaxMinutes: 105, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "" },
  { code: "HOME_PLUMB_BLOCK", categoryCode: "PLUMBING", nameHe: "סתימה/בעיה באינסטלציה", nameEn: "Blockage / plumbing issue", priceModel: "VISIT_QUOTE", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "Visit fee explicit" },
  { code: "HOME_PLUMB_LEAK", categoryCode: "PLUMBING", nameHe: "נזילה/פיצוץ בצנרת", nameEn: "Leak / burst pipe", priceModel: "VISIT_QUOTE", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "Emergency routing boundaries required" },
  { code: "HOME_ELECT_FAULT", categoryCode: "ELECTRICAL", nameHe: "תקלה חשמלית בבית", nameEn: "Electrical fault at home", priceModel: "VISIT_QUOTE", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "Dispatch only credential-eligible pro" },
  { code: "HOME_ELECT_INSTALL", categoryCode: "ELECTRICAL", nameHe: "התקנת גוף תאורה/אביזר חשמל", nameEn: "Fixture / electrical accessory install", priceModel: "VISIT_QUOTE", durationMinMinutes: 45, durationMaxMinutes: 120, trustTier: "C", launchStatus: "PILOT_CANDIDATE", notes: "Exact pricing config can evolve" },
  { code: "HOME_HANDYMAN", categoryCode: "HANDYMAN", nameHe: "הנדימן למשימה קטנה", nameEn: "Handyman, small task", priceModel: "HOURLY", durationMinMinutes: 60, durationMaxMinutes: 180, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Dynamic form must screen regulated tasks" },
  { code: "CLEAN_BASIC", categoryCode: "CLEAN", nameHe: "ניקיון בית לפי שעה", nameEn: "Hourly home cleaning", priceModel: "HOURLY", durationMinMinutes: 120, durationMaxMinutes: 300, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Minimum duration" },
  { code: "CLEAN_URGENT", categoryCode: "CLEAN", nameHe: "מנקה פנוי/ה להיום עכשיו", nameEn: "Cleaner available now, today", priceModel: "HOURLY", durationMinMinutes: 120, durationMaxMinutes: 240, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Strong liquidity challenge" },
  { code: "COURIER_DOC", categoryCode: "COURIER", nameHe: "מסמך/חבילה קטנה מנקודה לנקודה", nameEn: "Document / small package, point to point", priceModel: "DISTANCE_TIME", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Prohibited item policy" },
  { code: "COURIER_STORE", categoryCode: "COURIER", nameHe: "איסוף מחנות ומסירה", nameEn: "Store pickup and delivery", priceModel: "DISTANCE_TIME", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "B", launchStatus: "PILOT_CANDIDATE", notes: "Payment-for-goods flow not MVP unless explicitly designed" },
  { code: "PET_WALK30", categoryCode: "DOG_WALKING", nameHe: "טיול כלב 30 דקות", nameEn: "30-minute dog walk", priceModel: "FIXED", durationMinMinutes: 30, durationMaxMinutes: 30, trustTier: "B", launchStatus: "VALIDATE", notes: "Pet handoff/safety flow needed" },
  { code: "PET_WALK60", categoryCode: "DOG_WALKING", nameHe: "טיול כלב 60 דקות", nameEn: "60-minute dog walk", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 60, trustTier: "B", launchStatus: "VALIDATE", notes: "" },
  { code: "AUTO_BATTERY", categoryCode: "MOBILE_AUTO", nameHe: "סיוע/החלפת מצבר במקום", nameEn: "On-site battery assistance/replacement", priceModel: "VISIT_QUOTE", durationMinMinutes: 30, durationMaxMinutes: 60, trustTier: "C", launchStatus: "VALIDATE", notes: "Parts inventory complexity" },
  { code: "AUTO_TIRE", categoryCode: "MOBILE_AUTO", nameHe: "סיוע בפנצ'ר/גלגל", nameEn: "Flat tire assistance", priceModel: "VISIT_QUOTE", durationMinMinutes: 30, durationMaxMinutes: 60, trustTier: "C", launchStatus: "VALIDATE", notes: "" },
  { code: "TECH_HOME", categoryCode: "TECH_SUPPORT", nameHe: "טכנאי מחשבים/רשת/Wi-Fi עד הבית", nameEn: "Computer/network/Wi-Fi technician, at home", priceModel: "VISIT_QUOTE", durationMinMinutes: 60, durationMaxMinutes: 120, trustTier: "B", launchStatus: "VALIDATE", notes: "No credential/password harvesting" },
  { code: "MOVING_SMALL", categoryCode: "SMALL_MOVING", nameHe: "פריט בודד/הובלה קטנה", nameEn: "Single item / small move", priceModel: "DISTANCE_TIME", durationMinMinutes: null, durationMaxMinutes: null, trustTier: "C", launchStatus: "VALIDATE", notes: "Capacity/vehicle matching" },
  { code: "BEAUTY_LASH", categoryCode: "LASHES", nameHe: "טיפול ריסים עד הבית", nameEn: "Lash treatment, at home", priceModel: "FIXED", durationMinMinutes: 60, durationMaxMinutes: 120, trustTier: "C", launchStatus: "VALIDATE", notes: "" },
  { code: "FIT_PERSONAL", categoryCode: "FITNESS", nameHe: "אימון אישי בבית/בפארק", nameEn: "Personal training, at home/park", priceModel: "FIXED", durationMinMinutes: 45, durationMaxMinutes: 60, trustTier: "B", launchStatus: "VALIDATE", notes: "" },
];

/** Pilot market this seed activates for local/dev/staging demos only. */
export const PILOT_MARKET_CODE = "IL-PILOT-DEV";
