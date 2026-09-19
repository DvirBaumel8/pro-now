import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  AddressPickerBody,
  CallsListBody,
  ChatBody,
  CustomerHomeBody,
  CustomerProfileBody,
  DescribeFaultBody,
  JobCompleteBody,
  Mark,
  Persona,
  ProEarningsBody,
  ProJobBody,
  ProOfferBody,
  ProOnlineBody,
  ProProfileBody,
  QuoteApprovalBody,
  SearchingBody,
  ServiceDetailBody,
  TrackingBody,
  customerTheme,
  Sheet,
  lex,
  proTheme,
  radii,
  spacing,
  tint,
  type as t,
} from "@pro-now/ui";
import type { LiveLocationState } from "@pro-now/ui";
import type { ChatMessage } from "@pro-now/ui";
import type { JobState, ProPresenceState } from "@pro-now/types";

import { matchFixture, offerFixture } from "./fixtures";
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
  homeRecent,
  homeServices,
  jobDescription,
  jobMedia,
  jobSymptoms,
  matchRules,
  savedAddresses,
  proServices,
  profileReviews,
  profileServices,
  profileWorkPhotos,
  quoteFixture,
  receiptLines,
  serviceDetailElectric,
  serviceDetailLeak,
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

type CustomerTab = "home" | "calls" | "card";
type ProTab = "shift" | "earnings" | "profile";
type Side = "customer" | "pro";

type CustomerRoute =
  | { name: "home" }
  | { name: "address" }
  | { name: "service"; serviceId: string }
  | { name: "describe"; serviceId: string; symptomsHe: string[] }
  | { name: "chat" }
  | { name: "searching"; serviceId: string }
  | { name: "tracking"; stage: "assigned" | "enroute" | "arrived" }
  | { name: "quote" }
  | { name: "complete" };

const SERVICE_PAGES: Record<string, typeof serviceDetailLeak> = {
  "svc-leak": serviceDetailLeak,
  "svc-electric": serviceDetailElectric,
};

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

