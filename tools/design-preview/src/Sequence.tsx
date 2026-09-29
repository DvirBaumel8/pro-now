import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { CustomerHomeBody, customerTheme, JobCompleteBody, ProOfferBody, ProOnlineBody, ProProfileBody, proTheme, QuoteApprovalBody, radii, scale, SearchingBody, ServiceDetailBody, spacing, TrackingBody, type as t } from "@pro-now/ui";
import type { ProPresenceState } from "@pro-now/types";

import { matchFixture, offerFixture } from "./fixtures";
import {
  AVAILABILITY_AT_MS,
  availabilitySnapshot,
  homeRecent,
  homeServices,
  proServices,
  profileReviews,
  profileServices,
  profileWorkPhotos,
  quoteFixture,
  receiptLines,
  serviceDetailLeak,
} from "./screenFixtures";

/**
 * The journey, as one sequence you can walk.
 *
 * A grid of isolated screens tells you whether each screen is well made. It
 * cannot tell you whether the product feels like one thing — and that is the
 * question this round is actually about. So both flows are laid out as
 * steps, and stepping through them is the review.
 *
 * Two of the steps run real time rather than a frozen fixture: the search is
 * a live elapsed counter, and the offer counts down against a genuine
 * deadline until it expires in front of you. Those are the two moments the
 * product lives or dies on, and a screenshot of a countdown proves nothing
 * about how it feels to watch one run out.
 */

const CUSTOMER_STEPS = [
  "בית",
  "עמוד שירות",
  "סורקים",
  "מצאנו",
  "בדרך אליך",
  "הצעת מחיר",
  "סיום",
] as const;

const PRO_STEPS = ["מחוץ למשמרת", "יוצא למשמרת", "במשמרת", "הצעה נכנסת"] as const;

export function CustomerSequence({ width, height }: { width: number; height: number }) {
  const [step, setStep] = useState(0);
  const elapsed = useElapsed(step === 2);

  return (
    <Flow
      steps={CUSTOMER_STEPS as unknown as string[]}
      step={step}
      onStep={setStep}
      width={width}
      accent={customerTheme.colors.action}
    >
      {step === 0 ? (
        <CustomerHomeBody
          greetingHe="ערב טוב"
          addressLabelHe={availabilitySnapshot.areaLabel}
          services={homeServices}
          recent={homeRecent}
          availability={availabilitySnapshot}
          nowMs={AVAILABILITY_AT_MS + 10_000}
          width={width}
          onSelectService={() => setStep(1)}
        />
      ) : null}

      {step === 1 ? (
        <ServiceDetailBody {...serviceDetailLeak} width={width} height={height} onRequestNow={() => setStep(2)} />
      ) : null}

      {step === 2 ? (
        // Real elapsed time. The wait is the product here, and a frozen
        // "38 שניות" says nothing about what waiting feels like.
        <SearchingBody
          serviceNameHe="תיקון נזילה בברז"
          elapsedSeconds={elapsed}
          width={width}
          height={height}
        />
      ) : null}

      {step === 3 ? (
        <TrackingBody
          status="PRO_ASSIGNED"
          serviceNameHe="תיקון נזילה בברז"
          professional={matchFixture.professional}
          eta={matchFixture.eta}
          money={{ visitFeeHe: "₪179" }}
          width={width}
          height={height}
        />
      ) : null}

      {step === 4 ? (
        <TrackingBody
          status="PRO_EN_ROUTE"
          serviceNameHe="תיקון נזילה בברז"
          professional={matchFixture.professional}
          eta={matchFixture.eta}
          money={{ visitFeeHe: "₪179" }}
          width={width}
          height={height}
        />
      ) : null}

      {step === 5 ? (
        <QuoteApprovalBody
          quote={quoteFixture}
          serviceNameHe="תיקון נזילה בברז"
          professionalDisplayName={matchFixture.professional.displayName}
          onApprove={() => setStep(6)}
          width={width}
          height={height}
        />
      ) : null}

      {step === 6 ? (
        <JobCompleteBody
          serviceNameHe="תיקון נזילה בברז"
          mark="plumbing"
          professionalDisplayName={matchFixture.professional.displayName}
          whenHe="היום, 14:20 · 55 דקות"
          receiptLines={receiptLines}
          totalChargedMinorUnits={44500}
          paymentMethodLabelHe="ויזה · 4417"
          width={width}
          height={height}
        />
      ) : null}
    </Flow>
  );
}

