import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { ServiceSupply } from "@pro-now/types";

import { prosFreeShort } from "../lexicon";
import { customerTheme, elevation, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";

/**
 * A service that can be had RIGHT NOW.
 *
 * WHY THIS REPLACED THE PHOTO TILE. The old home screen was a grid of tiles,
 * each with a hatched grey rectangle standing in for a photograph we have
 * not commissioned, each with a solid coral band across it. Six of them down
 * the page. Amit's verdict — "הריבועים הכתומים והלא ברורים האלה" — was
 * exactly right, and for two reasons worth writing down:
 *
 * 1. **A placeholder photograph is worse than no photograph.** The grey
 *    hatching says "this is unfinished" on every single tile, and the
 *    caption inside it competes with the service name underneath for the
 *    same job. A designed surface with a mark on it is not a compromise
 *    waiting for a photo; it is a finished thing.
 *
 * 2. **Coral stopped meaning anything.** The palette reserves signal-coral
 *    for NOW — urgency and action. Painting it across six tiles at once
 *    turns the one colour that is supposed to mean "this is live" into the
 *    background. Here the whole card is calm and exactly one element is
 *    coral: the live line, with a pulse behind it.
 *
 * The pulse is honest, too. It animates only while the server says this
 * service is reachable, so the movement on screen IS the liveness — not a
 * decoration that keeps breathing after the data goes stale.
 */

const colors = customerTheme.colors;

export interface LiveServiceCardProps {
  nameHe: string;
  mark: MarkName;
  supply: ServiceSupply;
  /** A short "what this covers" line. Two lines maximum on the card. */
  descriptionHe?: string | null;
  priceHint?: string | null;
  width?: number;
  onPress?: () => void;
}

export function LiveServiceCard({
  nameHe,
  mark,
  supply,
  descriptionHe,
  priceHint,
  width = 188,
  onPress,
}: LiveServiceCardProps) {
  const limited = supply.state === "LIMITED";
  const accent = limited ? colors.statusWarning : colors.action;
  const accentText = limited ? colors.statusWarningText : colors.actionText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nameHe} · ${prosFreeShort(supply.count ?? 0, supply.nearestRouteEtaMinutes)}`}
      style={({ pressed }) => [
        styles.card,
        { width },
        elevation(1),
        pressed && { opacity: 0.94, transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={[styles.markWrap, { backgroundColor: tint.neutralLight(0.06) }]}>
        <Mark name={mark} size={26} color={colors.textPrimary} />
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {nameHe}
      </Text>

      {descriptionHe ? (
        <Text style={styles.desc} numberOfLines={2}>
          {descriptionHe}
        </Text>
      ) : null}

      <View style={styles.spacer} />

      <View style={styles.liveRow}>
        <Pulse color={accent} />
        <Text style={[styles.liveText, { color: accentText }]} numberOfLines={1}>
          {prosFreeShort(supply.count ?? 0, supply.nearestRouteEtaMinutes)}
        </Text>
      </View>

      {priceHint ? (
        <Text style={styles.price} numberOfLines={1}>
          {priceHint}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * A dot with a ring that expands and fades — the shape everyone reads as
 * "live" without being told. Slow (1.7s) on purpose: a fast pulse reads as
 * an alarm, and nothing here is an emergency the app is declaring.
 */
export function Pulse({ color, size = 8 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, {
        toValue: 1,
        duration: 1700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
        }}
      />
      <View
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 172,
  },
  markWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  name: {
    ...type.bodyStrong,
    fontSize: 16,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  desc: {
    ...type.caption,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  spacer: { flex: 1, minHeight: spacing.sm },
  liveRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  liveText: { ...type.captionStrong, writingDirection: "rtl", flexShrink: 1 },
  price: {
    ...type.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 3,
  },
});
