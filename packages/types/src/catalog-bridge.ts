/**
 * TWO CATALOGUES, AND THE ROPE BETWEEN THEM.
 *
 * ---------------------------------------------------------------------
 * WHAT IS ACTUALLY WRONG HERE
 * ---------------------------------------------------------------------
 * This project has two service catalogues that do not know about each
 * other:
 *
 *   - `pilot-catalog.ts` — what the customer sees. Forty-odd services
 *     with keywords, symptoms, photo prompts and matching modes. Ids like
 *     `svc-leak`, codes like `PLUMB_LEAK`. Every screen is built from it.
 *
 *   - the `services` table — what the server dispatches. Twenty-five
 *     rows seeded from `/docs/09b-SERVICE-CATALOG.md`, cuid ids, codes
 *     like `HOME_PLUMB_LEAK`.
 *
 * `POST /v1/jobs` looks a service up by DATABASE id, and the customer app
 * sends it the pilot catalogue's id. `svc-leak` is not a row in that
 * table and never has been, so **every job the customer app has ever
 * tried to create would have been refused** with SERVICE_NOT_FOUND. The
 * wiring is all there; the two halves speak different languages.
 *
 * ---------------------------------------------------------------------
 * WHY THIS FILE IS A ROPE AND NOT AN ANSWER
 * ---------------------------------------------------------------------
 * Which catalogue is the product's service list is a business decision —
 * `/CLAUDE.md §4` names "pilot service mix beyond the seeded candidates"
 * explicitly — and merging them the wrong way would throw away either the
 * customer-facing metadata or the dispatch spreadsheet.
 *
 * So this maps only where a pilot service and a database service are
 * plainly the same trade, and says nothing about the rest. A service with
 * no entry here cannot be requested against the server, and the caller is
 * told exactly that instead of being handed a service the customer did
 * not ask for — which is the bug `catalogAdapter.ts` already had to fix
 * once, when every category navigated to HOME_PLUMB_BLOCK.
 *
 * The gap is the point. `catalog-bridge.test.ts` fails if an entry names
 * a database code that does not exist, and `coverage()` reports how much
 * of the customer's catalogue can currently be ordered at all.
 *
 * Recorded as unconfirmed in `/docs/18-ROADMAP.md §Open decisions`.
 */

/** Pilot catalogue service id -> database service code. */
export const PILOT_TO_DATABASE_SERVICE_CODE: Readonly<Record<string, string>> = {
  // Plumbing — the database splits leaks from blockages the same way.
  "svc-leak": "HOME_PLUMB_LEAK",
  "svc-blockage": "HOME_PLUMB_BLOCK",

  // Electrical — a fault is a fault; installing a fitting is an install.
  "svc-electric": "HOME_ELECT_FAULT",
  "svc-socket": "HOME_ELECT_INSTALL",

  // The handyman is a handyman in both.
  "svc-handyman": "HOME_HANDYMAN",

  // Cleaning — the database's URGENT row is "a cleaner free today, now",
  // which is what the pilot's "ניקיון דחוף" asks for.
  "svc-clean": "CLEAN_URGENT",

  // Courier and small moves.
  "svc-courier": "COURIER_DOC",
  "svc-moving": "MOVING_SMALL",

  // Wellness and grooming at home.
  "svc-massage": "WELLNESS_MASSAGE60",
  "svc-trainer": "FIT_PERSONAL",
  "svc-nails": "BEAUTY_NAIL_MANICURE",

  // Dogs. The pilot has one walk; the database has two lengths, and the
  // shorter one is the one a customer asking for "a walk" means.
  "svc-dog-walk": "PET_WALK30",

  // Roadside.
  "svc-jump-start": "AUTO_BATTERY",
  "svc-flat-tyre": "AUTO_TIRE",

  // Makeup at home is one service in both.
  "svc-makeup": "BEAUTY_MAKEUP",

  /*
   * Carried into the database on 2026-09-22, codes and all, so these are
   * identity mappings rather than translations. They were the nine
   * services the customer catalogue called ACTIVE while the server had
   * never heard of them.
   */
  "svc-tap": "PLUMB_FIXTURE",
  "svc-lock": "LOCK_LOCKOUT",
  "svc-cylinder": "LOCK_CYLINDER",
  "svc-ac": "HVAC_REPAIR",
  "svc-fridge": "APPL_FRIDGE",
  "svc-washer": "APPL_WASHER",
  "svc-clean-reno": "CLEAN_RENOVATION",
  "svc-pest": "PEST_CONTROL",
  "svc-hands": "ASSIST_HANDS",

  // The database calls it a home technician for computers, network and
  // Wi-Fi; the pilot calls it a computer technician. Same visit.
  "svc-computer": "TECH_HOME",
};

