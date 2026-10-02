/**
 * VIRTUAL VENUES — a building is a metaphor for a candidate, never a place.
 *
 * ---------------------------------------------------------------------
 * THE IDEA THAT RESOLVED A REAL CONFLICT
 * ---------------------------------------------------------------------
 * Amit wanted a wide map you can move around in, showing all the
 * professionals who match your search. `CandidatePresence` forbids a
 * position — `lat?: never`, `lng?: never` — because before assignment a
 * professional's location is theirs, not ours to display. Those two things
 * looked irreconcilable: anyone standing on a street corner in a map is
 * making a claim about where they are.
 *
 * His own next sentence dissolved it:
 *
 *   "כשמוצא בעל מקצוע זה כאילו נותן פוקוס על המספרה הוירטואלית שלנו,
 *    ומשם מציע אופציות, או כמה מספרות שכל אחת היא אופציה אחרת."
 *
 * The candidate is not standing anywhere. The candidate is represented by
 * an illustrated shop that belongs to PRO NOW's world. Three barbershops on
 * screen are three choices, not three addresses — ChatGPT's words:
 * *"העסקים המאוירים אינם POI. הם האווטרים של ההיצע."*
 *
 * ---------------------------------------------------------------------
 * AND THE INVARIANT THAT SURVIVES A REAL MAP
 * ---------------------------------------------------------------------
 *     Geographic truth begins only after assignment.
 *
 * Before assignment the world may say WHO is available. It may never say
 * WHERE they are. After assignment the journey may carry a real position,
 * at whatever accuracy the data actually supports.
 *
 * The day a maps vendor exists, these venues do NOT get placed on map
 * coordinates. They become a Virtual Supply Layer with its own layout above
 * the map, moving with a parallax that makes plain they are not pinned to
 * the streets underneath.
 */

import type { CandidateMatchState } from "./living-map";
import { depthScale, districtCentre, venueSlots } from "./world-neighbourhood";
import type { DepartmentCode } from "./world-districts";

/** A point in the world's own 0..1 space. Composition, never geography. */
export interface NormalizedPoint {
  u: number;
  v: number;
}

/** Which illustrated business stands for which trade. */
export type VenueKind = "HAIR" | "AUTO" | "HOME" | "ELECTRICAL" | "PETS";

export interface VirtualVenue {
  /** The real candidate this venue is the avatar of. */
  candidateId: string;
  kind: VenueKind;
  /**
   * Where the venue sits in the composition.
   *
   * Seeded from the candidate id rather than randomised, so a venue does
   * not jump between renders — and derived from nothing else, so it can
   * never drift into being a position.
   */
  worldAnchor: NormalizedPoint;
  /**
   * How large this venue is drawn, where 1 is the nearest point on the
   * ring. Derived from depth alone (`plazaScale`), so a shop, a person and
   * a van standing the same distance away are drawn at the same size —
   * which is most of what makes a 3/4 world hold together.
   */
  scale?: number;
  state: CandidateMatchState;

  /*
   * THE INVARIANT, AS COMPILE ERRORS. A venue that could hold a coordinate
   * is a venue someone will eventually give a real one, and at that moment
   * an illustration becomes an address.
   */
  lat?: never;
  lng?: never;
  coordinates?: never;
  address?: never;
  poiId?: never;
  distanceMetres?: never;
}

/**
 * Lay venues out along a gentle arc across the district.
 *
 * Deterministic from the candidate ids, which matters for two reasons: the
 * composition is stable across renders, and the arrangement carries no
 * information — it is alphabetical-by-hash, not nearest-first. Anything
 * ordered by distance would be a distance claim drawn as a layout.
 */
export function layOutVenues(
  candidateIds: readonly string[],
  kind: VenueKind,
  state: CandidateMatchState = "ELIGIBLE",
  department: DepartmentCode = "HOME_URGENT"
): VirtualVenue[] {
  /*
   * ALONG A STREET, IN A NEIGHBOURHOOD.
   *
   * Two wrong versions preceded this one. First every venue sat on a single
   * horizontal line, which Amit called *"רק רחוב, מצומצם"*. Then they sat on
   * a ring around a plaza, and he rejected that too:
   *
   *     "גם זה כיכר מדי בשבילי. רוצה שיטיילו ברחובות ויהיו מגוון אפשרויות
   *      מכל סוג שבוחרים, לא שיראו את הכל."
   *
   * Both failed the same test: you could see the whole world at once. Now
   * the shops of one trade stand along that trade's street, spread far
   * enough apart that they do not all fit on screen — so choosing "hair"
   * puts you somewhere with barbershops in it and more of them further
   * along, rather than in front of the one barbershop.
   *
   * The order is positional and nothing else. A layout that put the
   * best-rated candidate nearest would be a ranking on screen at a moment
   * when nothing has been ranked, and every customer would read it as one.
   */
  const points = venueSlots(department, candidateIds.length);
  return candidateIds.map((candidateId, i) => {
    const worldAnchor = points[i] ?? districtCentre(department);
    return { candidateId, kind, worldAnchor, scale: depthScale(worldAnchor.v), state };
  });
}