export function App() {
  const { width, height } = useWindowDimensions();
  // The prototype fills whatever it is given: a phone at home-screen size,
  // or a centred phone-shaped frame on a laptop.
  const w = Math.min(430, width);
  const h = height;

  const [side, setSide] = useState<Side>("customer");
  const [notice, setNotice] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setNotice(false), 6000);
    return () => clearTimeout(id);
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: side === "pro" ? proTheme.colors.bg : customerTheme.colors.bg }]}>
      <View style={{ width: w, height: h, overflow: "hidden" }}>
        {side === "customer" ? (
          <CustomerApp width={w} height={h} onSwitch={() => setSide("pro")} />
        ) : (
          <ProApp width={w} height={h} onSwitch={() => setSide("customer")} />
        )}

        {notice ? (
          <Pressable style={styles.notice} onPress={() => setNotice(false)}>
            <Text style={styles.noticeText}>
              אב־טיפוס. אין שרת — כל הנתונים הם דוגמאות. גע כדי לסגור.
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------

function CustomerApp({
  width,
  height,
  onSwitch,
}: {
  width: number;
  height: number;
  onSwitch: () => void;
}) {
  const snapshot = useLiveSnapshot();
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
  const [elapsed, setElapsed] = useState(0);

  const BAR = 64;
  const bodyH = height - BAR;

  // The search advances on its own, the way it will in production when the
  // server answers — so the wait is experienced rather than described.
  useEffect(() => {
    if (route.name !== "searching") {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - started) / 1000);
      setElapsed(secs);
      if (secs >= 6) setRoute({ name: "tracking", stage: "assigned" });
    }, 1000);
    return () => clearInterval(id);
  }, [route.name]);

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
        const page = SERVICE_PAGES[route.serviceId] ?? serviceDetailLeak;
        return (
          <ServiceDetailBody
            {...page}
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
        const page = SERVICE_PAGES[route.serviceId] ?? serviceDetailLeak;
        return (
          <DescribeFaultBody
            serviceNameHe={page.nameHe}
            mark={page.mark}
            symptomsHe={route.symptomsHe}
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
            onSend={() => go({ name: "searching", serviceId: route.serviceId })}
            width={width}
            height={bodyH}
          />
        );
      }
      case "searching":
        return (
          <SearchingBody
            serviceNameHe={SERVICE_PAGES[route.serviceId]?.nameHe ?? "תיקון נזילה"}
            elapsedSeconds={elapsed}
            candidatesConsidered={12}
            candidatesEligible={3}
            onCancel={() => go({ name: "home" })}
            onBroaden={() => go({ name: "home" })}
            width={width}
            height={bodyH}
          />
        );
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
            serviceNameHe="תיקון נזילה בברז"
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
            serviceNameHe="תיקון נזילה בברז"
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
            serviceNameHe="תיקון נזילה בברז"
            mark="plumbing"
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
            services={homeServices}
            recent={homeRecent}
            availability={snapshot}
            nowMs={Date.now()}
            matchRules={matchRules}
            width={width}
            onSelectService={(id) => go({ name: "service", serviceId: id })}
            onChangeAddress={() => go({ name: "address" })}
          />
        );
    }
  }, [tab, route, elapsed, width, bodyH, go, snapshot, addressId, live, askLocation, addressLabel, capture, faultText]);

  // A tracked job needs somewhere to go next; the prototype offers the same
  // advances the server would push.
  const advance =
    tab === "home" && route.name === "tracking"
      ? route.stage === "assigned"
        ? { label: "בדרך אליך", next: () => go({ name: "tracking", stage: "enroute" }) }
        : route.stage === "enroute"
          ? { label: "הגיע ומתחיל", next: () => go({ name: "tracking", stage: "arrived" }) }
          : { label: "נשלחה הצעת מחיר", next: () => go({ name: "quote" }) }
      : null;

  return (
    <View style={{ width, height }}>
      <View style={{ height: bodyH }}>{body}</View>

      {advance ? <DemoBar label={advance.label} onPress={advance.next} width={width} /> : null}

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
          { key: "home", label: "בית", mark: "handyman" as const },
          { key: "calls", label: lex.myCalls, mark: "clock" as const },
          { key: "card", label: lex.myCard, mark: "person" as const },
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

function ProApp({ width, height, onSwitch }: { width: number; height: number; onSwitch: () => void }) {
  const [tab, setTab] = useState<ProTab>("shift");
  const [presence, setPresence] = useState<ProPresenceState>("OFFLINE");
  const [offerAt, setOfferAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [job, setJob] = useState<JobState | null>(null);
  const [proChat, setProChat] = useState<ChatMessage[]>(chatSeed);
  const [proView, setProView] = useState<null | "chat">(null);
  const [proSheet, setProSheet] = useState<null | "call" | "navigate" | "services">(null);

  const BAR = 64;
  const bodyH = height - BAR;

  useEffect(() => {
    if (offerAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [offerAt]);

  // Going online is a transition the SERVER confirms, so the prototype makes
  // you wait through it rather than flipping instantly — that delay is the
  // honest part of the interaction.
  const toggle = useCallback(() => {
    if (presence === "OFFLINE") {
      setPresence("STARTING_SHIFT");
      setTimeout(() => setPresence("AVAILABLE"), 1200);
    } else {
      setPresence("OFFLINE");
      setOfferAt(null);
    }
  }, [presence]);

  const offer = offerAt
    ? {
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
      setJob(null);
      return;
    }
    setJob(next);
  };

  const body = proView === "chat" ? (
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
        serviceNameHe="תיקון נזילה בברז"
        mark="plumbing"
        addressHe="רחוב הברזל 12, רמת אביב, תל אביב"
        accessNoteHe="קומה 3, דירה 9 · קוד כניסה 1408"
        routeEtaMinutes={9}
        distanceHe="2.4 ק״מ"
        customerNameHe="אמית (תצוגה)"
        customerSeed="cust_demo_1"
        symptomsHe={jobSymptoms}
        descriptionHe={jobDescription}
        media={jobMedia}
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
    ) : (
      <ProOnlineBody
        presenceState={presence}
        displayNameHe="דוגמה ד׳ (תצוגה)"
        todayNetMinorUnits={presence === "AVAILABLE" ? 48200 : 0}
        todayJobCount={presence === "AVAILABLE" ? 3 : 0}
        services={proServices}
        onToggleOnline={toggle}
        onManageServices={() => setProSheet("services")}
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

      {tab === "shift" && presence === "AVAILABLE" && !offer && !job ? (
        <DemoBar dark label="נכנסת עבודה" onPress={() => setOfferAt(Date.now())} width={width} />
      ) : null}

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
          { key: "shift", label: lex.shift, mark: "clock" as const },
          { key: "earnings", label: lex.payout, mark: "handyman" as const },
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
      style={({ pressed }) => [
        styles.demoBar,
        { width, backgroundColor: dark ? "rgba(247,243,250,0.10)" : "rgba(23,18,31,0.92)" },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={styles.demoBarText}>{label}</Text>
      <Text style={styles.demoBarHint}>הדגמה · לחץ כדי להתקדם</Text>
    </Pressable>
  );
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
  items: { key: string; label: string; mark: "handyman" | "clock" | "person" }[];
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
            <TabGlyph name={it.mark} color={on ? colors.action : colors.textSecondary} />
            <Text style={[styles.barLabel, { color: on ? colors.action : colors.textSecondary }]} numberOfLines={1}>
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

function TabGlyph({ name, color }: { name: "handyman" | "clock" | "person"; color: string }) {
  if (name === "person") return <Persona seed="tabbar-person" size={22} />;
  return <Mark name={name === "clock" ? "cleaning" : "handyman"} size={21} color={color} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "flex-start" },

  notice: {
    position: "absolute",
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "rgba(23,18,31,0.92)",
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  noticeText: { ...t.caption, color: "#FFFFFF", textAlign: "center", writingDirection: "rtl" },

  demoBar: {
    position: "absolute",
    bottom: 64,
    left: 0,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
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
  sheetPrimaryText: { ...t.bodyStrong, fontSize: 16, color: "#FFFFFF" },
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

  switchPill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radii.pill },
  switchText: { ...t.caption, fontSize: 11, fontWeight: "700", writingDirection: "rtl" },
});