export function ProSequence({ width, height }: { width: number; height: number }) {
  const [step, setStep] = useState(0);
  const nowMs = useNow(step === 3);
  const [offerStart] = useState(() => Date.now());

  const presence: ProPresenceState =
    step === 0 ? "OFFLINE" : step === 1 ? "STARTING_SHIFT" : "AVAILABLE";

  // The offer's deadline is a real instant 30 seconds after this step is
  // first reached, so the ring genuinely drains and genuinely expires.
  const offer = {
    ...offerFixture,
    offeredAt: new Date(offerStart).toISOString(),
    expiresAt: new Date(offerStart + 30_000).toISOString(),
  };

  return (
    <Flow
      steps={PRO_STEPS as unknown as string[]}
      step={step}
      onStep={setStep}
      width={width}
      dark
      accent={proTheme.colors.trust}
    >
      {step < 3 ? (
        <ProOnlineBody
          presenceState={presence}
          displayNameHe="דוגמה ד׳"
          todayNetMinorUnits={step === 0 ? 0 : step === 1 ? null : 48200}
          todayJobCount={step === 2 ? 3 : 0}
          services={proServices}
          onToggleOnline={() => setStep(step === 0 ? 1 : 0)}
          width={width}
          height={height}
        />
      ) : (
        <ProOfferBody
          offer={offer}
          nowMs={nowMs}
          onAccept={() => setStep(2)}
          onSkip={() => setStep(2)}
          width={width}
          height={height}
        />
      )}
    </Flow>
  );
}

export function ProfileSequence({ width }: { width: number }) {
  return (
    <ProProfileBody
      professional={matchFixture.professional}
      services={profileServices}
      reviews={profileReviews}
      workPhotoSubjects={profileWorkPhotos}
      activeSinceYear={2014}
      areaLabelHe="גוש דן"
      fromPriceMinorUnits={17900}
      width={width}
      height={980}
    />
  );
}

// ---------------------------------------------------------------------

function Flow({
  steps,
  step,
  onStep,
  width,
  children,
  dark = false,
  accent,
}: {
  steps: string[];
  step: number;
  onStep: (n: number) => void;
  width: number;
  children: React.ReactNode;
  dark?: boolean;
  accent: string;
}) {
  const colors = dark ? proTheme.colors : customerTheme.colors;
  const fade = useRef(new Animated.Value(1)).current;

  // A short cross-fade on each change, so stepping reads as a transition
  // rather than as a slide swap. It is the cheapest way to make a sequence
  // feel like one screen moving instead of seven screens taking turns.
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [step, fade]);

  return (
    <View style={{ width }}>
      <View style={styles.tabs}>
        {steps.map((label, i) => {
          const active = i === step;
          return (
            <Pressable
              key={label}
              onPress={() => onStep(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? accent : dark ? "rgba(255,255,255,0.07)" : "rgba(23,18,31,0.05)",
                },
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? "#FFFFFF" : dark ? colors.textSecondary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Animated.View style={{ opacity: fade }}>{children}</Animated.View>

      <View style={styles.navRow}>
        <Pressable
          disabled={step === 0}
          onPress={() => onStep(Math.max(0, step - 1))}
          style={[styles.navBtn, step === 0 && styles.navDisabled]}
        >
          <Text style={[styles.navLabel, { color: colors.textSecondary }]}>קודם</Text>
        </Pressable>
        <Text style={[styles.navCount, { color: colors.textSecondary }]}>
          {step + 1} / {steps.length}
        </Text>
        <Pressable
          disabled={step === steps.length - 1}
          onPress={() => onStep(Math.min(steps.length - 1, step + 1))}
          style={[styles.navBtn, { backgroundColor: accent }, step === steps.length - 1 && styles.navDisabled]}
        >
          <Text style={[styles.navLabel, { color: "#FFFFFF" }]}>הבא</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Seconds since this became active. Resets each time it is re-entered. */
function useElapsed(active: boolean): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => setN(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return n;
}

/** A ticking clock, so a countdown actually counts down. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
    justifyContent: "flex-end",
  },
  tab: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radii.pill },
  tabLabel: { ...t.caption, fontSize: scale.micro, fontWeight: "600", writingDirection: "rtl" },

  navRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  navBtn: {
    minHeight: 40,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23,18,31,0.07)",
  },
  navDisabled: { opacity: 0.35 },
  navLabel: { ...t.captionStrong },
  navCount: { ...t.caption, fontVariant: ["tabular-nums"] },
});
