import { departmentCodeByServiceId } from "@pro-now/ui";
import { pilotServiceIdForDatabaseCode } from "@pro-now/types";

/**
 * The drawn professional of a trade, for "your photo — or your trade's
 * character" while joining (Amit, 2026-09-30). The demo's rule
 * (`onboardShopFor`, tools/design-preview/src/App.tsx), copied: each
 * department stands in front of its own shop, and an electrician is the
 * tool-belt technician rather than the plumber with a wrench.
 */
const DEPARTMENT_FIGURE: Readonly<Record<string, string>> = {
  HOME_URGENT: "home",
  APPLIANCES: "appliance",
  HOME_CARE: "care",
  BEAUTY: "hair",
  WELLNESS: "well",
  PETS: "pets",
  VEHICLE: "auto",
  LOGISTICS: "move",
  TECH: "tech",
  ODD_JOBS: "help",
  IMPROVEMENT: "build",
};

export function tradeCharacterFor(databaseCode: string | null | undefined): string {
  const pilotId = databaseCode ? pilotServiceIdForDatabaseCode(databaseCode) : null;
  const department = pilotId ? departmentCodeByServiceId[pilotId] : undefined;
  const figure = pilotId && /^svc-(electric|socket|alarm|solar)/.test(pilotId) ? "appliance" : (department && DEPARTMENT_FIGURE[department]) || "home";
  return `/world/character_${figure}_icon.webp`;
}
