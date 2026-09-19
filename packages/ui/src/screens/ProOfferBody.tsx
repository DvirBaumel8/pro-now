import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { formatMoney, money, type OfferCardView } from "@pro-now/types";

import { proTheme, radii, spacing, tabular, tint, type } from "../theme";
import { formatCountdown, formatDistance, formatEta, payoutDisclosure } from "../format";
import { ClockMark, PinMark } from "../components/marks";
import { MapSurface } from "../components/MapSurface";

/**
 * P16 — an incoming job offer, as a full screen rather than a card.
 *
 * A card says "here is some information". This screen has to say "something
 * is happening to you, right now, and it stops in thirty seconds". Those are
 * different jobs, so this is not the offer card with more padding: the map
 * is the stage, the payout is the largest thing on the screen, the countdown
 * is a ring the professional can read at arm's length, and there is exactly
 * one affirmative action.
 *
 * The urgency is real, and that is the only reason it is allowed to look
 * like this. Three rules keep it from becoming pressure:
 *
 * 1. **The deadline is the server's.** The ring counts down to `expiresAt`;
 *    it never decides when the offer ends (/CLAUDE.md §3 — the server is
 *    authoritative for timers). When the clock runs out the screen says so
 *    and both actions go away, rather than failing on tap.
 * 2. **The payout is shown before accepting, or admitted as unknown.** A
 *    plausible-looking number in place of one nobody has calculated is the
 *    single most damaging lie this screen could tell, because the
 *    professional commits to driving on the strength of it.
 * 3. **The address is not here.** Before acceptance the customer's location
 *    is a coarse area label; precision is released on assignment
 *    (/docs/12-PRIVACY.md).
 */

const colors = proTheme.colors;

export interface ProOfferBodyProps {
  offer: OfferCardView;
  /** Total offer window in seconds, so the ring has a full-scale reference. */
  totalSeconds?: number;
  /** Injected in tests and in the gallery; defaults to the real clock. */
  nowMs?: number;
  onAccept?: () => void;
  onSkip?: () => void;
  width?: number;
  height?: number;
}

