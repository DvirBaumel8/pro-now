import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { elevation, imageRatio, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { ImageSlot } from "./surfaces";
import type { ThemeColors } from "./primitives";

/**
 * A service in the catalogue.
 *
 * The photograph carries the warmth and does the recognising; the mark is a
 * small wayfinding aid in the corner, not the hero. That ordering is what
 * separates this from a directory of icons in boxes.
 *
 * `availableNowCount` is the number of professionals the SERVER currently
 * reports as online and eligible for this service. It is optional because
 * it is frequently unknown, and when it is unknown the tile shows nothing
 * rather than "0 available" or a plausible number — /CLAUDE.md §3 forbids
 * fabricating availability, and an idle marketplace must be allowed to look
 * idle.
 */

export interface ServiceTileProps {
  nameHe: string;
  mark: MarkName;
  /** What the real photograph shows — see ImageSlot. */
  photoSubject: string;
  photoUri?: string | null;
  /** Server-reported count of professionals online for this service. */
  availableNowCount?: number | null;
  /** Short price hint, already formatted, e.g. "מ-₪179". */
  priceHint?: string | null;
  colors: ThemeColors;
  dark?: boolean;
  width?: number;
  onPress?: () => void;
}

export function ServiceTile({
  nameHe,
  mark,
  photoSubject,
  photoUri,
  availableNowCount,
  priceHint,
  colors,
  dark = false,
  width,
  onPress,
}: ServiceTileProps) {
  const hasSupply = typeof availableNowCount === "number" && availableNowCount > 0;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={nameHe}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: colors.surface },
        elevation(1, dark),
        pressed && styles.pressed,
      ]}
    >
      <View>
        <ImageSlot
          uri={photoUri}
          subject={photoSubject}
          ratio={imageRatio.serviceTile}
          radius={radii.md}
          colors={colors}
          dark={dark}
        />

        <View style={[styles.markBubble, { backgroundColor: colors.surface }, elevation(1, dark)]}>
          <Mark name={mark} size={19} color={colors.textPrimary} />
        </View>

        {hasSupply ? (
          <View style={[styles.supply, { backgroundColor: tint.action(0.92) }]}>
            <View style={styles.supplyDot} />
            <Text style={styles.supplyText}>{availableNowCount} זמינים עכשיו</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {nameHe}
        </Text>
        {priceHint ? (
          <Text style={[styles.price, { color: colors.textSecondary }]} numberOfLines={1}>
            {priceHint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.sm, overflow: "hidden" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },

  markBubble: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  supply: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  supplyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  supplyText: { ...type.caption, fontWeight: "700", color: "#FFFFFF" },

  body: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  name: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  price: { ...type.caption, textAlign: "right", writingDirection: "rtl" },
});

/**
 * A compact row form for a category list — same content model, no
 * photograph, used where a grid would be too heavy.
 */
export function ServiceRow({
  nameHe,
  mark,
  metaHe,
  colors,
  dark = false,
  onPress,
}: {
  nameHe: string;
  mark: MarkName;
  metaHe?: string;
  colors: ThemeColors;
  dark?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [row.container, { backgroundColor: colors.surface }, elevation(1, dark), pressed && row.pressed]}
    >
      <View style={[row.markWrap, { backgroundColor: dark ? colors.surfaceElevated : "#F4F2EC" }]}>
        <Mark name={mark} size={21} color={colors.textPrimary} />
      </View>
      <View style={row.text}>
        <Text style={[row.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {nameHe}
        </Text>
        {metaHe ? (
          <Text style={[row.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {metaHe}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  pressed: { opacity: 0.9 },
  markWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, alignItems: "flex-end", gap: 1 },
  name: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  meta: { ...type.caption, textAlign: "right", writingDirection: "rtl" },
});
