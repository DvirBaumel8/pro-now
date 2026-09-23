import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CARD_REST, customerCategoryById, categoryForDepartment, liveAreaLineHe, DEMO_WORLD, WORLD_DISTRICTS, type CandidatePresence, type LivingMapPhase, type LivingMapState, themeForDepartment,
  ROAD_PLATE_ASSET_ID,
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP_HE,
  supportEmailUrl,
  supportHoursHe,
  whatsappUrl,
} from "@pro-now/types";
import {
  discover,
  emptyDiscoveries,
  GROUND_GRASS_ID,
  GROUND_MATERIAL_IDS,
  type DiscoveryState,
  type WorldGeo,
} from "@pro-now/types";
import { AVATARS, avatarById, formatMoney, greetingAt, money, screenKey, travelAssetFor, VISIT_ORDER, type AvatarChoice } from "@pro-now/types";
import { matchServicesByText } from "@pro-now/ui";
import { canSaveSession, clearSession, loadSession, saveSession, savedAgoHe } from "./session";
import { HAIR_DISCOVERY_IDS } from "@pro-now/ui";

import type { WorldAssetSources } from "@pro-now/ui";
import { worldSources } from "./worldSources";
import { City } from "./city/City";
import { PREVIEW_SPONSORS } from "./sponsors";

/**
 * WHAT THE PROFESSIONAL'S APP ACTUALLY CARRIES.
 *
 * One file. The customer's journey happens inside the world — choosing a
 * character, walking the street, arriving at a shop — so their app ships
 * the whole pack, about eight megabytes. The professional's shift screen
 * wants somewhere to BE, not a cast, so it ships the plate and nothing
 * else: `DistrictLayer` draws nothing for a district whose art is
 * missing and `WorldLife` skips a moment whose asset is absent, which
 * makes a pack of one file a complete and correct world.
 *
 * The gallery is given exactly that rather than its own richer pack. A
 * gallery that shows a better screen than the product is the two-worlds
 * problem that cost a whole night once already.
 */
/*
 * THE PROFESSIONAL'S APP CARRIES THE GROUND AND NOTHING ELSE.
 *
 * It has no shopfronts and no avatars — the city is a band at the top of
 * the shift screen, not a place anybody walks. What it does need is every
 * layer of the GROUND, and the material tiles were missed when they were
 * added: the plate arrived and the stone and the grass did not, so the
 * real street corridor had no pavement in it on that side only.
 */
const proWorldSources: WorldAssetSources = Object.fromEntries(
  [ROAD_PLATE_ASSET_ID, GROUND_GRASS_ID, ...GROUND_MATERIAL_IDS]
    .filter((id) => worldSources[id])
    .map((id) => [id, worldSources[id]!])
);

import { standInWorldSources } from "./standInAvatars";
import fixtureGeo from "../geo/fixture_grid.json";

import { ActiveJobCapsule, AddressPickerBody, AppHeader, AppMenuBody, AvatarPickerBody, IntroBody, customerDarkTheme, FocusSheet, ScreenTransition, ArrivalVerifyBody, CallsListBody, CAPSULE_HEIGHT, ChatBody, ConnectionBanner, CategoryBody, CustomerHomeBody, CustomerProfileBody, customerTheme, DescribeFaultBody, JobClosedBody, JobCompleteBody, MatchConfirmBody, NavGlyph, Persona, PhoneAuthBody, ProEarningsBody, ProJobBody, ProJobSettledBody, ProOfferBody, ProOnlineBody, ProPricingBody, ProProfileBody, ProQuoteBuilderBody, ProServicesBody, ProShiftBody, proTheme, ProVerificationBody, ProVerificationStepBody, QuoteApprovalBody, radii, scale, SearchingBody, ServiceDetailBody, SponsorShopBody, AdvertiseBody, StrollBody, Sheet, spacing, tint, TrackingBody, type as t, WelcomeBody } from "@pro-now/ui";
import type { JobMediaItem, LiveLocationState, MarkName, NavGlyphName, ProPricingRow } from "@pro-now/ui";
import type { AuthStage, ChatMessage, ConnectionState } from "@pro-now/ui";
import { canHandOffToMaps, categoryAsksForPerson, mapsHandoffUrl, buildIntakeBrief, pilotIntakeByService, pilotServiceById, readAvailability } from "@pro-now/types";
import type { IntakeAnswer, IntakeBriefLine, MapsPlatform, OfferCardView, PriceModel } from "@pro-now/types";
import type { JobState, ProPresenceState } from "@pro-now/types";

import { installBackGesture, pushBackEntry, setBackHandler } from "./backGesture";
import { matchFixture, offerFixture } from "./fixtures";
import {
  catalogHomeServices,
  catalogMatchRules,
  catalogServicePages,
  departmentCodeByServiceId,
  eligibilityFor,
  isPersonFit,
  matchReasons,
  demoCandidatesFor,
  personFitCandidates,
  photoPromptFor,
  pricingRowsFor,
  togglesFor,
} from "@pro-now/ui";
import { useCapture } from "./useCapture";
import {
  availabilitySnapshot,
  callsList,
  chatSeed,
  customerHistory,
  customerOpenCall,
  customerQuickReplies,
  earningDays,
  earningJobs,
  proQuickReplies,
  verificationSteps,
  homeRecent,
  jobDescription,
  jobMedia,
  jobSymptoms,
  savedAddresses,
  profileReviews,
  profileServices,
  profileWorkPhotos,
  quoteFixture,
  receiptLines,
  priceContextFixture,
} from "./screenFixtures";

/**
 * PRO NOW — the playable prototype.
 *
 * This is not the component gallery. The gallery answers "is each screen
 * well made"; this answers the only question that matters before build:
 * **does using it feel like one product?** So it navigates for real — taps
 * go somewhere, back goes back, and the two sides of the marketplace are a
 * switch away from each other.
 *
 * What it is NOT, and must never be mistaken for:
 *
 * - There is no server. Every number is a fixture, and the banner says so on
 *   first open. A prototype that quietly looks live is how a demo becomes a
 *   promise nobody agreed to (/CLAUDE.md §3, and the reason `dev` fixtures
 *   are labelled rather than hidden).
 * - The availability snapshot is a real `AreaAvailabilityView` read through
 *   the real `readAvailability`, so the freshness and UNKNOWN rules behave
 *   here exactly as they will in production — including going quiet.
 *
 * The state machine below mirrors /docs/07-JOB-STATE-MACHINE.md's happy path
 * closely enough to be worth arguing with, which is the point of a
 * prototype.
 */

/** "14:22" in the device's own locale-free form. */
function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * THE REQUEST THE CUSTOMER ACTUALLY MADE — carried across to the other side.
 *
 * Until now the two halves of the prototype were sealed off from each other:
 * the customer described a leak, and the professional then received a
 * hard-coded fixture about a different leak. Every individual screen was
 * right and the product it described did not exist, because the one thing a
 * marketplace IS — a thing someone said arriving at someone who can answer
 * it — was the part being faked.
 *
 * Now what the customer types, taps, records and photographs becomes the
 * offer card on the professional's phone. Switch sides and you are reading
 * your own words back. That is also the only honest way to review the
 * intake: three taps on the customer's screen either turn into something a
 * professional can act on, or they do not, and no amount of fixture writing
 * will tell you which.
 */
export interface LiveRequest {
  serviceId: string;
  serviceNameHe: string;
  serviceCode: string;
  markName: string;
  priceModel: PriceModel;
  intakeBrief: IntakeBriefLine[];
  textHe: string;
  photos: number;
  voiceSeconds: number | null;
  areaLabelHe: string;
  typicalMinutes?: [number, number] | null;
  createdAtMs: number;
}

type CustomerTab = "home" | "calls" | "card" | "menu";
type ProTab = "shift" | "earnings" | "verify" | "profile";
type Side = "customer" | "pro";
/** Before either side's app: the landing page and the sign-in. */
type Gate =
  | { name: "welcome" }
  | { name: "auth"; side: Side }
  /**
   * WHERE ARE WE, AND WHY AM I BEING ASKED THIS.
   *
   * Three slides between signing in and the app, before the avatar rather
   * than after it — because the avatar only makes sense once somebody
   * knows there is a street to walk down. Amit: *"איפה מסך ראשון הסבר על
   * האפליקציה לפני האווטאר? איך הוא יבין למה הוא נכנס?"*
   *
   * Both sides see it, with their own three: the customer's questions
   * from the pavement, the professional's from behind the counter.
   * Skipping is an answer and is recorded as one, exactly like the
   * avatar's — see `introSeen`.
   */
  | { name: "intro"; side: Side }
  /**
   * WHO WALKS DOWN THE STREET.
   *
   * Sits between signing in and the app, and only for a customer who has
   * not answered it before. Amit: *"בבניית פרופיל לקוח יבנה את האווטאר
   * שלו... פשוט ממש, שלוקח 20 שניות עד דקה, שלא ידלגו — לא חובה."*
   *
   * "Not mandatory" is why the ANSWER is recorded rather than the choice:
   * somebody who skipped has answered, and must not be asked again every
   * time they open the app. That is the difference between optional and
   * nagging.
   */
  | { name: "avatar" };

type CustomerRoute =
  | { name: "home" }
  | { name: "address" }
  /**
   * A CATEGORY IS A DESTINATION, NOT A REDIRECT.
   *
   * Tapping "לבית" used to open the first service behind it, so the app
   * announced that the customer had a blocked drain before they said
   * anything. Amit: *"למה אני לוחץ על בית ומכניס אותי ישר לאינסטלטור?"*
   * Now it goes somewhere: that trade's street, and the short question.
   */
  /**
   * THE STREET, AS ITS OWN PLACE.
   *
   * Amit: *"עכשיו לראות איך הוא במפה זז — אני לא רואה ולא מבין."* Walking
   * was built and then hidden inside the dispatch wait, reachable only by
   * somebody who had already sent a real request for help. It has a door
   * on the home screen now. See `StrollBody`.
   */
  | { name: "stroll" }
  /*
   * THE SAME STREET, WITH A CAMERA IN IT.
   *
   * A full-bleed WebGL scene rather than a react-native-web tree, so it
   * is returned above the app's own chrome rather than as a body. It
   * lives in the preview and not in `packages/ui` for the reason given
   * on `StrollBody.onEnterCity`: react-native cannot host WebGL without
   * `expo-gl`, and pretending otherwise by shipping it from the shared
   * package would put a component in there that only one of the three
   * consumers can render.
   */
  | { name: "city" }
  | { name: "category"; categoryId: string }
  | { name: "service"; serviceId: string }
  | { name: "describe"; serviceId: string; symptomsHe: string[] }
  | { name: "chat" }
  /**
   * ONE ROUTE FOR FOUR PHASES. Searching, found, reveal and route are the
   * same mounted Living Map scene changing shape — not four destinations.
   * Amit's note was that the transitions between cards made no sense, and
   * four routes would have kept producing four hard cuts however well each
   * one was drawn.
   */
  | { name: "living"; serviceId: string; phase: LivingMapPhase }
  /** PERSON_FIT only: the system proposes, the customer confirms. */
  | { name: "matchconfirm"; serviceId: string; index: number }
  /*
   * THE VISIT HAS MORE THAN ONE MOMENT IN IT.
   *
   * There were three stages and the last of them, "arrived", stood for
   * everything from the knock to the final handshake. So approving a
   * price returned to the same screen it was opened from, whose only way
   * forward was "המקצוען שלח הצעת מחיר" — the quote again. Amit:
   * *"אחרי אישור הצעת מחיר זה מחזיר אותי לפה. למה אני חוזר לאותו עמוד?
   * איפה עמוד סיכום עבודה? איך נגמרת עבודה בין לקוח למקצוען?"*
   *
   * "diagnosis" is the stretch between the knock and the price, "working"
   * is after it was approved, and "done" is the professional saying he
   * has finished and waiting for the customer to agree. Each one has its
   * own sentence on the screen (`jobProgressHe`) and its own next step,
   * so the visit ends somewhere instead of circling.
   */
  | { name: "tracking"; stage: "assigned" | "enroute" | "arrived" | "diagnosis" | "working" | "done" }
  /** The minute before the knock. See ArrivalVerifyBody. */
  | { name: "arrival" }
  | { name: "quote" }
  | { name: "complete" }
  /*
   * THE LAST SCREEN OF A JOB.
   *
   * Amit: *"חייב עוד מסך כלשהו אחרי המסך של החשבונית לפני שחוזרים
   * לתפריט."* Sending a review went straight to `home` — a stranger came
   * to your flat, did work, took money, you rated them, and the app put
   * you back at a grid of categories as though none of it had happened.
   * The professional has had `ProJobSettledBody` closing the same job for
   * months.
   */
  | { name: "closed"; ratingGiven: number | null }
  /*
   * INSIDE A SHOP THAT PAID TO BE IN THE STREET.
   *
   * Amit: *"לקוח בזמן ההמתנה למקצוען יכול להיכנס לחנויות ואז ייפתח
   * האתר של המותג."* `from` is the waiting stage it was entered from,
   * so closing the shop puts the customer back where they were rather
   * than at the top of the job.
   */
  /*
   * `from` is WHERE YOU WERE, not a stage of the job.
   *
   * It was `"assigned" | "enroute"` — the two tracking stages — so
   * entering Lust from the STREET and pressing back put you on the
   * tracking screen, which is not where you were and not a place you
   * asked to be. A shop is somewhere you step into from somewhere, and
   * leaving it returns you there.
   */
  | { name: "sponsor"; shopId: string; from: "assigned" | "enroute" | "stroll" }
  /** The page for a business owner who wants a shop of their own. */
  | { name: "advertise" };

/**
 * DEEP LINK TO ONE LIVING MAP PHASE — `?phase=SEARCHING`, `CANDIDATES_FOUND`,
 * `MATCH_REVEAL`, `ASSIGNED_ROUTE`, with an optional `&service=svc-leak`.
 *
 * The four phases are one scene that advances itself on a timer, which is
 * correct for a person using the app and useless for anyone reviewing it:
 * the found state is on screen for two seconds, so capturing it means
 * racing a clock. This pins the scene to a single phase and stops the
 * timer, so a review, a screenshot or the audit walker can look at one
 * phase for as long as it needs to. It is inert unless the parameter is
 * present, and the preview app is developer-only.
 */
const PHASES: readonly LivingMapPhase[] = [
  "SEARCHING",
  "CANDIDATES_FOUND",
  "MATCH_REVEAL",
  "ASSIGNED_ROUTE",
];
const PINNED: { phase: LivingMapPhase; serviceId: string } | null = (() => {
  const q = new URLSearchParams(window.location.search);
  const raw = q.get("phase");
  if (!raw) return null;
  const phase = PHASES.find((p) => p === raw.toUpperCase());
  if (!phase) return null;
  return { phase, serviceId: q.get("service") ?? "svc-leak" };
})();

/**
 * TEMPORARY — REVIEW CYCLE. Remove once the Living Map screenshots are taken.
 *
 * The artifact host does not forward a query string into the preview frame,
 * so `?phase=` works locally and not there. This walks the four phases on a
 * slow loop from boot so each one can be captured from the published
 * artifact without touching the app.
 */
const REVIEW_CYCLE = false;
const REVIEW_PHASE_MS = 9000;

/**
 * Every service page, derived from the catalogue.
 *
 * This used to be a two-entry map with `?? serviceDetailLeak` behind it,
 * which meant tapping "מזגן" opened a page headed "תיקון נזילה" — the app
 * confidently answering a question nobody asked. A catalogue that knows
 * every service can also produce a page for every service, so the fallback
 * is gone along with the bug.
 */
const SERVICE_PAGES = catalogServicePages;

/**
 * What the professional in this prototype has actually had verified.
 * Everything on the pro side — which services toggle on, what the
 * verification screen lists as blocked — is computed from this one array, so
 * the two screens cannot disagree about the same person.
 */
const DEMO_VERIFIED = ["IDENTITY", "BUSINESS", "LIABILITY_INSURANCE"] as const;
const proEligibility = eligibilityFor([...DEMO_VERIFIED]);
const proServices = togglesFor([...DEMO_VERIFIED]);

/**
 * The prototype has no server, so it re-stamps its fixture snapshot on a
 * timer — the same thing a real poll does. That keeps the freshness rule
 * running for real rather than disabling it: the counts are live because
 * something keeps refreshing them, and if this timer stopped, the screen
 * would go quiet exactly as production would.
 */
