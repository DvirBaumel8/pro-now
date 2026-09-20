import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, depth, radii, spacing, tabular, tint, type } from "../theme";
import { Card } from "../components/Card";
import { ScanField } from "../components/ScanField";

/**
 * C08 — the search.
 *
 * THE SCAN IS THE SCREEN. Amit: "חייב שאתה מחפש מקצוען יהיה מפה שסורקת
 * ומונפשת שיתן חווית חיפוש." He is pointing at the most anxious moment in
 * the product — you have just asked a stranger to come to your house and
 * you do not yet know whether anyone will answer — and it was rendered as
 * a static decorative map under a sheet of text. A sweep says "we are
 * looking, near you, right now"; a still map says the app is thinking.
 *
 * WHAT THIS SCREEN MUST STILL RESIST is looking busy. The honest material
 * is small: how many candidates the dispatcher considered and how many
 * passed eligibility, both straight from `DispatchResultView`. There are no
 * professional markers moving around, no "12 people are viewing your
 * request", no invented activity. The blips under the sweep are abstract
 * and uncounted on purpose — see ScanField.
 *
 * AND THE COPY IS SHORTER. "לא צריך מלא מלא מלל, צריך ממוקד ונגיש": the
 * paragraph explaining the dispatch algorithm was three lines of prose on
 * a screen nobody reads, at the moment they are least able to read.
 */

const colors = customerDarkTheme.colors;

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
      {/* The scan fills the screen. It is the state, not a backdrop. */}
      <ScanField width={width} height={height} active={!exhausted} />

      {/* The one line, over the scan, where the eye already is. */}
      {!exhausted ? (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.scanTitle}>מחפשים מקצוען לידך</Text>
          <Text style={styles.scanService}>{serviceNameHe}</Text>
          <Text style={styles.scanElapsed}>{elapsed}</Text>
        </View>
      ) : null}

      <View style={styles.sheetWrap}>
        {exhausted ? (
          <Card variant="raised">
            <Text style={styles.title}>אין כרגע מי שפנוי</Text>
            <Text style={styles.body}>
              בדקנו את כל מי שפנוי עכשיו ל{serviceNameHe} באזור שלכם. אפשר להרחיב את הטווח או לנסות בעוד כמה דקות.
            </Text>

            <Pressable onPress={onBroaden} accessibilityRole="button" style={styles.primary}>
              <Text style={styles.primaryLabel}>הרחבת טווח החיפוש</Text>
            </Pressable>
            <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>ביטול הקריאה</Text>
            </Pressable>
          </Card>
        ) : (
          <Card variant="raised">
            {/*
              * The two numbers we genuinely have, and nothing else. Absent
              * until the server has them — a skeleton here was a shape
              * promising data that may never arrive.
              */}
            {typeof candidatesConsidered === "number" ? (
              <View style={styles.factRow}>
                <Fact label="נבדקו" value={String(candidatesConsidered)} />
                {typeof candidatesEligible === "number" ? (
                  <Fact label="מתאימים" value={String(candidatesEligible)} highlight />
                ) : null}
              </View>
            ) : (
              <Text style={styles.note}>פונים לאחד בכל פעם ומחכים לתשובה.</Text>
            )}

            <Pressable onPress={onCancel} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>ביטול הקריאה</Text>
            </Pressable>
          </Card>
        )}
      </View>
    </View>
  );
}

function Fact({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[styles.fact, highlight && { backgroundColor: tint.action(0.1) }]}>
      <Text style={[styles.factValue, highlight && { color: colors.actionText }]}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  sheetWrap: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },

  /*
   * The headline sits ON the scan, centred, where the eye already is. It
   * was inside the sheet at the bottom, which meant the most important
   * words on the screen were as far as possible from the thing that had
   * everyone's attention.
   */
  overlay: {
    position: "absolute",
    top: "16%",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  scanTitle: { ...type.title, color: colors.textPrimary, textAlign: "center", writingDirection: "rtl" },
  scanService: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
  },
  scanElapsed: { ...type.metaStrong, ...tabular, color: colors.actionText, marginTop: spacing.sm },

  title: { ...type.section, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },

  factRow: { flexDirection: "row-reverse", gap: spacing.md },
  fact: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: depth.panel.low,
  },
  factValue: { ...type.section, ...tabular, color: colors.textPrimary },
  factLabel: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl" },

  body: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  note: { ...type.meta, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },

  primary: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xl,
  },
  primaryLabel: { ...type.bodyStrong, color: colors.onAction },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  secondaryLabel: { ...type.body, color: colors.textSecondary },
});
