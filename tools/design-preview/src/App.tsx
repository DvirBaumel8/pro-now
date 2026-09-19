import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  AddressPickerBody,
  CallsListBody,
  ChatBody,
  ConnectionBanner,
  CustomerHomeBody,
  CustomerProfileBody,
  DescribeFaultBody,
  JobCompleteBody,

  NavGlyph,
  Persona,
  ProEarningsBody,
  MatchConfirmBody,
  ProJobBody,
  ProJobSettledBody,
  ProOfferBody,
  ProOnlineBody,
  ProShiftBody,
  ProVerificationBody,
  PhoneAuthBody,
  ProProfileBody,
  QuoteApprovalBody,
  SearchingBody,
  ServiceDetailBody,
  TrackingBody,
  WelcomeBody,
  customerTheme,
  Sheet,
  lex,
  proTheme,
  radii,
  spacing,
  tint,
  type as t,
} from "@pro-now/ui";
import type { JobMediaItem, LiveLocationState, MarkName, NavGlyphName } from "@pro-now/ui";
import type { AuthStage, ChatMessage, ConnectionState } from "@pro-now/ui";
import { buildIntakeBrief, pilotIntakeByService, pilotServiceById, readAvailability } from "@pro-now/types";
import type { IntakeAnswer, IntakeBriefLine, OfferCardView, PriceModel } from "@pro-now/types";
import type { JobState, ProPresenceState } from "@pro-now/types";

