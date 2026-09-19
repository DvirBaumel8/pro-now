import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { radius, spacing, typography } from "../theme";
import { Persona } from "./Persona";

/**
 * Shared presentational primitives for the match / offer cards.
 * Everything here is RTL-first (`row-reverse`, `textAlign: "right", writingDirection: "rtl"`) because
 * Hebrew is the primary layout direction, not a locale override
 * (/CLAUDE.md §6).
 */

export interface ThemeColors {
  bg: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  /** Signal — anything the user DOES. Buttons, live search, urgency. */
  action: string;
  /** Trust — anything that has been VERIFIED. Badges, online state. */
  trust: string;
  statusWarning: string;
  statusDanger: string;
  border: string;
}

// ---------------------------------------------------------------------
// LiveDot — a slow pulse used to signal "this is live data", nothing else.
// ---------------------------------------------------------------------

export function LiveDot({ color, size = 8 }: { color: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

// ---------------------------------------------------------------------
// StatusPill
// ---------------------------------------------------------------------

export function StatusPill({
  label,
  color,
  live = false,
  tint,
}: {
  label: string;
  color: string;
  live?: boolean;
  tint: string;
}) {
  return (
    <View style={[pill.container, { backgroundColor: tint }]}>
      {live ? <LiveDot color={color} /> : null}
      <Text style={[pill.label, { color }]}>{label}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  label: { fontSize: 13, fontWeight: "600" },
});

// ---------------------------------------------------------------------
// Avatar — photo when there is one, initials when there is not.
// Never a stock photo of a person who is not the professional.
// ---------------------------------------------------------------------

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => [...p][0] ?? "").join("");
}

export function Avatar({
  name,
  photoUrl,
  size = 64,
  ringColor,
  colors,
  seed,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  ringColor?: string;
  colors: ThemeColors;
  /** Stable id for the illustration shown when there is no real photo. */
  seed?: string;
}) {
  const ring = ringColor ? 3 : 0;
  const inner = size - ring * 2;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: ringColor,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surfaceElevated,
      }}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: inner, height: inner, borderRadius: inner / 2 }}
          accessibilityLabel={name}
        />
      ) : seed ? (
        // An illustration rather than initials. Two grey letters read as a
        // missing record; a drawn figure reads as a person, without
        // pretending to be a photograph of this one.
        <Persona seed={seed} size={inner} label={`איור · ${name}`} />
      ) : (
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.border,
          }}
        >
          <Text style={{ fontSize: inner * 0.36, fontWeight: "700", color: colors.textSecondary }}>
            {initialsOf(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------
// MetaChip — a small factual chip (ETA, distance, …)
// ---------------------------------------------------------------------

export function MetaChip({
  icon,
  label,
  colors,
  emphasis = false,
}: {
  icon: string;
  label: string;
  colors: ThemeColors;
  emphasis?: boolean;
}) {
  return (
    <View
      style={[
        chip.container,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
        emphasis && { borderColor: colors.action },
      ]}
    >
      <Text style={[chip.icon, { color: emphasis ? colors.action : colors.textSecondary }]}>{icon}</Text>
      <Text style={[chip.label, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  icon: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: "600" },
});

// ---------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------

export function Divider({ color, style }: { color: string; style?: ViewStyle }) {
  return <View style={[{ height: StyleSheet.hairlineWidth * 2, backgroundColor: color }, style]} />;
}

// ---------------------------------------------------------------------
// Skeleton — shimmering placeholder for the loading state that every data
// screen is required to have (/CLAUDE.md §6).
// ---------------------------------------------------------------------

export function Skeleton({
  width,
  height,
  radius: r = radius.sm,
  colors,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  colors: ThemeColors;
}) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return (
    <Animated.View
      style={{ width, height, borderRadius: r, backgroundColor: colors.border, opacity }}
      accessibilityRole="progressbar"
    />
  );
}

// ---------------------------------------------------------------------
// SectionLabel
// ---------------------------------------------------------------------

export function SectionLabel({ children, colors }: { children: string; colors: ThemeColors }) {
  return (
    <Text
      style={{
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: "right", writingDirection: "rtl",
        letterSpacing: 0.3,
        fontWeight: "600",
      }}
    >
      {children}
    </Text>
  );
}
