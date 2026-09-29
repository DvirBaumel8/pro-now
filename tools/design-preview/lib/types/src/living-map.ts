/**
 * THE LIVING MAP — built to ChatGPT's v1 build spec, one to one.
 *
 * ---------------------------------------------------------------------
 * WHERE THIS CAME FROM
 * ---------------------------------------------------------------------
 * Four search visuals were built and rejected — a radar, converging dots, a
 * lattice of igniting nodes, and a bright isometric town. Then Amit said
 * the thing that made all four obsolete:
 *
 *   "רק לקחת את זה ואת האיורים האלה ולהלביש על המפה האמיתית של המיקום…
 *    אם מחפשים ספר שיהיה מספרות, אם משהו לרכב שיהיה מוסך."
 *
 * He does not want an imaginary world INSTEAD of a map. He wants the real
 * world to become PRO NOW's world: real streets and distances, with an
 * illustrated layer over them that changes with what was asked for.
 *
 * ---------------------------------------------------------------------
 * AND THE DANGER THAT ARRIVES WITH IT
 * ---------------------------------------------------------------------
 * The imaginary world was safe because it was imaginary. On real
 * geography, every drawing risks becoming a claim: a drawn garage is not a
 * garage, a drawn barbershop is not a business, and a professional's bubble
 * at a point is not that professional's address.
 *
 * So the layers are types, and the separation is enforced by what each type
 * CANNOT hold. ChatGPT's invariants, now literally in the code:
 *
 *     WorldDecoration    cannot consume provider location
 *     CandidatePresence  cannot consume lat/lng
 *     JourneyLayer       requires assignmentId
 *
 * `never` is doing real work below. A decorative building has
 * `coordinates?: never`, so a developer who tries to give one a position
 * gets a compile error rather than a plausible-looking screen.
 */

/**
 * ---------------------------------------------------------------------
 * LAYER 1 — THE MAP ADAPTER
 * ---------------------------------------------------------------------
 * There is no maps vendor yet; choosing one is a business decision
 * (/CLAUDE.md §4 — cost, licensing, privacy). ChatGPT's instruction was
 * exact and is why nothing here draws a street:
 *
 *   "אל תצייר כרגע אפילו רחוב אחד. בנה MapAdapter ריק + שכבת
 *    LivingWorldOverlay עצמאית… ביום שיש provider, מחליפים רק את שכבת
 *    הבסיס וה-overlay נשאר."
 *
 * `DEMO_WORLD` is therefore a first-class adapter, not a placeholder to be
 * cleaned up later, and it is marked illustrative so nothing downstream can
 * mistake it for geography.
 */
export type MapAdapterKind = "DEMO_WORLD" | "GOOGLE_MAPS" | "MAPBOX" | "APPLE_MAPS";

export interface MapAdapter {
  kind: MapAdapterKind;
  /**
   * False for every real provider, true for DEMO_WORLD. The UI reads this
   * to decide whether it is allowed to speak about streets at all.
   */
  illustrativeOnly: boolean;
  /** Real providers only. Null under DEMO_WORLD, by construction. */
  centre: { lat: number; lng: number } | null;
  radiusMetres: number | null;
  /** True once tiles have actually painted. Drives the crossfade. */
  ready: boolean;
}

export const DEMO_WORLD: MapAdapter = {
  kind: "DEMO_WORLD",
  illustrativeOnly: true,
  centre: null,
  radiusMetres: null,
  ready: true,
};

/**
 * ---------------------------------------------------------------------
 * LAYER 2 — WORLD DECORATION
 * ---------------------------------------------------------------------
 * The illustrated layer. Art, not data, and the type is built so it cannot
 * quietly become data.
 *
 * ChatGPT: *"אין שמות עסקים. אין 'מספרת משה'. אין POI pin. אין כתובת… אל
 * תכתוב HAIR / GARAGE / SHOP על הבניינים… הבניינים צריכים להיות מובנים
 * מהצורה ומהאיקונוגרפיה."*
 *
 * A building is understood from its shape and its one explaining object —
 * scissors and a barber's chair, a garage door and a raised car. Never from
 * a sign, because a sign on a building on a map is a business at a place.
 */
export type WorldTheme = "HAIR" | "AUTO" | "HOME" | "ELECTRICAL" | "PETS";

export type DecorationKind =
  | "WORKSHOP"
  | "HOUSE"
  | "BLOCK"
  | "TREE"
  | "STREET_LIGHT"
  | "VEHICLE";

export interface WorldDecoration {
  kind: DecorationKind;
  theme: WorldTheme;
  /** Grid slot for composition. Not a place. */
  gx: number;
  gy: number;
  height: number;
  /** How many windows are lit. Atmosphere, nothing more. */
  lit: number;

