import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney, money, type ProPresenceState } from "@pro-now/types";

import { proTheme, radii, scale, spacing, tint, type } from "../theme";
import { MapSurface } from "../components/MapSurface";
import { BottomSheet, Chip } from "../components/surfaces";
import { Mark, type MarkName } from "../components/marks";

/**
 * COLOUR NOTE — this screen is where the palette's split earns its keep.
 * "You are ONLINE" is a VERIFIED STATE the server is asserting, so it is
 * drawn in trust-teal alongside the live beacon and the eligible services.
 * The button that starts a shift is an ACTION, so it is signal-coral. If the
 * two shared a colour, "go" and "confirmed" would read as the same word, and
 * a professional glancing at the screen could not tell intent from fact.
 *
 * P02 — The professional's home. Dark, map-forward, one decision on it:
 * ONLINE or not. /docs/03-DESIGN-SYSTEM.md asks the professional surfaces
 * for "dark charcoal, vivid live-green, large numbers, strong map presence".
 *
 * Going ONLINE is the promise the whole marketplace is built on, so this
 * screen is careful about two things:
 *
 * 1. **Presence is the server's.** The toggle reflects `presenceState` and
 *    reports intent upward; it never flips itself optimistically. A
 *    professional who believes they are online while the server disagrees
 *    is exactly the broken promise /CLAUDE.md §3 exists to prevent — so
 *    transitional states (STARTING_SHIFT / ENDING_SHIFT) render as their
 *    own visible state, not as the destination.
 * 2. **You cannot go online for a service you are not eligible for.**
 *    Eligibility is per service (/CLAUDE.md §3), so the enabled services are
 *    listed explicitly and a blocked one says why.
 */

const colors = proTheme.colors;

export interface ProServiceToggle {
  id: string;
  nameHe: string;
  mark: MarkName;
  enabled: boolean;
  /** Set when the professional is NOT dispatch-eligible for this service. */
  blockedReasonHe?: string | null;
}

export interface ProOnlineBodyProps {
  presenceState: ProPresenceState;
  displayNameHe: string;
  /** Today's net earnings in minor units, or null when not yet known. */
  todayNetMinorUnits: number | null;
  todayJobCount: number;
  services: ProServiceToggle[];
  onToggleOnline?: () => void;
  onManageServices?: () => void;
  /** Present when this screen is pushed from the shift screen. */
  onBack?: () => void;
  width?: number;
  height?: number;
}

const ONLINE_STATES: ProPresenceState[] = [
  "AVAILABLE",
  "OFFER_RECEIVED",
  "RESERVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "SERVICING",
  "COMPLETING",
];

