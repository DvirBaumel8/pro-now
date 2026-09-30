import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { formatMoney, money, type OfferCardView } from "@pro-now/types";

import { proTheme, radii, scale, spacing, tabular, tint, type } from "../theme";
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
  /**
   * PRICED BEFORE HE SETS OFF (towing, moving, painting…). He names the
   * price from the photos and details; he is assigned only once the
   * customer approves it.
   */
  quoteFirst?: { destinationHe?: string | null } | null;
  /** The professional is a woman: "כן, אני לוקחת". */
  proFemale?: boolean;
  /**
   * True while the answer is in flight.
   *
   * `OfferCard` has always had this and the full screen did not, which
   * matters more here than on the card: two taps on "כן, אני לוקח" send
   * two accepts, and the second comes back as OFFER_NO_LONGER_AVAILABLE
   * — indistinguishable from somebody else having taken it. The
   * professional would be told they lost the job they had just won,
   * and sent back to the shift screen while a customer waited for them.
   *
   * So the actions go quiet the moment one is tapped, and the screen
   * says which way it is going rather than looking inert.
   */
  responding?: boolean;
  width?: number;
  height?: number;
}

export function ProOfferBody({
  offer,
  totalSeconds = 30,
  nowMs = Date.now(),
  onAccept,
  quoteFirst = null,
  proFemale = false,
  onSkip,
  responding = false,
  width = 390,
  height = 780,
}: ProOfferBodyProps) {
  const countdown = formatCountdown(offer.expiresAt, nowMs, totalSeconds);
  const eta = formatEta(offer.eta);
  const distance = formatDistance(offer.eta?.distanceMeters ?? null);
  const payout = payoutDisclosure(offer.expectedPayoutMinorUnits, offer.payoutIsEstimate);
  const brief = offer.intakeBrief ?? [];
  const attachments = attachmentLabels(offer);
  const arrivalChips = arrivalLabels(offer);
  const typical = offer.typicalServiceMinutes ?? null;
  const [contentH, setContentH] = useState(0);

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
      {/*
        * The scrim is MEASURED, not guessed.
        *
        * It was a fixed 78% of the screen, which worked when the card held a
        * price and an ETA. Then the card grew a brief — the customer's own
        * answers, the media, the typical duration — and the top of that text
        * rose above the dark part of the gradient and landed on bare map.
        * Roads through Hebrew. Any fixed fraction has the same fate the next
        * time the card gains a line, so it now follows the content it exists
        * to protect, with enough headroom above it for the fade to happen.
        */}
      <View style={[styles.scrim, { height: contentH + 140 }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="offerScrim" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#060908" stopOpacity="0" />
              <Stop offset="0.35" stopColor="#060908" stopOpacity="0.82" />
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
          <Text style={styles.ringLabel}>
            {countdown.expired ? "הסתיימה" : "שניות להחליט"}
          </Text>
        </View>
      </View>

      <View style={styles.content} onLayout={(e) => setContentH(e.nativeEvent.layout.height)}>
        {/*
          * "עבודה חדשה" assumed the professional already knew what this
          * screen was. Nobody seeing it for the first time does: a full
          * screen appears, a ring counts down, and two buttons demand a
          * decision. So the kicker now says what happened and what the
          * countdown means, in one line, before anything else is read.
          */}
        <Text style={styles.kicker}>קריאה חדשה בשבילך · רק {proFemale ? "את רואה" : "אתה רואה"} אותה עכשיו</Text>
        <Text style={styles.service} numberOfLines={2}>
          {offer.serviceNameHe}
        </Text>

        {/* The number the decision is actually made on. */}
        {quoteFirst ? (
          <>
            <Text style={styles.payoutUnknown}>אתה קובע את המחיר</Text>
            <Text style={styles.payoutReason}>
              תסתכל על התמונות והפרטים ושלח מחיר. אתה יוצא רק אחרי שהלקוח מאשר — והסכום מאושר בכרטיס ועובר אליך בסוף.
            </Text>
            {quoteFirst.destinationHe ? <Text style={styles.payoutReason}>לאן: {quoteFirst.destinationHe}</Text> : null}
          </>
        ) : payout.known ? (
          <View style={styles.payoutRow}>
            <Text style={styles.payout}>
              {formatMoney(money(offer.expectedPayoutMinorUnits as number, "ILS"))}
            </Text>
            {offer.priceModel === "HOURLY" ? (
              <Text style={styles.payoutQualifier}>לשעה</Text>
            ) : payout.qualifierHe ? (
              <Text style={styles.payoutQualifier}>{payout.qualifierHe}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <Text style={styles.payoutUnknown}>הסכום ייקבע במקום</Text>
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

        {/*
          * WHAT IS WAITING THERE.
          *
          * Everything below is optional and renders as absent when the
          * server did not send it. The order is the order a professional
          * asks in their head: what exactly, what did they send me, what
          * will the building be like, how long does this kind of job
          * usually run.
          */}
        {brief.length > 0 ? (
          <View style={styles.brief}>
            {brief.slice(0, 4).map((l) => (
              <View key={l.questionId} style={styles.briefRow}>
                <Text style={styles.briefA} numberOfLines={1}>
                  {l.answerHe}
                </Text>
                <Text style={styles.briefQ} numberOfLines={1}>
                  {l.promptHe}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {offer.jobDescription ? (
          <Text style={styles.description} numberOfLines={3}>
            {offer.jobDescription}
          </Text>
        ) : null}

        {attachments.length > 0 || arrivalChips.length > 0 ? (
          <View style={styles.tags}>
            {attachments.map((a) => (
              <View key={a} style={[styles.tag, styles.tagMedia]}>
                <Text style={styles.tagText}>{a}</Text>
              </View>
            ))}
            {arrivalChips.map((a) => (
              <View key={a} style={styles.tag}>
                <Text style={styles.tagText}>{a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {typical ? (
          /*
           * Framed as a fact about the SERVICE, never as a prediction about
           * this job. "עבודות כאלה נמשכות בדרך כלל" is something we know;
           * "משך משוער" is something we do not, and a professional who plans
           * their evening around our guess is owed the difference.
           */
          <Text style={styles.typical}>
            עבודות כאלה נמשכות בדרך כלל {typical[0]}–{typical[1]} דקות
          </Text>
        ) : null}

        {countdown.expired ? (
          <View style={styles.expired}>
            <Text style={styles.expiredText}>
              הזמן נגמר. הקריאה עברה לבעל מקצוע אחר באזור.
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              onPress={responding ? undefined : onAccept}
              disabled={responding}
              accessibilityRole="button"
              accessibilityState={{ disabled: responding, busy: responding }}
              accessibilityLabel={`קבלת העבודה ${offer.serviceNameHe}`}
              style={({ pressed }) => [
                styles.accept,
                pressed && !responding && { opacity: 0.88 },
                responding && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.acceptLabel}>
                {responding ? "רגע…" : quoteFirst ? (proFemale ? "תני הצעת מחיר" : "תן הצעת מחיר") : proFemale ? "כן, אני לוקחת" : "כן, אני לוקח"}
              </Text>
            </Pressable>
            <Pressable
              onPress={responding ? undefined : onSkip}
              disabled={responding}
              accessibilityRole="button"
              accessibilityState={{ disabled: responding }}
              style={[styles.skip, responding && { opacity: 0.5 }]}
            >
              <Text style={styles.skipLabel}>לא עכשיו — העבר למקצוען אחר</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Media is announced, not shown.
 *
 * The photos and the voice note belong to a customer who has not yet been
 * matched with anyone. Releasing them to every professional the offer passes
 * through would scatter someone's kitchen around the city — so before
 * acceptance the card says what exists, and after acceptance the job screen
 * shows it.
 */
function attachmentLabels(offer: OfferCardView): string[] {
  const m = offer.mediaSummary;
  if (!m) return [];
  const out: string[] = [];
  if (m.photos === 1) out.push("תמונה אחת");
  else if (m.photos > 1) out.push(`${m.photos} תמונות`);
  if (typeof m.voiceSeconds === "number" && m.voiceSeconds > 0) {
    const mm = Math.floor(m.voiceSeconds / 60);
    const ss = String(Math.round(m.voiceSeconds % 60)).padStart(2, "0");
    out.push(`הקלטה ${mm}:${ss}`);
  }
  return out;
}

/**
 * Arrival conditions, ONLY where the customer said something.
 *
 * A missing lift renders as nothing at all rather than as "מעלית: לא ידוע".
 * Four unknowns on a card make a normal offer look broken, and the
 * professional learns to ignore the whole row — which costs us the times it
 * does carry something.
 */
function arrivalLabels(offer: OfferCardView): string[] {
  const a = offer.arrival;
  if (!a) return [];
  const out: string[] = [];
  if (typeof a.floor === "number") out.push(a.floor === 0 ? "קומת קרקע" : `קומה ${a.floor}`);
  if (a.hasLift === true) out.push("יש מעלית");
  else if (a.hasLift === false) out.push("אין מעלית");
  if (a.parkingHe) out.push(`חניה: ${a.parkingHe}`);
  return out;
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
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0 },

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
  ringValue: { ...type.h2, ...tabular, fontSize: scale.section },
  ringLabel: { ...type.caption, fontSize: scale.micro, color: colors.textSecondary, writingDirection: "rtl" },

  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "flex-end",
  },
  kicker: { ...type.captionStrong, color: colors.actionText, textAlign: "right" },
  service: {
    ...type.h1,
    fontSize: scale.title,
    lineHeight: 38,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  payoutRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: spacing.sm, marginTop: spacing.lg },
  payout: { ...type.displayXL, ...tabular, fontSize: scale.display, lineHeight: 62, color: colors.textPrimary },
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
  factLabel: { ...type.caption, fontSize: scale.micro, color: colors.textSecondary, writingDirection: "rtl" },

  brief: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "rgba(247,243,250,0.05)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  briefRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  briefQ: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl", flexShrink: 1 },
  briefA: { ...type.captionStrong, color: colors.textPrimary, writingDirection: "rtl", flexShrink: 1 },
  tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: spacing.md },
  tag: {
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagMedia: { borderColor: tint.trust(0.45), backgroundColor: tint.trust(0.1) },
  tagText: { ...type.caption, fontSize: scale.micro, color: colors.textPrimary, writingDirection: "rtl" },
  typical: {
    ...type.caption,
    color: colors.textSecondary,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: spacing.sm,
  },
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
  acceptLabel: { ...type.bodyStrong, fontSize: scale.body, color: colors.onAction },
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
