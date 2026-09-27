import type { DepartmentCode } from "./world-districts";
import { WORLD_DISTRICTS } from "./world-districts";

/**
 * THE CATEGORIES AS THE CUSTOMER THINKS OF THEM.
 *
 * ---------------------------------------------------------------------
 * WHY A SECOND LIST EXISTS AT ALL
 * ---------------------------------------------------------------------
 * `DepartmentCode` is the operational taxonomy: it decides dispatch
 * eligibility, which credentials a professional needs, and which district
 * of the world a job belongs to. It is correct, and it is also written in
 * our language rather than the customer's. HOME_URGENT, APPLIANCES,
 * ODD_JOBS and IMPROVEMENT are four separate operational worlds and one
 * single thought: *something in my flat needs a person.*
 *
 * Amit's note on the old home screen was that it read as an index —
 * *"חייב להעיף את דף הנחיתה של כל האפשרויות… חייב שיהיה יותר מזמין"* — and
 * then, when the answer swung too far the other way, the correction that
 * matters:
 *
 *     "לא לא, צריך שישאר נקי ופשוט, ולשלב אלמנטים וקטגוריות יותר טוב ממה
 *      שיש עכשיו. חייב שיהיה יותר מושך את העין."
 *
 * Not a catalogue of thirty services. Not one big empty question either.
 * A short, inviting set of ways in — which is only possible if the front
 * door groups by how somebody thinks at eleven at night, and the depth
 * opens afterwards.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS FILE MAY AND MAY NOT DO
 * ---------------------------------------------------------------------
 * It may REGROUP. It may not INVENT. Every entry maps onto departments
 * that already exist, and `customerCategoryViolations` fails if a category
 * claims a department that is not in `WORLD_DISTRICTS`, or if a department
 * ends up with no way in at all — a service nobody can reach from the home
 * screen is a service that does not exist, which is exactly the bug that
 * once made the whole describe-the-fault flow unreachable.
 *
 * Adding a real new service is still a decision for the catalogue
 * (`/docs/09b-SERVICE-CATALOG.md`) and for Amit, never for this file.
 */

export interface CustomerCategory {
  id: string;
  /** What the customer reads. Hebrew, because the trade is information. */
  labelHe: string;
  /** One short line, for the cases where the name is not enough on its own. */
  noteHe: string;
  /**
   * The operational departments behind this way in.
   *
   * More than one is the normal case, and it is the entire point: four
   * dispatch worlds behind one word the customer already uses.
   */
  departments: readonly DepartmentCode[];
  /**
   * Which district's character stands for this category.
   *
   * A character, never an icon. Amit: *"והכי חשוב: הקטגוריות עצמן יהיו
   * הדמויות שלנו, לא אייקונים גנריים."* A generic spanner says "category";
   * a person with a toolbag says "somebody is coming" — and that is the
   * product, not the decoration.
   */
  faceDepartment: DepartmentCode;
}

/**
 * The front door. Eight ways in, in the order they are offered.
 *
 * Eleven — one per field and per drawn professional — and not thirty. The order is by how often people
 * need them rather than alphabetically, because the first two are what most
 * people came for and everything below the fold is for everyone else.
 */