  /*
   * THE INVARIANTS, AS COMPILE ERRORS. Each of these is a thing a
   * well-meaning change would add, and each would turn the illustration
   * into a claim about the world.
   */
  businessName?: never;
  poiId?: never;
  coordinates?: never;
  lat?: never;
  lng?: never;
  address?: never;
}

/** Which world a department summons. One lookup, so nobody writes a switch. */
export function themeForDepartment(departmentCode: string): WorldTheme {
  switch (departmentCode) {
    case "BEAUTY":
    case "WELLNESS":
      return "HAIR";
    case "VEHICLE":
      return "AUTO";
    case "APPLIANCES":
      return "ELECTRICAL";
    case "PETS":
      return "PETS";
    default:
      return "HOME";
  }
}

/**
 * ---------------------------------------------------------------------
 * LAYER 3 — CANDIDATE PRESENCE
 * ---------------------------------------------------------------------
 * Real professionals only, and — ChatGPT again — *"Candidate bubbles
 * נמצאות בשכבת UI ולא במפה."* During the search there is no avatar driving
 * through streets, because before assignment a professional's position is
 * theirs, not ours to show (/docs/12-PRIVACY.md).
 *
 * So this type has no position of any kind. Not an approximate one, not a
 * blurred one. The renderer places bubbles on an orbit by index, which
 * carries no information and therefore cannot mislead.
 */
export type CandidateMatchState = "CHECKING" | "ELIGIBLE" | "RULED_OUT" | "CHOSEN";

export interface CandidatePresence {
  /** The server's id for a real eligible candidate. No placeholder form. */
  candidateId: string;
  displayNameHe: string;
  professionHe: string;
  /** Their approved photo. Null until one exists; never invented. */
  photoUri: string | null;
  state: CandidateMatchState;

  /*
   * REPUTATION, AND ONLY WHEN IT EXISTS.
   *
   * The match sheet shows "★ 4.9 (214) · 680 עבודות" in the reference, and
   * that row is worth having — it is the difference between a name and a
   * person you would let in. But /CLAUDE.md §3 forbids fabricating a trust
   * score, so every field here is nullable and the row is omitted rather
   * than filled in when the server has nothing to say.
   *
   * A professional with four jobs and no average is not a failure state. It
   * is a new professional, and the screen should say so instead of
   * rounding them up to a number.
   */
  ratingAverage: number | null;
  ratingCount: number;
  completedJobs: number | null;

  lat?: never;
  lng?: never;
  coordinates?: never;
  distanceMetres?: never;
}

/**
 * ---------------------------------------------------------------------
 * LAYER 4 — THE JOURNEY
 * ---------------------------------------------------------------------
 * Only after assignment, and this is the one place a real position is
 * allowed — which is why `assignmentId` is required rather than optional.
 *
 * THE RULE THAT KEEPS THE ANIMATION HONEST. ChatGPT:
 *
 *   "במקום teleport בין updates, ה-marker עושה interpolation ויזואלי
 *    מה-progress הקודם לחדש, אבל לעולם לא ממשיך לנחש מעבר ל-latest
 *    confirmed progress."
 *
 * The temptation is obvious: the marker glides beautifully if you keep it
 * moving at the professional's estimated speed between GPS updates. That
 * looks better and is a lie — the screen would be showing a position
 * nobody reported. So it animates TO each confirmed point over 600–900ms
 * and then idles there until the next one. A marker that pauses is telling
 * the truth about how often we hear from him.
 */
export interface JourneyFix {
  lat: number;
  lng: number;
  /** When the device actually reported this. Epoch ms. */
  observedAtMs: number;
  accuracyMetres: number;
  /** 0–1 along the route, from the routing provider. */
  routeProgress: number;
}

export interface Journey {
  /** Required. There is no journey without an assignment (§11). */
  assignmentId: string;
  /** The last position the server confirmed. Never extrapolated past it. */
  latestFix: JourneyFix | null;
  /** The fix before it, so the marker can animate between the two. */
  previousFix: JourneyFix | null;
}

/** How long the marker takes to travel to a newly confirmed fix. */
export const JOURNEY_INTERPOLATION_MS = 800;

/**
 * Whether the marker may move at all.
 *
 * It may only when there are two confirmed fixes to move between. With one
 * fix it sits still; with none it is not drawn. Movement without a new
 * observation would be the product guessing where someone is.
 */
export function journeyMayAnimate(j: Journey): boolean {
  return j.latestFix !== null && j.previousFix !== null;
}

/**
 * ---------------------------------------------------------------------
 * THE FOUR STATES
 * ---------------------------------------------------------------------
 * One mounted scene changing shape — not four screens. Amit's complaint
 * was that the transitions were not understandable, and building four
 * beautiful screens would be that same mistake with better art.
 */
export type LivingMapPhase =
  | "SEARCHING"
  | "CANDIDATES_FOUND"
  | "MATCH_REVEAL"
  | "ASSIGNED_ROUTE";

