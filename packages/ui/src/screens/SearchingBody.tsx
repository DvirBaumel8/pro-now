import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, depth, palette, radii, spacing, tabular, tint, type } from "../theme";
import { Card } from "../components/Card";
import { CandidatePresence, type Candidate } from "../components/CandidatePresence";
import { ProWorld } from "../components/ProWorld";

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
  /**
   * The REAL candidates dispatch has returned so far. Empty until the
   * server has any — never padded to fill the ring.
   */
  candidates?: Candidate[];
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
  candidates = [],
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
      {/*
        * THE WORLD FILLS THE SCREEN. It is the state, not a backdrop — and
        * it is deliberately the friendliest thing in the product, because
        * this is the most anxious minute in it. See LiveWorld for the three
        * rules that keep a world this full of life from claiming anything.
        */}
      <ProWorld width={width} height={height} active={!exhausted} />

      {/*
        * REAL CANDIDATES ONLY, IN A LAYER WITH NO GEOGRAPHY. Empty renders
        * nothing: an empty orbit over a lively world is the honest picture
        * of "still looking". See CandidatePresence for the rule.
        */}
      <CandidatePresence
        candidates={candidates}
        width={width}
        height={height}
        active={!exhausted}
      />

      {/* The one line, over the scan, where the eye already is. */}
      {!exhausted ? (
        <View style={styles.overlay} pointerEvents="none">
          {/*
            * ONE LINE, AND A JOB BRIEF. ChatGPT's instruction for this
            * screen was "בלי עוד פרוזה" — the world below is doing the
            * work of keeping someone company, and every extra sentence
            * here is something to read at the moment nobody is reading.
            */}
          <Text style={styles.scanTitle}>מחפשים את האדם המתאים לך</Text>
          <View style={styles.brief}>
            <Text style={styles.briefText} numberOfLines={1}>
              {serviceNameHe} · עכשיו
            </Text>
            <Text style={styles.scanElapsed}>{elapsed}</Text>
          </View>
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
  /*
   * The brief travels with the customer from the intake screen: what they
   * asked for, condensed to one line, so the search never feels like it
   * lost the thread of the request.
   */
  brief: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.55)",
  },
  briefText: { ...type.meta, color: colors.textPrimary, writingDirection: "rtl" },
  scanElapsed: { ...type.metaStrong, ...tabular, color: palette.signal300 },

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
