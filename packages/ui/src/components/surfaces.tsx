import React, { useId } from "react";
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from "react-native-svg";

import { elevation, imageRatio, radii, spacing, tint, type } from "../theme";
import type { ThemeColors } from "./primitives";
import { Persona } from "./Persona";

/**
 * Surfaces, sheets and imagery.
 *
 * The design brief is "premium, immediate, safe, human" and explicitly
 * rejects "clutter" and "heavy gradients" (/docs/03-DESIGN-SYSTEM.md
 * §Personality). So depth here is made of three things only: a generous
 * radius, a soft wide shadow, and honest whitespace. No borders competing
 * with shadows, no gradient fills, no decorative rules.
 */

// ---------------------------------------------------------------------
// Surface
// ---------------------------------------------------------------------

export function Surface({
  children,
  colors,
  dark = false,
  level = 1,
  radius = radii.lg,
  style,
  padded = true,
}: {
  children?: React.ReactNode;
  colors: ThemeColors;
  dark?: boolean;
  level?: 0 | 1 | 2 | 3;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius,
          padding: padded ? spacing.lg : 0,
          overflow: "hidden",
        },
        elevation(level, dark),
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------
// ImageSlot
// ---------------------------------------------------------------------

/**
 * Where licensed photography goes.
 *
 * /docs/03-DESIGN-SYSTEM.md §Content rules requires "real, diverse,
 * consented/licensed professional photography" and forbids generated fake
 * avatars. A design review therefore must not be shown invented photos of
 * people who do not exist — it would flatter the design and mislead the
 * reviewer about what is actually ready.
 *
 * So when there is no real `uri`, this renders a deliberate placeholder
 * that states the intended subject and the crop, instead of a stock image.
 * The layout, ratio and treatment are exactly what the real photo will get.
 */
export function ImageSlot({
  uri,
  subject,
  ratio = imageRatio.serviceTile,
  radius = radii.md,
  colors,
  dark = false,
  overlay = false,
  style,
}: {
  uri?: string | null;
  /** What the real photograph shows, e.g. "מטבח · תיקון נזילה". */
  subject: string;
  ratio?: number;
  radius?: number;
  colors: ThemeColors;
  dark?: boolean;
  /** Darkens the bottom for text laid over the image. */
  overlay?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // SVG ids must be XML names: Hebrew subject text is not a legal id, and a
  // bad id silently voids the fill (the slot then renders solid black).
  // This hook must run before any early return — React requires an
  // unconditional call order.
  const patternId = `hatch${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const base = dark ? colors.surfaceElevated : "#F0EEE8";

  if (uri) {
    return (
      <View style={[{ aspectRatio: ratio, borderRadius: radius, overflow: "hidden" }, style]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} accessibilityLabel={subject} resizeMode="cover" />
        {overlay ? <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(10,12,10,0.28)" }]} /> : null}
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`מקום לתצלום: ${subject}`}
      style={[
        {
          aspectRatio: ratio,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: base,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={patternId} width={10} height={10} patternUnits="userSpaceOnUse">
            <Line
              x1={0}
              y1={10}
              x2={10}
              y2={0}
              stroke={dark ? "rgba(243,245,243,0.05)" : "rgba(20,21,26,0.05)"}
              strokeWidth={1.4}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={base} />
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
      <View style={slot.badge}>
        <Text style={[slot.badgeText, { color: colors.textSecondary }]} numberOfLines={2}>
          {subject}
        </Text>
      </View>
    </View>
  );
}

const slot = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.62)",
    maxWidth: "85%",
  },
  badgeText: { ...type.caption, fontWeight: "600", textAlign: "center", writingDirection: "rtl" },
});

// ---------------------------------------------------------------------
// BottomSheet
// ---------------------------------------------------------------------

/**
 * The rising sheet from /docs/03-DESIGN-SYSTEM.md §Signature screen. Only
 * the top corners are rounded — it is anchored to the bottom of the screen,
 * not floating, which is what makes it read as a sheet rather than a card.
 */
export function BottomSheet({
  children,
  colors,
  dark = false,
  style,
}: {
  children: React.ReactNode;
  colors: ThemeColors;
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.sheet,
          borderTopRightRadius: radii.sheet,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
        },
        elevation(3, dark),
        style,
      ]}
    >
      <View
        style={{
          alignSelf: "center",
          width: 38,
          height: 4,
          borderRadius: 2,
          backgroundColor: dark ? tint.neutralDark(0.18) : tint.neutralLight(0.12),
          marginBottom: spacing.md,
        }}
      />
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------
// SectionHeader
// ---------------------------------------------------------------------

export function SectionHeader({
  title,
  action,
  onAction,
  colors,
}: {
  title: string;
  action?: string;
  /**
   * Makes the action label actually do something.
   *
   * It has been a bare `<Text>` since this component was written — styled
   * like a link, coloured like a link, and inert. A control that looks
   * pressable and is not teaches people that parts of the app are broken,
   * which is a worse lesson than having no control at all. Without a
   * handler it stays a label, which is at least honest.
   */
  onAction?: () => void;
  colors: ThemeColors;
}) {
  return (
    <View style={header.row}>
      <Text style={[header.title, { color: colors.textPrimary }]}>{title}</Text>
      {action ? (
        onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={action}
            style={header.actionHit}
          >
            <Text style={[header.action, { color: colors.actionText }]}>{action}</Text>
          </Pressable>
        ) : (
          <Text style={[header.action, { color: colors.actionText }]}>{action}</Text>
        )
      ) : null}
    </View>
  );
}

const header = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: { ...type.h2, textAlign: "right", writingDirection: "rtl" },
  action: { ...type.captionStrong },
  actionHit: { minHeight: 44, minWidth: 64, justifyContent: "center", alignItems: "flex-start" },
});

// ---------------------------------------------------------------------
// Chip
// ---------------------------------------------------------------------

export function Chip({
  label,
  colors,
  icon,
  selected = false,
  tone = "neutral",
}: {
  label: string;
  colors: ThemeColors;
  icon?: React.ReactNode;
  selected?: boolean;
  tone?: "neutral" | "action" | "trust" | "warning" | "danger";
}) {
  const toneColor =
    tone === "action"
      ? colors.action
      : tone === "trust"
        ? colors.trust
        : tone === "warning"
        ? colors.statusWarning
        : tone === "danger"
            ? colors.statusDanger
            : colors.textPrimary;

  const bg =
    tone === "action"
      ? tint.action()
      : tone === "trust"
        ? tint.trust()
        : tone === "warning"
        ? tint.warning()
        : tone === "danger"
            ? tint.danger()
            : selected
              ? tint.action()
              : colors.surfaceElevated;

  return (
    <View style={[chip.container, { backgroundColor: bg }]}>
      {icon}
      <Text style={[chip.label, { color: tone === "neutral" && !selected ? colors.textPrimary : toneColor }]}>
        {label}
      </Text>
    </View>
  );
}

const chip = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  label: { ...type.captionStrong },
});

// ---------------------------------------------------------------------
// Avatar ring — a progress/identity ring used around a professional photo
// ---------------------------------------------------------------------

export function RingedAvatar({
  size = 76,
  uri,
  name,
  colors,
  dark = false,
  ringColor,
  seed,
}: {
  size?: number;
  uri?: string | null;
  name: string;
  colors: ThemeColors;
  dark?: boolean;
  ringColor?: string;
  /** Stable id for the illustration used when there is no real photo. */
  seed?: string;
}) {
  const stroke = 2.5;
  const r = size / 2 - stroke / 2;
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => [...p][0] ?? "")
    .join("");

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={ringColor ?? colors.action} strokeWidth={stroke} fill="none" />
      </Svg>
      <View
        style={{
          width: size - 10,
          height: size - 10,
          borderRadius: (size - 10) / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: dark ? colors.surfaceElevated : "#F0EEE8",
        }}
      >
        {uri ? (
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} accessibilityLabel={name} />
        ) : seed ? (
          <Persona seed={seed} size={size - 10} label={`איור · ${name}`} />
        ) : (
          <Text style={{ ...type.h3, color: colors.textSecondary }}>{initials}</Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------
// Decorative corner flourish for hero areas — subtle, never a gradient wash
// ---------------------------------------------------------------------

export function HeroFlourish({ color, opacity = 0.08 }: { color: string; opacity?: number }) {
  return (
    <Svg width={220} height={220} viewBox="0 0 220 220" style={{ position: "absolute", top: -60, left: -50 }}>
      <Circle cx={110} cy={110} r={108} stroke={color} strokeWidth={1.4} fill="none" opacity={opacity} />
      <Circle cx={110} cy={110} r={78} stroke={color} strokeWidth={1.4} fill="none" opacity={opacity} />
      <Circle cx={110} cy={110} r={48} stroke={color} strokeWidth={1.4} fill="none" opacity={opacity} />
      <Path d="M110 2v216M2 110h216" stroke={color} strokeWidth={1} opacity={opacity * 0.6} />
    </Svg>
  );
}
