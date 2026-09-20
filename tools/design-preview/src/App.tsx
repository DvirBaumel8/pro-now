import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CARD_REST, customerCategoryById, liveAreaLineHe, DEMO_WORLD, type CandidatePresence, type LivingMapPhase, type LivingMapState, themeForDepartment } from "@pro-now/types";
import { discover, emptyDiscoveries, type DiscoveryState } from "@pro-now/types";
import { AVATARS, screenKey, travelAssetFor, type AvatarChoice } from "@pro-now/types";
import { matchServicesByText } from "@pro-now/ui";
import { canSaveSession, clearSession, loadSession, saveSession, savedAgoHe } from "./session";
import { HAIR_DISCOVERY_IDS } from "@pro-now/ui";

import { worldSources } from "./worldSources";

import { ActiveJobCapsule, AddressPickerBody, AppHeader, AvatarPickerBody, customerDarkTheme, FocusSheet, ScreenTransition, ArrivalVerifyBody, CallsListBody, CAPSULE_HEIGHT, ChatBody, ConnectionBanner, CategoryBody, CustomerHomeBody, CustomerProfileBody, customerTheme, DescribeFaultBody, JobCompleteBody, lex, MatchConfirmBody, NavGlyph, Persona, PhoneAuthBody, ProEarningsBody, ProJobBody, ProJobSettledBody, ProOfferBody, ProOnlineBody, ProPricingBody, ProProfileBody, ProShiftBody, proTheme, ProVerificationBody, QuoteApprovalBody, radii, scale, SearchingBody, ServiceDetailBody, Sheet, spacing, tint, TrackingBody, type as t, WelcomeBody } from "@pro-now/ui";
import type { JobMediaItem, LiveLocationState, MarkName, NavGlyphName, ProPricingRow } from "@pro-now/ui";
import type { AuthStage, ChatMessage, ConnectionState } from "@pro-now/ui";
import { buildIntakeBrief, pilotIntakeByService, pilotServiceById, readAvailability } from "@pro-now/types";
import type { IntakeAnswer, IntakeBriefLine, OfferCardView, PriceModel } from "@pro-now/types";
import type { JobState, ProPresenceState } from "@pro-now/types";

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
} from "./catalogAdapter";
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

type CustomerTab = "home" | "calls" | "card";
type ProTab = "shift" | "earnings" | "verify" | "profile";
type Side = "customer" | "pro";
/** Before either side's app: the landing page and the sign-in. */
type Gate =
  | { name: "welcome" }
  | { name: "auth"; side: Side }
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
  | { name: "tracking"; stage: "assigned" | "enroute" | "arrived" }
  /** The minute before the knock. See ArrivalVerifyBody. */
  | { name: "arrival" }
  | { name: "quote" }
  | { name: "complete" };

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

  /**
   * The avatar, and whether the question has been answered at all.
   *
   * Two values rather than one, because `null` is ambiguous on its own: it
   * is both "has not been asked" and "was asked and said no". Only the
   * second may skip the screen.
   */
  const [avatar, setAvatar] = useState<AvatarChoice>(restored?.avatar ?? null);
  const avatarAnswered = useRef(restored?.avatarAnswered ?? false);
  /**
   * Whether any avatar art has actually arrived.
   *
   * The whole screen is gated on this. See the comment at the call site
   * for why an empty picker is worse than no picker at all.
   */
  const avatarArtReady = AVATARS.some((a) => worldSources[a.portraitAssetId]);

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
  const [pendingQuote, setPendingQuote] = useState<{ sentAtMs: number } | null>(null);
  const [quoteDecision, setQuoteDecision] = useState<"APPROVED" | "DECLINED" | null>(null);
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
            gate?.name === "auth" ? `gate:auth:${gate.side}` : gate?.name === "welcome" ? "gate:welcome" : "gate:app"
          }
          screen={{ side: "gate", name: gate?.name === "auth" ? "auth" : gate?.name === "welcome" ? "welcome" : "home" }}
        >
        {gate?.name === "welcome" ? (
          <WelcomeBody
            worldSources={worldSources}
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
              const canAsk = gate.side === "customer" && !avatarAnswered.current && avatarArtReady;
              setGate(canAsk ? { name: "avatar" } : null);
            }}
            onBack={() => setGate({ name: "welcome" })}
            width={w}
            height={h - bannerH}
          />
        ) : gate?.name === "avatar" ? (
          <AvatarPickerBody
            value={avatar}
            sources={worldSources}
            onChoose={(id) => {
              setAvatar(id);
              avatarAnswered.current = true;
              saveSession({ avatar: id, avatarAnswered: true });
              setGate(null);
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
            }}
            width={w}
            height={h - bannerH}
          />
        ) : side === "customer" ? (
          <CustomerApp
            width={w}
            height={h - bannerH}
            onSwitch={() => setSide("pro")}
            onSendRequest={setLiveRequest}
            pendingQuote={pendingQuote}
            onQuoteDecision={(d) => {
              setQuoteDecision(d);
              setPendingQuote(null);
            }}
          />
        ) : (
          <ProApp
            width={w}
            height={h - bannerH}
            onSwitch={() => setSide("customer")}
            request={liveRequest}
            onTakeRequest={() => setLiveRequest(null)}
            pendingQuote={pendingQuote}
            quoteDecision={quoteDecision}
            onSendQuote={() => {
              setQuoteDecision(null);
              setPendingQuote({ sentAtMs: Date.now() });
            }}
            onQuoteSeen={() => setQuoteDecision(null)}
          />
        )}
        </ScreenTransition>
        </View>

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