function useLiveSnapshot() {
  const [stampedAt, setStampedAt] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setStampedAt(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return useMemo(
    () => ({ ...availabilitySnapshot, computedAt: new Date(stampedAt).toISOString() }),
    [stampedAt]
  );
}

/**
 * The connection state, from the browser rather than from a toggle.
 *
 * `navigator.onLine` is genuinely wired here: switching the phone to
 * aeroplane mode changes the banner. When the connection returns the app
 * spends a moment in `reconnecting` before declaring itself online, because
 * "the radio is back" and "we have fresh data" are different facts and
 * collapsing them is how a stale ETA gets presented as current.
 */
function useConnection(): [ConnectionState, () => void] {
  const [state, setState] = useState<ConnectionState>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const goOffline = () => setState("offline");
    const goOnline = () => {
      setState("reconnecting");
      setTimeout(() => setState("online"), 1400);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const retry = useCallback(() => {
    setState("reconnecting");
    setTimeout(
      () => setState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online"),
      1200
    );
  }, []);

  return [state, retry];
}

export function App() {
  const { width, height } = useWindowDimensions();
  // The prototype fills whatever it is given: a phone at home-screen size,
  // or a centred phone-shaped frame on a laptop.
  const w = Math.min(430, width);
  const h = height;

  // A pinned phase (`?phase=`) is a request to look at one screen. Sending
  // the reviewer through welcome and sign-in first would defeat that.
  const [gate, setGate] = useState<Gate | null>(PINNED || REVIEW_CYCLE ? null : { name: "welcome" });
  /*
   * The last review session, so a reload comes back to the side you were
   * on with what you typed still there. Only inputs are restored — see
   * `session.ts` for why a live job never is.
   */
  const restored = useMemo(() => loadSession(), []);
  const [side, setSide] = useState<Side>(restored?.side ?? "customer");
  useEffect(() => {
    saveSession({ side });
  }, [side]);

  /*
   * ONE LISTENER, IN THE ONE COMPONENT THAT IS ALWAYS MOUNTED.
   *
   * It used to live inside `CustomerApp`, which is unmounted the moment
   * you switch to the professional side — so the phone's back button went
   * from "go back one screen" to "leave the prototype" at exactly the
   * point Amit was reviewing the professional flow. See `backGesture.ts`.
   */
  useEffect(() => installBackGesture(), []);

  /**
   * Switching sides is a navigation and is recorded as one.
   *
   * Back from the first professional screen returns to the customer side
   * rather than out of the page — which is what the gesture means when
   * the thing you did to get here was press a button on screen.
   */
  const switchTo = useCallback((s: Side) => {
    backSide.current = sideRef.current;
    setSide(s);
    pushBackEntry();
  }, []);
  const sideRef = useRef<Side>(restored?.side ?? "customer");
  const backSide = useRef<Side | null>(null);
  useEffect(() => {
    sideRef.current = side;
  }, [side]);

  /**
   * What happens when a side has run out of screens to go back through.
   *
   * If the customer pressed "מקצוען" to get here, back returns them; if
   * they opened the prototype on this side, there is genuinely nothing
   * behind and the page is allowed to close. Returning `false` is that
   * second answer, and it is deliberate: a web page you cannot back out
   * of is a worse bug than the one this fixes.
   */
  const backOut = useCallback(() => {
    const previous = backSide.current;
    if (previous === null) return false;
    backSide.current = null;
    setSide(previous);
    return true;
  }, []);

  /**
   * The avatar, and whether the question has been answered at all.
   *
   * Two values rather than one, because `null` is ambiguous on its own: it
   * is both "has not been asked" and "was asked and said no". Only the
   * second may skip the screen.
   */
  const [avatar, setAvatar] = useState<AvatarChoice>(restored?.avatar ?? null);
  const avatarAnswered = useRef(restored?.avatarAnswered ?? false);
  /*
   * Seen once, never again — the same rule as the avatar's answer. An
   * explanation that reappears every morning is not an explanation, it is
   * an obstacle.
   */
  const introSeen = useRef(restored?.introSeen ?? false);
  /**
   * Whether any avatar art has actually arrived.
   *
   * The whole screen is gated on this. See the comment at the call site
   * for why an empty picker is worse than no picker at all.
   */
  /*
   * ---------------------------------------------------------------------
   * WALKING WITH BORROWED FACES — AND WHY THIS NOW STARTS ON
   * ---------------------------------------------------------------------
   * The picker and the walk are both finished and both invisible until
   * the twenty-four avatar files land, because nothing in this product
   * draws a figure it does not have. That is right in the app. This lets
   * the GALLERY borrow the professional figures that have arrived, and it
   * is deliberately wrong in the way that matters most — they face the
   * camera and a real avatar is seen from behind — so nobody can mistake
   * it for the finished thing. See `standInAvatars.ts`.
   *
   * IT WAS OFF BY DEFAULT, AND THAT WAS THE WHOLE PROBLEM. Amit:
   * *"כל המשחקיות לא טובה, משחקיות."*
   *
   * Measured rather than guessed. Holding an arrow on the route screen
   * moves the world 111px to the east and nothing at all north, south or
   * west — the camera starts clamped against the bottom of the plate, so
   * most of a walk is invisible even when the figure IS moving. And there
   * was no figure: the only avatar image on the page was the PORTRAIT in
   * the header. So the game he was asked to judge was holding an arrow
   * and watching a street slide, with nobody on it.
   *
   * `standInAvatars.ts` names three things that keep this from becoming
   * the thing it stands in for: it is off by default, it is labelled, and
   * the figures face the wrong way on purpose. Two of the three are
   * untouched. The first one was costing the only person who reviews this
   * the one feature he keeps asking about — *"רוצה חוויה של טיול ברחוב…
   * שירגישו כמו VR"* — and a safeguard whose whole effect is that the
   * reviewer never sees the feature is protecting nobody.
   *
   * The control is still there, still says "הדגמה", and still turns it
   * off. This is the developer gallery, which /CLAUDE.md §8 is explicit
   * is not a shipping target; the apps have no such flag and still draw
   * nothing until the art lands.
   */
  /*
   * ---------------------------------------------------------------------
   * AND IT IS OFF AGAIN, BECAUSE THE REASON IT WAS ON HAS GONE
   * ---------------------------------------------------------------------
   * Amit, walking the street with an avatar he had just chosen: *"במשחק
   * זה הבעל מקצוע ולא האווטאר שבחרתי."*
   *
   * He is right, and the note above explains exactly how it happened:
   * this was turned on because with it off there was NOBODY on the
   * street at all — the twelve `avatar_NN_world_back` files have never
   * been drawn, so the walker had nothing to render and rendered
   * nothing. Borrowing a trade figure was better than an empty street.
   *
   * That is no longer the choice. `walkingFallbackFor` draws the chosen
   * avatar's PORTRAIT on a pin — a convention everybody reads as "you
   * are here", claiming nothing about a figure that has not been drawn —
   * so with the stand-in off the person walking the street is now HIS
   * FACE rather than nobody. Between somebody else's body and your own
   * face on a marker, the marker is the one that is true.
   *
   * The borrowed body stays one tap away, still labelled "הדגמה", for
   * judging the FEEL of walking — which is what it was added to answer
   * and the one question the pin cannot.
   */
  const [standIn, setStandIn] = useState(false);
  const art = standIn ? standInWorldSources : worldSources;

  /**
   * THE GROUND, SWITCHABLE, SO THE TWO CAN BE COMPARED.
   *
   * Amit: *"אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו והקוד שלנו
   * יושב עליה."* The word doing the work there is *ונראה* — see. Not
   * "replace the plate with a map", but show me our city standing on a
   * real one so I can judge whether it sits.
   *
   * A switch is therefore the deliverable, not a migration. Flip it and
   * the same walker, the same trades and the same camera are on real
   * street geometry; flip it back and they are on the painting. Anything
   * that only works on one of the two grounds shows up in one tap.
   *
   * The extract shipped here is a FIXTURE — `real: false`, watermarked on
   * the artwork, and refused by `plotViolations` as a real place. Amit's
   * own neighbourhood arrives by running `fetch-geo.mjs` on a machine
   * whose network is allowed to reach OpenStreetMap; this container's is
   * not, and that is policy rather than a fault.
   */
  const [realMap, setRealMap] = useState(false);
  const geo = realMap ? (fixtureGeo as unknown as WorldGeo) : null;

  const avatarArtReady = AVATARS.some((a) => art[a.portraitAssetId]);

  /** Sides this device has already signed in on. See `session.ts`. */
  const authedSides = useRef<Set<Side>>(new Set(restored?.authedSides ?? []));
  const enter = useCallback((s: Side) => {
    if (authedSides.current.has(s)) {
      setSide(s);
      setGate(null);
      return;
    }
    setGate({ name: "auth", side: s });
  }, []);
  /** The request in flight, shared by both sides. See `LiveRequest`. */
  const [liveRequest, setLiveRequest] = useState<LiveRequest | null>(null);
  /**
   * THE QUOTE, CROSSING BACK THE OTHER WAY.
   *
   * The professional's screen correctly refuses to offer a button at
   * WAITING_QUOTE_APPROVAL — it is the customer's move — but in the
   * prototype the two sides were sealed, so the move could never arrive and
   * the professional simply stopped. The same bug as the request, in the
   * opposite direction, and it is the one place in the whole flow where the
   * product deliberately blocks one person on another.
   */
  /*
   * THE QUOTE ITSELF CROSSES THE BRIDGE NOW, NOT JUST ITS TIMESTAMP.
   *
   * Amit: *"לפחות שהכל יהיה שקוף מול הלקוח שיופיע לו גם."* This held a
   * `sentAtMs` and nothing else, so the customer's approval screen
   * rendered a FIXTURE — lines written by nobody, for a job nobody had
   * looked at — while the professional's side pretended to have sent
   * something. The two sides were telling different stories about the
   * same quote.
   */
  /**
   * A request from the professional's side to show the customer their
   * waiting quote — see `onSeeAsCustomer`. One-shot: CustomerApp clears
   * it once it has navigated, so a later visit to that side does not
   * re-open a quote somebody already answered.
   */
  const [openQuoteOnce, setOpenQuoteOnce] = useState(false);

  /**
   * The same shape, for the door to the street: the picker was opened by
   * that door, so once a figure exists the street is where to go.
   *
   * A ref rather than state because the picker replaces the customer's
   * whole app while it is up — nothing re-renders on it, and a render
   * between the tap and the answer would be the only thing state buys.
   */
  const pickingForStroll = useRef(false);
  const [openStrollOnce, setOpenStrollOnce] = useState(false);
  /** The same one-shot for the other wait: "is the work finished?" */
  const [openCompletionOnce, setOpenCompletionOnce] = useState(false);

  /**
   * THE WAY BACK, AFTER THE CUSTOMER HAS ANSWERED.
   *
   * Amit, standing on the customer's screen having just approved a
   * quote: *"איך אני חוזר לצד המקצוען אחרי שאישרתי את ההצעה מצד
   * הלקוח?"* The crossing has always been in the header — but it is a
   * plain switch that is there on every screen of the app, saying
   * nothing about the fact that the ball is now back in the other
   * court. The professional's side got a labelled row for exactly this
   * moment; this is its mirror, and the loop is only closed with both.
   */
  const [returnToPro, setReturnToPro] = useState(false);

  /**
   * WHERE THE CUSTOMER WAS, ACROSS A CROSSING.
   *
   * The two sides are two apps: switching unmounts one and mounts the
   * other, so everything the customer's side held goes with it. That was
   * invisible while nobody crossed mid-job — and the moment a labelled
   * row invites you to cross and come back, it becomes "I approved a
   * quote, went to look at his screen, came back, and my job was gone".
   *
   * A ref rather than state: nothing up here should re-render because
   * the customer moved between their own screens.
   */
  const customerMemory = useRef<CustomerMemory | null>(null);

  /**
   * And the professional's, for exactly the same reason and a worse
   * symptom: his side held the JOB. Crossing to the customer to answer a
   * quote destroyed the call he was on, so coming back showed an empty
   * shift — the customer had approved a job that, on the other screen,
   * had never happened.
   */
  const proMemory = useRef<ProMemory | null>(null);

  const [pendingQuote, setPendingQuote] = useState<{
    sentAtMs: number;
    draft: { lines: { id: string; description: string; quantity: number; unitPriceMinorUnits: number; kind: string }[]; notesHe: string } | null;
  } | null>(null);
  const [quoteDecision, setQuoteDecision] = useState<"APPROVED" | "DECLINED" | null>(null);
  /**
   * THE CUSTOMER SAID THE WORK IS DONE.
   *
   * Amit: *"איפה המקצוען רואה את האישור עבודה?"* The professional's
   * side had nowhere for this to arrive, because nothing was waiting
   * for it — their own "סיימתי" used to settle the job by itself. It
   * crosses the same way the quote's answer does, through the shell,
   * which is this prototype's stand-in for the server.
   */
  const [completionConfirmed, setCompletionConfirmed] = useState(false);
  /**
   * THE PROFESSIONAL GAVE THE JOB BACK.
   *
   * Amit: *"אחרי שהוא רשם כן אני לוקח, הוא לא יכול להתחרט?"* He can, up
   * to the diagnosis — and the whole point is that the customer finds
   * out at once rather than by nobody arriving. So it crosses the same
   * way every other fact between the two sides does.
   */
  const [jobReleased, setJobReleased] = useState(false);
  /**
   * The prototype notice. It covers the address row while it is up, so it
   * takes itself away — a permanent overlay on the first thing a reviewer
   * wants to tap is a worse lie about the product than the one the notice is
   * there to prevent.
   */
  const [notice, setNotice] = useState(true);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(false), 6000);
    return () => clearTimeout(id);
  }, [notice]);
  const [connection, retryConnection] = useConnection();
  // Measured rather than assumed: the banner's height depends on how much
  // text the current state needs, and guessing it leaves a gap or a clip.
  const [bannerH, setBannerH] = useState(0);
  useEffect(() => {
    if (connection === "online") setBannerH(0);
  }, [connection]);

  return (
    <View style={[styles.root, { backgroundColor: side === "pro" ? proTheme.colors.bg : customerDarkTheme.colors.bg }]}>
      <View style={{ width: w, height: h, overflow: "hidden" }}>
        {/*
          * The banner sits IN the layout rather than over it. An overlay
          * would cover whichever header happened to be beneath it, and a
          * message about the data being wrong should not hide the data.
          */}
        <View onLayout={(e) => setBannerH(e.nativeEvent.layout.height)}>
          <ConnectionBanner
            state={connection}
            colors={side === "pro" ? proTheme.colors : customerTheme.colors}
            duringLiveJob
            onRetry={retryConnection}
          />
        </View>

        {/*
          * THE DOOR ANIMATES TOO.
          *
          * The three steps before the app — the landing page, the sign-in,
          * and the app itself opening — were a hard cut, and they are the
          * first three things anybody sees. Going in slides forward; the
          * back control on the sign-in slides back, because it is a back
          * and the model works that out on its own.
          *
          * `side: "gate"` here for all three, including the app, so that
          * opening the app reads as one move into it rather than as a
          * change of product. Once inside, each app runs its own
          * transitions and this one holds still.
          */}
        {/*
          * Sized and clipped, because the transition positions its child
          * absolutely: without this it would be laid out over the
          * connection banner above rather than under it.
          */}
        <View style={{ height: h - bannerH, overflow: "hidden" }}>
        <ScreenTransition
          transitionKey={
            gate?.name === "auth"
              ? `gate:auth:${gate.side}`
              : gate?.name === "welcome"
                ? "gate:welcome"
                : gate?.name === "intro"
                  ? "gate:intro"
                  : gate?.name === "avatar"
                    ? "gate:avatar"
                    : "gate:app"
          }
          screen={{ side: "gate", name: gate?.name === "auth" ? "auth" : gate?.name === "welcome" ? "welcome" : "home" }}
        >
        {gate?.name === "welcome" ? (
          <WelcomeBody
            worldSources={art}
            /*
             * Straight in if this device has signed in on that side before.
             * The welcome screen itself is kept — it is the screen Amit
             * reviews most and skipping it would make it unreachable
             * without a reset — but the phone number and the code are not
             * asked twice. The code screen accepts any six digits because
             * there is no server to check them against, so remembering that
             * it was passed claims nothing that was not already true.
             */
            onCustomer={() => enter("customer")}
            onProfessional={() => enter("pro")}
            width={w}
            height={h - bannerH}
          />
        ) : gate?.name === "auth" ? (
          <AuthGate
            side={gate.side}
            onDone={() => {
              authedSides.current.add(gate.side);
              saveSession({ authedSides: [...authedSides.current] });
              setSide(gate.side);
              /*
               * A customer who has never been asked meets the avatar once
               * — BUT ONLY IF THERE ARE FACES TO CHOOSE BETWEEN.
               *
               * I shipped this screen with twelve empty tiles reading
               * "דמות 1", "דמות 2", and Amit's answer was the right one:
               * *"זה רחוק מחווית משתמש שמחה. איפה הדמויות? נוראי."* A
               * screen whose entire content is choosing between faces,
               * with no faces, is a form.
               *
               * It is also me breaking our own rule. Everywhere else in
               * this product missing art renders NOTHING rather than a
               * placeholder, precisely so an unfinished thing never looks
               * like a finished one. A whole screen deserves the same
               * treatment: not asking is better than asking badly, and
               * the question appears by itself the day the faces land.
               *
               * A professional never sees it either: they are not the one
               * walking down the street.
               */
              /*
               * The explanation first, then the character. In that order,
               * because "which of these twelve people are you" is a
               * strange question until somebody has been told there is a
               * city to be one of them in.
               */
              if (!introSeen.current) {
                setGate({ name: "intro", side: gate.side });
                return;
              }
              const canAsk = gate.side === "customer" && !avatarAnswered.current && avatarArtReady;
              setGate(canAsk ? { name: "avatar" } : null);
            }}
            onBack={() => setGate({ name: "welcome" })}
            width={w}
            height={h - bannerH}
          />
        ) : gate?.name === "intro" ? (
          <IntroBody
            side={gate.side === "pro" ? "PRO" : "CUSTOMER"}
            sources={gate.side === "pro" ? proWorldSources : art}
            onDone={() => {
              introSeen.current = true;
              saveSession({ introSeen: true });
              const canAsk =
                gate.side === "customer" && !avatarAnswered.current && avatarArtReady;
              setGate(canAsk ? { name: "avatar" } : null);
            }}
            width={w}
            height={h - bannerH}
          />
        ) : gate?.name === "avatar" ? (
          <AvatarPickerBody
            value={avatar}
            sources={art}
            onChoose={(id) => {
              setAvatar(id);
              avatarAnswered.current = true;
              saveSession({ avatar: id, avatarAnswered: true });
              setGate(null);
              /*
               * If the picker was opened BY the door to the street, the
               * door finishes what it started. Without this the person
               * taps an invitation, answers a question, and lands on the
               * home screen — which is the picker's own behaviour
               * leaking out as "I pressed something and it went
               * somewhere else".
               */
              if (pickingForStroll.current) setOpenStrollOnce(true);
              pickingForStroll.current = false;
            }}
            /*
             * Skipping is an ANSWER, recorded as one. Treating it as a
             * deferral means asking again tomorrow, which is what makes an
             * optional step feel compulsory.
             */
            onSkip={() => {
              setAvatar(null);
              avatarAnswered.current = true;
              saveSession({ avatar: null, avatarAnswered: true });
              setGate(null);
              // Skipped, so there is still nobody to walk: no street.
              pickingForStroll.current = false;
            }}
            width={w}
            height={h - bannerH}
          />
        ) : side === "customer" ? (
          <CustomerApp
            width={w}
            height={h - bannerH}
            onSwitch={() => switchTo("pro")}
            onBackOut={backOut}
            onSendRequest={setLiveRequest}
            pendingQuote={pendingQuote}
            openQuoteOnce={openQuoteOnce}
            onQuoteOpened={() => setOpenQuoteOnce(false)}
            openCompletionOnce={openCompletionOnce}
            onCompletionOpened={() => setOpenCompletionOnce(false)}
            jobReleased={jobReleased}
            onReleaseSeen={() => setJobReleased(false)}
            /*
             * REOPENING THE PICKER, WHICH ONLY THE SHELL CAN DO.
             *
             * Skipping the avatar is a real answer and it is the one most
             * people give — so the door to the street, which needs a
             * figure to walk, disappeared for most people. It stays now
             * and picks a figure on the way; this is the only way back
             * into the picker, because the picker is a gate over the whole
             * app rather than a screen inside it.
             *
             * Undefined while the portraits have not arrived: a picker
             * with nothing in it is worse than no door.
             */
            onPickAvatar={
              avatarArtReady
                ? () => {
                    pickingForStroll.current = true;
                    setGate({ name: "avatar" });
                  }
                : undefined
            }
            openStrollOnce={openStrollOnce}
            onStrollOpened={() => setOpenStrollOnce(false)}
            memory={customerMemory}
            onConfirmCompletion={() => {
              setCompletionConfirmed(true);
              setReturnToPro(true);
            }}
            returnToPro={returnToPro}
            onReturnToPro={() => {
              setReturnToPro(false);
              switchTo("pro");
            }}
            onQuoteDecision={(d) => {
              setQuoteDecision(d);
              setPendingQuote(null);
              /*
               * Either answer puts the professional back to work — an
               * approval starts the job, a decline sends him back to the
               * diagnosis with the customer still standing there. So the
               * way back is offered for both.
               */
              setReturnToPro(true);
            }}
            avatar={avatar}
            art={art}
            geo={geo}
            realMap={realMap}
            onToggleRealMap={() => setRealMap((r) => !r)}
            standIn={standIn}
            onToggleStandIn={() => {
              const next = !standIn;
              setStandIn(next);
              /*
               * Re-ask only if there is nothing to walk as. The faces are
               * real now and the question arrives by itself after
               * sign-in, so re-opening the picker here would take a
               * choice somebody already made and put it back in front of
               * them.
               */
              if (!avatar) {
                avatarAnswered.current = false;
                setGate({ name: "avatar" });
              }
            }}
          />
        ) : (
          <ProApp
            geo={geo}
            width={w}
            height={h - bannerH}
            onSwitch={() => switchTo("customer")}
            onBackOut={backOut}
            request={liveRequest}
            onTakeRequest={() => setLiveRequest(null)}
            pendingQuote={pendingQuote}
            sentQuoteLines={pendingQuote?.draft?.lines ?? null}
            sentQuoteNotes={pendingQuote?.draft?.notesHe ?? ""}
            quoteDecision={quoteDecision}
            onSendQuote={(draft) => {
              setQuoteDecision(null);
              setPendingQuote({ sentAtMs: Date.now(), draft });
            }}
            onQuoteSeen={() => setQuoteDecision(null)}
            /*
             * Crosses to the customer and asks for the quote. The shell
             * owns the side, so it is the only place that can do both —
             * and `openQuote` is a one-shot flag rather than a route,
             * because CustomerApp owns its own routing and the shell
             * must not reach into it.
             */
            memory={proMemory}
            onReleaseJob={() => setJobReleased(true)}
            /*
             * Carried across from the picker, which runs on the other
             * side of the app. `art` rather than `worldSources` so the
             * gallery's borrowed figures work here too.
             */
            customerFaceUri={(() => {
              const id = avatar ? AVATARS.find((a) => a.id === avatar)?.portraitAssetId : null;
              const src = id ? art[id] : undefined;
              return src && typeof src === "object" && "uri" in src && typeof src.uri === "string"
                ? src.uri
                : null;
            })()}
            completionConfirmed={completionConfirmed}
            onCompletionSeen={() => setCompletionConfirmed(false)}
            onSeeAsCustomer={(what) => {
              /*
               * Two waits, two destinations. The quote is a screen of its
               * own; the confirmation that the work is done lives on the
               * tracking panel, at the stage that asks for it.
               */
              if (what === "completion") setOpenCompletionOnce(true);
              else setOpenQuoteOnce(true);
              switchTo("customer");
            }}
          />
        )}
        </ScreenTransition>
        </View>

        {/*
          * THE REVIEW CONTROL FOR THE WALK.
          *
          * Only while the real avatar art is missing, because the moment
          * it lands this is not a choice anybody should be offered — it is
          * just a worse version of the thing.
          *
          * It says what it is before it says what it does, like every
          * demo control here. A demo control that can be mistaken for the
          * product is worse than no demo control.
          */}
        {notice && !gate ? (
          // Offset by the banner, which is in the layout above this overlay.
          // Without it the prototype notice lands on top of the message
          // saying the data may be wrong — the less important of the two.
          <Pressable style={[styles.notice, { top: bannerH + spacing.lg }]} onPress={() => setNotice(false)}>
            <Text style={styles.noticeText}>
              אב־טיפוס. אין שרת — כל הנתונים הם דוגמאות. גע כדי לסגור.
            </Text>
            {/*
              * WHAT IS REMEMBERED, SAID WHERE IT MATTERS.
              *
              * Amit asked when the prototype would start saving what he
              * chooses so a flow can be tested for real. It does now — and
              * the second line is not decoration: a reviewer who does not
              * know their answers are kept will assume a stale address is
              * a bug, and one who thinks EVERYTHING is kept will expect a
              * job to still be running. Both sentences are needed.
              */}
            {canSaveSession() ? (
              <Text style={styles.noticeSub}>
                {savedAgoHe(restored, Date.now()) ?? "מה שתבחרו ותכתבו יישמר במכשיר הזה"} · קריאה
                פעילה לא נשמרת
              </Text>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Sign-in, with the timers and the failure it will have in production.
 *
 * The resend countdown and the rejected-code path are here rather than
 * skipped, because they are most of what sign-in actually feels like: a
 * screen that only ever shows the happy path teaches nobody whether the
 * unhappy one is survivable.
 */
function AuthGate({
  side,
  onDone,
  onBack,
  width,
  height,
}: {
  side: Side;
  onDone: () => void;
  onBack: () => void;
  width: number;
  height: number;
}) {
  const [stage, setStage] = useState<AuthStage>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const sendCode = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setStage("code");
      setResendIn(30);
    }, 700);
  };

  return (
    <PhoneAuthBody
      side={side}
      stage={stage}
      phone={phone}
      onChangePhone={setPhone}
      code={code}
      onChangeCode={(v) => {
        setCode(v.replace(/\D/g, "").slice(0, 6));
        setError(null);
      }}
      resendInSeconds={resendIn}
      errorHe={error}
      busy={busy}
      onSubmitPhone={sendCode}
      onSubmitCode={() => {
        // A rejected code is a normal event and the screen has to survive it,
        // so one value is deliberately refused.
        if (code === "000000") {
          setError("הקוד לא נכון. אפשר לנסות שוב או לבקש קוד חדש.");
          return;
        }
        setBusy(true);
        setTimeout(() => {
          setBusy(false);
          onDone();
        }, 600);
      }}
      onResend={() => setResendIn(30)}
      onBack={() => (stage === "code" ? setStage("phone") : onBack())}
      width={width}
      height={height}
    />
  );
}

// ---------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------

/**
 * WHAT THE CUSTOMER'S SIDE MUST NOT FORGET WHEN IT IS NOT ON SCREEN.
 *
 * The mirror of `ProMemory`, for the same reason: the two sides are two
 * apps and crossing unmounts one of them. What is kept is what a person
 * would be startled to lose — where they were, and what they approved.
 *
 * The approved quote is kept as LINES and not only as a total, because
 * the closing screen tells them what was done in the professional's own
 * words, and those words exist nowhere else once the pending quote has
 * been answered and cleared.
 */
interface CustomerMemory {
  route: CustomerRoute;
  approvedTotalMinor: number | null;
  approvedLines: readonly { id: string; descriptionHe: string; totalMinorUnits: number }[] | null;
}

function CustomerApp({
  width,
  height,
  onSwitch,
  onBackOut,
  onSendRequest,
  pendingQuote,
  openQuoteOnce,
  onQuoteOpened,
  openCompletionOnce,
  onCompletionOpened,
  jobReleased,
  onReleaseSeen,
  onPickAvatar,
  openStrollOnce,
  onStrollOpened,
  memory,
  returnToPro,
  onReturnToPro,
  onConfirmCompletion,
  onQuoteDecision,
  avatar,
  art,
  standIn,
  onToggleStandIn,
  geo,
  realMap,
  onToggleRealMap,
}: {
  width: number;
  height: number;
  onSwitch: () => void;
  /**
   * Called when this side has no screen left behind it. Returns true if
   * the gesture was used to leave for the other side, false to let the
   * browser close the page. See `backGesture.ts`.
   */
  onBackOut: () => boolean;
  onSendRequest: (r: LiveRequest) => void;
  /** A quote the professional sent and the customer has not answered. */
  pendingQuote: {
    sentAtMs: number;
    draft: { lines: { id: string; description: string; quantity: number; unitPriceMinorUnits: number; kind: string }[]; notesHe: string } | null;
  } | null;
  /**
   * Set when the professional asked, from their own side, to see this
   * quote as the customer — the review control on their demo row. It is
   * a request rather than a route: this component owns its routing, and
   * the shell must not reach into it.
   */
  openQuoteOnce: boolean;
  /** Cleared as soon as we have acted on it, so it fires exactly once. */
  onQuoteOpened: () => void;
  /** The professional is waiting to be told the work is finished. */
  openCompletionOnce?: boolean;
  onCompletionOpened?: () => void;
  /** The professional gave the job back and the customer has to be told. */
  jobReleased?: boolean;
  onReleaseSeen?: () => void;
  /**
   * Reopens the avatar picker. Undefined while its art has not arrived.
   * The picker is a gate above this component, so this is the only way
   * somebody who skipped it can answer again.
   */
  onPickAvatar?: () => void;
  /** A figure was just chosen because the street was asked for. */
  openStrollOnce?: boolean;
  onStrollOpened?: () => void;
  /**
   * Where this side was the last time it was mounted — see the shell.
   * Held above because crossing to the professional unmounts all of this.
   */
  memory?: React.MutableRefObject<CustomerMemory | null>;
  /** The customer has answered a quote, so the professional has a move. */
  returnToPro?: boolean;
  onReturnToPro?: () => void;
  /** The customer agreed the work is finished. See `completionConfirmed`. */
  onConfirmCompletion?: () => void;
  onQuoteDecision: (d: "APPROVED" | "DECLINED") => void;
  /**
   * Who the customer walks the street as. Owned above, because the picker
   * runs before this component exists — and `null` is the answer for
   * everybody who skipped it, which the whole app has to handle.
   */
  avatar: AvatarChoice;
  /** The art that has arrived — or, in review, the borrowed stand-ins. */
  art: WorldAssetSources;
  /** Whether the walking figures are currently borrowed. */
  standIn: boolean;
  onToggleStandIn: () => void;
  geo: WorldGeo | null;
  realMap: boolean;
  onToggleRealMap: () => void;
}) {
  const snapshot = useLiveSnapshot();
  /**
   * ONE reading, shared by the home grid and by every service page opened
   * from it. Two independent reads of the same snapshot can land either side
   * of the freshness boundary and disagree on screen.
   */
  const supply = readAvailability(snapshot, Date.now());
  const [tab, setTab] = useState<CustomerTab>("home");
  const capture = useCapture();
  /*
   * The last review session, read once. Everything seeded from it below is
   * an INPUT the person supplied; nothing about a live job is restored.
   */
  const saved = useMemo(() => loadSession(), []);
  const [faultText, setFaultText] = useState(saved?.faultText ?? "");
  const [chat, setChat] = useState<ChatMessage[]>(chatSeed);
  const [sheet, setSheet] = useState<null | "call" | "safety" | "payment" | "released">(null);
  /**
   * THE HANDOFF, RECORDED RATHER THAN PERFORMED.
   *
   * Pressing "לאתר של Lust" in the shipping app hands the URL to the
   * platform's own browser and PRO NOW is done with it. In this gallery
   * it is written down instead: a developer tool that navigates a review
   * session away to a commercial site — mid-walk, mid-screenshot — is a
   * surprise, and the thing worth SHOWING is that the app announced the
   * handoff before making it, which is on the screen either way.
   */
  const [sponsorHandoff, setSponsorHandoff] = useState<string | null>(null);
  /** Same, for the advertiser lead: shown back, never posted anywhere. */
  const [advertiseLead, setAdvertiseLead] = useState<string | null>(null);

  /*
   * WHICH SHOP IS OPEN.
   *
   * Amit: *"כל חנות כזו בעצם תהיה הכרטיס, שם יקפוץ פרופיל המקצוען."* The
   * venue was decorative until now — a building you cannot open is a
   * picture of a choice rather than a choice.
   */
  const [openVenue, setOpenVenue] = useState<string | null>(null);
  /**
   * A REQUEST TO TRAVEL, from the card back down to the street.
   *
   * Amit: *"ואם אני עושה דלג אז חוזר לרחוב ועובר לחנות הבאה."* The card
   * is above the map, so skipping has to ask the map to make the same
   * move a tap on a shopfront makes: out, along, in.
   */
  const [enterVenue, setEnterVenue] = useState<string | null>(null);
  /** The total the customer actually approved, for the panel to say back. */
  const [approvedTotalMinor, setApprovedTotalMinor] = useState<number | null>(
    memory?.current?.approvedTotalMinor ?? null
  );
  /** The lines of that quote, for the closing screen's account of the work. */
  const [approvedLines, setApprovedLines] = useState<CustomerMemory["approvedLines"]>(
    memory?.current?.approvedLines ?? null
  );

  /**
   * The professional's own lines, shaped as the quote the screen renders.
   *
   * The total is summed here for DISPLAY only. In the product the server
   * builds it with `buildQuoteVersion` and binds it to a version hash
   * that the customer approves — so if the two ever disagreed the
   * server's would be the one that counts, and this screen has always
   * been careful to render the total it was GIVEN rather than one it
   * worked out. That stays true: this is the caller doing the sum, not
   * the screen.
   */
  const writtenQuote = useMemo(() => {
    const draft = pendingQuote?.draft;
    if (!draft || draft.lines.length === 0) return null;
    const lineItems = draft.lines.map((l, i) => ({
      id: `w${i}`,
      quoteId: "quote_written",
      description: l.description,
      quantity: l.quantity,
      unitPriceMinorUnits: l.unitPriceMinorUnits,
      kind: l.kind as "LABOR" | "MATERIALS" | "OTHER",
    }));
    return {
      ...quoteFixture,
      id: "quote_written",
      lineItems,
      notes: draft.notesHe || quoteFixture.notes,
      totalMinorUnits: draft.lines.reduce(
        (sum, l) => sum + Math.round(l.quantity * l.unitPriceMinorUnits),
        0
      ),
    };
  }, [pendingQuote]);

  /*
   * Seeded from the last review session, so a reload lands where you were
   * with what you typed still in the boxes. See `session.ts` for the line
   * between "what the person chose" (saved) and "what the server owns"
   * (never saved).
   */
  const [addressId, setAddressId] = useState<string>(saved?.addressId ?? "addr_home");
  const [live, setLive] = useState<LiveLocationState>({ status: "idle" });

  const chosen = savedAddresses.find((a) => a.id === addressId) ?? savedAddresses[0]!;
  // The label on the home screen says whose door this is. Forgetting that a
  // call is for someone else is how a professional ends up at the wrong flat.
  const addressLabel = chosen.forSomeoneElseNameHe
    ? `${chosen.labelHe} · עבור ${chosen.forSomeoneElseNameHe}`
    : chosen.formattedHe.split(" · ")[0] ?? chosen.labelHe;

  /*
   * A real permission request, not a decoration. If the device refuses or
   * cannot answer, the screen says so — it never invents a position.
   */
  const askLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLive({ status: "unavailable" });
      return;
    }
    setLive({ status: "asking" });
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLive({
          status: "ready",
          // A coordinate is not a street. Turning one into an address needs a
          // geocoding vendor, which is still an open decision (CLAUDE.md §4),
          // so the honest thing to show is the position itself.
          coarseLabelHe: `מיקום נוכחי · ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
        }),
      (err) => setLive({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 }
    );
  }, []);
  const [route, setRoute] = useState<CustomerRoute>(
    /*
     * A pin or a review cycle is an instruction about where to open and
     * wins; otherwise a crossing back lands where it left off rather
     * than on the home screen. See `memory` in the shell.
     */
    PINNED
      ? { name: "living", serviceId: PINNED.serviceId, phase: PINNED.phase }
      : REVIEW_CYCLE
        ? { name: "living", serviceId: "svc-leak", phase: "SEARCHING" }
        : (memory?.current?.route ?? { name: "home" })
  );
  /**
   * The intake answers live in the app, not in the screen, because they
   * travel: they are what the professional's offer card is built from two
   * screens later. Keyed by question id, last answer wins.
   */
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswer[]>(
    (saved?.intakeAnswers as IntakeAnswer[] | undefined) ?? []
  );
  /**
   * A sentence typed on the category screen that matched nothing there.
   *
   * It comes back to the home screen's field rather than being dropped, so
   * the full catalogue gets a chance to answer it. Held here because it
   * travels between two screens.
   */
  const [homeQuery, setHomeQuery] = useState<string | null>(null);
  /** The service this journey is about, kept after the route moves on. */
  const [lastRequestedId, setLastRequestedId] = useState<string | null>(saved?.lastServiceId ?? null);
  /**
   * The name of whatever the customer is actually tracking.
   *
   * Four screens after the request — searching, tracking, quote, complete —
   * were hard-coded to "תיקון נזילה בברז". Ask for a fridge and the app
   * spent the next four screens telling you a plumber was on the way about a
   * tap. Every screen was individually correct; the journey was fiction.
   */
  const trackedService = useMemo(() => {
    const id =
      route.name === "service" || route.name === "describe" || route.name === "living"
        ? route.serviceId
        : lastRequestedId;
    const page = id ? SERVICE_PAGES[id] : undefined;
    return {
      // Carried so the tracking screen knows which street the professional
      // comes down and what they are driving.
      id: id ?? null,
      nameHe: page?.nameHe ?? "תיקון נזילה בברז",
      mark: (page?.mark ?? "plumbing") as MarkName,
      /*
       * And what was agreed about money before anybody set off. The
       * tracking panel's one money line is derived from this and the
       * job's state — a fixed-price service must never be told a quote
       * is coming, because none is.
       */
      price: page?.price ?? null,
    };
  }, [route, lastRequestedId]);

  /*
   * WRITE WHAT WAS CHOSEN, NEVER WHAT IS LIVE.
   *
   * The address, the text, the answers and the last service asked about —
   * inputs, all of them. The route is deliberately absent: restoring
   * "מקצוען בדרך אליך · 9 דקות" after a night away would be fabricating a
   * live job, which is the same class of mistake as inventing availability
   * and more convincing because the reviewer created it themselves.
   */
  useEffect(() => {
    saveSession({
      side: "customer",
      addressId,
      faultText,
      intakeAnswers,
      lastServiceId: lastRequestedId,
    });
  }, [addressId, faultText, intakeAnswers, lastRequestedId]);

  const answerIntake = useCallback((a: IntakeAnswer) => {
    setIntakeAnswers((prev) => [...prev.filter((p) => p.questionId !== a.questionId), a]);
  }, []);
  const [elapsed, setElapsed] = useState(0);
  /*
   * The waiting game is OPT-IN and off by default. It is a hypothesis test,
   * not a feature: does anyone want to touch the world while they wait?
   * Defaulting it on would answer the question by forcing it.
   */
  /**
   * The neighbourhood's discoveries, for the length of one wait.
   *
   * Local and unpersisted on purpose. Nothing found here survives the
   * screen — no points, no wallet, no loyalty — because a reward is a
   * commercial decision nobody has made (/CLAUDE.md §4).
   */
  const [discoveries, setDiscoveries] = useState<DiscoveryState>(() => emptyDiscoveries(HAIR_DISCOVERY_IDS));

  // A tracked job needs somewhere to go next; the prototype offers the same
  // advances the server would push. Computed BEFORE the body height, because
  // the demo strip takes its own space rather than covering the app's.
  /**
   * A way to SEE the personal-match flow before those services launch.
   *
   * The barber, the masseuse and the trainer are PILOT: the verification
   * policy for being alone with a person has not been decided, so they are
   * not orderable. But the flow they need is built and has to be reviewable
   * — so it is reachable through the demo strip, which announces itself as
   * not part of the app, rather than by quietly making a service orderable
   * that is not.
   */
  const previewMatch =
    tab === "home" && route.name === "service" && isPersonFit(route.serviceId)
      ? {
          label: "הצג איך נראית התאמה אישית",
          next: () => go({ name: "matchconfirm", serviceId: route.serviceId, index: 0 }),
        }
      : null;

  const arrivalAdvance =
    tab === "home" && route.name === "arrival"
      ? {
          label: "אימתתי את הקוד — הוא נכנס",
          next: () => go({ name: "tracking", stage: "arrived" }),
        }
      : null;

  /*
   * ONE STEP FORWARD PER STAGE, AND THE LAST ONE ENDS THE JOB.
   *
   * This used to fall through to "sent a quote" for everything that was
   * not assigned or en route — so approving a price landed back on a
   * screen whose only button offered the same quote again, and a visit
   * could never finish. The chain now runs knock → diagnosis → price →
   * work → finished → summary, which is the sequence a real visit has.
   */
  const advance =
    tab === "home" && route.name === "tracking"
      ? route.stage === "assigned"
        ? { label: "המקצוען יצא לדרך", next: () => go({ name: "tracking", stage: "enroute" }) }
        : route.stage === "enroute"
          ? { label: "המקצוען כמעט אצלך", next: () => go({ name: "arrival" }) }
          : route.stage === "arrived"
            ? {
                label: "המקצוען מתחיל לבדוק",
                next: () => go({ name: "tracking", stage: "diagnosis" }),
              }
            : route.stage === "diagnosis"
              ? { label: "המקצוען שלח הצעת מחיר", next: () => go({ name: "quote" }) }
              : route.stage === "working"
                ? {
                    label: "המקצוען סיים את העבודה",
                    next: () => go({ name: "tracking", stage: "done" }),
                  }
                : { label: "סיכום העבודה", next: () => go({ name: "complete" }) }
      : null;

  const demo = advance ?? arrivalAdvance ?? previewMatch;

  /**
   * A thin utility row instead of a bar at the bottom. It is 56px and it
   * carries two destinations, not four.
   */
  /*
   * ON EVERY SCREEN EXCEPT THE JOB'S OWN.
   *
   * The capsule exists so a live job is never lost while the customer is
   * doing something else. On the job's own screens it is noise — the whole
   * screen is already about that job — and the first version showed it
   * while merely browsing a service page, advertising an unrelated call.
   */
  const jobScreens = [
    "living",
    "tracking",
    "arrival",
    "chat",
    "quote",
    "complete",
    "matchconfirm",
  ];
  const capsule =
    pendingQuote && route.name !== "quote"
      ? {
          textHe: "הצעת מחיר ממתינה לאישורך",
          etaMinutes: null,
          onPress: () => go({ name: "quote" }),
        }
      : customerOpenCall.length > 0 && !jobScreens.includes(route.name)
      ? {
          textHe: `${customerOpenCall[0]!.proNameHe} · ${customerOpenCall[0]!.stateHe}`,
          etaMinutes: customerOpenCall[0]!.etaMinutes,
          onPress: () => go({ name: "tracking", stage: "enroute" }),
        }
      : null;

  /*
   * THE WAY BACK TO THE OTHER SIDE, AT THE MOMENT IT MATTERS.
   *
   * Amit, having just approved a quote as the customer: *"איך אני חוזר
   * לצד המקצוען אחרי שאישרתי את ההצעה מצד הלקוח?"* The switch has always
   * been in the header, on every screen — which is exactly why it does
   * not answer this: a control that is always there says nothing about
   * now. The professional's side gained a labelled row for the crossing
   * out; this is the crossing back, offered only while the professional
   * actually has a move to make, and only on the job's own screens where
   * it is about the thing in front of you.
   *
   * A review control, and it says so like every other one in this row.
   */
  const showReturnToPro =
    (returnToPro ?? false) && (route.name === "tracking" || route.name === "arrival");

  const UTIL = 56;
  const bodyH =
    height -
    UTIL -
    (demo ? DEMO_H : 0) -
    (showReturnToPro ? DEMO_H : 0) -
    (capsule ? CAPSULE_HEIGHT : 0);

  /**
   * The live job, as one sentence. Present only while there is a job to
   * talk about — a capsule that is always there is a navigation bar with
   * extra steps.
   */


  /**
   * THE SEARCH ADVANCES ITSELF, the way the server will — so the wait is
   * experienced rather than described.
   *
   * And it now advances through PHASES of one scene rather than navigating
   * between screens: SEARCHING → CANDIDATES_FOUND → MATCH_REVEAL, and then
   * the customer decides. That last stop is the fix for the thing Amit
   * caught: *"הוא ישר מעביר אותי לדף מקצוען בדרך אליך בלי שבחרתי אותו
   * בכלל."* Delegating the choice is not the same as declining to be told
   * who is coming.
   */
  useEffect(() => {
    if (route.name !== "living") {
      setElapsed(0);
      return;
    }
    if (route.phase !== "SEARCHING" && route.phase !== "CANDIDATES_FOUND") return;
    // A pinned phase is being looked at, not lived through. Let it stand still.
    if (PINNED || REVIEW_CYCLE) return;
    const started = Date.now();
    const serviceId = route.serviceId;
    const fromPhase = route.phase;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      setElapsed((e) => e + 1);
      if (fromPhase === "SEARCHING" && secs >= 5) {
        setRoute({ name: "living", serviceId, phase: "CANDIDATES_FOUND" });
      } else if (fromPhase === "CANDIDATES_FOUND" && secs >= 2) {
        setRoute({ name: "living", serviceId, phase: "MATCH_REVEAL" });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [route]);

  /** TEMPORARY — see REVIEW_CYCLE. */
  useEffect(() => {
    if (!REVIEW_CYCLE) return;
    const id = setInterval(() => {
      setRoute((r) => {
        if (r.name !== "living") return { name: "living", serviceId: "svc-leak", phase: "SEARCHING" };
        const next = PHASES[(PHASES.indexOf(r.phase) + 1) % PHASES.length] ?? "SEARCHING";
        return { name: "living", serviceId: r.serviceId, phase: next };
      });
    }, REVIEW_PHASE_MS);
    return () => clearInterval(id);
  }, []);

  /*
   * Routes live under the "home" tab, so navigating to one from another tab
   * has to move the tab as well. The first version did not, and tapping a
   * live call in the calls list silently did nothing — the route changed
   * underneath a tab that was still rendering its own screen. Keeping the
   * tab switch inside `go` makes that impossible to forget at a call site.
   */
  /**
 * The services a customer category actually covers, in this catalogue.
 *
 * This replaced a function that returned the FIRST service and opened it —
 * a shortcut that made tapping "לבית" mean "I have a blocked drain". A
 * category is several departments wide; the only honest thing to do with a
 * tap on one is to show what it contains and ask.
 */
function servicesForCategory(category: { departments: readonly string[] }) {
  return catalogHomeServices.filter((s2) =>
    category.departments.includes(departmentCodeByServiceId[s2.id] ?? "")
  );
}

const go = useCallback((r: CustomerRoute) => {
    /*
     * The stack remembers WHERE YOU WERE, not where you are going. That
     * distinction was the bug: the stack was filled by an effect watching
     * `route`, so it recorded the screen you had just arrived at — and a
     * back then popped the screen you were standing on and "returned" you
     * to it. Pressing back appeared to do nothing, or, once the browser's
     * own history had drifted a step out of line with ours, landed on some
     * screen from earlier in the session. Amit's original question —
     * *"איך חוזרים אחורה במסכים של הלקוח?"* — was still only half answered:
     * there was a control on every screen, and it did not reliably go back.
     */
    backStack.current = [...backStack.current, { route: hereRef.current, tab: tabRef.current }].slice(-40);
    setRoute(r);
    if (r.name !== "home") setTab("home");
    pushHistory();
  }, []);

  /**
   * Move to a tab, recording where you were so back can return there.
   *
   * A tab is a sibling of home rather than a step into it (see
   * `navigation-flow.ts`), so the transition barely moves — but it is still
   * a navigation, and leaving it out of the history is what made the back
   * gesture fall out of the app.
   */
  /*
   * THE OTHER SIDE ASKED FOR THIS SCREEN.
   *
   * Amit: *"איך אני מאשר כרגע את הקריאה מצד הלקוח לראות שזה עובד?"* The
   * answer was already in the app — the customer gets a capsule saying a
   * quote is waiting — but finding it meant knowing to press "לקוח" and
   * then noticing a strip above the tab bar. So the professional's demo
   * row now crosses over and lands here directly.
   *
   * It runs through `go`, not `setRoute`, so the move is a real
   * navigation: it animates, it moves the tab, and back returns to
   * wherever the customer actually was.
   */
  useEffect(() => {
    if (!openQuoteOnce) return;
    onQuoteOpened();
    if (!pendingQuote) return;
    go({ name: "quote" });
  }, [openQuoteOnce, onQuoteOpened, pendingQuote, go]);

  /*
   * AND THE DOOR TO THE STREET FINISHES ITS OWN SENTENCE.
   *
   * The picker unmounts this component, so the intent is held above and
   * arrives back here as a one-shot. `avatar` is checked rather than
   * trusted: a skip answers "no figure", and walking an empty street is
   * the thing the door exists not to do.
   */
  /*
   * The other crossing: straight to the stage that asks the customer
   * whether the work is finished. Same one-shot shape as the quote's.
   */
  useEffect(() => {
    if (!openCompletionOnce) return;
    onCompletionOpened?.();
    go({ name: "tracking", stage: "done" });
  }, [openCompletionOnce, onCompletionOpened, go]);

  /*
   * TOLD AT ONCE, AND PUT BACK IN THE QUEUE.
   *
   * The professional released the job. The customer's screen must not
   * keep tracking somebody who is not coming — which is the state the
   * product had before, arrived at by the professional simply not
   * turning up. The sheet says what happened; behind it the search has
   * already started again, because that is what actually protects them.
   */
  useEffect(() => {
    if (!jobReleased) return;
    onReleaseSeen?.();
    setSheet("released");
    go({ name: "living", serviceId: lastRequestedId ?? "svc-leak", phase: "SEARCHING" });
  }, [jobReleased, onReleaseSeen, lastRequestedId, go]);

  useEffect(() => {
    if (!openStrollOnce) return;
    onStrollOpened?.();
    if (avatar === null) return;
    go({ name: "stroll" });
  }, [openStrollOnce, onStrollOpened, avatar, go]);

  /**
   * ONE DOOR, TWO ANSWERS.
   *
   * With a figure it opens the street. Without one it opens the picker
   * and comes back here — and the card says which of the two it is, so
   * nobody taps "walk the street" and gets a questionnaire. When the
   * portraits have not arrived there is no door at all, because a picker
   * with nothing in it is worse than no invitation.
   */
  const strollDoor = avatar ? () => go({ name: "stroll" }) : onPickAvatar;

  const goTab = useCallback((t: CustomerTab) => {
    backStack.current = [...backStack.current, { route: hereRef.current, tab: tabRef.current }].slice(-40);
    setTab(t);
    setRoute({ name: "home" });
    pushHistory();
  }, []);

  /*
   * ---------------------------------------------------------------------
   * THE PHONE'S OWN BACK GESTURE
   * ---------------------------------------------------------------------
   * Amit: *"איך חוזרים אחורה במסכים של הלקוח?"* Adding a visible control to
   * every screen answers half of it. The other half is that he is reviewing
   * this in a browser on a phone, where the swipe-from-the-edge and the
   * Android back button are how people leave a screen — and here they did
   * nothing at all, or worse, left the prototype entirely.
   *
   * Navigation lives in React state rather than in the URL, so the history
   * stack has to be maintained by hand: every `go` pushes an entry, and a
   * `popstate` is routed into the same `back()` the on-screen control uses.
   * The two are then the same action by construction, which is the only way
   * they stay in agreement as screens are added.
   *
   * The entries are deliberately empty of state. The artifact host strips
   * query strings (this is the same constraint that killed `?phase=`), so a
   * URL-encoded route would survive locally and silently break in the one
   * place Amit actually looks at it.
   */
  const backStack = useRef<{ route: CustomerRoute; tab: CustomerTab }[]>([]);
  /*
   * Where we are RIGHT NOW, readable from a callback that was created on
   * the first render. `go` is memoised with no dependencies on purpose —
   * every screen holds a handler built from it — so it cannot close over
   * the current route, and a ref is what lets it record the screen it is
   * leaving without being rebuilt on every navigation.
   */
  const hereRef = useRef<CustomerRoute>({ name: "home" });
  const tabRef = useRef<CustomerTab>("home");
  const pushHistory = pushBackEntry;

  /*
   * The listener itself now lives in the shell, because it has to outlive
   * this component: switching to the professional side unmounts
   * `CustomerApp`, and with it went the only thing listening for the
   * phone's back button. See `backGesture.ts`.
   *
   * What is registered here is what "back" MEANS on the customer side,
   * which is still this component's business and nobody else's.
   */
  useEffect(
    () =>
      setBackHandler(() => {
        const previous = backStack.current.pop();
        if (previous) {
          setRoute(previous.route);
          // The tab comes back too. Going back from a screen opened out of
          // the calls list used to land on the home tab, which is a
          // different place from the one you left.
          setTab(previous.tab);
          return true;
        }
        // Nothing left on this side. If we arrived here from the
        // professional side, the gesture takes us back there; otherwise
        // the page is allowed to go — see `backGesture.ts`.
        return onBackOut();
      }),
    [onBackOut]
  );

  // Keep the "where we are" refs in step with the state they mirror. This
  // does NOT push anything: `go` does the pushing, because only `go` knows
  // that a move is happening rather than a re-render.
  useEffect(() => {
    hereRef.current = route;
    tabRef.current = tab;
    /*
     * And the same two facts one level up, so a crossing to the
     * professional's side and back lands where it left off rather than
     * on the home screen. See `memory` in the shell.
     */
    if (memory) memory.current = { route, approvedTotalMinor, approvedLines };
  }, [route, tab, approvedTotalMinor, approvedLines, memory]);

  /**
   * WHERE THE CUSTOMER IS, as the transition model understands it.
   *
   * Two facts, and they are not the same fact. The KEY is identity: change
   * it and a transition plays. The SCREEN is position in the journey:
   * compare it with the last one and the direction falls out.
   *
   * What is deliberately left out of the subject matters as much as what is
   * in it. The living map's phase and the tracking stage both change while
   * you are standing still — the world is searching, then it has found
   * someone, then they are driving — and those are one scene changing
   * shape. Feeding them in would cut a continuous journey into four page
   * loads, which is the exact fault the whole thing was built to fix.
   */
  /**
   * The professional behind the shop that was just opened.
   *
   * The sheet showed `matchFixture.professional` whatever you tapped, so
   * being driven into "דוגמה ט׳"'s shop opened a card headed "דוגמה א׳".
   * Caught in a screenshot of the exact journey Amit asked about.
   *
   * The demo candidates have no reputation of their own and that is
   * deliberate (`demoCandidatesFor`): a derived candidate nobody has
   * hired shows "חדש ב-PRO NOW" rather than a borrowed 4.86. So the
   * fixture's numbers are dropped along with its name — taking the name
   * from one person and the rating from another would be worse than the
   * bug being fixed.
   */
  const openVenueProfessional = useMemo(() => {
    const base = matchFixture.professional;
    const index = openVenue?.match(/^demo-cand-(\d+)$/)?.[1];
    if (index === undefined) return base;
    const serviceId = route.name === "living" ? route.serviceId : null;
    if (!serviceId) return base;
    const candidate = demoCandidatesFor(serviceId, 3)[Number(index)];
    if (!candidate) return base;
    return {
      ...base,
      id: candidate.seed,
      displayName: candidate.displayNameHe,
      /*
       * The figure drawn for this trade, instead of a generated cartoon.
       * Amit: *"תשתמש במה שיצרנו."* `worldSources` holds the delivered
       * art; a trade with no figure yet falls back to `Persona`, which is
       * the same honest "we do not have a picture of this person".
       */
      profilePhotoUrl: (() => {
        // `WorldAssetSources` is typed as React Native's source union, and
        // on web every entry is the `{ uri }` object form. Narrowed here
        // rather than cast, so a future entry of another shape falls back
        // to Persona instead of rendering nothing.
        const src = candidate.photoAssetId ? worldSources[candidate.photoAssetId] : undefined;
        return src && typeof src === "object" && "uri" in src && typeof src.uri === "string"
          ? src.uri
          : null;
      })(),
      proNowCompletedJobs: candidate.completedJobs ?? 0,
      proNowRatingAverage: candidate.ratingAverage,
      proNowRatingCount: candidate.ratingCount ?? 0,
      // Somebody else's Google rating is not this person's. Absent is the
      // honest value and the profile is built to show nothing for it.
      externalReputation: null,
    };
  }, [openVenue, route]);

  /**
   * INSIDE THE SHOP, IF THE TRADE HAS AN INSIDE DRAWN.
   *
   * Amit: *"איך עושים שבלחיצה על המקצוען נכנסים לתוך החנות שלו ממש
   * בפנים, שיראו את הדברים הקטנים שעבדנו עליהם?"*
   *
   * The trade comes from the SERVICE the customer asked about, which is
   * what decides whose street this is — not from the venue's id, which
   * is only which of three candidates was pressed. The interior is named
   * by `venueInteriorAssetId`, so the day one lands in the pack under
   * its name, pressing that trade's shop opens into it with no change
   * here. Today the barber is the only trade that has one.
   */
  /**
   * THE PROFESSIONAL THE CUSTOMER IS WATCHING, WITH A FACE.
   *
   * Amit: *"למה התמונה של בעל המקצוע והשם לא מהדמויות שבנינו?"* The
   * fixture carries `profilePhotoUrl: null`, so every screen fell back
   * to a monogram — while eleven trade characters sat in the pack, and
   * the candidate cards two screens earlier were already using them.
   *
   * It is the TRADE's figure, not a likeness of a person: an
   * illustration of a plumber, on a demonstration professional whose
   * name says "(תצוגה)". That is the same claim the candidate cards
   * make and it is a small one. The day a real professional uploads a
   * photo, the server sends it and this is never consulted.
   */
  const trackedProfessional = useMemo(() => {
    const base = matchFixture.professional;
    const dept = trackedService.id ? departmentCodeByServiceId[trackedService.id] : null;
    const id = dept ? WORLD_DISTRICTS[dept]?.characterPortraitAssetId : null;
    const src = id ? art[id] : undefined;
    const uri =
      src && typeof src === "object" && "uri" in src && typeof src.uri === "string" ? src.uri : null;
    return uri ? { ...base, profilePhotoUrl: uri } : base;
  }, [trackedService, art]);

  /**
   * WHICH SHOP IS NEXT ALONG THE STREET.
   *
   * The candidates the search found, in the order it found them, wrapped
   * — so "next" from the last one is the first rather than a dead end.
   * Null when there is only one to see.
   */
  const nextVenueId = useMemo(() => {
    const serviceId = route.name === "living" ? route.serviceId : lastRequestedId;
    if (!serviceId || !openVenue) return null;
    const ids = demoCandidatesFor(serviceId, 3).map((_, i) => `demo-cand-${i}`);
    if (ids.length < 2) return null;
    const at = ids.indexOf(openVenue);
    if (at < 0) return null;
    return ids[(at + 1) % ids.length] ?? null;
  }, [route, lastRequestedId, openVenue]);

  const shopInteriorUri = useMemo(() => {
    /*
     * EVERY SCREEN THAT IS ABOUT A SERVICE, not only the map.
     *
     * This read the service off the living map and otherwise fell back
     * to the last REQUESTED one — so on the match screen, which is
     * reached before anything is requested, it had nothing and drew
     * nothing. The trade is on the route wherever the route is about a
     * trade.
     */
    const serviceId =
      route.name === "living" ||
      route.name === "matchconfirm" ||
      route.name === "service" ||
      route.name === "describe"
        ? route.serviceId
        : lastRequestedId;
    const dept = serviceId ? departmentCodeByServiceId[serviceId] : null;
    const id = dept ? WORLD_DISTRICTS[dept]?.venueInteriorAssetId : null;
    if (!id) return null;
    const src = art[id];
    return src && typeof src === "object" && "uri" in src && typeof src.uri === "string"
      ? src.uri
      : null;
  }, [route, lastRequestedId, art]);

  const screenNow = useMemo(() => {
    // Off the home tab, the tab IS the screen: the calls list and the card
    // are siblings of home, not steps into it.
    const name = tab === "home" ? route.name : tab;
    const subject =
      tab !== "home"
        ? null
        : route.name === "category"
          ? route.categoryId
          : route.name === "service" || route.name === "describe" || route.name === "living" || route.name === "matchconfirm"
            ? route.serviceId
            /*
             * THE VISIT'S STAGES ARE SEPARATE SCREENS. The living map's
             * phases are not, and the difference is real rather than
             * taste.
             *
             * Amit: *"המסכים חייבים להתחלף כל לחיצת כפתור, כל פעולה, גם
             * ללקוח וגם למקצוען"*, and about this stretch in particular:
             * *"אין שום תחלופה במסך."*
             *
             * The four living-map phases are ONE scene changing shape
             * while the customer stands still — searching, found,
             * revealed, en route — and cutting them into page loads is
             * the exact fault that scene was built to fix.
             *
             * A tracking stage is the opposite: something happened. He
             * arrived; he finished looking; a price came; you approved
             * it. Each is a different set of facts and a different next
             * move, and arriving at one deserves the same slide as
             * arriving anywhere else. It also means each opens at the
             * top rather than inheriting the last one's scroll.
             */
            : route.name === "tracking"
              ? route.stage
              : null;
    return {
      key: screenKey({ side: "customer", name, subject }),
      screen: { side: "customer" as const, name },
    };
  }, [tab, route]);

  const body = useMemo(() => {
    if (tab === "card") {
      return (
        <CustomerProfileBody
          displayNameHe="אמית (תצוגה)"
          seed="cust_demo_1"
          homeAreaLabelHe={availabilitySnapshot.areaLabel}
          paymentLabelHe="ויזה · 4417"
          openCalls={route.name === "tracking" ? customerOpenCall : []}
          history={customerHistory}
          lifetimeSpendMinorUnits={164400}
          onOpenCall={() => goTab("calls")}
          /*
           * A review session that remembers what you typed needs an
           * obvious way back to a first-run state, or the second test of
           * the sign-up flow runs with last week's answers in the boxes.
           * Reloads afterwards so every screen re-seeds from nothing.
           */
          onResetReviewSession={() => {
            clearSession();
            if (typeof window !== "undefined") window.location.reload();
          }}
          reviewSavedHe={savedAgoHe(saved, Date.now())}
          onEditAddresses={() => go({ name: "address" })}
          onEditPayment={() => setSheet("payment")}
          width={width}
          height={bodyH}
        />
      );
    }

    if (tab === "menu") {
      /* ----------------------------------------------------------------
         EVERY ROW HERE GOES SOMEWHERE THAT EXISTS.

         `AppMenuBody` drops a row with no handler, so this list is also
         the honest inventory of what the customer side can actually do.
         Settings and "צור קשר" are absent because the support channel is
         an open decision (/CLAUDE.md §4) — a switch that controls nothing
         and a contact row pointing nowhere would make the real rows
         beside them suspect.
         ---------------------------------------------------------------- */
      return (
        <AppMenuBody
          groups={[
            {
              titleHe: "העבודות שלי",
              items: [
                {
                  id: "calls",
                  labelHe: "הקריאות שלי",
                  detailHe: "היסטוריה, קריאה פעילה ודירוגים",
                  onPress: () => goTab("calls"),
                },
              ],
            },
            {
              titleHe: "החשבון",
              items: [
                {
                  id: "card",
                  labelHe: "החשבון שלי",
                  detailHe: "פרטים, אמצעי תשלום והיסטוריית חיובים",
                  onPress: () => goTab("card"),
                },
                {
                  id: "address",
                  labelHe: "הכתובות שלי",
                  detailHe: "לאן שולחים את המקצוען",
                  onPress: () => {
                    setTab("home");
                    go({ name: "address" });
                  },
                },
                {
                  id: "avatar",
                  labelHe: "הדמות שלי",
                  detailHe: "מי מטייל ברחוב בזמן ההמתנה",
                  onPress: onPickAvatar,
                },
              ],
            },
            {
              titleHe: "עזרה",
              items: [
                {
                  id: "whatsapp",
                  labelHe: "ואטסאפ",
                  detailHe: SUPPORT_WHATSAPP_HE,
                  onPress: () => {
                    /*
                     * Handed to whatever WhatsApp the person already
                     * has, the same way an address is handed to their
                     * own maps app — see `maps-handoff`. It chooses no
                     * vendor and needs no integration: it is a link.
                     */
                    void Linking.openURL(whatsappUrl("שלום, אני צריך עזרה ב-PRO NOW"));
                  },
                },
                {
                  id: "email",
                  labelHe: "אימייל",
                  detailHe: SUPPORT_EMAIL,
                  onPress: () => {
                    void Linking.openURL(supportEmailUrl("פנייה מ-PRO NOW"));
                  },
                },
              ],
            },
            {
              titleHe: "העולם",
              items: [
                {
                  id: "stroll",
                  labelHe: "טיול בשכונה",
                  detailHe: "בלי בקשה פתוחה",
                  onPress: strollDoor,
                },
                {
                  id: "advertise",
                  labelHe: "יש לך עסק?",
                  detailHe: "פתיחת חנות בשכונה של PRO NOW",
                  onPress: () => {
                    setTab("home");
                    go({ name: "advertise" });
                  },
                },
              ],
            },
          ]}
          footnoteHe={supportHoursHe()}
          onBack={() => setTab("home")}
          width={width}
          height={bodyH}
        />
      );
    }

    if (tab === "calls") {
      return (
        <CallsListBody
          calls={callsList}
          onOpen={(id) =>
            id === "call_live" ? go({ name: "tracking", stage: "enroute" }) : setSheet("payment")
          }
          onRate={() => go({ name: "complete" })}
          onApproveQuote={() => go({ name: "quote" })}
          onNewCall={() => {
            setRoute({ name: "home" });
            setTab("home");
          }}
          width={width}
          height={bodyH}
        />
      );
    }

    switch (route.name) {
      case "address":
        return (
          <AddressPickerBody
            saved={savedAddresses}
            selectedId={addressId}
            liveLocation={live}
            onUseLiveLocation={askLocation}
            onSelect={setAddressId}
            onConfirm={() => go({ name: "home" })}
            onBack={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
      /*
       * THE STREET. A place of its own, reached from the home screen —
       * see the route above for why it is not inside the dispatch wait
       * any more.
       *
       * Walking up to a shop opens the TRADE, never a person: this
       * screen draws districts and no venues, so it never suggests
       * anybody is behind a door before the server has been asked.
       */
      case "stroll":
        return (
          <StrollBody
            avatar={avatar}
            sources={art}
            geo={geo}
            /* The paid shops stand in this street like any other. */
            sponsors={PREVIEW_SPONSORS}
            onEnterSponsor={(shop) =>
              go({ name: "sponsor", shopId: shop.id, from: "stroll" })
            }
            onOpenDepartment={(department) => {
              const category = categoryForDepartment(department);
              if (category) go({ name: "category", categoryId: category.id });
            }}
            onBack={() => go({ name: "home" })}
            onEnterCity={() => go({ name: "city" })}
            width={width}
            height={bodyH}
          />
        );
      case "category": {
        const category = customerCategoryById(route.categoryId);
        if (!category) return null;
        return (
          <CategoryBody
            category={category}
            services={servicesForCategory(category).map((s2) => ({
              id: s2.id,
              nameHe: s2.nameHe,
              descriptionHe: s2.descriptionHe ?? null,
              /*
               * Read from the same snapshot every other number on screen
               * reads, and null when the snapshot did not mention this
               * service — silence rather than a zero that would read as
               * "nobody is free".
               */
              availableNowCount: supply.supplyFor(s2.id).count,
            }))}
            worldSources={art}
            /*
             * "מה צריך?" OR "את מי צריך?" — decided from the catalogue,
             * not typed into the screen.
             *
             * Amit: *"מתלבט איתך אם צריך פה את התפקידים גם של האנשי
             * מקצוע ולא רק בעיות."* On a category whose every service is
             * a PERSON — a barber, a makeup artist, a trainer — there is
             * no fault to describe, and the thing the customer has in
             * mind is a role. The catalogue already says which those are
             * (`matchingMode: "PERSON_FIT"`, the same field that makes
             * them show who is coming before you commit), so the question
             * is derived from it and cannot drift out of agreement with
             * the way the match is actually made.
             */
            asksForPerson={categoryAsksForPerson(
              servicesForCategory(category)
                .map((s2) => pilotServiceById[s2.id])
                .filter((s2): s2 is NonNullable<typeof s2> => Boolean(s2))
            )}
            onSelectService={(id) => go({ name: "service", serviceId: id })}
            /*
             * TYPED, NOT TAPPED.
             *
             * Run through the SAME matcher the home screen uses, so the
             * two cannot disagree about what a sentence means — but scoped
             * to this category, because the customer has already told us
             * the area and a match outside it is the app ignoring what
             * they said.
             *
             * No match is a real outcome and is handled rather than
             * swallowed: the text goes back to the home screen's field,
             * where the full catalogue can answer it and the suggestions
             * appear. That is a better answer than a confident wrong
             * service, and it never leaves the customer holding a sentence
             * with nowhere to put it.
             */
            onDescribe={(textHe) => {
              const inCategory = new Set(servicesForCategory(category).map((s2) => s2.id));
              const best = matchServicesByText(
                textHe,
                catalogMatchRules.filter((r) => inCategory.has(r.serviceId))
              )[0];
              if (best) {
                setFaultText(textHe);
                go({ name: "service", serviceId: best.serviceId });
                return;
              }
              setHomeQuery(textHe);
              go({ name: "home" });
            }}
            onBack={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
      }
      case "service": {
        const page = SERVICE_PAGES[route.serviceId]!;
        /*
         * THE COUNT HAS TO COME FROM THE SAME SNAPSHOT THE HOME SCREEN USED.
         *
         * It did not, and the consequence was severe rather than cosmetic:
         * the page's CTA switches on `availableNowCount > 0`, so with the
         * count hard-null EVERY service page showed "בדיקה מחדש" instead of
         * "בקשת בעל מקצוע עכשיו" — and the entire describe-the-fault flow,
         * the voice note, the photos, the matcher, all of it, was
         * unreachable from the app. The screens existed; no tap led to them.
         *
         * Reading the same snapshot here means the service page and the tile
         * that opened it can never disagree, and they expire together.
         */
        const reading = supply.supplyFor(route.serviceId);
        return (
          <ServiceDetailBody
            {...page}
            availableNowCount={reading.count}
            width={width}
            height={bodyH}
            onBack={() => go({ name: "home" })}
            onRequestNow={(symptomsHe, noteHe) => {
              // What they typed on the service page IS the description.
              // Carrying it means the describe screen opens with their own
              // words already in it, rather than asking the same question
              // one screen later and throwing the first answer away.
              if (noteHe) setFaultText((cur) => (cur ? cur : noteHe));
              go({ name: "describe", serviceId: route.serviceId, symptomsHe });
            }}
            onRecheck={() => go({ name: "home" })}
          />
        );
      }
      case "chat":
        return (
          <ChatBody
            side="customer"
            counterpartNameHe={matchFixture.professional.displayName}
            counterpartSeed={matchFixture.professional.id}
            jobTitleHe="תיקון נזילה בברז"
            jobOpen
            messages={chat}
            quickRepliesHe={customerQuickReplies}
            onSend={(t) => setChat((c) => [...c, { id: `m${c.length}`, from: "customer", textHe: t, atHe: nowHHMM() }])}
            onCall={() => setSheet("call")}
            onBack={() => go({ name: "tracking", stage: "enroute" })}
            width={width}
            height={bodyH}
          />
        );
      case "describe": {
        const page = SERVICE_PAGES[route.serviceId]!;
        return (
          <DescribeFaultBody
            serviceNameHe={page.nameHe}
            mark={page.mark}
            symptomsHe={route.symptomsHe}
            photoPromptHe={photoPromptFor(route.serviceId)}
            intake={pilotIntakeByService[route.serviceId]}
            answers={intakeAnswers}
            onAnswer={answerIntake}
            text={faultText}
            onChangeText={setFaultText}
            photos={capture.photos}
            onAddPhoto={capture.addPhoto}
            onAddFromLibrary={capture.addFromLibrary}
            onRemovePhoto={capture.removePhoto}
            voice={capture.voice}
            recording={capture.recording}
            recordSeconds={capture.recordSeconds}
            canRecord={capture.canRecord}
            recordBlockedHe={capture.recordBlockedHe}
            onStartRecord={capture.startRecord}
            onStopRecord={capture.stopRecord}
            onDeleteVoice={capture.deleteVoice}
            onBack={() => go({ name: "service", serviceId: route.serviceId })}
            onSend={() => {
              /*
               * Everything the customer gave, packed once and handed over.
               * `buildIntakeBrief` is the same pure function the offer card
               * renders from, so what the professional sees cannot drift
               * from what was actually answered — and an unanswered
               * question is dropped here rather than travelling as an empty
               * row.
               */
              const def = pilotServiceById[route.serviceId];
              onSendRequest({
                serviceId: route.serviceId,
                serviceNameHe: page.nameHe,
                serviceCode: def?.code ?? route.serviceId,
                markName: page.mark,
                priceModel: page.price.priceModel,
                intakeBrief: buildIntakeBrief(
                  pilotIntakeByService[route.serviceId],
                  intakeAnswers
                ),
                textHe: faultText,
                photos: capture.photos.length,
                voiceSeconds: capture.voice?.seconds ?? null,
                areaLabelHe: addressLabel,
                typicalMinutes: def?.typicalMinutes ?? null,
                createdAtMs: Date.now(),
              });
              setLastRequestedId(route.serviceId);
              go({ name: "living", serviceId: route.serviceId, phase: "SEARCHING" });
            }}
            width={width}
            height={bodyH}
          />
        );
      }
      case "living": {
        /*
         * THE DEMO CANDIDATES, AND WHY THEY ARE SHAPED LIKE THIS.
         *
         * `CandidatePresence` has `lat?: never` and `lng?: never`, so these
         * fixtures physically cannot carry a position — which is the point.
         * The prototype shows three bubbles because three candidates exist
         * in the fixture, not to make the ring look better; `foundHeadlineHe`
         * counts the same array, so the number on screen and the number of
         * people can never disagree.
         */
        const cands: CandidatePresence[] = demoCandidatesFor(route.serviceId, 3).map((c, i) => ({
          candidateId: `demo-cand-${i}`,
          displayNameHe: c.displayNameHe,
          professionHe: c.headlineHe,
          photoUri: null,
          /*
           * Carried through from the fixture rather than invented here. A
           * derived candidate has no rating and no jobs, so `matchFactsHe`
           * returns nothing and the sheet shows "חדש ב-PRO NOW" — which is
           * true of a professional nobody has hired yet.
           */
          ratingAverage: c.ratingAverage,
          ratingCount: c.ratingCount,
          completedJobs: c.completedJobs,
          state:
            route.phase === "SEARCHING"
              ? ("CHECKING" as const)
              : i === 0 && (route.phase === "MATCH_REVEAL" || route.phase === "ASSIGNED_ROUTE")
                ? ("CHOSEN" as const)
                : ("ELIGIBLE" as const),
        }));

        const page = SERVICE_PAGES[route.serviceId];
        const etaMin = matchFixture.eta ? Math.round(matchFixture.eta.etaSeconds / 60) : null;
        const arrival = etaMin === null ? null : new Date(Date.now() + etaMin * 60_000);
        const arrivalClockHe =
          arrival === null
            ? null
            : `${String(arrival.getHours()).padStart(2, "0")}:${String(arrival.getMinutes()).padStart(2, "0")}`;

        const living: LivingMapState = {
          phase: route.phase,
          theme: themeForDepartment(departmentCodeByServiceId[route.serviceId] ?? "HOME_URGENT"),
          adapter: DEMO_WORLD,
          /*
           * NOBODY IS NAMED DURING THE SEARCH.
           *
           * This used to show two CHECKING bubbles here, which was a
           * reasonable guess before Amit said what the search is:
           * *"השלב של החיפוש יהיה שלב שהרדאר שלנו עובר בלי כפתור לחיצות,
           * עם הדמות בין הרחובות ומחפש איש מקצוע."* No buttons, nobody
           * named — the camera touring the shops with the figure walking
           * it IS the search being shown.
           *
           * And the app cannot do otherwise even if it wanted to:
           * `GET /v1/jobs/:id` returns a status, not a roster, so
           * `scenePhaseForJob` never produces a named candidate before
           * assignment. Two floating names over the city was the gallery
           * showing a search that cannot happen — the same two-worlds
           * problem as the home screen, on the screen Amit reviews most.
           */
          candidates: route.phase === "SEARCHING" ? [] : cands,
          /*
           * No journey on the demo world. `livingMapViolations` refuses a
           * real position over invented streets, and that refusal is the
           * whole reason the invented city is allowed to exist.
           */
          journey: null,
        };

        return (
          <SearchingBody
            geo={geo}
            worldSources={art}
            /*
             * THE SHOPS IN THE STREET THAT PAID TO BE THERE.
             *
             * Amit: *"לא הגיוני שאני צריך לגלול עד לפה בשביל למצוא את
             * זה. למה אין מבנה של לאסט במפה??"* The row at the foot of
             * the tracking sheet stays — it is the readable, scrollable
             * copy — but this is where a shop is actually FOUND, by
             * walking past it.
             */
            sponsors={PREVIEW_SPONSORS}
            onEnterSponsor={(shop) =>
              go({ name: "sponsor", shopId: shop.id, from: "enroute" })
            }
            /*
             * AND EVERY OTHER DOOR IN THE STREET.
             *
             * Amit: *"שגם זה יהיה לחיץ ויפתח את החנות והכרטיס שלו."*
             * The card that opens is about the trade — `TradeCard`, and
             * the note there about why it must never read as a profile
             * — and its one action is the catalogue for that trade,
             * which is the honest thing a building without a person
             * behind it can offer.
             */
            onOpenTrade={(department) => {
              const category = categoryForDepartment(department);
              if (category) go({ name: "category", categoryId: category.id });
            }}
            departmentCode={departmentCodeByServiceId[route.serviceId]}
            serviceNameHe={page?.nameHe ?? ""}
            living={living}
            etaMinutes={route.phase === "SEARCHING" ? null : etaMin}
            arrivalClockHe={route.phase === "SEARCHING" ? null : arrivalClockHe}
            checkingEligibility={route.phase !== "SEARCHING"}
            discoveries={discoveries}
            onFound={(id) => setDiscoveries((d) => discover(d, id))}
            onPlayAction={(action) => {
              /*
               * EVERY ROUTE OUT OF THE WAIT IS A REAL DESTINATION.
               *
               * That was the note, and half of it was untrue: only two of
               * the drawer's four actions went anywhere. "לשחק עוד" and
               * "בינתיים" did nothing at all — the exact failure this
               * comment was written about, sitting under the comment.
               *
               * They go to the street. Amit: *"לקוח בזמן ההמתנה למקצוען
               * יכול להיכנס לחנויות."* The wait IS the street; walking it
               * is the thing there is to do while somebody drives to you,
               * and it is the only place the sponsored shops mean
               * anything.
               */
              if (action === "JOB_DETAILS") go({ name: "tracking", stage: "enroute" });
              if (action === "FOLLOW_PRO") go({ name: "tracking", stage: "enroute" });
              if (action === "PLAY_MORE" || action === "WHILE_YOU_WAIT") strollDoor?.();
            }}
            onAccept={() => go({ name: "living", serviceId: route.serviceId, phase: "ASSIGNED_ROUTE" })}
            onAnother={
              isPersonFit(route.serviceId)
                ? () => go({ name: "matchconfirm", serviceId: route.serviceId, index: 1 })
                : undefined
            }
            onSafety={() => setSheet("safety")}
            onOpenProfile={(id) => setOpenVenue(id)}
            /*
             * SKIP TAKES YOU TO THE NEXT SHOP, not just off this card.
             * Amit: *"ואם אני עושה דלג אז חוזר לרחוב ועובר לחנות הבאה."*
             * The scene runs its own journey for it — see `enterVenueId`.
             */
            enterVenueId={enterVenue}
            onEnterHandled={() => setEnterVenue(null)}
            profileOpen={openVenue !== null}
            /*
             * WHO IS WALKING. Whatever they picked at the start, or null
             * if they skipped it — in which case the street still works,
             * there is simply nobody in it and the camera goes back to
             * looking at places rather than following a person.
             */
            avatar={avatar}
            /*
             * THE WAY OUT, AND WHAT IT COSTS.
             *
             * Amit found this screen with no back control at all, which was
             * the worst place to have none: the request is out, nobody has
             * answered, and the only thing to do was wait.
             *
             * Before an assignment, going back means the request stops — so
             * it is labelled "ביטול הבקשה" rather than drawn as a chevron.
             * A bare arrow would have let someone end their own call for
             * help with a gesture they made without reading. Once a
             * professional is en route the label disappears, because then
             * leaving is only leaving: the job keeps running and the calls
             * list still holds it.
             */
            onBack={() =>
              route.phase === "ASSIGNED_ROUTE"
                ? go({ name: "tracking", stage: "enroute" })
                : go({ name: "service", serviceId: route.serviceId })
            }
            backLabelHe={route.phase === "ASSIGNED_ROUTE" ? null : "ביטול הבקשה"}
            width={width}
            height={bodyH}
          />
        );
      }
      case "matchconfirm": {
        const page = SERVICE_PAGES[route.serviceId]!;
        const c = personFitCandidates[route.index % personFitCandidates.length]!;
        const etaMin = matchFixture.eta ? Math.round(matchFixture.eta.etaSeconds / 60) : null;
        /*
         * The arrival clock, computed from the ETA rather than stored. "14
         * דקות" is a duration; "אצלך בערך ב-22:48" is a plan, and a person
         * deciding whether to let someone into their home is making a plan.
         */
        const arrival = etaMin === null ? null : new Date(Date.now() + etaMin * 60_000);
        // No ETA means no arrival time — not a guessed one.
        const arrivalClockHe =
          arrival === null
            ? null
            : `${String(arrival.getHours()).padStart(2, "0")}:${String(
                arrival.getMinutes()
              ).padStart(2, "0")}`;
        return (
          <MatchConfirmBody
            serviceNameHe={page.nameHe}
            displayNameHe={c.displayNameHe}
            headlineHe={c.headlineHe}
            /*
             * No photo, and no illustrated stand-in either. A face on a
             * proposed professional — drawn or photographed — asserts that
             * this specific person exists and is free right now. The
             * monogram occupies exactly the space a real approved photo
             * will, so nothing about this screen changes on the day one
             * arrives.
             */
            photoUri={null}
            portfolio={c.portfolio}
            /*
             * Their place, from inside it. Derived from the service being
             * asked about — which on this screen is also the trade — so
             * the day an interior lands under its name it appears here
             * with no change. Today the barber is the only one drawn.
             */
            shopInteriorUri={shopInteriorUri}
            reasons={matchReasons({
              specialtiesHe: c.specialtiesHe,
              // What the customer actually said — their typed sentence and
              // whichever symptoms they tapped. Nothing else counts as
              // having been asked for.
              askedForHe: [
                faultText.toLowerCase(),
                ...intakeAnswers.flatMap((a) => a.optionIds ?? []),
                ...(page.symptomsHe ?? []),
              ].filter(Boolean),
              onlineNow: true,
              etaMinutes: etaMin,
              completedJobs: c.completedJobs,
              ratingAverage: c.ratingAverage,
              ratingCount: c.ratingCount,
              serviceNameHe: page.nameHe,
            })}
            presence="ONLINE"
            presenceLabelHe="זמינה עכשיו"
            ratingAverage={c.ratingAverage}
            ratingCount={c.ratingCount}
            completedJobs={c.completedJobs}
            credentialsHe={page.requiredCredentialsHe}
            eta={matchFixture.eta}
            arrivalClockHe={arrivalClockHe}
            price={page.price}
            /*
             * Only PERSON_FIT offers another. For a blocked drain the
             * second-fastest plumber is not a different product, and
             * offering him invites a comparison the customer has no basis
             * to make while water is on the floor.
             */
            hasAlternative={
              isPersonFit(route.serviceId) && route.index < personFitCandidates.length - 1
            }
            onAccept={() => go({ name: "tracking", stage: "assigned" })}
            onAnother={() =>
              go({ name: "matchconfirm", serviceId: route.serviceId, index: route.index + 1 })
            }
            onBack={() => go({ name: "service", serviceId: route.serviceId })}
            width={width}
            height={bodyH}
          />
        );
      }
      /* ----------------------------------------------------------------
         STANDING INSIDE A SPONSOR'S SHOP.

         Reached from the street of shops on the tracking screen. The
         "site" link is deliberately NOT wired to window.open here: the
         gallery is a developer tool, and silently navigating a review
         session away to a commercial site is a surprise. It records the
         handoff instead, which is what the shipping app will hand to
         the platform's own browser.
         ---------------------------------------------------------------- */
      case "sponsor": {
        const shop = PREVIEW_SPONSORS.find((sp) => sp.id === route.shopId);
        if (!shop) return null;
        return (
          <View style={{ width, height: bodyH }}>
            <SponsorShopBody
              shop={shop}
              interiorUri={
                shop.interiorAssetId
                  ? (art?.[shop.interiorAssetId] as { uri?: string } | undefined)?.uri ?? null
                  : null
              }
              onOpenSite={(picked) => setSponsorHandoff(picked.siteUrl)}
              onBack={() => {
                setSponsorHandoff(null);
                if (route.from === "stroll") go({ name: "stroll" });
                else go({ name: "tracking", stage: route.from });
              }}
              width={width}
              height={bodyH}
            />
            {sponsorHandoff ? <PreviewNote textHe={`הועבר לדפדפן: ${sponsorHandoff}`} /> : null}
          </View>
        );
      }
      case "advertise":
        return (
          <View style={{ width, height: bodyH }}>
            <AdvertiseBody
              exampleVenueUri={
                (art?.["sponsor_lust_venue"] as { uri?: string } | undefined)?.uri ?? null
              }
              exampleBrandName={PREVIEW_SPONSORS[0]?.brandName ?? null}
              onSubmit={(lead) => setAdvertiseLead(lead.businessNameHe)}
              onBack={() => {
                setAdvertiseLead(null);
                go({ name: "home" });
              }}
              width={width}
              height={bodyH}
            />
            {advertiseLead ? (
              <PreviewNote textHe={`נרשם בגלריה בלבד: ${advertiseLead} — שום דבר לא נשלח לשרת`} />
            ) : null}
          </View>
        );
      case "tracking":
        return (
          <TrackingBody
            geo={geo}
            status={
              route.stage === "assigned"
                ? "PRO_ASSIGNED"
                : route.stage === "enroute"
                  ? "PRO_EN_ROUTE"
                  : route.stage === "arrived"
                    ? "PRO_ARRIVED"
                    : route.stage === "diagnosis"
                      ? "DIAGNOSIS"
                      : route.stage === "done"
                        ? "COMPLETION_PENDING"
                        : "IN_PROGRESS"
            }
            serviceNameHe={trackedService.nameHe}
            professional={trackedProfessional}
            eta={matchFixture.eta}
            /*
             * The street of paid shops. `SponsorRow` shows itself only
             * while the customer is waiting — pass it at every stage
             * and watch it disappear at "arrived", which is the point.
             */
            sponsors={PREVIEW_SPONSORS}
            sponsorVenueUriFor={(shop) =>
              (art?.[shop.venueAssetId] as { uri?: string } | undefined)?.uri ?? null
            }
            onEnterSponsor={(shop) =>
              go({
                name: "sponsor",
                shopId: shop.id,
                from: route.stage === "assigned" ? "assigned" : "enroute",
              })
            }
            /*
             * The arrival clock is DERIVED from the ETA the server gave,
             * not stored beside it. Two fields carrying the same fact drift,
             * and the one that drifts is always the one the customer
             * remembers.
             */
            arrivalClockHe={(() => {
              // No ETA means NO arrival time. ArrivalPromise renders a
              // sentence about why rather than a guessed clock (§3).
              if (!matchFixture.eta) return null;
              const mins = Math.round(matchFixture.eta.etaSeconds / 60);
              const at = new Date(Date.now() + mins * 60_000);
              return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
            })()}
            onGetHelp={() => setSheet("safety")}
            /*
             * THE TAP THAT ENDS THE JOB.
             *
             * It goes to the receipt, which is where the money is
             * accounted for. In the product this is
             * `POST /v1/jobs/:id/confirm-completion` — the server
             * settles, authorises, captures and writes the ledger, and
             * none of it is reported by the client.
             */
            /*
             * The most consequential tap in the product: the
             * professional's claim becomes the customer's agreement and
             * the money moves. It goes UP as well as forward now, so the
             * other side's screen can stop waiting.
             */
            onConfirmCompletion={() => {
              onConfirmCompletion?.();
              go({ name: "complete" });
            }}
            /*
             * The world, and who is coming through it. `departmentCode`
             * decides which street they come down and what they are
             * driving; the ETA the fixture carries is the one the trip
             * started with, so progress is a fraction of a real number
             * rather than a timer this screen invented.
             */
            worldSources={art}
            departmentCode={trackedService.id ? departmentCodeByServiceId[trackedService.id] : null}
            etaSecondsAtAssignment={matchFixture.eta?.etaSeconds ?? null}
            /*
             * WHAT COMES DOWN THE LANE IS THE TRADE'S, NOT A DEFAULT.
             *
             * This was pinned to the courier's scooter, so a customer whose
             * car would not start watched a delivery moped drive towards
             * their house. The trade decides — a tow truck for the garage, a
             * van for a move, the handler on foot for the dog — and the
             * scooter stays the honest fallback for everyone who really does
             * arrive on two wheels.
             */
            vehicleAssetId={travelAssetFor(
              (trackedService.id ? departmentCodeByServiceId[trackedService.id] : null) ?? "HOME_URGENT"
            )}
            onCancelJob={() => go({ name: "home" })}
            /*
             * Leaving, not cancelling. `onCancelJob` above is the one that
             * ends the job; this only returns to the app while the
             * professional stays on the way — the distinction the customer
             * has to be able to feel before tapping.
             */
            onBack={() => go({ name: "home" })}
            /*
             * THE FACTS, NOT THE SENTENCE.
             *
             * This was one fixed string — "דמי ביקור ₪179 · הצעת מחיר
             * תישלח לאישורך" — repeated through the whole visit. Amit:
             * *"איך הצעת מחיר תשלח אם הוא כבר סיים את העבודה? זה אמור
             * להיות לפני."* The screen now derives the line from the
             * job's state (`visitMoneyLineHe`), and these are the only
             * numbers it is allowed to use.
             */
            money={{
              visitFeeHe:
                trackedService.price?.priceModel === "VISIT_QUOTE" && trackedService.price.visitFeeMinorUnits
                  ? formatMoney(money(trackedService.price.visitFeeMinorUnits, "ILS"))
                  : null,
              fixedTotalHe:
                trackedService.price?.priceModel === "FIXED" && trackedService.price.fixedTotalMinorUnits
                  ? formatMoney(money(trackedService.price.fixedTotalMinorUnits, "ILS"))
                  : null,
              pendingTotalHe: writtenQuote ? formatMoney(money(writtenQuote.totalMinorUnits, "ILS")) : null,
              approvedTotalHe:
                approvedTotalMinor !== null ? formatMoney(money(approvedTotalMinor, "ILS")) : null,
            }}
            onCall={() => setSheet("call")}
            onMessage={() => go({ name: "chat" })}
            onSafety={() => setSheet("safety")}
            width={width}
            height={bodyH}
          />
        );
      case "arrival":
        return (
          <ArrivalVerifyBody
            displayNameHe={matchFixture.professional.displayName}
            /* No invented face here either — the monogram holds the space. */
            photoUri={null}
            headlineHe={`${trackedService.nameHe} · ${matchFixture.professional.proNowCompletedJobs} עבודות דרך PRO NOW`}
            /*
             * In production this comes from the server with the assignment.
             * A code the client can derive is a code an impostor's client
             * can derive, so it is never computed here — the prototype
             * carries a fixed one and says nothing that implies otherwise.
             */
            codeHe="4821"
            vehicleHe="יונדאי i20 לבנה"
            plateTailHe="47"
            etaMinutes={2}
            onCall={() => setSheet("call")}
            onMessage={() => go({ name: "chat" })}
            onShare={() => setSheet("safety")}
            onReport={() => setSheet("safety")}
            onBack={() => go({ name: "tracking", stage: "arrived" })}
            width={width}
            height={bodyH}
          />
        );
      case "quote":
        /*
         * THE QUOTE IS NOT A PAGE. It rises out of the dark tracking screen
         * as a light sheet, with the live job still visible above it.
         *
         * ChatGPT: "אל תנווט ב־cut ממסך שחור למסך לבן… זה טקס, לא theme
         * switch." A cut to full ivory reads as a bug or as a different
         * app; a sheet that always arrives the same way teaches light a
         * meaning the product can rely on — stop and read before you agree
         * to money. It also keeps the professional on screen, which is the
         * truth: he is still in your kitchen while you read his price.
         */
        return (
          <View style={{ width, height: bodyH }}>
            <TrackingBody
              geo={geo}
              // He is in the room and diagnosing; the price is what he
              // came out of the diagnosis with.
              status="DIAGNOSIS"
              serviceNameHe={trackedService.nameHe}
              professional={trackedProfessional}
              eta={matchFixture.eta}
              /*
               * THE SAME STREET AS THE SCREEN UNDERNEATH.
               *
               * This one was left without the art, so reading a price
               * cut from the lit city to the grey "the map will go here"
               * placeholder and back again — on the one screen where the
               * professional is supposed to still be visibly in your
               * kitchen while you read what he wants for the work.
               */
              worldSources={art}
              width={width}
              height={bodyH}
            />
            <FocusSheet
              visible
              titleHe={`${matchFixture.professional.displayName} שלח הצעת מחיר`}
              onDismiss={() => go({ name: "tracking", stage: "diagnosis" })}
              width={width}
              height={bodyH}
            >
              <QuoteApprovalBody
                /*
                 * THE QUOTE THE PROFESSIONAL ACTUALLY WROTE.
                 *
                 * This rendered `quoteFixture` whatever had happened —
                 * lines written by nobody, for a job nobody had looked
                 * at — so the customer approved one thing while the
                 * professional had composed another, or nothing at all.
                 * Amit: *"שהכל יהיה שקוף מול הלקוח שיופיע לו גם."*
                 *
                 * The fixture stays as the fallback for a deep link
                 * that lands here without a visit behind it, which is
                 * how this screen is usually reviewed.
                 */
                quote={writtenQuote ?? quoteFixture}
                /*
                 * Demonstration data — see `priceContextFixture`. In the
                 * product the server decides this from approved quotes
                 * and stays silent until there are enough of them, which
                 * on a marketplace that has not opened means silent.
                 */
                priceContext={priceContextFixture}
                serviceNameHe={trackedService.nameHe}
                professionalDisplayName={matchFixture.professional.displayName}
                onApprove={() => {
                  /*
                   * Remembered so the tracking panel can say it back
                   * while the work runs: "אישרתם ₪320 · זה הסכום
                   * לעבודה הזו". The pending quote is cleared by the
                   * shell on this same tap, so the number has to be
                   * kept here or the screen behind it loses it.
                   */
                  {
                    const approved = writtenQuote ?? quoteFixture;
                    setApprovedTotalMinor(approved.totalMinorUnits);
                    /*
                     * The lines as APPROVED, kept whole. The pending
                     * quote is cleared on this same tap, so this is the
                     * last moment the customer's side can see what it
                     * agreed to — and the closing screen's account of
                     * the work is built from exactly this and from
                     * nothing the app made up.
                     */
                    setApprovedLines(
                      approved.lineItems.map((li) => ({
                        id: li.id,
                        descriptionHe: li.description,
                        totalMinorUnits: Math.round(li.quantity * li.unitPriceMinorUnits),
                      }))
                    );
                  }
                  onQuoteDecision("APPROVED");
                  // An approved price is the professional's cue to start.
                  go({ name: "tracking", stage: "working" });
                }}
                onDecline={() => {
                  onQuoteDecision("DECLINED");
                  // Declined, he is still in the room and still diagnosing.
                  go({ name: "tracking", stage: "diagnosis" });
                }}
                onAskQuestion={() => go({ name: "chat" })}
                /*
                 * Back is not a decline. The sheet closes, the quote stays
                 * pending, and the professional is told nothing — because a
                 * navigation control must never carry a financial answer.
                 */
                onBack={() => go({ name: "tracking", stage: "diagnosis" })}
                width={width}
                height={Math.round(bodyH * 0.78) - 56}
              />
            </FocusSheet>
          </View>
        );
      case "complete":
        return (
          <JobCompleteBody
            serviceNameHe={trackedService.nameHe}
            mark={trackedService.mark}
            professionalDisplayName={matchFixture.professional.displayName}
            whenHe="היום, 14:20 · 55 דקות"
            receiptLines={receiptLines}
            totalChargedMinorUnits={44500}
            paymentMethodLabelHe="ויזה · 4417"
            // The rating travels with the navigation, so the closing
            // screen can speak about what they actually left rather than
            // thanking somebody for a review they may have skipped.
            onSubmitReview={(rating) => go({ name: "closed", ratingGiven: rating })}
            onDownloadInvoice={() => setSheet("payment")}
            onBack={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
      case "closed":
        return (
          <JobClosedBody
            serviceNameHe={trackedService.nameHe}
            mark={trackedService.mark}
            professionalDisplayName={matchFixture.professional.displayName}
            whenHe="היום, 14:20 · 55 דקות"
            /*
             * THE AMOUNT THAT WAS APPROVED, not a number on this screen.
             *
             * This was hard-coded to 44500 — so a customer who had just
             * agreed to ₪320 was thanked for ₪445. The fixture stays as
             * the fallback for a deep link that lands here with no visit
             * behind it, which is how this screen is usually reviewed.
             */
            totalChargedMinorUnits={approvedTotalMinor ?? 44500}
            /*
             * And what the money bought, in the professional's own
             * words — the lines of the quote that was approved. Null
             * when nothing was approved in this session, in which case
             * the screen says nothing rather than describing work it did
             * not see.
             */
            workLines={approvedLines ?? undefined}
            /*
             * False, and it is the default for a reason: no payment
             * provider has been chosen (/CLAUDE.md §4), so the money has
             * not moved. The amount is real — it is the quote that was
             * approved — and only the tense is in question. A caller who
             * forgets this understates, which is recoverable.
             */
            paymentCaptured={false}
            ratingGiven={route.ratingGiven}
            onDone={() => go({ name: "home" })}
            onOpenReceipt={() => setSheet("payment")}
            onGetHelp={() => setSheet("safety")}
            /*
             * The street still needs somebody to walk it, so without an
             * avatar this door picks one first and the card says so. It
             * used to simply vanish — which meant the invitation Amit
             * asked for reached only the minority who did not skip the
             * picker.
             */
            onStroll={strollDoor}
            strollNeedsAvatar={avatar === null}
            width={width}
            height={bodyH}
          />
        );
      default:
        return (
          <CustomerHomeBody
            /* Same door, same rule — see the closing screen above. */
            onStroll={strollDoor}
            /* The other doorway on this page, for a business owner. */
            onAdvertise={() => go({ name: "advertise" })}
            strollNeedsAvatar={avatar === null}
            /*
             * FROM THE SAME CLOCK AS THE LIGHT OVER THE STREET.
             *
             * This said "ערב טוב" at every hour, which was survivable
             * while the world was painted at one hour too. It stops
             * being survivable now that the sky above the words is at
             * the viewer's own time: a bright midday street under "ערב
             * טוב" is the app contradicting itself on one screen.
             */
            greetingHe={greetingAt(new Date())}
            addressLabelHe={addressLabel}
            onChangeAddress={() => go({ name: "address" })}
            services={catalogHomeServices}
            recent={homeRecent}
            availability={snapshot}
            nowMs={Date.now()}
            matchRules={catalogMatchRules}
            /*
             * The microphone and the camera are REAL here — the same
             * `useCapture` the describe screen uses, so what the customer
             * records on the home screen is what travels with the request.
             * Wiring a second, fake set of buttons on this screen would have
             * been easier and would have been a lie.
             */
            height={bodyH}
            seedQueryHe={homeQuery}
            capture={{
              photos: capture.photos.length,
              voiceSeconds: capture.voice?.seconds ?? null,
              recording: capture.recording,
              recordSeconds: capture.recordSeconds,
              canRecord: capture.canRecord,
              recordBlockedHe: capture.recordBlockedHe,
              // Only when embedded: in a top-level tab there is nothing to open.
              onOpenInOwnTab: capture.framed ? capture.openInOwnTab : undefined,
              onStartRecord: capture.startRecord,
              onStopRecord: capture.stopRecord,
              onDeleteVoice: capture.deleteVoice,
              onAddPhoto: capture.addPhoto,
              // The gallery, which used to be wired to the camera.
              onAddFromLibrary: capture.addFromLibrary,
              onClearPhotos: () => capture.photos.forEach((p) => capture.removePhoto(p.id)),
            }}
            width={width}
            worldSources={art}
            onSelectService={(id) => go({ name: "service", serviceId: id })}
            /*
             * A category does not open a category page. It takes the
             * customer into that part of the world, which is Amit's own
             * instruction: *"לחיצה לא פותחת דף קטגוריה משעמם — היא מכניסה
             * את המשתמש לתוך אותו עולם."* The prototype travels there and
             * then asks the short question that turns a trade into a
             * request.
             */
            onSelectCategory={(id) => go({ name: "category", categoryId: id })}
            /*
             * One true sentence, counted from the same snapshot every
             * other number on this screen reads. See `liveAreaLineHe` for
             * why it counts services rather than people.
             */
            liveLineHe={liveAreaLineHe({
              fresh: supply.fresh,
              areaLabel: supply.areaLabel,
              services: catalogHomeServices.map((s2) => ({
                hasSupply: (supply.supplyFor(s2.id).count ?? 0) > 0,
              })),
            })}
          />
        );
    }
  }, [tab, route, elapsed, width, bodyH, go, goTab, snapshot, supply, addressId, live, askLocation, addressLabel, capture, faultText, intakeAnswers, answerIntake, trackedService, onSendRequest]);

  /*
   * ONLY WHERE THERE IS A STREET TO WALK DOWN.
   *
   * This floated over every screen in the app, including a service page
   * about parts that were not supplied in advance — where a button
   * marked "הליכה" is nonsense. Amit, on the artifact: *"למה יש פה כפתור
   * הליכה מה קשור."*
   *
   * A demo control that appears where the thing it demonstrates does not
   * exist is worse than no demo control: it reads as a feature of the
   * screen it is standing on. So it lives here, where the route is
   * known, rather than above the whole app where it was not.
   */
  /*
   * ---------------------------------------------------------------------
   * AND ONLY WHERE THERE IS SOMEBODY TO SHOW OR HIDE
   * ---------------------------------------------------------------------
   * Amit: *"מה עושה הליכה הדגמה, אני לוחץ לא קורה כלום."*
   *
   * "stroll" and "living" was not narrow enough. The walker exists on
   * the living map only in ASSIGNED_ROUTE — during the search, the found
   * moment and the reveal there is no figure on the street at all — so
   * on three of the four phases the button was real, pressed, and
   * changed nothing anybody could see. Which is the same fault the note
   * above describes, one level further in.
   *
   * AND IT SAYS WHAT PRESSING IT WILL DO. It used to start OFF, so "▸
   * הליכה" meant "press to see a walk". It starts ON now, so the same
   * label sat over a figure that was already there and read as a button
   * that had failed. A toggle has to name its own state.
   */
  const walkable =
    route.name === "stroll" || (route.name === "living" && route.phase === "ASSIGNED_ROUTE");
  const walkingDemo =
    !AVATARS.some((a) => worldSources[a.worldAssetId]) && tab === "home" && walkable ? (
      <Pressable
        onPress={onToggleStandIn}
        accessibilityRole="switch"
        accessibilityState={{ checked: standIn }}
        accessibilityLabel="הדגמה — דמות מושאלת ברחוב. הדמויות פונות למצלמה; האווטאר האמיתי ייראה מהגב."
        style={styles.standIn}
      >
        <Text style={styles.standInText}>
          {standIn ? "▪ הדמות מוצגת (הדגמה)" : "▸ הצגת דמות (הדגמה)"}
        </Text>
      </Pressable>
    ) : null;

  /*
   * THE GROUND SWITCH.
   *
   * Under the walking control rather than beside it: they are both
   * gallery-only, they are both about the same screen, and two pills on
   * one row at 390 points wide would have collided with the header's own
   * trailing control the first time the label grew a word.
   */
  const groundSwitch =
    tab === "home" && GROUND_SCREENS.includes(route.name) ? (
      <Pressable
        onPress={onToggleRealMap}
        accessibilityRole="button"
        accessibilityLabel="החלפה בין המפה המצוירת לבין תוכנית רחובות אמיתית"
        style={styles.groundSwitch}
      >
        <Text style={styles.standInText}>{realMap ? "▪ מפה אמיתית" : "▸ מפה אמיתית"}</Text>
      </Pressable>
    ) : null;

  /*
   * THE CITY TAKES THE WHOLE SCREEN, HEADER AND ALL.
   *
   * Everything else in this app is a BODY under a header and over a
   * utility row. The city is not a body: it is a camera in a place, and
   * a chrome bar across the top of it is the single clearest way to say
   * "this is a widget in an app" about something whose entire purpose
   * is to stop feeling like one. It returns before the frame is built,
   * rather than being slotted into it.
   */
  if (route.name === "city") {
    return (
      <View style={{ width, height }}>
        <City base="./world/" onExit={() => go({ name: "stroll" })} />
      </View>
    );
  }

  return (
    <View style={{ width, height }}>
      {walkingDemo}
      {groundSwitch}
      <AppHeader
        width={width}
        greetingHe="שלום"
        /*
         * THE FACE THE CUSTOMER CHOSE, IN THE ONE PLACE THEY LOOK FOR
         * THEMSELVES.
         *
         * Amit, on the gallery: *"האווטאר ככ קטן שאני לא מצליח לראות
         * אותו אפילו."* Two faults behind one sentence. The circle was
         * 34px, which is fixed in `AppHeader` — and NOTHING HAD EVER
         * PASSED IT A PICTURE. `avatarUri` has been a prop of that
         * header since it was written, and every screen in this
         * prototype rendered the grey stand-in glyph, including for
         * somebody who had just spent a minute choosing a character.
         *
         * So what he was squinting at was not a small avatar. It was
         * the placeholder that means "no avatar", drawn small.
         *
         * `avatarById` turns the stored id into the portrait's asset
         * id; `art` resolves it as far as the pack has arrived. Absent
         * — no choice made, or the file not delivered — the glyph comes
         * back, which is the honest picture of "nobody chosen".
         */
        avatarUri={(() => {
          const chosen = avatarById(avatar);
          if (!chosen) return null;
          const src = art?.[chosen.portraitAssetId] as { uri?: string } | undefined;
          return src?.uri ?? null;
        })()}
        /*
         * A TAB IS A MOVE TOO.
         *
         * These set the tab directly and pushed nothing, so back from the
         * calls list or the card left the prototype entirely instead of
         * returning to the home screen — the one place a reviewer on a
         * phone reaches for back first.
         */
        /*
         * THE MENU IS A MENU NOW.
         *
         * Amit: *"התפריט פה נראה כמו תפריט ראשי, לא יכול להיות שזה מביא
         * אותי ישר לקריאות שלי."* Three lines that go to one screen is a
         * small broken promise on the busiest chrome in the app.
         */
        onMenu={() => goTab("menu")}
        onAccount={() => goTab("card")}
        trailing={
          <Pressable
            onPress={onSwitch}
            accessibilityRole="button"
            accessibilityLabel="מעבר לצד בעל המקצוע"
            style={styles.sideSwitch}
          >
            <Text style={styles.sideSwitchText}>מקצוען</Text>
          </Pressable>
        }
      />

      {/*
        * Every move animates, and the SHAPE of the animation is worked out
        * from the two screens rather than from the control that was
        * pressed — see `navigation-flow.ts`. Going deeper slides one way,
        * coming back slides the other, switching tabs barely moves at all.
        *
        * The key carries the screen's SUBJECT, not just its route name.
        * Tapping a second category is still `category`, so keying on the
        * name alone meant the busiest taps in the app swapped their
        * contents with no motion — the dead tiles Amit kept pointing at.
        */}
      <View style={{ height: bodyH, overflow: "hidden" }}>
        <ScreenTransition transitionKey={screenNow.key} screen={screenNow.screen}>
          {body}
        </ScreenTransition>
      </View>

      {showReturnToPro ? (
        <DemoBar
          label="חזרה לצד בעל המקצוע — לראות מה קורה אצלו"
          onPress={() => onReturnToPro?.()}
          width={width}
        />
      ) : null}

      {demo ? <DemoBar label={demo.label} onPress={demo.next} width={width} /> : null}

      <Sheet
        visible={sheet === "call"}
        onClose={() => setSheet(null)}
        colors={customerTheme.colors}
        titleHe="שיחה דרך PRO NOW"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBody}>
          החיוג עובר דרך מספר מסווה. המספר הפרטי שלך לא נחשף למקצוען, ושלו לא נחשף לך — גם אחרי
          שהעבודה נסגרת.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setSheet(null)}>
          <Text style={styles.sheetPrimaryText}>חיוג למקצוען</Text>
        </Pressable>
        <Text style={styles.sheetNote}>באב־טיפוס אין חיוג אמיתי.</Text>
      </Sheet>

      {/* ---------------------------------------------------------------
          THE SHOP, OPENED.
          ---------------------------------------------------------------
          A full profile rather than the small card that was there before:
          who they are, what they are actually verified for, what people
          have said. It rises over the world instead of replacing it, so
          closing it puts the customer back on the same street rather than
          somewhere new — which is the difference between looking in a
          window and being taken to a page.
          --------------------------------------------------------------- */}
      <FocusSheet
        visible={openVenue !== null}
        titleHe="הפרופיל של המקצוען"
        onDismiss={() => setOpenVenue(null)}
        width={width}
        height={bodyH}
        /*
         * NOT A QUOTE SHEET.
         *
         * ChatGPT's spec, and the reason is the whole journey: *"במצב
         * הסופי הכרטיס תופס כ-38–42% מגובה המסך, לא 78% כמו quote.
         * מאחוריו ממשיכים לראות את החלק העליון של העסק ואת הרחוב."*
         *
         * The camera spent two and a half seconds taking the customer
         * somewhere. A sheet that then covers the place erases what the
         * journey was for. So it sits low, the street stays visible, and
         * the world dims rather than disappearing — a light scrim and no
         * heavy blur.
         */
        heightFraction={CARD_REST.heightShare}
        scrimOpacity={CARD_REST.scrimOpacity}
      >
        <ProProfileBody
          /*
           * THE PERSON WHOSE SHOP WAS OPENED, NOT ALWAYS THE MATCHED ONE.
           *
           * This was `matchFixture.professional` regardless of which shop
           * the customer had just been driven into — so tapping "דוגמה ט׳"
           * opened a profile headed "דוגמה א׳". Caught in a screenshot of
           * the very journey Amit asked about: the camera takes you into
           * somebody's shop, the card rises, and it is a different person.
           *
           * The street's candidates carry their own names (`demo-cand-N`
           * above), so the sheet takes the one that was opened and falls
           * back to the match only when the id is not one of theirs.
           */
          professional={openVenueProfessional}
          services={profileServices}
          reviews={profileReviews}
          workPhotoSubjects={profileWorkPhotos}
          /*
           * INSIDE THE SHOP, IF THE TRADE HAS AN INSIDE DRAWN.
           *
           * Amit: *"איך עושים שבלחיצה על המקצוען נכנסים לתוך החנות שלו
           * ממש בפנים?"* The lookup is by trade, from
           * `venueInteriorAssetId` — so the day an interior lands in the
           * pack under its name, pressing that trade's shop opens into
           * it, with no change here. Today only the barber has one.
           */
          /*
           * NOT HERE ANY MORE — the frame behind this card IS the
           * interior now that the trades have one, so putting the same
           * picture inside the card shows it twice and pushes the
           * person's own name below the fold. The match screen still
           * carries it, because there the camera has not taken anybody
           * anywhere.
           */
          activeSinceYear={2014}
          areaLabelHe="גוש דן"
          fromPriceMinorUnits={17900}
          onBack={() => setOpenVenue(null)}
          /*
           * THE NEXT SHOP ON THE STREET, cycling through the ones the
           * search actually found. Absent when there is only one, in
           * which case the card simply closes — a "next" that comes
           * back to the same shop is worse than no next.
           */
          onNext={
            nextVenueId
              ? () => {
                  setOpenVenue(null);
                  setEnterVenue(nextVenueId);
                }
              : undefined
          }
          width={width}
          height={Math.round(bodyH * CARD_REST.heightShare) - 56}
        />
      </FocusSheet>

      <Sheet
        visible={sheet === "safety"}
        onClose={() => setSheet(null)}
        colors={customerTheme.colors}
        titleHe="בטיחות"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBody}>
          אפשר לשתף את מצב הקריאה עם מישהו שסומכים עליו — הוא יראה מי הגיע, מתי, ומתי העבודה
          נסגרה. בלי הכתובת המלאה שלך.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setSheet(null)}>
          <Text style={styles.sheetPrimaryText}>שיתוף מצב הקריאה</Text>
        </Pressable>
        <Pressable style={styles.sheetSecondary} onPress={() => setSheet(null)}>
          <Text style={styles.sheetSecondaryText}>דיווח על בעיה במהלך הביקור</Text>
        </Pressable>
      </Sheet>

      {/* ----------------------------------------------------------------
          THE PROFESSIONAL COULD NOT COME.

          Told plainly, and the search is already running behind it. The
          alternative — the one the product had — is a tracking screen
          counting down to an arrival that is not going to happen.
          ---------------------------------------------------------------- */}
      <Sheet
        visible={sheet === "released"}
        onClose={() => setSheet(null)}
        colors={customerTheme.colors}
        titleHe="מחפשים לכם מישהו אחר"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBody}>
          המקצוען שהיה בדרך אליכם לא יכול להגיע, והקריאה חזרה לחיפוש. לא חויבתם על כלום.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setSheet(null)}>
          <Text style={styles.sheetPrimaryText}>הבנתי</Text>
        </Pressable>
      </Sheet>

      <Sheet
        visible={sheet === "payment"}
        onClose={() => setSheet(null)}
        colors={customerTheme.colors}
        titleHe="חיוב וחשבונית"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBody}>
          החשבונית נשלחת למייל עם סגירת העבודה, ונשמרת בקריאה עצמה. אמצעי התשלום מחויב רק אחרי
          שאישרת את הסכום.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setSheet(null)}>
          <Text style={styles.sheetPrimaryText}>שליחת החשבונית למייל</Text>
        </Pressable>
        <Text style={styles.sheetNote}>
          ספק הסליקה עדיין לא נבחר — זו החלטה עסקית פתוחה, אז כאן אין חיוב אמיתי.
        </Text>
      </Sheet>

      {/*
        * NO TAB BAR HERE. The customer's home is a command surface — it asks
        * one question, and four permanent doors underneath it imply the
        * answer might be somewhere else. Navigation lives in a thin top row;
        * a live job gets its own capsule, which is not navigation and does
        * not pretend to be. (Visual System v1, and the reasoning is in
        * CommandChrome.tsx.)
        */}
      {capsule ? (
        /*
         * NO `progress` HERE, AND THAT IS THE POINT.
         *
         * The capsule can walk the professional to a known point on the
         * track when the server says how far through the trip they are —
         * `routeProgress` computes that from the ETA at assignment and
         * the ETA now. The preview's open-call record carries only the
         * minutes remaining, so it has the second number and not the
         * first, and one of two numbers is not a fraction.
         *
         * Left out, the figure walks and the road moves past it: alive,
         * and silent about distance, which is exactly what we know.
         * Filling it in from the minutes alone would be inventing the
         * denominator. /CLAUDE.md §3.
         */
        <ActiveJobCapsule
          textHe={capsule.textHe}
          etaMinutes={capsule.etaMinutes}
          onPress={capsule.onPress}
          width={width}
        />
      ) : null}

    </View>
  );
}

// ---------------------------------------------------------------------
// Professional
// ---------------------------------------------------------------------

/**
 * WHAT THE PROFESSIONAL'S SIDE MUST NOT FORGET WHEN IT IS NOT ON SCREEN.
 *
 * The two sides of this prototype are two apps: switching unmounts one
 * and mounts the other. Everything below lived only inside `ProApp`, so
 * a reviewer who crossed to the customer to answer a quote came back to
 * an empty shift — the job the customer had just approved did not exist
 * on the screen of the person doing it.
 *
 * The shift's own totals are here too. A crossing that resets somebody's
 * earnings to zero is the same fault wearing a different number.
 */
interface ProMemory {
  tab: ProTab;
  presence: ProPresenceState;
  job: JobState | null;
  proView: null | "chat" | "presence" | "pricing" | "quote";
  onlineSince: number | null;
  shiftNet: number;
  shiftJobs: number;
  settled: number | null;
  takenRequest: LiveRequest | null;
}

function ProApp({
  geo: proGeo,
  width,
  height,
  onSwitch,
  onBackOut,
  request,
  onTakeRequest,
  pendingQuote,
  quoteDecision,
  sentQuoteLines,
  sentQuoteNotes,
  onSendQuote,
  onQuoteSeen,
  onSeeAsCustomer,
  completionConfirmed,
  onCompletionSeen,
  onReleaseJob,
  customerFaceUri,
  memory,
}: {
  /**
   * The professional's city is the customer's city.
   *
   * It was the last screen still on the painted plate, which is a
   * quieter version of the same drift the customer screens had: a
   * plumber and the person who called them looking at two different
   * streets with the same names.
   */
  geo: WorldGeo | null;
  width: number;
  height: number;
  onSwitch: () => void;
  /**
   * Called when this side has no screen left behind it. Returns true if
   * the gesture was used to leave for the other side, false to let the
   * browser close the page. See `backGesture.ts`.
   */
  onBackOut: () => boolean;
  /** A request the customer side actually made, waiting to be offered. */
  request: LiveRequest | null;
  /** Called once the offer has been taken off the queue. */
  onTakeRequest: () => void;
  /** A quote this professional sent that the customer has not answered. */
  pendingQuote: {
    sentAtMs: number;
    draft: { lines: { id: string; description: string; quantity: number; unitPriceMinorUnits: number; kind: string }[]; notesHe: string } | null;
  } | null;
  /** The customer's answer, once it arrives. */
  quoteDecision: "APPROVED" | "DECLINED" | null;
  /** The lines already sent, so an update opens them rather than a blank form. */
  sentQuoteLines: { id: string; description: string; quantity: number; unitPriceMinorUnits: number; kind: string }[] | null;
  sentQuoteNotes: string;
  onSendQuote: (draft: { lines: { id: string; description: string; quantity: number; unitPriceMinorUnits: number; kind: string }[]; notesHe: string }) => void;
  onQuoteSeen: () => void;
  /**
   * Review-only: cross to the customer's side and open the quote that is
   * waiting there. A real professional has no button that answers as
   * their own customer, which is why this lives on the demo row and says
   * "הדגמה" before it says anything else.
   */
  onSeeAsCustomer?: (what: "quote" | "completion") => void;
  /**
   * The customer has agreed the work is finished.
   *
   * This is what ends a job. The professional's own "סיימתי את העבודה"
   * only moves them to COMPLETION_PENDING — see `JOB_FLOW` — because
   * /docs/09-PAYMENTS.md puts the charge behind the customer's
   * confirmation rather than the professional's claim.
   */
  completionConfirmed?: boolean;
  onCompletionSeen?: () => void;
  /** The professional gave the job back. The customer has to be told. */
  onReleaseJob?: () => void;
  /**
   * The avatar the customer picked for themselves, if they picked one.
   * Their own choice, carried across — not a likeness we invented.
   */
  customerFaceUri?: string | null;
  /**
   * What this side was doing the last time it was mounted. Held above
   * because a crossing unmounts all of it — see `ProMemory`.
   */
  memory?: React.MutableRefObject<ProMemory | null>;
}) {
  const kept = memory?.current ?? null;
  const [tab, setTab] = useState<ProTab>(kept?.tab ?? "shift");
  const [presence, setPresence] = useState<ProPresenceState>(kept?.presence ?? "OFFLINE");
  /*
   * The offer is NOT restored. An offer is a live thing with a clock on
   * it; bringing one back after a trip to another screen would be
   * showing a countdown that never ran.
   */
  const [offerAt, setOfferAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [job, setJob] = useState<JobState | null>(kept?.job ?? null);
  const [proChat, setProChat] = useState<ChatMessage[]>(chatSeed);
  const [proView, setProView] = useState<null | "chat" | "presence" | "pricing" | "quote">(
    kept?.proView ?? null
  );

  /*
   * The draft is NOT kept here. It goes straight up through
   * `onSendQuote` to the shell, which hands it to the customer's
   * approval screen — one copy, so the two sides cannot end up showing
   * different quotes for the same job.
   */

  /**
   * WHICH SERVICES ARE ARMED FOR THIS SHIFT.
   *
   * Amit: *"איך אני מוריד ומעלה אפשרויות?"* The sheet that answered that
   * question said "אפשר לכבות ולהדליק שירותים בכל רגע" and carried no
   * control at all.
   *
   * Held here rather than inside the sheet, because arming a service is
   * not a property of a sheet — it is what the shift screen's chips
   * report and what dispatch would read. A toggle that changed only the
   * sheet would be the same dead control with a nicer surface.
   *
   * Starts as everything the professional is ELIGIBLE for: somebody who
   * has gone to the trouble of being approved for a service wants it on.
   */
  const [armed, setArmed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(proServices.map((s) => [s.id, s.enabled && !s.blockedReasonHe]))
  );

  /*
   * ---------------------------------------------------------------------
   * THE PROFESSIONAL SIDE HAD NO HISTORY AT ALL
   * ---------------------------------------------------------------------
   * Amit: *"באנדרואיד רצוי שהכפתור הטבעי שלו למטרה זו גם יעבוד — כרגע
   * זורק החוצה מהאפליקציה."*
   *
   * The customer side records every move so the phone's back button can
   * undo one. This side navigates with `setProView` and `setTab`, neither
   * of which recorded anything, so the back button had nothing to pop on
   * any professional screen — and the one listener that might have
   * noticed was inside `CustomerApp`, which is not even mounted here.
   *
   * `goPro` is the same idea as the customer's `go`: it remembers where
   * you WERE, not where you are going. That distinction is the bug the
   * customer side already paid for once.
   */
  const proBack = useRef<{ view: null | "chat" | "presence" | "pricing" | "quote"; tab: ProTab }[]>([]);
  const proHere = useRef<{ view: null | "chat" | "presence" | "pricing" | "quote"; tab: ProTab }>({
    view: null,
    tab: "shift",
  });
  const goPro = useCallback((view: null | "chat" | "presence" | "pricing" | "quote") => {
    proBack.current = [...proBack.current, proHere.current].slice(-40);
    setProView(view);
    pushBackEntry();
  }, []);
  const goProTab = useCallback((next: ProTab) => {
    proBack.current = [...proBack.current, proHere.current].slice(-40);
    setTab(next);
    setProView(null);
    pushBackEntry();
  }, []);
  /**
   * The professional's own prices, one row per applied service.
   *
   * They start unset, which is the honest state of a marketplace that has
   * not opened — and is a different thing from free. `pricedForDispatch`
   * treats an unset price as not dispatchable, so the shift screen cannot
   * offer a service nobody has put a number on.
   */
  const [pricing, setPricing] = useState<ProPricingRow[]>(() => {
    // The prices a professional typed are theirs and are tedious to retype;
    // the eligibility that sits beside them is the server's and is rebuilt
    // from the catalogue every time rather than restored from a browser.
    const stored = loadSession()?.prices ?? {};
    return pricingRowsFor([...DEMO_VERIFIED]).map((r) => ({
      ...r,
      amountMinorUnits: r.serviceId in stored ? (stored[r.serviceId] ?? null) : r.amountMinorUnits,
    }));
  });
  useEffect(() => {
    saveSession({
      prices: Object.fromEntries(pricing.map((r) => [r.serviceId, r.amountMinorUnits])),
    });
  }, [pricing]);
  const pricingRows = pricing;
  /**
   * When this shift actually went online. The shift clock counts from a real
   * timestamp rather than from a fixture, so "מחובר כבר" is true and the
   * rate stays withheld for the first 45 minutes exactly as production
   * would withhold it.
   */
  const [onlineSince, setOnlineSince] = useState<number | null>(kept?.onlineSince ?? null);
  const [shiftNow, setShiftNow] = useState(() => Date.now());
  /**
   * The shift's running totals. They start at zero and only move when a job
   * actually settles — which is what makes the completion screen mean
   * something and what makes "לשעת חיבור" a real number rather than a
   * fixture. End the shift and they reset, because they describe THIS shift.
   */
  const [shiftNet, setShiftNet] = useState(kept?.shiftNet ?? 0);
  const [shiftJobs, setShiftJobs] = useState(kept?.shiftJobs ?? 0);
  /** The payout just settled, while the completion screen is showing. */
  const [settled, setSettled] = useState<number | null>(kept?.settled ?? null);
  /**
   * The customer request this offer was built from, captured at the moment
   * the offer was raised. Held here rather than read live, so the card does
   * not change under the professional's hands while the ring counts down.
   */
  const [takenRequest, setTakenRequest] = useState<LiveRequest | null>(kept?.takenRequest ?? null);
  /**
   * Which credential's own page is open, if any. An id rather than the
   * step itself, so the list stays the single source of what each step
   * says — a copy held here would go stale the first time a state
   * changed.
   */
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const openStep = openStepId ? verificationSteps.find((v) => v.id === openStepId) ?? null : null;
  const [proSheet, setProSheet] = useState<
    null | "call" | "navigate" | "services" | "howitworks" | "quote" | "release"
  >(
    /*
     * OPEN ON ARRIVAL, ONCE.
     *
     * The professional side has four tabs, a map, a shift clock, a services
     * list and a countdown that can take over the screen — and until now it
     * explained none of it. "לא מבין כלום מזה הפעולות האלה" is the correct
     * reaction to that, not a failure to read carefully. Four sentences
     * before the first tap costs nothing and removes the confusion at its
     * source.
     *
     * ONCE means once. This side is unmounted every time the reviewer
     * crosses to the customer, so an unconditional "howitworks" reopened
     * the explanation on top of whatever was happening — including on
     * top of a job that was mid-visit, where it covered the whole screen
     * and the way back out. See `ProMemory`.
     */
    kept ? null : "howitworks"
  );

  const BAR = 64;
  /**
   * The demo control only exists while online, with no offer and no job in
   * hand — and it takes its own row. It used to sit on top of "סיום משמרת".
   */
  const showDemo =
    tab === "shift" &&
    presence === "AVAILABLE" &&
    offerAt === null &&
    job === null &&
    settled === null;

  /*
   * ---------------------------------------------------------------------
   * AND ONE FOR THE MOMENT THE BALL IS IN THE OTHER COURT
   * ---------------------------------------------------------------------
   * Amit, with a quote sent and the job waiting: *"איך אני מאשר כרגע את
   * הקריאה מצד הלקוח לראות שזה עובד?"*
   *
   * The mechanism was already there — the customer gets a capsule
   * reading "הצעת מחיר ממתינה לאישורך" that opens the quote — and
   * reaching it meant knowing to press "לקוח" in the tab bar and then
   * finding the capsule. For somebody testing both sides of a handover,
   * that is two guesses at a moment when the screen says "waiting" and
   * offers nothing.
   *
   * So the same demo row that hands the professional a sample call now
   * also hands them the other side of this one. It is a review control
   * and says so, like every other control in this row: a real
   * professional has no button that answers as their customer.
   */
  /*
   * The same crossing at the second wait: the customer's confirmation
   * that the work is done is what ends the job, and a reviewer looking
   * at "ממתין לאישור הלקוח" needs the same one tap to go and give it.
   */
  const showHandover =
    (job === "WAITING_QUOTE_APPROVAL" || job === "COMPLETION_PENDING") && settled === null;
  const bodyH = height - BAR - (showDemo || showHandover ? DEMO_H : 0);

  useEffect(() => {
    if (offerAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [offerAt]);

  /**
   * THE CUSTOMER ANSWERED.
   *
   * Approval moves the job forward; a decline sends it back to diagnosis,
   * because the professional is still standing there and the next thing
   * that has to happen is a revised quote — not a cancelled job. That
   * distinction is the difference between a marketplace and a vending
   * machine.
   */
  useEffect(() => {
    if (!quoteDecision || job !== "WAITING_QUOTE_APPROVAL") return;
    setJob(quoteDecision === "APPROVED" ? "IN_PROGRESS" : "DIAGNOSIS");
    onQuoteSeen();
  }, [quoteDecision, job, onQuoteSeen]);

  /**
   * AND THE CUSTOMER SAID THE WORK IS DONE.
   *
   * Amit: *"איפה המקצוען רואה את האישור עבודה?"* Here — this is the
   * only thing that ends a job. The professional's own "סיימתי את
   * העבודה" leaves them at COMPLETION_PENDING; what settles the money
   * and opens the closing screen is the other person agreeing, and it
   * arrives from the shell the way the quote's answer does.
   *
   * Guarded on the state, not just on the flag: a confirmation that
   * arrived for a job this side is no longer on would otherwise settle
   * whatever job it IS on.
   */
  useEffect(() => {
    if (!completionConfirmed || job !== "COMPLETION_PENDING") return;
    advanceJob();
    onCompletionSeen?.();
  });

  // The shift clock ticks once a second while online, and not at all when
  // offline — there is nothing to count.
  useEffect(() => {
    // Also while a quote is out: the waiting counter is the only thing on
    // that screen that changes, and a frozen counter reads as a frozen app.
    if (onlineSince === null && !pendingQuote) return;
    const id = setInterval(() => setShiftNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onlineSince, pendingQuote]);

  // Going online is a transition the SERVER confirms, so the prototype makes
  // you wait through it rather than flipping instantly — that delay is the
  // honest part of the interaction.
  const toggle = useCallback(() => {
    if (presence === "OFFLINE") {
      setPresence("STARTING_SHIFT");
      setTimeout(() => {
        setPresence("AVAILABLE");
        setOnlineSince(Date.now());
      }, 1200);
    } else {
      setPresence("OFFLINE");
      setOnlineSince(null);
      setShiftNet(0);
      setShiftJobs(0);
      setOfferAt(null);
    }
  }, [presence]);

  /**
   * The offer, built from the customer's actual request when there is one.
   *
   * `offerFixture` stays as the fallback so the professional side can be
   * reviewed on its own — but the moment a request exists, this card is that
   * request: the same service, the same answers, the same media counts.
   * Nothing is re-described in fixture prose, because a fixture that
   * paraphrases a real payload is a fixture that will eventually disagree
   * with it.
   */
  const offer: OfferCardView | null = offerAt
    ? takenRequest
      ? {
          ...offerFixture,
          offerId: `offer_${offerAt}`,
          jobId: `job_${offerAt}`,
          serviceNameHe: takenRequest.serviceNameHe,
          serviceCode: takenRequest.serviceCode,
          priceModel: takenRequest.priceModel,
          offeredAt: new Date(offerAt).toISOString(),
          expiresAt: new Date(offerAt + 30_000).toISOString(),
          customerAreaLabel: takenRequest.areaLabelHe,
          jobDescription: takenRequest.textHe.trim() || null,
          intakeBrief: takenRequest.intakeBrief,
          mediaSummary:
            takenRequest.photos > 0 || (takenRequest.voiceSeconds ?? 0) > 0
              ? { photos: takenRequest.photos, voiceSeconds: takenRequest.voiceSeconds }
              : undefined,
          // The customer was never asked about the floor or the lift, so the
          // card says nothing about them rather than inventing a building.
          arrival: undefined,
          typicalServiceMinutes: takenRequest.typicalMinutes ?? null,
          // VISIT_QUOTE means the payout genuinely is not knowable yet, and
          // the card must say so rather than carry the fixture's number
          // across to a different service.
          expectedPayoutMinorUnits:
            takenRequest.priceModel === "VISIT_QUOTE" ? null : offerFixture.expectedPayoutMinorUnits,
          payoutIsEstimate: takenRequest.priceModel !== "FIXED",
        }
      : {
          ...offerFixture,
          offeredAt: new Date(offerAt).toISOString(),
          expiresAt: new Date(offerAt + 30_000).toISOString(),
        }
    : null;

  /*
   * ---------------------------------------------------------------------
   * AND IT STOPS ON THE CUSTOMER'S CONFIRMATION, WHICH IT DID NOT
   * ---------------------------------------------------------------------
   * Amit: *"איפה מסך אישור התשלום ע"י הלקוח? איפה המקצוען רואה את
   * האישור עבודה?"*
   *
   * COMPLETION_PENDING was missing from this list, so "סיימתי את
   * העבודה" went straight to COMPLETED: the professional declared the
   * work done and the app paid them out on their own say-so, on the
   * same tap. The state machine has two states there for a reason —
   * /docs/09-PAYMENTS.md puts the charge behind the CUSTOMER's
   * confirmation, not the professional's claim — and this side was
   * skipping the one that belongs to the other person.
   *
   * With it in the list the professional's last button leaves them
   * waiting, and what ends the job is the customer pressing "הכול תקין"
   * on their own screen. Which is also the answer to the second half of
   * his question: the approval he was looking for had nowhere to arrive,
   * because nothing was waiting for it.
   */
  /*
   * DERIVED, so this and the tracker cannot disagree about the order.
   *
   * Amit, twice: *"איך הצעת מחיר תשלח אם הוא כבר סיים את העבודה?"* and
   * *"זה אמור להיות לפני שהוא עובד בכלל."* The order he keeps restating
   * is now `VISIT_ORDER`, beside the state machine, with
   * `visitOrderViolations` asserting it — and this list, which is what
   * the professional's buttons actually walk, is that same order with
   * the end of the job on it. A second copy typed out here is a second
   * copy that drifts; the missing COMPLETION_PENDING was exactly that.
   */
  /**
   * THE PRICE THIS SERVICE ALREADY HAS, IF IT HAS ONE.
   *
   * FIXED services carry a figure the customer saw before they asked;
   * VISIT_QUOTE ones carry a visit fee and nothing about the work. So
   * the first is a line the builder should open with, and the second is
   * a form that must stay empty — inventing a starting number there is
   * the app putting a price in somebody's mouth.
   */
  const agreedPrice = useMemo(() => {
    const id = takenRequest?.serviceId ?? null;
    const price = id ? SERVICE_PAGES[id]?.price : undefined;
    if (!price || price.priceModel !== "FIXED" || !price.fixedTotalMinorUnits) return null;
    const amount = price.fixedTotalMinorUnits;
    return {
      lines: [
        {
          id: "l1",
          description: takenRequest?.serviceNameHe ?? "",
          quantity: 1,
          unitPriceMinorUnits: amount,
          kind: "LABOR" as const,
        },
      ],
      noteHe: `לשירות הזה יש מחיר קבוע שסוכם מראש: ${formatMoney(
        money(amount, "ILS")
      )}. אפשר לשנות אם מצאת עבודה נוספת — הלקוח יראה את מה שתשלח.`,
    };
  }, [takenRequest]);

  const JOB_FLOW: JobState[] = [...VISIT_ORDER, "COMPLETED"];
  const advanceJob = () => {
    if (!job) return;
    const i = JOB_FLOW.indexOf(job);
    const next = JOB_FLOW[i + 1];
    if (!next || next === "COMPLETED") {
      /*
       * CLOSING THE LOOP.
       *
       * This used to be `setJob(null)` — the work finished and the app said
       * nothing, dropping the professional back onto a map as though the
       * last fifty minutes had not happened. The payout now lands on the
       * shift, the completion screen states what was added and to what, and
       * it says out loud that they are available again so nobody has to
       * wonder whether to press something.
       */
      const payout = 13400;
      setShiftNet((n) => n + payout);
      setShiftJobs((n) => n + 1);
      setSettled(payout);
      setJob(null);
      return;
    }
    setJob(next);
  };

  /**
   * WHERE THE PROFESSIONAL IS.
   *
   * The order here mirrors the order the body is chosen in, and it has to:
   * if the two disagree, the app animates a move to a screen it is not
   * showing. Kept adjacent for exactly that reason.
   */
  /*
   * Mirrors the state `goPro` records, for the same reason the customer
   * side keeps `hereRef`: `goPro` is memoised with no dependencies so
   * every screen can hold a handler built from it, which means it cannot
   * close over the current view.
   */
  useEffect(() => {
    proHere.current = { view: proView, tab };
  }, [proView, tab]);

  /*
   * And everything a crossing would otherwise throw away — see
   * `ProMemory`. Written on every change rather than on the way out,
   * because there is no "way out": the component is simply unmounted.
   */
  useEffect(() => {
    if (!memory) return;
    memory.current = { tab, presence, job, proView, onlineSince, shiftNet, shiftJobs, settled, takenRequest };
  }, [memory, tab, presence, job, proView, onlineSince, shiftNet, shiftJobs, settled, takenRequest]);

  useEffect(
    () =>
      setBackHandler(() => {
        const previous = proBack.current.pop();
        if (previous) {
          setProView(previous.view);
          setTab(previous.tab);
          return true;
        }
        return onBackOut();
      }),
    [onBackOut]
  );

  const proScreen = useMemo(() => {
    const name =
      settled !== null
        ? "settled"
        : proView === "chat"
          ? "chat"
          : proView === "quote"
            ? "quote"
          : tab === "earnings" || tab === "verify" || tab === "profile"
            ? tab
            : job
              ? "job"
              : proView === "presence"
                ? "presence"
                : proView === "pricing"
                ? "pricing"
                : "shift";
    /*
     * GOING ONLINE IS A CHANGE OF SCREEN, AND WAS NOT TREATED AS ONE.
     *
     * Amit: *"למה נראה כאילו זה נגלל והמסך לא זז?"*
     *
     * The shift screen shows completely different content online and
     * offline — a countdown and earnings against a readiness summary —
     * but both sat under one key. So pressing the biggest button on the
     * professional's app played no transition at all, and the scroll
     * position carried over into content of a different height. What he
     * saw was the page appearing to scroll under his thumb, which is
     * exactly what happens when the content changes and the offset does
     * not.
     *
     * The subject carries the shift state now, so the two states are two
     * screens: a transition plays and each opens at the top.
     */
    /*
     * AND SO IS EVERY STEP OF A JOB.
     *
     * Amit: *"לחצתי על הגעתי, נשארתי שוב באותו מסך. חייב תחלופה
     * ועניין."*
     *
     * The customer's side got this earlier today; this side still had
     * ONE key for the whole visit. So a professional pressed the only
     * button on the screen — "יוצא לדרך", then "הגעתי", then "מתחיל
     * אבחון" — and each time the app changed a word and a button while
     * the screen itself did not move at all, keeping the scroll position
     * from the step before.
     *
     * Each state is its own screen now: the slide plays, it opens at the
     * top, and the five-step tracker's mark advances. Pressing the
     * button visibly does something, which is the least a button owes.
     */
    const subject =
      name === "shift"
        ? presence === "OFFLINE"
          ? "offline"
          : "online"
        : name === "job"
          ? job
          : null;
    return {
      key: screenKey({ side: "pro", name, subject }),
      screen: { side: "pro" as const, name },
    };
  }, [settled, proView, tab, job, presence]);

  const body = settled !== null ? (
    <ProJobSettledBody
      addedNetMinorUnits={settled}
      shiftNetMinorUnits={shiftNet}
      shiftJobCount={shiftJobs}
      onlineMinutes={onlineSince === null ? 0 : Math.floor((shiftNow - onlineSince) / 60000)}
      returningToAvailable={presence === "AVAILABLE"}
      onDone={() => setSettled(null)}
      width={width}
      height={bodyH}
    />
  ) : proView === "chat" ? (
    <ChatBody
      side="pro"
      counterpartNameHe="אמית (תצוגה)"
      counterpartSeed="cust_demo_1"
      jobTitleHe="תיקון נזילה בברז"
      jobOpen
      messages={proChat}
      quickRepliesHe={proQuickReplies}
      onSend={(t) => setProChat((c) => [...c, { id: `p${c.length}`, from: "pro", textHe: t, atHe: nowHHMM() }])}
      onCall={() => setProSheet("call")}
      onBack={() => setProView(null)}
      width={width}
      height={bodyH}
    />
  ) : tab === "earnings" ? (
    <ProEarningsBody
      periodNetMinorUnits={183000}
      periodGrossMinorUnits={215300}
      periodJobCount={14}
      periodLabelHe="השבוע"
      days={earningDays}
      jobs={earningJobs}
      nextPayoutHe="יום שני, 22.9"
      nextPayoutMinorUnits={183000}
      onOpenJob={() => setProSheet("navigate")}
      onBack={() => setTab("shift")}
      width={width}
      height={bodyH}
    />
  ) : tab === "verify" ? (
    /* ----------------------------------------------------------------
       ONE CREDENTIAL AT A TIME, WHEN ONE IS OPEN.

       Amit: *"כל מה שאני לוחץ פה פותח לי בכלל משהו אחר ולא מחובר"*, and
       he was right in the most literal way: `onOpenStep` ignored WHICH
       step had been pressed and opened the services sheet, so five
       different credentials in five different states all led to the same
       unrelated screen.
       ---------------------------------------------------------------- */
    openStep ? (
      <ProVerificationStepBody
        step={openStep}
        /*
         * No submit handler, deliberately. The identity provider is an
         * open decision (/CLAUDE.md §4), and a button that photographs
         * somebody's identity card and says "הוגש" would be presenting a
         * stub as production. The screen says so itself.
         */
        onBack={() => setOpenStepId(null)}
        width={width}
        height={bodyH}
      />
    ) : (
    <ProVerificationBody
      displayNameHe="דוגמה ד׳ (תצוגה)"
      steps={verificationSteps}
      services={proEligibility}
      onOpenStep={(id) => setOpenStepId(id)}
      onBack={() => setTab("shift")}
      width={width}
      height={bodyH}
    />
    )
  ) :
    tab === "profile" ? (
      <ProProfileBody
        professional={matchFixture.professional}
        services={profileServices}
        reviews={profileReviews}
        workPhotoSubjects={profileWorkPhotos}
        activeSinceYear={2014}
        areaLabelHe="גוש דן"
        fromPriceMinorUnits={17900}
        width={width}
        height={bodyH}
      />
    /*
     * ABOVE THE JOB SCREEN, LIKE THE CHAT.
     *
     * The builder is opened FROM a job, so `job` is set the whole time
     * it is up — and with the job screen checked first, pressing "שליחת
     * הצעת מחיר" changed the route and rendered the same screen again.
     * Which is the very fault being fixed, one level down.
     */
    ) : proView === "quote" ? (
      <ProQuoteBuilderBody
        /*
         * The lines already sent, when there are any — so "עדכון ההצעה"
         * opens what was sent rather than an empty form.
         */
        initialLines={
          /*
           * The bridge carries `kind` as a plain string — it crosses two
           * components and a shell — so it is narrowed here rather than
           * cast. An unknown kind falls to OTHER, which is the honest
           * bucket for "we do not know what this is".
           */
          sentQuoteLines?.map((l) => ({
            ...l,
            kind:
              l.kind === "LABOR" || l.kind === "MATERIALS" ? (l.kind as "LABOR" | "MATERIALS") : ("OTHER" as const),
          })) ??
          /*
           * A SERVICE WITH A SET PRICE OPENS WITH IT ALREADY IN.
           *
           * Amit: *"יש מקצועות שיש להם מחירים קבועים ויש מקצועות שזה
           * משתנה."* On a FIXED service the customer was shown a price
           * before anybody was dispatched, so a blank form asks the
           * professional to invent a number that was already agreed —
           * and every one they type that is not it is a deal being
           * changed by accident.
           *
           * The figure comes from the catalogue, which is where the
           * price lives, and it is editable: finding more work is real
           * and this is a quote, not a receipt. What it is not is
           * blank.
           */
          agreedPrice?.lines
        }
        agreedPriceNoteHe={agreedPrice?.noteHe ?? null}
        initialNotesHe={sentQuoteNotes}
        serviceNameHe={takenRequest?.serviceNameHe ?? "תיקון נזילה בברז"}
        symptomsHe={takenRequest ? takenRequest.intakeBrief.map((l) => l.answerHe) : jobSymptoms}
        customerTextHe={takenRequest ? takenRequest.textHe.trim() || null : jobDescription}
        /*
         * The same range the customer will be shown on the approval
         * screen — told here, before the quote goes out, rather than
         * behind the professional's back.
         */
        usualUpToMinorUnits={48000}
        usualSampleSize={14}
        onSend={(draft) => {
          // The lines go to the customer, not only "a quote was sent".
          onSendQuote(draft);
          advanceJob();
          setProView(null);
        }}
        onBack={() => setProView(null)}
        width={width}
        height={bodyH}
      />
    ) : job ? (
      <ProJobBody
        status={job}
        /*
         * The job screen inherits the same request the offer was built
         * from. It used to be hard-coded to "תיקון נזילה בברז" — so a
         * professional could accept a call about a fridge and land on a
         * screen about a tap. The offer and the job are the same job.
         */
        serviceNameHe={takenRequest?.serviceNameHe ?? "תיקון נזילה בברז"}
        mark={(takenRequest?.markName as MarkName) ?? "plumbing"}
        addressHe="רחוב הברזל 12, רמת אביב, תל אביב"
        accessNoteHe="קומה 3, דירה 9 · קוד כניסה 1408"
        routeEtaMinutes={9}
        distanceHe="2.4 ק״מ"
        customerNameHe="אמית (תצוגה)"
        customerSeed="cust_demo_1"
        /*
         * THE FIGURE THE CUSTOMER ACTUALLY CHOSE.
         *
         * Amit: *"למה התמונה של הלקוח לא מהדמויות שבנינו?"* Because
         * nothing was passing it. The picker runs on the other side of
         * the app and the choice was never carried across — so a
         * professional saw a monogram about somebody who had picked one
         * of twelve characters we drew.
         *
         * Null when they skipped the picker, which is a real answer:
         * the monogram comes back, claiming no likeness.
         */
        customerPhotoUri={customerFaceUri}
        symptomsHe={
          takenRequest ? takenRequest.intakeBrief.map((l) => l.answerHe) : jobSymptoms
        }
        descriptionHe={
          takenRequest ? takenRequest.textHe.trim() || "הלקוח לא הוסיף תיאור." : jobDescription
        }
        media={takenRequest ? requestMedia(takenRequest) : jobMedia}
        /*
         * The same range the customer will be shown on the quote screen,
         * told to the professional first. Demonstration figures here, as
         * everywhere in this prototype; in the product both sides read
         * `price-context.ts`, which refuses to speak below eight real
         * jobs — so on a marketplace that has not opened, neither side
         * sees anything.
         */
        usualUpToMinorUnits={48000}
        usualSampleSize={14}
        payoutMinorUnits={job === "DIAGNOSIS" || job === "WAITING_QUOTE_APPROVAL" ? null : 13400}
        payoutIsEstimate={false}
        onAdvance={advanceJob}
        /*
         * OPENS THE FORM RATHER THAN SENDING A FIXTURE.
         *
         * This used to call `onSendQuote()` and advance the job in one
         * tap, so the quote the customer approved was lines written by
         * nobody for a job nobody had looked at. Amit: *"מתחיל אבחון לא
         * קורה כלום, לא עובר לטופס שהוא ממלא."* The send now happens
         * from the form, once there is something to send.
         */
        onSendQuote={() => goPro("quote")}
        waitingMinutes={
          pendingQuote ? Math.floor((shiftNow - pendingQuote.sentAtMs) / 60_000) : null
        }
        /*
         * "עדכון ההצעה" OPENS THE FORM, PRE-FILLED.
         *
         * It opened a sheet that described sending an updated quote,
         * offered "חזרה לאבחון", and admitted underneath that the
         * prototype had no amount editing. The same shape as the button
         * that sent a fixture: a described capability with no control
         * behind it. Amit: *"איפה החלק שאני מרכיב את הצעת המחיר
         * ללקוח?"*
         *
         * Pre-filled with what was sent, because updating a quote means
         * editing it — usually adding the one thing you found — and a
         * blank form means retyping the lines that did not change.
         */
        onWithdrawQuote={() => goPro("quote")}
        /*
         * A confirmation, because this is the rarest and most
         * consequential thing on the screen and the customer finds out
         * about it either way. See `onRelease` in ProJobBody.
         */
        onRelease={() => setProSheet("release")}
        onNavigate={() => setProSheet("navigate")}
        onCall={() => setProSheet("call")}
        onMessage={() => goPro("chat")}
        width={width}
        height={bodyH}
      />
    ) : proView === "presence" ? (
      /*
       * The map-forward presence screen, pushed from the shift screen. It
       * owns "where am I and which services are armed"; the shift screen
       * owns the numbers. Two questions, two screens — putting both on one
       * makes GO ONLINE compete with six figures, and the button loses.
       */
      <ProOnlineBody
        presenceState={presence}
        displayNameHe="דוגמה ד׳ (תצוגה)"
        todayNetMinorUnits={presence === "AVAILABLE" ? 48200 : 0}
        todayJobCount={presence === "AVAILABLE" ? 3 : 0}
        services={proServices}
        onToggleOnline={toggle}
        onManageServices={() => setProSheet("services")}
        onOpenPricing={() => goPro("pricing")}
        onBack={() => setProView(null)}
        width={width}
        height={bodyH}
      />
    ) : proView === "pricing" ? (
      /*
       * WHERE THE PRICE IS SET — דורון's question, answered as a screen.
       *
       * The amounts live in the app rather than in the screen because they
       * are the professional's, not this view's: they belong to the account
       * and will be the server's. Nothing here computes a net payout, since
       * the commission is an undecided business question (/CLAUDE.md §4).
       */
      <ProPricingBody
        rows={pricingRows}
        commissionPercent={null}
        onChange={(serviceId, amountMinorUnits) =>
          setPricing((prev) =>
            prev.map((r) => (r.serviceId === serviceId ? { ...r, amountMinorUnits } : r))
          )
        }
        onBack={() => setProView("presence")}
        width={width}
        height={bodyH}
      />
    ) : (
      <ProShiftBody
        geo={proGeo}
        displayNameHe="דוגמה ד׳ (תצוגה)"
        presenceState={presence}
        shift={{
          onlineSinceMs: onlineSince,
          // Real running totals, moved only by a job that actually settled.
          // A shift that has just started therefore reads ₪0 / 0 jobs, which
          // is the honest starting state and the case "לשעת חיבור" has to
          // survive.
          settledNetMinorUnits: onlineSince === null ? null : shiftNet,
          completedJobs: shiftJobs,
        }}
        /*
         * A deliberately PARTIAL briefing. The server here knows how many
         * peers are online and what this professional earned last week; it
         * has no area demand reading. The screen must therefore render two
         * lines, not three, and must not fill the gap.
         */
        briefing={{ peersOnline: 2, lastWeekNetMinorUnits: 384000, lastWeekOnlineMinutes: 1215 }}
        services={proServices.map((s) => ({
          id: s.id,
          nameHe: s.nameHe,
          mark: s.mark,
          // Eligible AND armed. Either one alone is not "taking calls".
          live: s.enabled && !s.blockedReasonHe && (armed[s.id] ?? true),
        }))}
        nowMs={shiftNow}
        onToggleOnline={toggle}
        onOpenEarnings={() => goProTab("earnings")}
        /*
         * STRAIGHT TO THE SERVICES, NOT TO A SCREEN THAT HAS THEM.
         *
         * This opened the presence screen, which has its own "ניהול"
         * that opens the services sheet — so the link sitting beside
         * "שירותים במשמרת" took two hops to reach the services, and the
         * first hop landed somewhere about location and shift state.
         * Amit: *"איך אני מוריד ומעלה אפשרויות?"* He pressed the label
         * that promised it and did not arrive.
         */
        onManageServices={() => setProSheet("services")}
        onOpenPresence={() => goPro("presence")}
        /*
         * THE PLATE, AND NOTHING ELSE — because that is what the
         * professional's app ships.
         *
         * Handing this the gallery's whole pack draws eleven PRO NOW
         * shopfronts into the band, and the shipped app cannot: it
         * carries one file, for half a megabyte rather than eight. A
         * gallery that shows a richer screen than the product is the
         * two-worlds problem that cost a whole night once already, so it
         * is given exactly what the app has.
         */
        worldSources={proWorldSources}
        width={width}
        height={bodyH}
      />
    );

  return (
    <View style={{ width, height }}>
      {/*
        * The professional's side moves by the same rules as the customer's:
        * four tabs that are siblings of each other, and the work that sits
        * below them. See `navigation-flow.ts`.
        *
        * The job's STATE is not part of the key. A job going from assigned
        * to en route to diagnosis is one screen following a job, not three
        * pages — keying on it replayed a page transition over a
        * professional who was mid-drive.
        */}
      <View style={{ height: bodyH, overflow: "hidden" }}>
        <ScreenTransition transitionKey={proScreen.key} screen={proScreen.screen}>
          {body}
        </ScreenTransition>
      </View>

      {/*
        * An offer ARRIVES. It does not replace a tab — it rises over
        * whatever the professional was looking at, the way a call does,
        * because that is what makes it an event rather than a page.
        */}
      {offer ? (
        <RiseIn key={offerAt ?? 0} width={width} height={height}>
          <ProOfferBody
            offer={offer}
            nowMs={now}
            onAccept={() => {
              setOfferAt(null);
              setJob("PRO_ASSIGNED");
            }}
            onSkip={() => setOfferAt(null)}
            width={width}
            height={height}
          />
        </RiseIn>
      ) : null}

      {showHandover ? (
        <DemoBar
          dark
          label={
            job === "COMPLETION_PENDING"
              ? "מעבר לצד הלקוח כדי לאשר שהעבודה הושלמה"
              : "מעבר לצד הלקוח כדי לאשר את ההצעה"
          }
          onPress={() => onSeeAsCustomer?.(job === "COMPLETION_PENDING" ? "completion" : "quote")}
          width={width}
        />
      ) : null}

      {showDemo ? (
        <DemoBar
          dark
          /*
           * The label tells the truth about which of the two things is
           * about to happen: replay the sample offer, or deliver the
           * request the customer side actually just made.
           */
          label={request ? "הקריאה ששלחת בצד הלקוח ממתינה" : "שלח אליי עכשיו קריאה לדוגמה"}
          onPress={() => {
            setTakenRequest(request);
            if (request) onTakeRequest();
            setOfferAt(Date.now());
          }}
          width={width}
        />
      ) : null}

      <Sheet
        visible={proSheet === "howitworks"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="איך זה עובד — בקצרה"
        width={width}
        height={height}
      >
        {[
          {
            n: "1",
            t: "אתה מחליט מתי אתה עובד",
            d: "כל עוד אתה לא במשמרת — לא מגיעות אליך קריאות. לוחצים ״התחלת משמרת״ ומתחילים.",
          },
          {
            n: "2",
            t: "קריאה מגיעה אליך לבד",
            d: "לא מחפשים לקוחות ולא מתמודדים מול אחרים. הקריאה נשלחת לבעל מקצוע אחד בכל פעם — אליך.",
          },
          {
            n: "3",
            t: "רואה הכל לפני שאתה מחליט",
            d: "מה צריך שם, איפה זה, כמה זמן נסיעה וכמה אתה מקבל. יש לך כמה שניות לענות כן או לא.",
          },
          {
            n: "4",
            t: "אמרת לא — לא קרה כלום",
            d: "הקריאה עוברת לבעל מקצוע אחר. אין קנס, אין ציון, אין פגיעה בך.",
          },
        ].map((x) => (
          <View key={x.n} style={styles.howRow}>
            <View style={styles.howNum}>
              <Text style={styles.howNumText}>{x.n}</Text>
            </View>
            <View style={styles.howText}>
              <Text style={styles.howTitle}>{x.t}</Text>
              <Text style={styles.howBody}>{x.d}</Text>
            </View>
          </View>
        ))}
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>הבנתי, בוא נתחיל</Text>
        </Pressable>
      </Sheet>

      <Sheet
        visible={proSheet === "quote"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="עדכון ההצעה"
        width={width}
        height={height}
      >
        {/*
          * Kept only as an explanation now: the ACTION lives on the job
          * screen and opens the form pre-filled. The note under it used
          * to say the prototype had no amount editing, which stopped
          * being true the moment P19 existed — a stale caveat is its own
          * kind of lie.
          */}
        <Text style={styles.sheetBodyDark}>
          כל עוד הלקוח לא אישר, אפשר לשלוח הצעה מעודכנת — למשל אחרי שגילית משהו נוסף באבחון.
          ההצעה הקודמת מתבטלת והלקוח מקבל את החדשה לאישור.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>הבנתי</Text>
        </Pressable>
      </Sheet>

      <Sheet
        visible={proSheet === "call"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="שיחה עם הלקוח"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBodyDark}>
          החיוג עובר דרך מספר מסווה. המספר הפרטי שלך לא נחשף ללקוח — גם לא אחרי שהעבודה נסגרת.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>חיוג ללקוח</Text>
        </Pressable>
        <Text style={styles.sheetNoteDark}>באב־טיפוס אין חיוג אמיתי.</Text>
      </Sheet>

      {/* ----------------------------------------------------------------
          GIVING THE JOB BACK.

          Amit: *"אחרי שהוא רשם כן אני לוקח, הוא לא יכול להתחרט? אין פה
          כפתור ביטול או חזור."*

          What this sheet says is only what is certain. The customer is
          told and re-matched — that is mechanical. What it does NOT say
          is whether this costs the professional anything or what
          repeated releases do to their dispatch: both are business rules
          and both are open (/CLAUDE.md §4 lists cancellation fees by
          name), and a screen that guessed at them would be inventing the
          most consequential sentence on it.
          ---------------------------------------------------------------- */}
      <Sheet
        visible={proSheet === "release"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="שחרור הקריאה"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBodyDark}>
          הלקוח מקבל הודעה מיד ואנחנו מתחילים לחפש לו מישהו אחר. הקריאה הזו כבר לא שלך.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="אישור שחרור הקריאה"
          style={styles.sheetPrimary}
          onPress={() => {
            setProSheet(null);
            setJob(null);
            setTakenRequest(null);
            onReleaseJob?.();
          }}
        >
          <Text style={styles.sheetPrimaryText}>שחרור הקריאה</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ביטול — חזרה לעבודה"
          style={styles.sheetSecondary}
          onPress={() => setProSheet(null)}
        >
          <Text style={styles.sheetSecondaryText}>חזרה לעבודה</Text>
        </Pressable>
      </Sheet>

      <Sheet
        visible={proSheet === "navigate"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="ניווט"
        width={width}
        height={height}
      >
        <Text style={styles.sheetBodyDark}>
          רחוב הברזל 12, רמת אביב · קומה 3, דירה 9 · קוד כניסה 1408
        </Text>
        {/*
          * IT OPENS MAPS NOW.
          *
          * Amit: *"איפה הכתובת נפתחת במפות עם זמן מוערך לנסיעה?"* This
          * button said "פתיחה באפליקציית הניווט" and closed the sheet,
          * under a note explaining that the maps VENDOR is an open
          * decision. The note is true and it was excusing the wrong
          * thing: computing routes needs a vendor, handing an address to
          * the app somebody already has needs a link. A professional
          * standing beside their van looking at an address they cannot
          * open was being told the app cannot do what every app does.
          *
          * The drive time they then see is their maps app's, computed by
          * it and presented by it — which is also why this is allowed to
          * exist while `MapsRoutingProvider` is still undecided. We are
          * not claiming a number; we are handing over an address.
          */}
        <Pressable
          style={styles.sheetPrimary}
          onPress={() => {
            const address = "רחוב הברזל 12, רמת אביב, תל אביב";
            if (!canHandOffToMaps(address)) return;
            const platform: MapsPlatform =
              Platform.OS === "android" ? "android" : Platform.OS === "ios" ? "ios" : "web";
            void Linking.openURL(mapsHandoffUrl(address, platform));
            setProSheet(null);
          }}
        >
          <Text style={styles.sheetPrimaryText}>פתיחה באפליקציית הניווט</Text>
        </Pressable>
        <Text style={styles.sheetNoteDark}>
          זמן הנסיעה שיוצג שם הוא של אפליקציית הניווט שלך. PRO NOW לא מחשב מסלולים — ספק המפות עוד
          לא נבחר — אז המספר הזה שלה, לא שלנו.
        </Text>
      </Sheet>

      <Sheet
        visible={proSheet === "services"}
        onClose={() => setProSheet(null)}
        colors={proTheme.colors}
        dark
        titleHe="שירותים פעילים"
        width={width}
        height={height}
      >
        {/*
          * This said "אפשר לכבות ולהדליק שירותים בכל רגע" and gave no way
          * to do either. Amit went looking for the control and concluded
          * the screen was broken, which is the right conclusion: an app
          * that describes a capability it does not offer is worse than
          * one that stays quiet about it.
          */}
        <ProServicesBody
          rows={proServices.map((s) => ({
            id: s.id,
            nameHe: s.nameHe,
            mark: s.mark,
            eligible: s.enabled && !s.blockedReasonHe,
            live: armed[s.id] ?? true,
            blockedReasonHe: s.blockedReasonHe,
          }))}
          onToggle={(id, next) => setArmed((a) => ({ ...a, [id]: next }))}
          width={width - spacing.xl * 2}
          height={Math.round(height * 0.5)}
        />
      </Sheet>

      <TabBar
        dark
        width={width}
        height={BAR}
        items={[
          /*
           * Plain Hebrew, and a different mark per tab.
           *
           * These read "התמורה שלך" and "מאומת" — product vocabulary that
           * means nothing to someone opening the app for the first time —
           * and two of the four shared the same clock icon, so even the
           * shapes gave no help. A tab label's only job is to say where it
           * goes.
           */
          { key: "shift", label: "המשמרת", mark: "clock" as const },
          { key: "earnings", label: "כמה הרווחתי", mark: "wallet" as const },
          { key: "verify", label: "המסמכים שלי", mark: "shield" as const },
          { key: "profile", label: "הפרופיל", mark: "person" as const },
        ]}
        active={tab}
        onPress={(k) => goProTab(k as ProTab)}
        onSwitch={onSwitch}
        switchLabel="לקוח"
      />
    </View>
  );
}

// ---------------------------------------------------------------------

/**
 * The control that drives the prototype forward.
 *
 * It used to be a small pill floating over the content, and the first person
 * to use it could not hit it. That is a real finding about tap targets, not
 * a prototype quirk: a control that advances the whole demo has no business
 * being the smallest thing on screen. It is now a full-width bar with a
 * 56px target, sitting in its own space above the tab bar rather than
 * hovering over someone else's text.
 */
/**
 * THE DEMO STRIP.
 *
 * It used to float at `bottom: 64`, directly over whatever the screen had
 * put there — which on the professional's screen was "סיום משמרת". Two
 * different actions, stacked on the same pixels: the most important control
 * on the screen sat underneath a demo affordance, and Amit could neither
 * read it nor press it.
 *
 * It is now a strip in the layout, above the tab bar, in a colour that
 * belongs to neither app surface, and it says what it is before it says what
 * it does. A demo control that can be mistaken for the product is worse than
 * no demo control.
 */
/**
 * The screens where walking is a thing that exists.
 *
 * Home, because the street's door is there; the street itself; and the
 * living map, which is where the wait's game runs. Everywhere else the
 * control would be describing something that is not on the screen.
 */
/*
 * WHERE A WALKING DEMO MAKES ANY SENSE AT ALL.
 *
 * "home" was on this list and should not have been. The home screen has
 * a city behind it, which is why it looked like a street — but nobody
 * walks on it: there is no figure, no pad and nothing to steer. So the
 * button was permanently parked over the top-left of the first screen
 * anyone sees, offering a demonstration of something that screen does
 * not do. Amit, on the artifact: *"למה הכפתור הזה תמיד פה."*
 *
 * It belongs on the two screens where somebody actually walks. It also
 * disappears on its own the moment the twelve walking figures arrive —
 * see `walkingDemo` — which is the real answer to "why is it here": it
 * is standing in for art that has not landed yet.
 */

/*
 * THE GROUND SWITCH REACHES FURTHER THAN THE WALKING ONE.
 *
 * Walking only makes sense where there is somebody to walk. A real street
 * plan matters most on the screen Amit watches for twenty minutes — the
 * one where the question is "where are they" — so tracking is in the list
 * even though nobody strolls on it.
 */
const GROUND_SCREENS = ["stroll", "living", "tracking"];

const DEMO_H = 60;

function DemoBar({
  label,
  onPress,
  width,
  dark = false,
}: {
  label: string;
  onPress: () => void;
  width: number;
  dark?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`הדגמה: ${label}`}
      style={({ pressed }) => [
        styles.demoBar,
        { width, backgroundColor: dark ? "#2E2640" : "#E8E2DC" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.demoBarHint, { color: dark ? "#A79FB3" : "#5A5266" }]}>
        הדגמה — לא חלק מהאפליקציה
      </Text>
      <Text style={[styles.demoBarText, { color: dark ? "#F7F3FA" : "#17121F" }]}>▸ {label}</Text>
    </Pressable>
  );
}

/**
 * The media the customer actually attached, as placeholder rows.
 *
 * `uri: null` throughout, and the job screen already says so rather than
 * miming playback — the prototype holds the real blobs only on the customer
 * side of this browser tab, and copying them across would be inventing a
 * transfer that has no server behind it. The COUNTS are real, which is the
 * part the professional decides on.
 */
function requestMedia(r: LiveRequest): JobMediaItem[] {
  const out: JobMediaItem[] = [];
  if ((r.voiceSeconds ?? 0) > 0) {
    out.push({
      id: "req-voice",
      kind: "VOICE",
      subjectHe: "הקלטה מהלקוח",
      seconds: Math.round(r.voiceSeconds ?? 0),
      uri: null,
    });
  }
  for (let i = 0; i < r.photos; i += 1) {
    out.push({
      id: `req-photo-${i}`,
      kind: "PHOTO",
      subjectHe: `תמונה ${i + 1} מהלקוח`,
      uri: null,
    });
  }
  return out;
}

/** Slides and fades a full-screen layer in from below. */
function RiseIn({
  children,
  width,
  height,
}: {
  children: React.ReactNode;
  width: number;
  height: number;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [v]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [height * 0.45, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function TabBar({
  items,
  active,
  onPress,
  onSwitch,
  switchLabel,
  width,
  height,
  dark = false,
}: {
  items: { key: string; label: string; mark: NavGlyphName }[];
  active: string;
  onPress: (key: string) => void;
  onSwitch: () => void;
  switchLabel: string;
  width: number;
  height: number;
  dark?: boolean;
}) {
  const colors = dark ? proTheme.colors : customerTheme.colors;
  return (
    <View
      style={[
        styles.bar,
        {
          width,
          height,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      {items.map((it) => {
        const on = it.key === active;
        return (
          <Pressable key={it.key} onPress={() => onPress(it.key)} style={styles.barItem} accessibilityRole="tab">
            <TabGlyph name={it.mark} color={on ? colors.actionText : colors.textSecondary} />
            <Text style={[styles.barLabel, { color: on ? colors.actionText : colors.textSecondary }]} numberOfLines={1}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}

      <Pressable onPress={onSwitch} style={styles.barItem} accessibilityRole="button">
        <View style={[styles.switchPill, { backgroundColor: tint.trust(dark ? 0.18 : 0.12) }]}>
          <Text style={[styles.switchText, { color: colors.trust }]} numberOfLines={1}>
            {switchLabel}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * The profile tab shows the person's own illustrated face rather than a
 * generic outline — it is the one tab that is about them.
 */
function TabGlyph({ name, color }: { name: NavGlyphName; color: string }) {
  if (name === "person") return <Persona seed="tabbar-person" size={22} />;
  return <NavGlyph name={name} size={22} color={color} />;
}

const styles = StyleSheet.create({
  /*
   * SMALL, AND ON THE LEFT.
   *
   * It began as a full-width strip and covered the greeting and the
   * headline of whatever screen it was on — the app's own words, hidden
   * by a control that is not part of the app. In a right-to-left layout
   * the text runs to the right, so the left edge is the one corner that
   * is reliably free.
   */
  standIn: {
    position: "absolute",
    zIndex: 5,
    /*
     * TOP LEFT, AND ONLY ON THE TWO SCREENS THAT WALK.
     *
     * The complaint was that it was *always* there — it was listed for
     * the home screen, which has a city behind it and nobody walking on
     * it, so it was parked over the first screen anyone sees. That is
     * fixed by the list, not by the position.
     *
     * Moving it to the bottom instead was my own mistake and lasted one
     * screenshot: the wait screen's drawer owns the bottom, and the
     * button landed on top of "לעקוב אחרי". The steer pad and the safety
     * control both sit ABOVE that drawer for exactly this reason, and a
     * gallery-only control has no business taking space they need.
     */
    top: spacing.xl * 2,
    left: spacing.md,
    /*
     * 44 POINTS, BECAUSE THE SWEEP SAID SO.
     *
     * `paddingVertical: 6` made this 36 points tall, and the screen sweep
     * reported it as too small to hit on five different screens. It is a
     * gallery-only control, which is exactly why it was easy to leave —
     * but Amit taps it on a phone, and a control that misses is a control
     * that looks broken. 44 is the floor the sweep enforces for every
     * other target in the product.
     */
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(46,38,64,0.92)",
    alignItems: "center",
  },
  groundSwitch: {
    position: "absolute",
    zIndex: 5,
    top: spacing.xl * 2 + 52,
    left: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(46,38,64,0.92)",
    alignItems: "center",
  },
  standInText: { ...t.bodyStrong, color: "#F7F3FA" },
  standInHint: { ...t.caption, color: "#A79FB3" },
  root: { flex: 1, alignItems: "center", justifyContent: "flex-start" },

  notice: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(23,18,31,0.92)",
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  noticeText: { ...t.caption, color: "#FFFFFF", textAlign: "center", writingDirection: "rtl" },
  noticeSub: {
    ...t.caption,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
  },

  howRow: { flexDirection: "row-reverse", gap: 12, marginBottom: 18, alignItems: "flex-start" },
  howNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,92,56,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  howNumText: { ...t.captionStrong, color: proTheme.colors.actionText },
  howText: { flex: 1 },
  howTitle: { ...t.bodyStrong, color: proTheme.colors.textPrimary, textAlign: "right" },
  howBody: {
    ...t.caption,
    fontSize: scale.meta,
    lineHeight: 20,
    color: proTheme.colors.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },
  demoBar: {
    height: DEMO_H,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(128,120,140,0.35)",
  },
  sheetBody: {
    ...t.body,
    fontSize: scale.meta,
    color: customerTheme.colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  sheetPrimary: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: customerTheme.colors.action,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  /*
   * White on coral is 3.07:1 — below WCAG for body text, and the same
   * defect the palette split was written to remove. Ink on coral is 5.99:1.
   */
  sheetPrimaryText: { ...t.bodyStrong, fontSize: scale.body, color: customerTheme.colors.onAction },
  /*
   * The side switch is a prototype affordance, not product navigation —
   * a real customer has no professional side to jump to. It sits quietly
   * at the bottom-left rather than occupying a slot in a navigation bar.
   */
  sideSwitch: {
    minHeight: 44,
    minWidth: 68,
    alignItems: "center",
    marginLeft: spacing.xs,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.trust(0.2),
  },
  /*
   * The teal that is legible on ivory is 3.76:1 on the dark header — the
   * audit caught it on eight screens the moment the customer app went dark.
   * The dark side already has a token for this exact problem.
   */
  sideSwitchText: { ...t.caption, fontSize: scale.micro, fontWeight: "700", color: proTheme.colors.trust },
  sheetSecondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  sheetSecondaryText: { ...t.captionStrong, color: customerTheme.colors.statusDanger },
  sheetNote: {
    ...t.caption,
    color: customerTheme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },

  sheetBodyDark: {
    ...t.body,
    fontSize: scale.meta,
    color: proTheme.colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },
  sheetNoteDark: {
    ...t.caption,
    color: proTheme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },

  demoBarText: { ...t.bodyStrong, fontSize: scale.body, color: "#FFFFFF", writingDirection: "rtl" },
  demoBarHint: { ...t.caption, fontSize: scale.micro, color: "rgba(255,255,255,0.65)", writingDirection: "rtl" },

  bar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 6,
  },
  barItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 6 },
  barLabel: { ...t.caption, fontSize: scale.micro, fontWeight: "600", writingDirection: "rtl" },

  switchPill: {
    minHeight: 44,
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  switchText: { ...t.caption, fontSize: scale.micro, fontWeight: "700", writingDirection: "rtl" },
});

/**
 * WHAT THE GALLERY DID INSTEAD OF THE REAL THING.
 *
 * Two places in this preview stop short of an action the shipping app
 * performs: handing a URL to the platform's browser, and sending a
 * business owner's details somewhere. Both stop for the same reason —
 * a developer gallery must not navigate a reviewer away mid-walk, and
 * must never appear to have submitted something it swallowed.
 *
 * So the gallery says so, on screen, in the place the action would have
 * happened. A silent no-op would look exactly like a working button,
 * which is the failure this note exists to prevent.
 */
function PreviewNote({ textHe }: { textHe: string }) {
  return (
    <View
      style={{
        position: "absolute",
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.xl,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.md,
        backgroundColor: "rgba(23,18,31,0.92)",
        borderWidth: 1,
        borderColor: "rgba(247,243,250,0.24)",
      }}
    >
      <Text
        style={{
          ...t.micro,
          color: "#F7F3FA",
          textAlign: "right",
          writingDirection: "rtl",
        }}
      >
        {textHe}
      </Text>
    </View>
  );
}
