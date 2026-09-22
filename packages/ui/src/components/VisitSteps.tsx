import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { visitStepsHe } from "@pro-now/types";
import type { JobState } from "@pro-now/types";

import { palette, spacing, type } from "../theme";

/**
 * WHERE THIS VISIT HAS GOT TO — THE SAME FOUR STEPS ON BOTH SIDES.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS ONE COMPONENT AND NOT TWO
 * ---------------------------------------------------------------------
 * Amit: *"בשלב שהמקצוען התחיל לבדוק ועד להצעת מחיר אין שום דבר בזמן
 * העבודה, אין שום תחלופה במסך"*, and then *"המסכים חייבים להתחלף כל
 * לחיצת כפתור, כל פעולה, גם ללקוח וגם למקצוען."*
 *
 * Both of them are watching ONE visit. A customer told the work is at
 * step three while the professional's screen says step two is a
 * disagreement about a fact, in a product whose whole proposition is
 * that the two sides can trust what they are shown. Two copies of this
 * would drift the first time somebody changed one of them.
 *
 * So the steps come from `visitStepsHe`, beside the state machine, and
 * the drawing of them lives here, once.
 *
 * ---------------------------------------------------------------------
 * WHAT IT REFUSES TO SAY
 * ---------------------------------------------------------------------
 * No times, no percentage, no bar filling up. How long a diagnosis takes
 * is not knowable from a state, and drawing a bar that is 40% full is a
 * measurement nobody made (/CLAUDE.md §3). A step is behind you, the one
 * you are in, or ahead — three honest answers and no fourth one
 * pretending to be a fifth of the way through something.
 */
export interface VisitStepsProps {
  status: JobState;
  /**
   * The surface this is drawn on. Both sides use a dark panel, and the
   * two themes disagree about their accent — so the colour that means
   * "you are here" is passed in rather than chosen here.
   */
  accent: string;
  done: string;
}

export function VisitSteps({ status, accent, done }: VisitStepsProps) {
  const steps = visitStepsHe(status);
  // Null before the professional arrives: the journey owns the screen
  // then, and a visit tracker beside a countdown answers a question
  // nobody is asking yet.
  if (!steps) return null;

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`שלב ${steps.findIndex((s) => s.state === "NOW") + 1} מתוך ${steps.length}: ${
        steps.find((s) => s.state === "NOW")?.labelHe ?? "הושלם"
      }`}
    >
      {steps.map((step, i) => (
        <View key={step.labelHe} style={styles.step}>
          <View style={styles.pipRow}>
            <View
              style={[
                styles.pip,
                step.state === "DONE" && { backgroundColor: done },
                step.state === "NOW" && [styles.pipNow, { borderColor: accent }],
              ]}
            />
            {i < steps.length - 1 ? (
              <View style={[styles.rail, step.state === "DONE" && { backgroundColor: done }]} />
            ) : null}
          </View>
          <Text
            style={[
              styles.label,
              step.state === "NOW" && styles.labelNow,
              step.state === "AHEAD" && styles.labelAhead,
            ]}
            numberOfLines={1}
          >
            {step.labelHe}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * `row-reverse`, so the first step is on the RIGHT where a Hebrew
   * reader starts and the rail grows leftwards — the direction the visit
   * travels.
   */
  row: { flexDirection: "row-reverse", marginTop: spacing.lg, marginBottom: spacing.xs, alignSelf: "stretch" },
  step: { flex: 1 },
  pipRow: { flexDirection: "row-reverse", alignItems: "center" },
  /*
   * A step still ahead has to be VISIBLE as a step. A low-alpha neutral
   * on a near-black panel left one lonely ring saying nothing at all
   * about what comes after it.
   */
  pip: { width: 9, height: 9, borderRadius: 999, backgroundColor: palette.ink300 },
  /*
   * The current step is a RING, not a bigger dot. A dot that grows reads
   * as "more"; this one means "here" — and a ring still reads as the
   * current step to somebody who cannot tell the two colours apart.
   */
  pipNow: { width: 13, height: 13, backgroundColor: "transparent", borderWidth: 3 },
  rail: { flex: 1, height: 2, marginHorizontal: 4, backgroundColor: palette.ink500 },
  label: {
    ...type.caption,
    color: palette.ink300,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 6,
  },
  labelNow: { color: palette.ink100, fontWeight: "700" },
  labelAhead: { opacity: 0.55 },
});
