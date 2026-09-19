import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, elevation, radii, spacing, tint, type } from "../theme";
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
 * The live count is the one specific thing a category card may carry,
 * because it is the only thing on it that changes minute to minute: how many
 * of its services have someone reachable right now. Zero renders as absent
 * rather than as "0 פנויים", which is a number that makes a whole category
 * look dead when it is merely quiet.
 */

const colors = customerTheme.colors;

export interface CategoryCardProps {
  nameHe: string;
  mark: MarkName;
  serviceCount: number;
  /** Services in this category with someone reachable now. */
  liveCount: number;
  width: number;
  onPress?: () => void;
}

export function CategoryCard({
  nameHe,
  mark,
  serviceCount,
  liveCount,
  width,
  onPress,
}: CategoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        liveCount > 0 ? `${nameHe}, ${liveCount} שירותים פנויים עכשיו` : nameHe
      }
      style={({ pressed }) => [
        styles.card,
        { width },
        elevation(1),
        pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={styles.markWrap}>
        <Mark name={mark} size={24} color={colors.textPrimary} />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {nameHe}
      </Text>

      {liveCount > 0 ? (
        <View style={styles.live}>
          <Pulse color={colors.action} size={6} />
          <Text style={styles.liveText} numberOfLines={1}>
            {liveCount === 1 ? "שירות אחד פנוי עכשיו" : `${liveCount} פנויים עכשיו`}
          </Text>
        </View>
      ) : (
        <Text style={styles.meta} numberOfLines={1}>
          {serviceCount === 1 ? "שירות אחד" : `${serviceCount} שירותים`}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 124,
  },
  markWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: tint.neutralLight(0.05),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  name: {
    ...type.bodyStrong,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    flex: 1,
  },
  live: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: spacing.sm },
  liveText: { ...type.caption, fontSize: 12, fontWeight: "700", color: colors.actionText, writingDirection: "rtl", flexShrink: 1 },
  meta: { ...type.caption, fontSize: 12, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: spacing.sm },
});
