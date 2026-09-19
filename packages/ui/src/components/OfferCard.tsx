import React, { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney, money, type OfferCardView } from "@pro-now/types";

import { proTheme, radius, spacing, touchTarget, typography } from "../theme";
import { formatCountdown, formatDistance, formatEta, payoutDisclosure } from "../format";
import { Divider, MetaChip, SectionLabel, Skeleton, type ThemeColors } from "./primitives";

/**
 * P-side incoming offer — the professional's decision moment.
 *
 * Two invariants shape this card and are worth stating because they are
 * what make it different from a generic "new job" notification:
 *
 *  1. **Transparent payout** (/CLAUDE.md §3). The professional sees the
 *     expected earnings BEFORE accepting whenever the amount is knowable.
 *     When it is not knowable the card says so in words — it never prints a
 *     plausible number to fill the space.
 *  2. **Pre-assignment location privacy** (/docs/12-PRIVACY.md). Before
 *     acceptance the card shows an approximate area, never the exact street
 *     address. There is no prop on this component that could carry one.
 *
 * The countdown is rendered from the server's `expiresAt`. The client counts
 * down to a deadline it was given; it never decides that an offer expired
 * (/CLAUDE.md §3 — the server is authoritative for timers). When the clock
 * reaches zero the card disables itself and waits for the server, rather
 * than reporting an expiry of its own.
 */

const colors: ThemeColors = proTheme.colors;

export interface OfferCardProps {
  offer: OfferCardView;
  onAccept: () => void;
  onSkip: () => void;
  responding?: boolean;
  /** Injectable clock so the countdown is deterministic in tests/snapshots. */
  nowMs?: number;
}

function urgencyColor(urgency: "calm" | "warning" | "critical"): string {
  if (urgency === "calm") return colors.action;
  if (urgency === "warning") return colors.statusWarning;
  return colors.statusDanger;
}

