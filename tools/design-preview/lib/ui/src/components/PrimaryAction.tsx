import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, proTheme, radii, scale, spacing, type } from "../theme";

/**
 * The single coral action on a screen.
 *
 * Visual System v1 §2 allows one coral-filled action per viewport and §9
 * allows one primary action per screen state. Both are easy to state and
 * were being broken constantly, because a screen with three things to offer
 * naturally styles all three as buttons and the most important one stops
 * standing out.
 *
 * Making it a named component does not enforce the rule by itself — but it
 * makes a second one on a screen visible in the diff, and the audit counts
 * coral fills in the rendered DOM, which does enforce it.
 *
 * SECONDARY ACTIONS ARE NOT SMALL PRIMARY ACTIONS. They are text. A quieter
 * filled button still reads as a button and still competes; a line of text
 * reads as an alternative, which is what it is.
 */

export interface PrimaryActionProps {
  labelHe: string;
  /** A second line inside the button — an ETA, a total, a consequence. */
  subLabelHe?: string | null;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  /** Spoken label, when the visible one is not enough on its own. */
  accessibilityLabelHe?: string;
}

export function PrimaryAction({
  labelHe,
  subLabelHe,
  onPress,
  disabled,
  tone = "light",
  accessibilityLabelHe,
}: PrimaryActionProps) {
  const colors = tone === "dark" ? proTheme.colors : customerTheme.colors;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabelHe ?? labelHe}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: colors.action },
        pressed && { opacity: 0.9 },
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[styles.label, { color: colors.onAction }]} numberOfLines={1}>
        {labelHe}
      </Text>
      {subLabelHe ? (
        <Text style={[styles.sub, { color: colors.onAction }]} numberOfLines={1}>
          {subLabelHe}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** The alternative to the primary action. Text, never a second button. */
export function SecondaryAction({
  labelHe,
  onPress,
  tone = "light",
}: {
  labelHe: string;
  onPress?: () => void;
  tone?: "light" | "dark";
}) {
  const colors = tone === "dark" ? proTheme.colors : customerTheme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={labelHe}
      style={styles.secondary}
    >
      <Text style={[styles.secondaryText, { color: colors.textSecondary }]} numberOfLines={1}>
        {labelHe}
      </Text>
    </Pressable>
  );
}

/** The bar the primary action sits in at the foot of a screen. */
export function ActionBar({
  tone = "light",
  children,
}: {
  tone?: "light" | "dark";
  children: React.ReactNode;
}) {
  const colors = tone === "dark" ? proTheme.colors : customerTheme.colors;
  return (
    <View
      style={[styles.bar, { backgroundColor: colors.bg, borderTopColor: colors.border }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 60,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    paddingHorizontal: spacing.lg,
  },
  label: { ...type.bodyStrong, fontSize: scale.body },
  sub: { ...type.caption, fontSize: scale.micro, opacity: 0.78 },
  secondary: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  secondaryText: { ...type.caption, fontSize: scale.meta, writingDirection: "rtl" },
  bar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
  },
});