/**
 * Services the customer can see but not yet order, because the database
 * has no equivalent row. Listed rather than inferred, so that adding one
 * to the database is a deliberate act and not a silent widening.
 */
export const PILOT_SERVICES_NOT_IN_DATABASE: readonly string[] = [
  /*
   * A haircut at home is one service in the pilot catalogue and two in
   * the database — `BEAUTY_HAIR_MEN` and `BEAUTY_HAIR_BLOWDRY`. Choosing
   * one of them for a customer who asked for neither is exactly the bug
   * `catalogAdapter.ts` had to remove, so it stays unmapped until
   * somebody decides whether the customer picks.
   */
  "svc-haircut",
  "svc-paint",
  "svc-furniture",
  "svc-tv",
  "svc-garden",
  "svc-glass",
  "svc-sealing",
  "svc-carpentry",
  "svc-tiling",
  "svc-drywall",
  "svc-curtains",
  "svc-alarm",
  "svc-solar",
  "svc-gas",
  "svc-tutor",
  "svc-pet-sit",
  "svc-pet-groom",

  /*
   * Trades the dispatch catalogue has never contained. Two of them are
   * not merely missing rows: a doctor and a vet carry licensing,
   * liability and duty-of-care questions that /CLAUDE.md §4 puts outside
   * this codebase entirely. They are in the customer catalogue because
   * somebody drew the screens for them; they are not orderable because
   * nobody has decided they should be.
   */
  "svc-doctor",
  "svc-vet",
  "svc-car-lockout",
  "svc-towing",
  "svc-phone-fix",
];

export interface BridgeResult {
  /** The database code to request, when there is one. */
  databaseCode: string | null;
  /** Why not, in a sentence a caller can show a person. */
  reasonHe: string | null;
}

export function databaseCodeForPilotService(pilotServiceId: string): BridgeResult {
  const code = PILOT_TO_DATABASE_SERVICE_CODE[pilotServiceId];
  if (code) return { databaseCode: code, reasonHe: null };
  return {
    databaseCode: null,
    reasonHe: "השירות הזה עדיין לא פתוח להזמנה — הוא קיים בקטלוג ולא במערכת השיגור.",
  };
}

/**
 * The server's catalogue, flattened to code -> database id.
 *
 * The response nests department -> category -> service, and a caller that
 * walks only the first category of each department resolves half the
 * catalogue to nothing — which a customer reads as "there are no
 * locksmiths in your area" rather than as a bug.
 */
export function serviceIdsByCode(catalog: {
  departments: ReadonlyArray<{
    categories: ReadonlyArray<{ services: ReadonlyArray<{ id: string; code: string }> }>;
  }>;
}): Map<string, string> {
  const map = new Map<string, string>();
  for (const department of catalog.departments) {
    for (const category of department.categories) {
      for (const service of category.services) {
        map.set(service.code, service.id);
      }
    }
  }
  return map;
}

export function coverage(allPilotServiceIds: readonly string[]): {
  mapped: number;
  unmapped: number;
  total: number;
} {
  const mapped = allPilotServiceIds.filter(
    (id) => PILOT_TO_DATABASE_SERVICE_CODE[id] !== undefined
  ).length;
  return { mapped, unmapped: allPilotServiceIds.length - mapped, total: allPilotServiceIds.length };
}