export function ProOfferBody({
  offer,
  totalSeconds = 30,
  nowMs = Date.now(),
  onAccept,
  onSkip,
  width = 390,
  height = 780,
}: ProOfferBodyProps) {
  const countdown = formatCountdown(offer.expiresAt, nowMs, totalSeconds);
  const eta = formatEta(offer.eta);
  const distance = formatDistance(offer.eta?.distanceMeters ?? null);
  const payout = payoutDisclosure(offer.expectedPayoutMinorUnits, offer.payoutIsEstimate);

  const urgencyColor =
    countdown.urgency === "critical"
      ? colors.statusDanger
      : countdown.urgency === "warning"
        ? colors.statusWarning
        : colors.action;

  return (
    <View style={[styles.screen, { width, height }]}>
      <MapSurface
        colors={colors}
        dark
        height={height}
        showAssignedMarker
        statusText={offer.customerAreaLabel}
        statusTopOffset={spacing.xl}
        style={styles.map}
      />

      {/*
       * A legibility scrim, not decoration. /docs/03-DESIGN-SYSTEM.md rules
       * out "heavy gradients" as ornament; this is the standard map-overlay
       * technique that lets type sit directly on a scene instead of in a box
       * on top of it — which is the whole "fewer containers" move. A flat
       * slab would be easier and would also kill the map, and then the map
       * is not the stage, it is a strip at the top.
       */}
      <View style={styles.scrim} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="offerScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#060908" stopOpacity="0" />
              <Stop offset="0.45" stopColor="#060908" stopOpacity="0.72" />
              <Stop offset="1" stopColor="#060908" stopOpacity="0.96" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#offerScrim)" />
        </Svg>
      </View>

      <View style={styles.ring}>
        <CountdownRing fraction={countdown.fraction} color={urgencyColor} trackColor={colors.border} />
        <View style={styles.ringInner}>
          <Text style={[styles.ringValue, { color: urgencyColor }]}>
            {countdown.expired ? "—" : countdown.label}
          </Text>
          <Text style={styles.ringLabel}>{countdown.expired ? "הסתיימה" : "נותרו"}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.kicker}>עבודה חדשה</Text>
        <Text style={styles.service} numberOfLines={2}>
          {offer.serviceNameHe}
        </Text>

        {/* The number the decision is actually made on. */}
        {payout.known ? (
          <View style={styles.payoutRow}>
            <Text style={styles.payout}>
              {formatMoney(money(offer.expectedPayoutMinorUnits as number, "ILS"))}
            </Text>
            {payout.qualifierHe ? <Text style={styles.payoutQualifier}>{payout.qualifierHe}</Text> : null}
          </View>
        ) : (
          <>
            <Text style={styles.payoutUnknown}>סכום ייקבע באתר</Text>
            <Text style={styles.payoutReason}>{payout.reasonHe}</Text>
          </>
        )}

        <View style={styles.facts}>
          <Fact
            icon={<ClockMark size={15} color={colors.textSecondary} />}
            value={eta ? `${eta.value} ${eta.unit}` : "—"}
            label={eta ? (eta.isApproximate ? "נסיעה · משוער" : "נסיעה") : "זמן נסיעה טרם חושב"}
          />
          <Fact
            icon={<PinMark size={15} color={colors.textSecondary} />}
            value={distance ?? "—"}
            label={distance ? "מרחק" : "מרחק לא ידוע"}
          />
        </View>

        {offer.jobDescription ? (
          <Text style={styles.description} numberOfLines={3}>
            {offer.jobDescription}
          </Text>
        ) : null}

        {countdown.expired ? (
          <View style={styles.expired}>
            <Text style={styles.expiredText}>ההצעה הסתיימה ונשלחה למישהו אחר.</Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={onAccept}
              accessibilityRole="button"
              accessibilityLabel={`קבלת העבודה ${offer.serviceNameHe}`}
              style={({ pressed }) => [styles.accept, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.acceptLabel}>קבלת העבודה</Text>
            </Pressable>
            <Pressable onPress={onSkip} accessibilityRole="button" style={styles.skip}>
              <Text style={styles.skipLabel}>דילוג</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function Fact({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <View style={styles.fact}>
      <View style={styles.factTop}>
        {icon}
        <Text style={styles.factValue}>{value}</Text>
      </View>
      <Text style={styles.factLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The ring drains clockwise from full. `strokeDasharray` on a circle is the
 * honest way to do this: the arc length IS the remaining fraction, so the
 * picture cannot drift from the number beside it.
 */
function CountdownRing({
  fraction,
  color,
  trackColor,
  size = 86,
}: {
  fraction: number;
  color: string;
  trackColor: string;
  size?: number;
}) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${circumference * fraction} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  map: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },

  // No card: a vertical wash carries the type instead of a container.
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "78%" },

  ring: {
    position: "absolute",
    top: 86,
    alignSelf: "center",
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: { alignItems: "center", justifyContent: "center" },
  ringValue: { ...type.h2, ...tabular, fontSize: 24 },
  ringLabel: { ...type.caption, fontSize: 11, color: colors.textSecondary, writingDirection: "rtl" },

  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "flex-end",
  },
  kicker: { ...type.overline, color: colors.action },
  service: {
    ...type.h1,
    fontSize: 32,
    lineHeight: 38,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  payoutRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.lg },
  payout: { ...type.displayXL, ...tabular, fontSize: 58, lineHeight: 62, color: colors.textPrimary },
  payoutQualifier: { ...type.captionStrong, color: colors.statusWarning, writingDirection: "rtl" },
  payoutUnknown: { ...type.h1, color: colors.textSecondary, marginTop: spacing.lg, writingDirection: "rtl" },
  payoutReason: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  facts: { flexDirection: "row-reverse", gap: spacing.xxl, marginTop: spacing.lg },
  fact: { alignItems: "flex-end" },
  factTop: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  factValue: { ...type.h3, ...tabular, color: colors.textPrimary },
  factLabel: { ...type.caption, fontSize: 11, color: colors.textSecondary, writingDirection: "rtl" },

  description: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 18,
  },

  accept: {
    alignSelf: "stretch",
    minHeight: 62,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  acceptLabel: { ...type.bodyStrong, fontSize: 18, color: colors.onAction },
  skip: { alignSelf: "center", paddingVertical: spacing.md, minHeight: 44, justifyContent: "center" },
  skipLabel: { ...type.captionStrong, color: colors.textSecondary },

  expired: {
    alignSelf: "stretch",
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: tint.neutralDark(0.06),
  },
  expiredText: { ...type.captionStrong, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl" },
});