/**
 * ---------------------------------------------------------------------
 * THE CAMERA IS THE NARRATOR
 * ---------------------------------------------------------------------
 * ChatGPT's best note in this round, and it reframes the whole screen:
 * *"אל תחשבו על המפה כעל background שהמשתמש גורר. המצלמה עצמה הופכת
 * למספרת הסיפור."*
 *
 *     WIDE      searching — the city is alive, nothing is attached to
 *               anyone yet
 *     DISTRICT  found — the camera moves to the trade's district and the
 *               venues wake one after another
 *     VENUE     choosing — one venue is being considered
 *     ROUTE     assigned — the camera pulls back out to follow the journey
 */
export type CameraShot = "WIDE" | "DISTRICT" | "VENUE" | "ROUTE";

export interface CameraState {
  shot: CameraShot;
  /** Where the camera is looking, in the world's own space. */
  focus: NormalizedPoint;
  /** 1 is the resting width. Larger is closer in. */
  zoom: number;
  /**
   * How long this move should take, when the default is wrong for it.
   *
   * The search sweep needs a shorter, repeating travel than a phase
   * change does, and a camera that takes its phase-transition time to
   * hop one shop along the street reads as syrup rather than as looking.
   */
  durationMs?: number;
}

/** The resting camera. Everything else is expressed as a move from here. */
export const WIDE_CAMERA: CameraState = { shot: "WIDE", focus: { u: 0.5, v: 0.5 }, zoom: 1 };

/**
 * Where the camera should be, given the phase and what is on screen.
 *
 * Pure, so the whole narrative can be tested without rendering anything —
 * and so the one rule that matters is checkable: the camera never moves
 * closer than it can justify. A venue shot with no venue chosen would be a
 * close-up of nothing.
 */
export function cameraFor(args: {
  shot: CameraShot;
  venues: readonly VirtualVenue[];
  chosenCandidateId?: string | null;
}): CameraState {
  const { shot, venues, chosenCandidateId } = args;

  if (shot === "WIDE" || venues.length === 0) return WIDE_CAMERA;

  if (shot === "VENUE") {
    const chosen = venues.find((v) => v.candidateId === chosenCandidateId);
    // No chosen venue means there is nothing to look at closely. Falling
    // back to the district is honest; inventing a target is not.
    if (chosen) return { shot: "VENUE", focus: chosen.worldAnchor, zoom: 1.6 };
    return { shot: "DISTRICT", focus: centreOf(venues), zoom: 1.25 };
  }

  if (shot === "ROUTE") return { shot: "ROUTE", focus: centreOf(venues), zoom: 1.1 };

  return { shot: "DISTRICT", focus: centreOf(venues), zoom: 1.25 };
}

function centreOf(venues: readonly VirtualVenue[]): NormalizedPoint {
  const u = venues.reduce((a, v) => a + v.worldAnchor.u, 0) / venues.length;
  const v = venues.reduce((a, x) => a + x.worldAnchor.v, 0) / venues.length;
  return { u, v };
}

/**
 * Everything wrong with a set of venues.
 *
 * The rules here are about meaning rather than layout: two venues for one
 * candidate would show the same person as two choices, and a venue for a
 * candidate the server never returned would be supply we invented.
 */
export function virtualVenueViolations(args: {
  venues: readonly VirtualVenue[];
  eligibleCandidateIds: readonly string[];
}): string[] {
  const v: string[] = [];
  const seen = new Set<string>();

  for (const venue of args.venues) {
    if (seen.has(venue.candidateId)) {
      v.push(`Two venues stand for candidate "${venue.candidateId}"; one person cannot be two choices.`);
    }
    seen.add(venue.candidateId);

    if (!args.eligibleCandidateIds.includes(venue.candidateId)) {
      v.push(`Venue for "${venue.candidateId}", who is not in the eligible set. A venue is supply, and supply is never invented.`);
    }

    const { u, v: w } = venue.worldAnchor;
    if (u < 0 || u > 1 || w < 0 || w > 1) {
      v.push(`Venue "${venue.candidateId}" is anchored at (${u}, ${w}); the world's space is 0..1.`);
    }
  }

  const chosen = args.venues.filter((x) => x.state === "CHOSEN");
  if (chosen.length > 1) {
    v.push(`${chosen.length} venues are CHOSEN. Exactly one candidate is assigned at a time.`);
  }

  return v;
}