/** Transition durations, in one place so the scene cannot disagree with itself. */
export const LIVING_MAP_TIMING = {
  searchingToFound: 550,
  foundToReveal: 780,
  revealToRoute: 1050,
  candidateStaggerMs: 90,
} as const;

export interface LivingMapState {
  phase: LivingMapPhase;
  theme: WorldTheme;
  adapter: MapAdapter;
  /** Exactly what dispatch returned. Never padded to fill the ring. */
  candidates: CandidatePresence[];
  /** Present only in ASSIGNED_ROUTE. */
  journey: Journey | null;
}

/**
 * THE INVARIANT, AS A TESTABLE FUNCTION.
 *
 * Every rule here is easy to break with a change that looks harmless in
 * review — a third bubble added "so the ring looks better", a route drawn
 * before a provider exists — and each of those is a claim about the world.
 * An empty array means the scene may render.
 */
export function livingMapViolations(s: LivingMapState): string[] {
  const out: string[] = [];

  for (const c of s.candidates) {
    if (!c.candidateId.trim()) {
      out.push("candidate with no id — only real candidates may be drawn");
    }
  }

  const chosen = s.candidates.filter((c) => c.state === "CHOSEN");
  if (chosen.length > 1) out.push("more than one CHOSEN candidate — the match is singular");
  if (s.phase === "MATCH_REVEAL" && chosen.length !== 1) {
    out.push("MATCH_REVEAL without exactly one CHOSEN candidate");
  }
  if (s.phase === "SEARCHING" && chosen.length > 0) {
    out.push("a chosen candidate while still SEARCHING");
  }

  if (s.phase === "ASSIGNED_ROUTE") {
    if (s.journey === null) out.push("ASSIGNED_ROUTE without a journey");
    else if (!s.journey.assignmentId.trim()) {
      out.push("journey without an assignmentId — a route requires an assignment");
    }
    /*
     * A route on an illustrative adapter would be a drawn street pretending
     * to be a road, which is the exact thing the illustrated world exists
     * to avoid having to do.
     */
    if (s.adapter.illustrativeOnly && s.journey?.latestFix) {
      out.push("a real position on the DEMO world — there is no geography to place it in");
    }
  } else if (s.journey !== null) {
    out.push(`journey present in ${s.phase} — a journey belongs only to an assigned job`);
  }

  return out;
}

/**
 * The headline for CANDIDATES_FOUND — and the plural only when it is true.
 *
 * ChatGPT: *"'3 התאמות' מוצג רק אם באמת קיימות 3 eligible candidates."*
 * The plural is the temptation, because "we found 3" feels better than "we
 * found someone", and the third one is the cheapest lie in the product.
 */
/**
 * The facts line under a name, or nothing at all.
 *
 * Deliberately returns `null` rather than a cheerful fallback. "עדיין אין
 * דירוג" under a name is still a sentence about their reputation; an absent
 * line is not. The one thing worth saying about a new professional is said
 * separately, by `noReputationYetHe`, so a screen has to opt into it.
 */
export function matchFactsHe(c: Pick<CandidatePresence, "ratingAverage" | "ratingCount" | "completedJobs">): string | null {
  const parts: string[] = [];
  if (c.ratingAverage !== null && c.ratingCount > 0) {
    /*
     * `toFixed(1)` alone renders 4.85 as "4.8", because 4.85 is stored as
     * 4.84999…. It is a small thing and it is a professional's rating, so
     * the nudge makes half-up rounding actually happen.
     */
    const shown = (Math.round((c.ratingAverage + Number.EPSILON) * 10) / 10).toFixed(1);
    parts.push(`★ ${shown} (${c.ratingCount})`);
  }
  if (c.completedJobs !== null && c.completedJobs > 0) {
    parts.push(`${c.completedJobs} עבודות`);
  }
  return parts.length ? parts.join(" · ") : null;
}

/** What to say instead, when a screen chooses to say something. */
export const noReputationYetHe = "חדש ב-PRO NOW";

export function foundHeadlineHe(candidates: CandidatePresence[]): string | null {
  const n = candidates.filter((c) => c.state === "ELIGIBLE" || c.state === "CHOSEN").length;
  if (n <= 0) return null;
  return n === 1 ? "מצאנו התאמה זמינה" : `מצאנו ${n} התאמות זמינות`;
}

/**
 * The searching sub-line, which changes on REAL EVENTS ONLY.
 *
 * ChatGPT: *"לא carousel מזויף לפי timer."* Rotating reassurances on a
 * timer is the most common waiting-screen pattern and it is a small lie
 * told repeatedly: the words imply progress that the clock, not the
 * server, produced.
 */
export function searchingDetailHe(s: {
  checkingEligibility: boolean;
  anyCandidateSeen: boolean;
}): string {
  if (s.checkingEligibility || s.anyCandidateSeen) return "בודקים מי מתאים לבקשה שלך";
  return "בודקים זמינות באזור שלך";
}