function CustomerApp({
  width,
  height,
  onSwitch,
  onSendRequest,
  pendingQuote,
  onQuoteDecision,
}: {
  width: number;
  height: number;
  onSwitch: () => void;
  onSendRequest: (r: LiveRequest) => void;
  /** A quote the professional sent and the customer has not answered. */
  pendingQuote: { sentAtMs: number } | null;
  onQuoteDecision: (d: "APPROVED" | "DECLINED") => void;
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
  const [sheet, setSheet] = useState<null | "call" | "safety" | "payment">(null);
  /*
   * WHICH SHOP IS OPEN.
   *
   * Amit: *"כל חנות כזו בעצם תהיה הכרטיס, שם יקפוץ פרופיל המקצוען."* The
   * venue was decorative until now — a building you cannot open is a
   * picture of a choice rather than a choice.
   */
  const [openVenue, setOpenVenue] = useState<string | null>(null);
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
    PINNED
      ? { name: "living", serviceId: PINNED.serviceId, phase: PINNED.phase }
      : REVIEW_CYCLE
        ? { name: "living", serviceId: "svc-leak", phase: "SEARCHING" }
        : { name: "home" }
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

  const advance =
    tab === "home" && route.name === "tracking"
      ? route.stage === "assigned"
        ? { label: "המקצוען יצא לדרך", next: () => go({ name: "tracking", stage: "enroute" }) }
        : route.stage === "enroute"
          ? { label: "המקצוען כמעט אצלך", next: () => go({ name: "arrival" }) }
          : { label: "המקצוען שלח הצעת מחיר", next: () => go({ name: "quote" }) }
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

  const UTIL = 56;
  const bodyH = height - UTIL - (demo ? DEMO_H : 0) - (capsule ? CAPSULE_HEIGHT : 0);

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
  const pushHistory = () => {
    if (typeof window === "undefined") return;
    window.history.pushState({ proNow: true }, "");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      const previous = backStack.current.pop();
      // Nothing behind us: home, rather than falling out of the prototype.
      setRoute(previous?.route ?? { name: "home" });
      // The tab comes back too. Going back from a screen opened out of the
      // calls list used to land on the home tab, which is a different
      // place from the one you left.
      setTab(previous?.tab ?? "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keep the "where we are" refs in step with the state they mirror. This
  // does NOT push anything: `go` does the pushing, because only `go` knows
  // that a move is happening rather than a re-render.
  useEffect(() => {
    hereRef.current = route;
    tabRef.current = tab;
  }, [route, tab]);

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
            worldSources={worldSources}
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
            onRequestNow={(symptomsHe) => go({ name: "describe", serviceId: route.serviceId, symptomsHe })}
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
          candidates: route.phase === "SEARCHING" ? cands.slice(0, 2) : cands,
          /*
           * No journey on the demo world. `livingMapViolations` refuses a
           * real position over invented streets, and that refusal is the
           * whole reason the invented city is allowed to exist.
           */
          journey: null,
        };

        return (
          <SearchingBody
            worldSources={worldSources}
            departmentCode={departmentCodeByServiceId[route.serviceId]}
            serviceNameHe={page?.nameHe ?? ""}
            living={living}
            etaMinutes={route.phase === "SEARCHING" ? null : etaMin}
            arrivalClockHe={route.phase === "SEARCHING" ? null : arrivalClockHe}
            checkingEligibility={route.phase !== "SEARCHING"}
            discoveries={discoveries}
            onFound={(id) => setDiscoveries((d) => discover(d, id))}
            onPlayAction={(action) => {
              // Every route out of the wait is a real destination. This is
              // the thing that was missing when finishing the old game left
              // the screen with nowhere to go.
              if (action === "JOB_DETAILS") go({ name: "tracking", stage: "enroute" });
              if (action === "FOLLOW_PRO") go({ name: "tracking", stage: "enroute" });
            }}
            onAccept={() => go({ name: "living", serviceId: route.serviceId, phase: "ASSIGNED_ROUTE" })}
            onAnother={
              isPersonFit(route.serviceId)
                ? () => go({ name: "matchconfirm", serviceId: route.serviceId, index: 1 })
                : undefined
            }
            onSafety={() => setSheet("safety")}
            onOpenProfile={(id) => setOpenVenue(id)}
            profileOpen={openVenue !== null}
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
      case "tracking":
        return (
          <TrackingBody
            status={
              route.stage === "assigned"
                ? "PRO_ASSIGNED"
                : route.stage === "enroute"
                  ? "PRO_EN_ROUTE"
                  : "IN_PROGRESS"
            }
            serviceNameHe={trackedService.nameHe}
            professional={matchFixture.professional}
            eta={matchFixture.eta}
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
             * The world, and who is coming through it. `departmentCode`
             * decides which street they come down and what they are
             * driving; the ETA the fixture carries is the one the trip
             * started with, so progress is a fraction of a real number
             * rather than a timer this screen invented.
             */
            worldSources={worldSources}
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
            priceLineHe={`${lex.visitFee} ₪179 · ${lex.quotePending}`}
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
              status="IN_PROGRESS"
              serviceNameHe={trackedService.nameHe}
              professional={matchFixture.professional}
              eta={matchFixture.eta}
              width={width}
              height={bodyH}
            />
            <FocusSheet
              visible
              titleHe={`${matchFixture.professional.displayName} שלח הצעת מחיר`}
              onDismiss={() => go({ name: "tracking", stage: "arrived" })}
              width={width}
              height={bodyH}
            >
              <QuoteApprovalBody
                quote={quoteFixture}
                serviceNameHe={trackedService.nameHe}
                professionalDisplayName={matchFixture.professional.displayName}
                onApprove={() => {
                  onQuoteDecision("APPROVED");
                  go({ name: "tracking", stage: "arrived" });
                }}
                onDecline={() => {
                  onQuoteDecision("DECLINED");
                  go({ name: "tracking", stage: "arrived" });
                }}
                onAskQuestion={() => go({ name: "chat" })}
                /*
                 * Back is not a decline. The sheet closes, the quote stays
                 * pending, and the professional is told nothing — because a
                 * navigation control must never carry a financial answer.
                 */
                onBack={() => go({ name: "tracking", stage: "arrived" })}
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
            onSubmitReview={() => go({ name: "home" })}
            onDownloadInvoice={() => setSheet("payment")}
            onBack={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
      default:
        return (
          <CustomerHomeBody
            greetingHe="ערב טוב"
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
            worldSources={worldSources}
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

  return (
    <View style={{ width, height }}>
      <AppHeader
        width={width}
        greetingHe="שלום"
        /*
         * A TAB IS A MOVE TOO.
         *
         * These set the tab directly and pushed nothing, so back from the
         * calls list or the card left the prototype entirely instead of
         * returning to the home screen — the one place a reviewer on a
         * phone reaches for back first.
         */
        onMenu={() => goTab("calls")}
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
          professional={matchFixture.professional}
          services={profileServices}
          reviews={profileReviews}
          workPhotoSubjects={profileWorkPhotos}
          activeSinceYear={2014}
          areaLabelHe="גוש דן"
          fromPriceMinorUnits={17900}
          onBack={() => setOpenVenue(null)}
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

function ProApp({
  width,
  height,
  onSwitch,
  request,
  onTakeRequest,
  pendingQuote,
  quoteDecision,
  onSendQuote,
  onQuoteSeen,
}: {
  width: number;
  height: number;
  onSwitch: () => void;
  /** A request the customer side actually made, waiting to be offered. */
  request: LiveRequest | null;
  /** Called once the offer has been taken off the queue. */
  onTakeRequest: () => void;
  /** A quote this professional sent that the customer has not answered. */
  pendingQuote: { sentAtMs: number } | null;
  /** The customer's answer, once it arrives. */
  quoteDecision: "APPROVED" | "DECLINED" | null;
  onSendQuote: () => void;
  onQuoteSeen: () => void;
}) {
  const [tab, setTab] = useState<ProTab>("shift");
  const [presence, setPresence] = useState<ProPresenceState>("OFFLINE");
  const [offerAt, setOfferAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [job, setJob] = useState<JobState | null>(null);
  const [proChat, setProChat] = useState<ChatMessage[]>(chatSeed);
  const [proView, setProView] = useState<null | "chat" | "presence" | "pricing">(null);
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
  const [onlineSince, setOnlineSince] = useState<number | null>(null);
  const [shiftNow, setShiftNow] = useState(() => Date.now());
  /**
   * The shift's running totals. They start at zero and only move when a job
   * actually settles — which is what makes the completion screen mean
   * something and what makes "לשעת חיבור" a real number rather than a
   * fixture. End the shift and they reset, because they describe THIS shift.
   */
  const [shiftNet, setShiftNet] = useState(0);
  const [shiftJobs, setShiftJobs] = useState(0);
  /** The payout just settled, while the completion screen is showing. */
  const [settled, setSettled] = useState<number | null>(null);
  /**
   * The customer request this offer was built from, captured at the moment
   * the offer was raised. Held here rather than read live, so the card does
   * not change under the professional's hands while the ring counts down.
   */
  const [takenRequest, setTakenRequest] = useState<LiveRequest | null>(null);
  const [proSheet, setProSheet] = useState<
    null | "call" | "navigate" | "services" | "howitworks" | "quote"
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
     */
    "howitworks"
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
  const bodyH = height - BAR - (showDemo ? DEMO_H : 0);

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

  const JOB_FLOW: JobState[] = [
    "PRO_ASSIGNED",
    "PRO_EN_ROUTE",
    "PRO_ARRIVED",
    "DIAGNOSIS",
    "WAITING_QUOTE_APPROVAL",
    "IN_PROGRESS",
    "COMPLETED",
  ];
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
  const proScreen = useMemo(() => {
    const name =
      settled !== null
        ? "settled"
        : proView === "chat"
          ? "chat"
          : tab === "earnings" || tab === "verify" || tab === "profile"
            ? tab
            : job
              ? "job"
              : proView === "presence"
                ? "presence"
                : proView === "pricing"
                ? "pricing"
                : "shift";
    return { key: screenKey({ side: "pro", name }), screen: { side: "pro" as const, name } };
  }, [settled, proView, tab, job]);

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
    <ProVerificationBody
      displayNameHe="דוגמה ד׳ (תצוגה)"
      steps={verificationSteps}
      services={proEligibility}
      onOpenStep={() => setProSheet("services")}
      onBack={() => setTab("shift")}
      width={width}
      height={bodyH}
    />
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
        symptomsHe={
          takenRequest ? takenRequest.intakeBrief.map((l) => l.answerHe) : jobSymptoms
        }
        descriptionHe={
          takenRequest ? takenRequest.textHe.trim() || "הלקוח לא הוסיף תיאור." : jobDescription
        }
        media={takenRequest ? requestMedia(takenRequest) : jobMedia}
        payoutMinorUnits={job === "DIAGNOSIS" || job === "WAITING_QUOTE_APPROVAL" ? null : 13400}
        payoutIsEstimate={false}
        onAdvance={advanceJob}
        onSendQuote={() => {
          onSendQuote();
          advanceJob();
        }}
        waitingMinutes={
          pendingQuote ? Math.floor((shiftNow - pendingQuote.sentAtMs) / 60_000) : null
        }
        onWithdrawQuote={() => setProSheet("quote")}
        onNavigate={() => setProSheet("navigate")}
        onCall={() => setProSheet("call")}
        onMessage={() => setProView("chat")}
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
        onOpenPricing={() => setProView("pricing")}
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
          live: s.enabled && !s.blockedReasonHe,
        }))}
        nowMs={shiftNow}
        onToggleOnline={toggle}
        onOpenEarnings={() => setTab("earnings")}
        onManageServices={() => setProView("presence")}
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
        <Text style={styles.sheetBodyDark}>
          כל עוד הלקוח לא אישר, אפשר לשלוח הצעה מעודכנת — למשל אחרי שגילית משהו נוסף באבחון.
          ההצעה הקודמת מתבטלת והלקוח מקבל את החדשה לאישור.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>חזרה לאבחון</Text>
        </Pressable>
        <Text style={styles.sheetNoteDark}>
          באב־טיפוס אין עריכת סכומים — המסלול קיים, המספרים לא.
        </Text>
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
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>פתיחה באפליקציית הניווט</Text>
        </Pressable>
        <Text style={styles.sheetNoteDark}>
          ספק המפות עדיין לא נבחר — החלטה עסקית פתוחה — אז כאן אין ניווט אמיתי.
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
        <Text style={styles.sheetBodyDark}>
          אפשר לכבות ולהדליק שירותים בכל רגע. שירות חסום לא נפתח מכאן — הוא נפתח כשהמסמך שפג
          מתחדש, כי ההסמכה נבדקת מול כל שירות בנפרד ולא מול החשבון.
        </Text>
        <Pressable style={styles.sheetPrimary} onPress={() => setProSheet(null)}>
          <Text style={styles.sheetPrimaryText}>חידוש רישיון חשמלאי</Text>
        </Pressable>
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
        onPress={(k) => {
          setProView(null);
          setTab(k as ProTab);
        }}
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
