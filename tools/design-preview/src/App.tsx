import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import {
  CustomerHomeBody,
  CustomerProfileBody,
  JobCompleteBody,
  Mark,
  Persona,
  ProOfferBody,
  ProOnlineBody,
  ProProfileBody,
  QuoteApprovalBody,
  SearchingBody,
  ServiceDetailBody,
  TrackingBody,
  customerTheme,
  lex,
  proTheme,
  radii,
  spacing,
  tint,
  type as t,
} from "@pro-now/ui";
import type { ProPresenceState } from "@pro-now/types";

import { matchFixture, offerFixture } from "./fixtures";
import {
  availabilitySnapshot,
  customerHistory,
  customerOpenCall,
  homeRecent,
  homeServices,
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

type CustomerTab = "home" | "calls" | "card";
type ProTab = "shift" | "profile";
type Side = "customer" | "pro";

type CustomerRoute =
  | { name: "home" }
  | { name: "service"; serviceId: string }
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

  const go = useCallback((r: CustomerRoute) => setRoute(r), []);

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
          width={width}
          height={bodyH}
        />
      );
    }

    if (tab === "calls") {
      return (
        <CustomerProfileBody
          displayNameHe="אמית (תצוגה)"
          seed="cust_demo_1"
          homeAreaLabelHe={availabilitySnapshot.areaLabel}
          paymentLabelHe="ויזה · 4417"
          openCalls={customerOpenCall}
          history={customerHistory}
          lifetimeSpendMinorUnits={164400}
          width={width}
          height={bodyH}
        />
      );
    }

    switch (route.name) {
      case "service": {
        const page = SERVICE_PAGES[route.serviceId] ?? serviceDetailLeak;
        return (
          <ServiceDetailBody
            {...page}
            width={width}
            height={bodyH}
            onBack={() => go({ name: "home" })}
            onRequestNow={() => go({ name: "searching", serviceId: route.serviceId })}
            onRecheck={() => go({ name: "home" })}
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
            width={width}
            height={bodyH}
          />
        );
      default:
        return (
          <CustomerHomeBody
            greetingHe="ערב טוב"
            addressLabelHe={availabilitySnapshot.areaLabel}
            services={homeServices}
            recent={homeRecent}
            availability={snapshot}
            nowMs={Date.now()}
            width={width}
            onSelectService={(id) => go({ name: "service", serviceId: id })}
          />
        );
    }
  }, [tab, route, elapsed, width, bodyH, go]);

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

      {advance ? (
        <Pressable style={styles.advance} onPress={advance.next}>
          <Text style={styles.advanceText}>▶ {advance.label}</Text>
        </Pressable>
      ) : null}

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

  const body =
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
    ) : offer ? (
      <ProOfferBody
        offer={offer}
        nowMs={now}
        onAccept={() => setOfferAt(null)}
        onSkip={() => setOfferAt(null)}
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
        width={width}
        height={bodyH}
      />
    );

  return (
    <View style={{ width, height }}>
      <View style={{ height: bodyH }}>{body}</View>

      {tab === "shift" && presence === "AVAILABLE" && !offer ? (
        <Pressable style={[styles.advance, styles.advanceDark]} onPress={() => setOfferAt(Date.now())}>
          <Text style={styles.advanceText}>▶ נכנסת עבודה</Text>
        </Pressable>
      ) : null}

      <TabBar
        dark
        width={width}
        height={BAR}
        items={[
          { key: "shift", label: lex.shift, mark: "clock" as const },
          { key: "profile", label: "הפרופיל", mark: "person" as const },
        ]}
        active={tab}
        onPress={(k) => setTab(k as ProTab)}
        onSwitch={onSwitch}
        switchLabel="לקוח"
      />
    </View>
  );
}

// ---------------------------------------------------------------------

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

  advance: {
    position: "absolute",
    bottom: 84,
    alignSelf: "center",
    backgroundColor: "rgba(23,18,31,0.9)",
    paddingVertical: 9,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
  advanceDark: { backgroundColor: "rgba(247,243,250,0.16)" },
  advanceText: { ...t.captionStrong, color: "#FFFFFF", writingDirection: "rtl" },

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
