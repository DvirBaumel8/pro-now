import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, radii, spacing, tint, type } from "../theme";
import { MapSurface } from "../components/MapSurface";
import { BottomSheet } from "../components/surfaces";
import { Skeleton } from "../components/primitives";

/**
 * C08 — "the Wolt moment", specified in /docs/03-DESIGN-SYSTEM.md
 * §Signature screen: full-screen map, a pulse from the customer's location,
 * "מחפשים מקצוען לידך", and then the sheet rising with the match.
 *
 * What this screen must resist is the temptation to look busy. The honest
 * material it has is small: how many candidates the dispatcher considered
 * and how many were eligible — both straight from `DispatchResultView`. So
 * that is what it shows. There are no professional markers moving around
 * the map, no "12 people looking at your request", no invented activity.
 *
 * The map is decorative; `statusText` on it and the sheet copy carry the
 * real state for screen readers (§Accessibility).
 */

const colors = customerTheme.colors;

export interface SearchingBodyProps {
  serviceNameHe: string;
  /** Seconds since the request was sent. Presentation only. */
  elapsedSeconds: number;
  /** From DispatchResultView — the size of the pool the server looked at. */
  candidatesConsidered?: number | null;
  /** From DispatchResultView — how many passed eligibility. */
  candidatesEligible?: number | null;
  /** True once the server reports NO_ELIGIBLE_CANDIDATES. */
  exhausted?: boolean;
  onCancel?: () => void;
  onBroaden?: () => void;
  width?: number;
  height?: number;
}

export function SearchingBody({
  serviceNameHe,
  elapsedSeconds,
  candidatesConsidered,
  candidatesEligible,
  exhausted = false,
  onCancel,
  onBroaden,
  width = 390,
  height = 780,
}: SearchingBodyProps) {
  const mm = Math.floor(elapsedSeconds / 60);
  const ss = elapsedSeconds % 60;
  const elapsed = `${mm}:${String(ss).padStart(2, "0")}`;

  return (
    <View style={[styles.screen, { width, height }]}>
      <MapSurface
        colors={colors}
        height={height}
        pulsing={!exhausted}
        statusText={exhausted ? "לא נמצא בעל מקצוע זמין" : "מחפשים מקצוען לידך"}
        style={styles.map}
      />

      <View style={styles.sheetWrap}>
        <BottomSheet colors={colors}>
          {exhausted ? (
            <>
              <Text style={styles.title}>אין כרגע בעל מקצוע זמין</Text>
              <Text style={styles.body}>
                בדקנו את כל מי שזמין עכשיו לשירות {serviceNameHe} באזור שלך ולא נמצאה התאמה. זה לא אומר שאין
                מענה — אפשר להרחיב את טווח החיפוש או לנסות שוב בעוד כמה דקות.
              </Text>

              <Pressable onPress={onBroaden} accessibilityRole="button" style={styles.primary}>
                <Text style={styles.primaryLabel}>הרחב את טווח החיפוש</Text>
              </Pressable>
              <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
                <Text style={styles.secondaryLabel}>ביטול הקריאה</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.headRow}>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>מחפשים</Text>
                </View>
                <Text style={styles.elapsed}>{elapsed}</Text>
              </View>

              <Text style={styles.title}>מחפשים מקצוען לידך</Text>
              <Text style={styles.subtitle}>{serviceNameHe}</Text>

              {/* The only two numbers we actually have. */}
              {typeof candidatesConsidered === "number" ? (
                <View style={styles.factRow}>
                  <Fact label="נבדקו" value={String(candidatesConsidered)} />
                  {typeof candidatesEligible === "number" ? (
                    <Fact label="מתאימים" value={String(candidatesEligible)} highlight />
                  ) : null}
                </View>
              ) : (
                <View style={styles.skeletonRow}>
                  <Skeleton width={96} height={46} radius={radii.md} colors={colors} />
                  <Skeleton width={96} height={46} radius={radii.md} colors={colors} />
                </View>
              )}

              <Text style={styles.note}>
                אנחנו פונים לבעל מקצוע אחד בכל פעם ומחכים לתשובה. אם הוא לא זמין — עוברים לבא בתור.
              </Text>

              <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
                <Text style={styles.secondaryLabel}>ביטול הקריאה</Text>
              </Pressable>
            </>
          )}
        </BottomSheet>
      </View>
    </View>
  );
}

function Fact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.fact, highlight && { backgroundColor: tint.action(0.1) }]}>
      <Text style={[styles.factValue, highlight && { color: colors.action }]}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  map: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },

  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },

  headRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  livePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.action(),
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.action },
  liveText: { ...type.captionStrong, color: colors.action },
  elapsed: { ...type.captionStrong, color: colors.textSecondary, fontVariant: ["tabular-nums"] },

  title: {
    ...type.h1,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  factRow: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.lg },
  skeletonRow: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.lg },
  fact: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
  },
  factValue: { ...type.h2, color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  factLabel: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 23,
  },
  note: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
    lineHeight: 19,
  },

  primary: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  primaryLabel: { ...type.bodyStrong, color: "#FFFFFF" },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  secondaryLabel: { ...type.body, color: colors.textSecondary },
});