import { matchFixture, offerFixture } from "./fixtures";
import {
  catalogHomeServices,
  togglesFor,
  catalogMatchRules,
  catalogServicePages,
  eligibilityFor,
  isPersonFit,
  personFitCandidates,
  photoPromptFor,
} from "./catalogAdapter";
import { useCapture } from "./useCapture";
import {
  availabilitySnapshot,
  callsList,
  castSeeds,
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
type Gate = { name: "welcome" } | { name: "auth"; side: Side };

type CustomerRoute =
  | { name: "home" }
  | { name: "address" }
  | { name: "service"; serviceId: string }
  | { name: "describe"; serviceId: string; symptomsHe: string[] }
  | { name: "chat" }
  | { name: "searching"; serviceId: string }
  /** PERSON_FIT only: the system proposes, the customer confirms. */
  | { name: "matchconfirm"; serviceId: string; index: number }
  | { name: "tracking"; stage: "assigned" | "enroute" | "arrived" }
  | { name: "quote" }
  | { name: "complete" };

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

  const [gate, setGate] = useState<Gate | null>({ name: "welcome" });
  const [side, setSide] = useState<Side>("customer");
  /** The request in flight, shared by both sides. See `LiveRequest`. */
  const [liveRequest, setLiveRequest] = useState<LiveRequest | null>(null);
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
    <View style={[styles.root, { backgroundColor: side === "pro" ? proTheme.colors.bg : customerTheme.colors.bg }]}>
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

        {gate?.name === "welcome" ? (
          <WelcomeBody
            castSeeds={castSeeds}
            onCustomer={() => setGate({ name: "auth", side: "customer" })}
            onProfessional={() => setGate({ name: "auth", side: "pro" })}
            width={w}
            height={h - bannerH}
          />
        ) : gate?.name === "auth" ? (
          <AuthGate
            side={gate.side}
            onDone={() => {
              setSide(gate.side);
              setGate(null);
            }}
            onBack={() => setGate({ name: "welcome" })}
            width={w}
            height={h - bannerH}
          />
        ) : side === "customer" ? (
          <CustomerApp
            width={w}
            height={h - bannerH}
            onSwitch={() => setSide("pro")}
            onSendRequest={setLiveRequest}
          />
        ) : (
          <ProApp
            width={w}
            height={h - bannerH}
            onSwitch={() => setSide("customer")}
            request={liveRequest}
            onTakeRequest={() => setLiveRequest(null)}
          />
        )}

        {notice && !gate ? (
          // Offset by the banner, which is in the layout above this overlay.
          // Without it the prototype notice lands on top of the message
          // saying the data may be wrong — the less important of the two.
          <Pressable style={[styles.notice, { top: bannerH + spacing.lg }]} onPress={() => setNotice(false)}>
            <Text style={styles.noticeText}>
              אב־טיפוס. אין שרת — כל הנתונים הם דוגמאות. גע כדי לסגור.
            </Text>
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
}: {
  width: number;
  height: number;
  onSwitch: () => void;
  onSendRequest: (r: LiveRequest) => void;
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
  const [faultText, setFaultText] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>(chatSeed);
  const [sheet, setSheet] = useState<null | "call" | "safety" | "payment">(null);
  const [addressId, setAddressId] = useState<string>("addr_home");
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
  const [route, setRoute] = useState<CustomerRoute>({ name: "home" });
  /**
   * The intake answers live in the app, not in the screen, because they
   * travel: they are what the professional's offer card is built from two
   * screens later. Keyed by question id, last answer wins.
   */
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswer[]>([]);
  /** The service this journey is about, kept after the route moves on. */
  const [lastRequestedId, setLastRequestedId] = useState<string | null>(null);
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
      route.name === "service" || route.name === "describe" || route.name === "searching"
        ? route.serviceId
        : lastRequestedId;
    const page = id ? SERVICE_PAGES[id] : undefined;
    return {
      nameHe: page?.nameHe ?? "תיקון נזילה בברז",
      mark: (page?.mark ?? "plumbing") as MarkName,
    };
  }, [route, lastRequestedId]);

  const answerIntake = useCallback((a: IntakeAnswer) => {
    setIntakeAnswers((prev) => [...prev.filter((p) => p.questionId !== a.questionId), a]);
  }, []);
  const [elapsed, setElapsed] = useState(0);

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

  const advance =
    tab === "home" && route.name === "tracking"
      ? route.stage === "assigned"
        ? { label: "המקצוען יצא לדרך", next: () => go({ name: "tracking", stage: "enroute" }) }
        : route.stage === "enroute"
          ? { label: "המקצוען הגיע ומתחיל לעבוד", next: () => go({ name: "tracking", stage: "arrived" }) }
          : { label: "המקצוען שלח הצעת מחיר", next: () => go({ name: "quote" }) }
      : null;

  const demo = advance ?? previewMatch;

  const BAR = 64;
  const bodyH = height - BAR - (demo ? DEMO_H : 0);

  // The search advances on its own, the way it will in production when the
  // server answers — so the wait is experienced rather than described.
  useEffect(() => {
    if (route.name !== "searching") {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const serviceId = route.serviceId;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      setElapsed(secs);
      if (secs < 6) return;
      /*
       * WHERE THE SEARCH ENDS DEPENDS ON THE SERVICE, not on the screen.
       * FASTEST_ELIGIBLE goes straight to tracking — the customer delegated
       * the choice and being asked to approve it now would be a burden.
       * PERSON_FIT stops and asks, because for those services the person IS
       * the thing being bought.
       */
      setRoute(
        isPersonFit(serviceId)
          ? { name: "matchconfirm", serviceId, index: 0 }
          : { name: "tracking", stage: "assigned" }
      );
    }, 1000);
    return () => clearInterval(id);
  }, [route.name, route]);

  /*
   * Routes live under the "home" tab, so navigating to one from another tab
   * has to move the tab as well. The first version did not, and tapping a
   * live call in the calls list silently did nothing — the route changed
   * underneath a tab that was still rendering its own screen. Keeping the
   * tab switch inside `go` makes that impossible to forget at a call site.
   */
  const go = useCallback((r: CustomerRoute) => {
    setRoute(r);
    if (r.name !== "home") setTab("home");
  }, []);

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
          onOpenCall={() => setTab("calls")}
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
            onRemovePhoto={capture.removePhoto}
            voice={capture.voice}
            recording={capture.recording}
            recordSeconds={capture.recordSeconds}
            canRecord={capture.canRecord}
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
              go({ name: "searching", serviceId: route.serviceId });
            }}
            width={width}
            height={bodyH}
          />
        );
      }
      case "searching":
        return (
          <SearchingBody
            serviceNameHe={SERVICE_PAGES[route.serviceId]?.nameHe ?? ""}
            elapsedSeconds={elapsed}
            candidatesConsidered={12}
            candidatesEligible={3}
            onCancel={() => go({ name: "home" })}
            onBroaden={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
      case "matchconfirm": {
        const page = SERVICE_PAGES[route.serviceId]!;
        const c = personFitCandidates[route.index % personFitCandidates.length]!;
        return (
          <MatchConfirmBody
            serviceNameHe={page.nameHe}
            displayNameHe={c.displayNameHe}
            seed={c.seed}
            specialtiesHe={c.specialtiesHe}
            portfolio={c.portfolio}
            ratingAverage={c.ratingAverage}
            ratingCount={c.ratingCount}
            completedJobs={c.completedJobs}
            credentialsHe={page.requiredCredentialsHe}
            eta={matchFixture.eta}
            price={page.price}
            /*
             * Bounded on purpose. Three proposals, then the screen says
             * that is what there is. Unlimited alternatives would turn a
             * two-tap booking into a browsing session and teach customers
             * to keep looking instead of to trust the match.
             */
            alternativesLeft={personFitCandidates.length - 1 - route.index}
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
            priceLineHe={`${lex.visitFee} ₪179 · ${lex.quotePending}`}
            onCall={() => setSheet("call")}
            onMessage={() => go({ name: "chat" })}
            onSafety={() => setSheet("safety")}
            width={width}
            height={bodyH}
          />
        );
      case "quote":
        return (
          <QuoteApprovalBody
            quote={quoteFixture}
            serviceNameHe={trackedService.nameHe}
            professionalDisplayName={matchFixture.professional.displayName}
            onApprove={() => go({ name: "complete" })}
            onDecline={() => go({ name: "tracking", stage: "arrived" })}
            onAskQuestion={() => go({ name: "chat" })}
            width={width}
            height={bodyH}
          />
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
            width={width}
            height={bodyH}
          />
        );
      default:
        return (
          <CustomerHomeBody
            greetingHe="ערב טוב"
            addressLabelHe={addressLabel}
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
            capture={{
              photos: capture.photos.length,
              voiceSeconds: capture.voice?.seconds ?? null,
              recording: capture.recording,
              recordSeconds: capture.recordSeconds,
              canRecord: capture.canRecord,
              onStartRecord: capture.startRecord,
              onStopRecord: capture.stopRecord,
              onDeleteVoice: capture.deleteVoice,
              onAddPhoto: capture.addPhoto,
              onClearPhotos: () => capture.photos.forEach((p) => capture.removePhoto(p.id)),
            }}
            width={width}
            onSelectService={(id) => go({ name: "service", serviceId: id })}
            onChangeAddress={() => go({ name: "address" })}
          />
        );
    }
  }, [tab, route, elapsed, width, bodyH, go, snapshot, supply, addressId, live, askLocation, addressLabel, capture, faultText, intakeAnswers, answerIntake, trackedService, onSendRequest]);

  return (
    <View style={{ width, height }}>
      <View style={{ height: bodyH }}>{body}</View>

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

      <TabBar
        width={width}
        height={BAR}
        items={[
          { key: "home", label: "בית", mark: "home" as const },
          { key: "calls", label: "הקריאות שלי", mark: "list" as const },
          { key: "card", label: "הכרטיס שלי", mark: "person" as const },
        ]}
        active={tab}
        onPress={(k) => {
          setTab(k as CustomerTab);
          if (k === "home") setRoute({ name: "home" });
        }}
        onSwitch={onSwitch}
        switchLabel="מקצוען"
      />
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
}: {
  width: number;
  height: number;
  onSwitch: () => void;
  /** A request the customer side actually made, waiting to be offered. */
  request: LiveRequest | null;
  /** Called once the offer has been taken off the queue. */
  onTakeRequest: () => void;
}) {
  const [tab, setTab] = useState<ProTab>("shift");
  const [presence, setPresence] = useState<ProPresenceState>("OFFLINE");
  const [offerAt, setOfferAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [job, setJob] = useState<JobState | null>(null);
  const [proChat, setProChat] = useState<ChatMessage[]>(chatSeed);
  const [proView, setProView] = useState<null | "chat" | "presence">(null);
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
  const [proSheet, setProSheet] = useState<null | "call" | "navigate" | "services" | "howitworks">(
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

  // The shift clock ticks once a second while online, and not at all when
  // offline — there is nothing to count.
  useEffect(() => {
    if (onlineSince === null) return;
    const id = setInterval(() => setShiftNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [onlineSince]);

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
        onSendQuote={advanceJob}
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
        onBack={() => setProView(null)}
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
      <View style={{ height: bodyH }}>{body}</View>

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
    fontSize: 14,
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
    fontSize: 15,
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
  sheetPrimaryText: { ...t.bodyStrong, fontSize: 16, color: customerTheme.colors.onAction },
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
    fontSize: 15,
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

  demoBarText: { ...t.bodyStrong, fontSize: 16, color: "#FFFFFF", writingDirection: "rtl" },
  demoBarHint: { ...t.caption, fontSize: 11, color: "rgba(255,255,255,0.65)", writingDirection: "rtl" },

  bar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingBottom: 6,
  },
  barItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3, paddingTop: 6 },
  barLabel: { ...t.caption, fontSize: 11, fontWeight: "600", writingDirection: "rtl" },

  switchPill: {
    minHeight: 44,
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  switchText: { ...t.caption, fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
});