export function ProOnlineBody({
  presenceState,
  displayNameHe,
  todayNetMinorUnits,
  todayJobCount,
  services,
  onToggleOnline,
  onManageServices,
  onBack,
  width = 390,
  height = 780,
}: ProOnlineBodyProps) {
  const isOnline = ONLINE_STATES.includes(presenceState);
  const isTransitioning = presenceState === "STARTING_SHIFT" || presenceState === "ENDING_SHIFT";

  const statusHe = isTransitioning
    ? presenceState === "STARTING_SHIFT"
      ? "מתחברים…"
      : "מסיימים משמרת…"
    : isOnline
      ? "אתה ONLINE"
      : "אתה לא זמין";

  const eligibleCount = services.filter((s) => s.enabled && !s.blockedReasonHe).length;

  return (
    <View style={[styles.screen, { width, height }]}>
      <MapSurface
        colors={{ ...colors, action: colors.trust }}
        dark
        height={height}
        pulsing={isOnline}
        statusText={isOnline ? "מחוברים — עבודות באזור שלך יגיעו לכאן" : "לא מחוברים"}
        // Below the floating earnings card, which owns the top-right corner.
        statusTopOffset={132}
        style={styles.map}
      />

      {/* Earnings float above the map, big numbers as the spec asks */}
      <View style={[styles.topBar, onBack ? styles.topBarRow : null]}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="חזרה למשמרת"
            style={styles.backHit}
          >
            <Text style={styles.backText}>חזרה</Text>
          </Pressable>
        ) : null}
        <View style={styles.earnCard}>
          <Text style={styles.earnLabel}>היום</Text>
          {todayNetMinorUnits === null ? (
            <Text style={styles.earnUnknown}>—</Text>
          ) : (
            <Text style={styles.earnValue}>{formatMoney(money(todayNetMinorUnits, "ILS"))}</Text>
          )}
          <Text style={styles.earnSub}>
            {todayJobCount === 0
              ? "טרם הושלמו עבודות"
              : todayJobCount === 1
                ? "עבודה אחת הושלמה"
                : `${todayJobCount} עבודות הושלמו`}
          </Text>
        </View>
      </View>

      <View style={styles.sheetWrap}>
        <BottomSheet colors={colors} dark>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              {isOnline && !isTransitioning ? <LiveBeacon color={colors.trust} /> : null}
              <Text
                style={[
                  styles.status,
                  {
                    color: isTransitioning
                      ? colors.statusWarning
                      : isOnline
                        ? colors.trust
                        : colors.textSecondary,
                  },
                ]}
              >
                {statusHe}
              </Text>
            </View>
            <Text style={styles.hello} numberOfLines={1}>
              {displayNameHe}
            </Text>
          </View>

          <Text style={styles.explain}>
            {isOnline
              ? "כל עוד אתה מחובר, עבודות מתאימות באזור שלך יישלחו אליך אחת בכל פעם."
              : "כשתתחבר, נתחיל לשלוח אליך עבודות מתאימות באזור שלך."}
          </Text>

          {/* --- Services --- */}
          <View style={styles.servicesHead}>
            <Pressable
              onPress={onManageServices}
              accessibilityRole="button"
              accessibilityLabel="ניהול השירותים שלי"
              style={styles.manageHit}
            >
              <Text style={styles.manage}>ניהול</Text>
            </Pressable>
            <Text style={styles.servicesTitle}>
              שירותים פעילים · {eligibleCount}/{services.length}
            </Text>
          </View>

          <View style={styles.serviceList}>
            {services.map((s) => {
              const blocked = Boolean(s.blockedReasonHe);
              return (
                <View key={s.id} style={styles.serviceRow}>
                  <View
                    style={[
                      styles.serviceMark,
                      { backgroundColor: blocked ? tint.danger(0.12) : s.enabled ? tint.trust(0.14) : colors.surfaceElevated },
                    ]}
                  >
                    <Mark
                      name={s.mark}
                      size={18}
                      color={blocked ? colors.statusDanger : s.enabled ? colors.trust : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.serviceText}>
                    <Text style={styles.serviceName} numberOfLines={1}>
                      {s.nameHe}
                    </Text>
                    {blocked ? (
                      <Text style={styles.serviceBlocked} numberOfLines={2}>
                        {s.blockedReasonHe}
                      </Text>
                    ) : null}
                  </View>
                  {blocked ? (
                    <Chip label="חסום" colors={colors} tone="danger" />
                  ) : s.enabled ? (
                    <Chip label="פעיל" colors={colors} tone="trust" />
                  ) : (
                    <Chip label="כבוי" colors={colors} tone="neutral" />
                  )}
                </View>
              );
            })}
          </View>

          <Pressable
            onPress={onToggleOnline}
            disabled={isTransitioning}
            accessibilityRole="button"
            accessibilityLabel={isOnline ? "סיום משמרת" : "התחברות לקבלת עבודות"}
            style={({ pressed }) => [
              styles.cta,
              isOnline ? styles.ctaOnline : styles.ctaOffline,
              pressed && { opacity: 0.85 },
              isTransitioning && { opacity: 0.5 },
            ]}
          >
            <Text style={[styles.ctaLabel, { color: isOnline ? colors.textPrimary : "#06210F" }]}>
              {isTransitioning ? "רגע…" : isOnline ? "סיום משמרת" : "אני זמין לעבודה"}
            </Text>
          </Pressable>
        </BottomSheet>
      </View>
    </View>
  );
}

/** A slow breathing dot — "the server says you are live", nothing more. */
function LiveBeacon({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={{
        width: 9,
        height: 9,
        borderRadius: 5,
        backgroundColor: color,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
      }}
    />
  );
}

const styles = StyleSheet.create({
  manageHit: { minHeight: 44, minWidth: 64, justifyContent: "center", alignItems: "flex-start" },
  backHit: {
    minHeight: 44,
    minWidth: 64,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.72)",
  },
  backText: { ...type.captionStrong, color: colors.textPrimary },
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  map: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },

  topBar: { position: "absolute", top: spacing.xl, right: spacing.lg, left: spacing.lg, alignItems: "flex-end" },
  /**
   * With a back affordance present the bar becomes a row. row-reverse puts
   * the first child on the right, which is where a Hebrew reader looks for
   * "back" — and leaves the earnings card on the left rather than stacking
   * the two on top of each other.
   */
  topBarRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "flex-start" },
  earnCard: {
    backgroundColor: "rgba(11,15,14,0.86)",
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "flex-end",
  },
  earnLabel: { ...type.overline, color: colors.textSecondary },
  earnValue: { ...type.h1, color: colors.textPrimary, fontVariant: ["tabular-nums"], marginTop: 2 },
  earnUnknown: { ...type.h1, color: colors.textSecondary, marginTop: 2 },
  earnSub: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },

  statusRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  statusLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  status: { ...type.captionStrong, writingDirection: "rtl" },
  hello: { ...type.h3, color: colors.textPrimary, writingDirection: "rtl", maxWidth: 190 },

  explain: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 19,
  },

  servicesHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xl,
  },
  servicesTitle: { ...type.captionStrong, color: colors.textSecondary, writingDirection: "rtl" },
  manage: { ...type.captionStrong, color: colors.trust },

  serviceList: { gap: spacing.sm, marginTop: spacing.md },
  serviceRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  serviceMark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  serviceText: { flex: 1, alignItems: "flex-end" },
  serviceName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  serviceBlocked: { ...type.caption, color: colors.statusDanger, writingDirection: "rtl", textAlign: "right" },

  cta: {
    minHeight: 58,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  ctaOffline: { backgroundColor: colors.action },
  ctaOnline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  ctaLabel: { ...type.bodyStrong, fontSize: scale.body },
});