export const CUSTOMER_CATEGORIES: readonly CustomerCategory[] = [
  /*
   * ELEVEN, ONE FOR EACH OF OUR PROFESSIONALS (Amit, 2026-09-27: "בנינו עוד
   * דמויות, צריך להשתמש בכולם"). "לבית" held four fields behind one face,
   * so the appliance technician, the renovator and the helper were never
   * seen — and people left thinking the service was not there.
   */
  {
    id: "home",
    labelHe: "תיקונים בבית",
    noteHe: "נזילה, סתימה, חשמל, מנעולן",
    departments: ["HOME_URGENT"],
    faceDepartment: "HOME_URGENT",
  },
  {
    id: "appliances",
    labelHe: "מזגנים ומכשירים",
    noteHe: "מזגן, מקרר, מכונת כביסה",
    departments: ["APPLIANCES"],
    faceDepartment: "APPLIANCES",
  },
  {
    id: "beauty",
    labelHe: "ביוטי ושיער",
    noteHe: "תספורת, ציפורניים, איפור",
    departments: ["BEAUTY"],
    faceDepartment: "BEAUTY",
  },
  {
    id: "cleaning",
    labelHe: "ניקיון",
    noteHe: "ניקיון בית, אחרי אירוע, חלונות",
    departments: ["HOME_CARE"],
    faceDepartment: "HOME_CARE",
  },
  {
    id: "logistics",
    labelHe: "הובלות ומשלוחים",
    noteHe: "הובלה קטנה או גדולה, שליחות עכשיו",
    departments: ["LOGISTICS"],
    faceDepartment: "LOGISTICS",
  },
  {
    id: "vehicle",
    labelHe: "רכב",
    noteHe: "גרר, מצבר, פנצ׳ר",
    departments: ["VEHICLE"],
    faceDepartment: "VEHICLE",
  },
  {
    id: "pets",
    labelHe: "חיות",
    noteHe: "טיול, טיפוח, השגחה",
    departments: ["PETS"],
    faceDepartment: "PETS",
  },
  {
    id: "wellness",
    labelHe: "בריאות וכושר",
    noteHe: "אימון, עיסוי, טיפול",
    departments: ["WELLNESS"],
    faceDepartment: "WELLNESS",
  },
  {
    id: "tech",
    labelHe: "מחשבים וסלולר",
    noteHe: "תיקון, התקנה, גיבוי",
    departments: ["TECH"],
    faceDepartment: "TECH",
  },
  {
    id: "improvement",
    labelHe: "שיפוץ והתקנות",
    noteHe: "צבע, ריצוף, נגרות, תליית טלוויזיה",
    departments: ["IMPROVEMENT"],
    faceDepartment: "IMPROVEMENT",
  },
  {
    id: "oddjobs",
    labelHe: "עזרה ועבודות קטנות",
    noteHe: "הנדימן, זוג ידיים, שיעור פרטי",
    departments: ["ODD_JOBS"],
    faceDepartment: "ODD_JOBS",
  },
];

export function customerCategoryById(id: string): CustomerCategory | null {
  return CUSTOMER_CATEGORIES.find((c) => c.id === id) ?? null;
}

/** The category a department is reached through, for the reverse journey. */
export function categoryForDepartment(department: DepartmentCode): CustomerCategory | null {
  return CUSTOMER_CATEGORIES.find((c) => c.departments.includes(department)) ?? null;
}

/**
 * The character that stands for this category in the world and on the home
 * screen — the same person in both places, which is what makes tapping a
 * face and arriving in that face's district feel like one movement rather
 * than two screens.
 */
export function categoryFaces(category: CustomerCategory): {
  portraitAssetId: string;
  worldAssetId: string;
} {
  const district = WORLD_DISTRICTS[category.faceDepartment];
  return {
    portraitAssetId: district.characterPortraitAssetId,
    worldAssetId: district.characterWorldAssetId,
  };
}

/**
 * Everything wrong with the front door.
 *
 * The second check is the one that has already caught a real outage: a
 * department with no category is a set of services that exist in the
 * database, pass eligibility, have professionals online — and that no
 * customer can reach, because nothing on the home screen leads there.
 */
export function customerCategoryViolations(
  categories: readonly CustomerCategory[] = CUSTOMER_CATEGORIES
): string[] {
  const v: string[] = [];
  const seenIds = new Set<string>();
  const covered = new Set<DepartmentCode>();

  for (const c of categories) {
    if (seenIds.has(c.id)) v.push(`Two categories share the id "${c.id}".`);
    seenIds.add(c.id);

    if (c.departments.length === 0) {
      v.push(`"${c.labelHe}" leads nowhere: a way in with no departments behind it.`);
    }
    if (!c.departments.includes(c.faceDepartment)) {
      v.push(
        `"${c.labelHe}" wears the face of ${c.faceDepartment}, which is not one of its own departments.`
      );
    }
    for (const d of c.departments) {
      if (!WORLD_DISTRICTS[d]) v.push(`"${c.labelHe}" claims department ${d}, which has no district.`);
      if (covered.has(d)) v.push(`Department ${d} is reachable through more than one category.`);
      covered.add(d);
    }
    if (!/[֐-׿]/.test(c.labelHe)) {
      v.push(`"${c.id}" has no Hebrew label; only the PRO NOW wordmark stays in English.`);
    }
  }

  for (const d of Object.keys(WORLD_DISTRICTS) as DepartmentCode[]) {
    if (!covered.has(d)) {
      v.push(`Department ${d} cannot be reached from the home screen at all. A service nobody can open does not exist.`);
    }
  }

  return v;
}