export function OfferCard({ offer, onAccept, onSkip, responding = false, nowMs }: OfferCardProps) {
  const totalSeconds = Math.max(
    1,
    Math.round((new Date(offer.expiresAt).getTime() - new Date(offer.offeredAt).getTime()) / 1000)
  );

  // A frozen clock (tests, screenshots) must not start a ticking timer.
  const isFrozen = nowMs !== undefined;
  const [tick, setTick] = useState(() => nowMs ?? Date.now());

  useEffect(() => {
    if (isFrozen) return;
    const id = setInterval(() => setTick(Date.now()), 250);
    return () => clearInterval(id);
  }, [isFrozen]);

  const countdown = formatCountdown(offer.expiresAt, isFrozen ? nowMs : tick, totalSeconds);
  const accent = urgencyColor(countdown.urgency);

  const etaDisplay = formatEta(offer.eta);
  const distance = formatDistance(offer.eta?.distanceMeters ?? null);
  const payout = payoutDisclosure(offer.expectedPayoutMinorUnits, offer.payoutIsEstimate);
  const currency = (offer.currency as "ILS" | "USD" | "EUR") ?? "ILS";

  const disabled = responding || countdown.expired;

  return (
    <View style={styles.card} accessibilityLabel={`הצעת עבודה: ${offer.serviceNameHe}`}>
      {/* --- Countdown --- */}
      <View style={styles.countdownRow}>
        <Text style={[styles.countdownValue, { color: accent }]}>{countdown.label}</Text>
        <Text style={styles.countdownLabel}>
          {countdown.expired ? "ההצעה הסתיימה" : "נותר להחליט"}
        </Text>
      </View>
      <View style={styles.trackOuter}>
        <Animated.View
          style={[styles.trackInner, { backgroundColor: accent, width: `${countdown.fraction * 100}%` }]}
        />
      </View>

      {/* --- Job --- */}
      <Text style={styles.serviceName} numberOfLines={2}>
        {offer.serviceNameHe}
      </Text>
      <Text style={styles.area} numberOfLines={1}>
        {offer.customerAreaLabel}
      </Text>

      <View style={styles.metaRow}>
        {etaDisplay ? (
          <MetaChip
            icon="◷"
            label={`${etaDisplay.value} ${etaDisplay.unit}${etaDisplay.isApproximate ? " (משוער)" : ""}`}
            colors={colors}
            emphasis
          />
        ) : null}
        {distance ? <MetaChip icon="◎" label={distance} colors={colors} /> : null}
      </View>

      {offer.jobDescription ? (
        <Text style={styles.description} numberOfLines={3}>
          {offer.jobDescription}
        </Text>
      ) : null}

      <Divider color={colors.border} style={{ marginVertical: spacing.lg }} />

      {/* --- Payout --- */}
      <SectionLabel colors={colors}>תשלום צפוי</SectionLabel>
      {payout.known ? (
        <View style={styles.payoutRow}>
          <Text style={styles.payoutValue}>
            {formatMoney(money(offer.expectedPayoutMinorUnits as number, currency))}
          </Text>
          {payout.qualifierHe ? (
            <View style={styles.estimateChip}>
              <Text style={styles.estimateChipLabel}>{payout.qualifierHe}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.payoutUnknown}>{payout.reasonHe}</Text>
      )}
      <Text style={styles.payoutNote}>
        {payout.known && payout.isEstimate
          ? "הסכום הסופי ייגזר מהעבודה בפועל ויוצג לפני החיוב."
          : "הסכום מוצג לפני קבלת העבודה, ללא עמלות נסתרות."}
      </Text>

      {/* --- Actions --- */}
      <Pressable
        onPress={onAccept}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="קבלת העבודה"
        style={({ pressed }) => [
          styles.acceptButton,
          pressed && styles.acceptButtonPressed,
          responding && styles.buttonDisabled,
          countdown.expired && styles.acceptButtonExpired,
        ]}
      >
        <Text style={[styles.acceptButtonLabel, countdown.expired && styles.acceptButtonLabelExpired]}>
          {countdown.expired ? "ההצעה הסתיימה" : responding ? "שולח…" : "קבלת העבודה"}
        </Text>
      </Pressable>

      <Pressable
        onPress={onSkip}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="דילוג על ההצעה"
        style={styles.skipButton}
      >
        <Text style={styles.skipButtonLabel}>דילוג</Text>
      </Pressable>
    </View>
  );
}

/** Loading state for the offer card. */
export function OfferCardSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="טוען הצעת עבודה">
      <Skeleton width="35%" height={34} colors={colors} />
      <View style={{ height: spacing.md }} />
      <Skeleton width="100%" height={6} radius={radius.pill} colors={colors} />
      <View style={{ height: spacing.xl }} />
      <Skeleton width="70%" height={26} colors={colors} />
      <View style={{ height: spacing.sm }} />
      <Skeleton width="45%" height={14} colors={colors} />
      <Divider color={colors.border} style={{ marginVertical: spacing.lg }} />
      <Skeleton width="40%" height={40} colors={colors} />
      <View style={{ height: spacing.xl }} />
      <Skeleton width="100%" height={56} radius={radius.md} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },

  countdownRow: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  countdownValue: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    fontVariant: ["tabular-nums" as const],
  },
  countdownLabel: { ...typography.caption, color: colors.textSecondary },
  trackOuter: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  // Anchored to the physical right rather than ordered by flex, so the bar
  // drains from the trailing edge identically on a device and in the web
  // gallery — flex direction flips between those two, absolute insets do not.
  trackInner: {
    position: "absolute",
    top: 0,
    right: 0,
    height: 6,
    borderRadius: radius.pill,
  },

  serviceName: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.xl,
  },
  area: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.xs,
  },

  metaRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },

  description: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.lg,
    lineHeight: 20,
  },

  payoutRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  payoutValue: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: colors.textPrimary,
    fontVariant: ["tabular-nums" as const],
  },
  estimateChip: {
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: "rgba(245,165,36,0.16)",
  },
  estimateChipLabel: { fontSize: 13, fontWeight: "600", color: colors.statusWarning },
  payoutUnknown: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  payoutNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: "right", writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 19,
  },

  acceptButton: {
    minHeight: 58,
    backgroundColor: colors.action,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  acceptButtonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.45 },
  acceptButtonExpired: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  acceptButtonLabel: { ...typography.button, fontSize: 17, color: "#06210F" },
  acceptButtonLabelExpired: { color: colors.textSecondary },

  skipButton: {
    minHeight: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  skipButtonLabel: { ...typography.body, color: colors.textSecondary },
});
