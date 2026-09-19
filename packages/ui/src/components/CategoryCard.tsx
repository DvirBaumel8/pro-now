import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { Pulse } from "./LiveServiceCard";

/**
 * A broad category — "תקלות בבית", "אנשים שמגיעים אליך", "שינוע".
 *
 * Amit asked for "אופציות כלליות וקטגוריות" instead of a list of named
 * services, and the reason that is the better default is worth stating: a
 * customer who has not described their problem does not know which of our
 * twelve service names fits it. They DO know whether the problem is in their
 * house, in their body, or in moving something. Broad first, specific after
 * — the direction that matches how anyone actually narrows a question.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NO LONGER A CARD
 * ---------------------------------------------------------------------
 * It was a two-column grid of bordered, shadowed tiles — each with an icon
 * chip, a name and a status line. The review verdict was blunt and correct:
 * "הקטגוריות ב־Home לא צריכות להרגיש כמו dashboard ארגוני… יש נטייה שכל
 * רעיון יקבל מלבן משלו."
 *
 * Three things were wrong with the tile, in increasing order of importance.
 *
 * It broke §5 outright — border AND shadow on the same surface, the one
 * combination the system forbids by name.
 *
 * It wasted the width. A 2-up grid gives each category about 170px, which is
 * why the names wrapped to two lines and the live line had to be shortened
 * to fit. A full-width row gives the same name the whole screen.
 *
 * And it flattened the answer. Six equal rectangles say "six equivalent
 * options, choose one" — a menu. What we want it to say is "here is how the
 * catalogue is shaped", and a list says that with no boxes at all: type for
 * the name, space for the grouping, a hairline where two things genuinely
 * separate.
 *
 * The live count stays, because it is the one thing here that changes minute
 * to minute. Zero renders as absent rather than "0 פנויים" — a number that
 * makes a whole category look dead when it is merely quiet.
 */

const colors = customerTheme.colors;

export interface CategoryCardProps {
  nameHe: string;
  mark: MarkName;
  serviceCount: number;
  /** Services in this category with someone reachable now. */
  liveCount: number;
  /** Ignored. Kept so existing callers do not break; the row is full-width. */
  width?: number;
  onPress?: () => void;
}

export function CategoryCard({
  nameHe,
  mark,
  serviceCount,
  liveCount,
  onPress,
}: CategoryCardProps) {
  const live = liveCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        live ? `${nameHe}, ${liveCount} שירותים פנויים עכשיו` : nameHe
      }
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: tint.neutralLight(0.04) },
      ]}
    >
      <View style={styles.markWrap}>
        <Mark name={mark} size={22} color={colors.textPrimary} />
      </View>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {nameHe}
        </Text>
        {live ? (
          <View style={styles.live}>
            <Pulse color={colors.action} size={6} />
            <Text style={styles.liveText} numberOfLines={1}>
              {liveCount === 1 ? "שירות אחד פנוי עכשיו" : `${liveCount} שירותים פנויים עכשיו`}
            </Text>
          </View>
        ) : (
          <Text style={styles.meta} numberOfLines={1}>
            {serviceCount === 1 ? "שירות אחד" : `${serviceCount} שירותים`}
          </Text>
        )}
      </View>

      <Text style={styles.go}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  markWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: tint.neutralLight(0.05),
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
  name: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  live: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  liveText: {
    ...type.metaStrong,
    color: colors.actionText,
    writingDirection: "rtl",
    flexShrink: 1,
  },
  meta: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  go: { color: colors.textSecondary, ...type.section, fontWeight: "400", lineHeight: 26 },
});
