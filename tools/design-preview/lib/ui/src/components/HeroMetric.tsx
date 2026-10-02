import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { customerTheme, proTheme, scale, tabular, type } from "../theme";

/**
 * The one big number on a screen, and the reason it is a component.
 *
 * Visual System v1 §1 allows exactly one display-or-hero per viewport, and
 * §10 says every live number carries provenance. Both were being enforced by
 * memory, which meant the ETA was 44px on one screen and 22px on another,
 * and "—" appeared in some places as a dash and in others as an absent row.
 *
 * So the big number is a component with three states rather than a styled
 * Text: it has a value, or it is genuinely unknown and says which kind of
 * unknown, or it has gone stale. A caller cannot render a hero number
 * without deciding which of those it is.
 */

export interface HeroMetricProps {
  /** Already formatted by the caller — currency and units are theirs. */
  value: string | null;
  /** A short unit shown beside the value: "דק׳", "₪". */
  unitHe?: string | null;
  /** What this number is. Always present, even when the value is not. */
  labelHe: string;
  /**
   * Why the value is missing. Required when `value` is null — an unexplained
   * dash is the thing this component exists to prevent.
   */
  unknownReasonHe?: string;
  /** True when the server's freshness window has passed. */
  stale?: boolean;
  size?: "display" | "hero";
  tone?: "light" | "dark";
  align?: "right" | "center";
}

export function HeroMetric({
  value,
  unitHe,
  labelHe,
  unknownReasonHe,
  stale,
  size = "hero",
  tone = "light",
  align = "right",
}: HeroMetricProps) {
  const colors = tone === "dark" ? proTheme.colors : customerTheme.colors;
  const fontSize = size === "display" ? scale.display : scale.hero;
  const known = value !== null && !stale;

  return (
    <View style={[styles.wrap, align === "center" && { alignItems: "center" }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {labelHe}
      </Text>

      {known ? (
        <View style={[styles.valueRow, align === "center" && { justifyContent: "center" }]}>
          <Text
            style={[
              styles.value,
              { fontSize, lineHeight: Math.round(fontSize * 1.04), color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {value}
          </Text>
          {unitHe ? (
            <Text style={[styles.unit, { color: colors.textSecondary }]}>{unitHe}</Text>
          ) : null}
        </View>
      ) : (
        /*
         * An unknown number is a sentence, not a dash. "—" tells the reader
         * the app is broken; "זמן ההגעה יחושב כשיצא לדרך" tells them the
         * system is working and this particular fact does not exist yet.
         */
        <Text
          style={[styles.unknown, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {stale ? "הנתון לא עודכן — נבדוק שוב" : (unknownReasonHe ?? "לא ידוע")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "flex-end" },
  label: { ...type.overline },
  valueRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: 6, marginTop: 2 },
  value: { ...type.display, ...tabular, writingDirection: "rtl" },
  unit: { ...type.body, writingDirection: "rtl" },
  unknown: {
    ...type.body,
    fontSize: scale.body,
    writingDirection: "rtl",
    textAlign: "right",
    marginTop: 4,
    lineHeight: 23,
  },
});
