import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { radii, spacing, tint, type } from "../theme";
import type { ThemeColors } from "./primitives";
import type { JobState } from "@pro-now/demo-types";

/**
 * Where the job is, on the customer's screen.
 *
 * The steps are a PRESENTATION grouping of the real `JobState` machine in
 * /docs/07-JOB-STATE-MACHINE.md — they do not add states and they cannot
 * advance on their own. The server's `status` is the only input, so the
 * client can never show "on the way" for a job the server still has in
 * SEARCHING (/CLAUDE.md §3 — the server is authoritative for job state).
 *
 * Terminal states (CANCELLED, DISPUTED) deliberately render no progress at
 * all: a progress bar implies forward motion that is not happening.
 */

export type ProgressStepKey = "matching" | "enRoute" | "onSite" | "done";

const STEP_LABELS: Record<ProgressStepKey, string> = {
  matching: "מחפשים",
  enRoute: "בדרך אליך",
  onSite: "בעבודה",
  done: "הושלם",
};

const STEP_ORDER: ProgressStepKey[] = ["matching", "enRoute", "onSite", "done"];

/** Maps the authoritative job state onto a step, or null when none applies. */
export function stepForJobState(status: JobState): ProgressStepKey | null {
  switch (status) {
    case "DRAFT":
    case "SEARCHING":
    case "OFFERING":
      return "matching";
    case "PRO_ASSIGNED":
    case "PRO_EN_ROUTE":
      return "enRoute";
    case "PRO_ARRIVED":
    case "DIAGNOSIS":
    case "WAITING_QUOTE_APPROVAL":
    case "IN_PROGRESS":
    case "COMPLETION_PENDING":
      return "onSite";
    case "COMPLETED":
    case "PAYMENT_PENDING":
    case "PAYMENT_CAPTURED":
    case "REVIEW_PENDING":
    case "CLOSED":
      return "done";
    // A cancelled or disputed job is not "in progress" in any sense.
    case "CANCELLED":
    case "DISPUTED":
      return null;
    default:
      return null;
  }
}

export function JobProgress({
  status,
  colors,
  dark = false,
}: {
  status: JobState;
  colors: ThemeColors;
  dark?: boolean;
}) {
  const current = stepForJobState(status);

  if (!current) {
    return (
      <View style={[styles.terminal, { backgroundColor: tint.danger(0.1) }]}>
        <Text style={[styles.terminalText, { color: colors.statusDanger }]}>
          {status === "CANCELLED" ? "הקריאה בוטלה" : "הקריאה בבירור מול השירות"}
        </Text>
      </View>
    );
  }

  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={`שלב: ${STEP_LABELS[current]}`}>
      <View style={styles.track}>
        {STEP_ORDER.map((key, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <React.Fragment key={key}>
              <View
                style={[
                  styles.node,
                  {
                    backgroundColor: done || active ? colors.action : dark ? colors.border : "#E4E1DA",
                    // The active node is larger AND ringed — never colour alone
                    // (/docs/03-DESIGN-SYSTEM.md §Accessibility).
                    width: active ? 14 : 10,
                    height: active ? 14 : 10,
                    borderRadius: active ? 7 : 5,
                    borderWidth: active ? 3 : 0,
                    borderColor: tint.action(0.25),
                  },
                ]}
              />
              {i < STEP_ORDER.length - 1 ? (
                <View
                  style={[
                    styles.link,
                    { backgroundColor: i < currentIndex ? colors.action : dark ? colors.border : "#E4E1DA" },
                  ]}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.labels}>
        {STEP_ORDER.map((key, i) => (
          <Text
            key={key}
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: i === currentIndex ? colors.textPrimary : colors.textSecondary,
                fontWeight: i === currentIndex ? "700" : "400",
              },
            ]}
          >
            {STEP_LABELS[key]}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  track: { flexDirection: "row-reverse", alignItems: "center" },
  node: {},
  link: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 6 },
  labels: { flexDirection: "row-reverse", justifyContent: "space-between" },
  label: { ...type.caption, writingDirection: "rtl", flex: 1, textAlign: "center" },

  terminal: { paddingVertical: spacing.md, borderRadius: radii.md, alignItems: "center" },
  terminalText: { ...type.captionStrong, writingDirection: "rtl" },
});
