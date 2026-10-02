import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { customerTheme, elevation, proTheme, radii, spacing } from "../theme";
import type { ThemeColors } from "./primitives";

/**
 * The ONE elevated container. Visual System v1 §4 and §5, as code.
 *
 * WHY A PRIMITIVE AND NOT A STYLE. Across the twenty-three screens in this
 * package there were eleven different ways to say "this is a box": surface
 * plus border, surface plus shadow, surface plus border AND shadow, a tint
 * wash, a tint wash with a border, and so on. Every one of them was a
 * reasonable local choice. Together they are the "dashboard" density
 * ChatGPT named — "יש נטייה שכל רעיון יקבל מלבן משלו" — because when a
 * container is one line of style, every idea gets one.
 *
 * So a container is now a decision with a name attached:
 *
 *   raised    a unit that can be picked up — selected, opened, dragged.
 *   outlined  a unit with a boundary that matters — an input, a selection.
 *   quiet     a grouping wash. No edge, no lift. The default.
 *
 * **`raised` and `outlined` are mutually exclusive by construction.** §5
 * forbids shadow + border on the same surface, and the only way to break
 * that rule here is to render two nested Surfaces, which is visible in
 * review in a way that `borderWidth: 1` on line 340 of a stylesheet is not.
 *
 * And the rule this primitive is really for, from §4: a card requires
 * semantics. A name with a subtitle is not a card. A metric with its label
 * is not a card. Those sit on the screen, separated by space and type. If
 * you are reaching for `<Surface>` to group two lines of text, the answer
 * is spacing.
 */

export type SurfaceKind = "raised" | "outlined" | "quiet";

export interface SurfaceProps {
  kind?: SurfaceKind;
  tone?: "light" | "dark";
  /** 0–3. Ignored unless `kind="raised"`. */
  level?: 0 | 1 | 2 | 3;
  radius?: number;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;

  /**
   * ---- the previous call shape ----
   * Twelve screens pass an explicit palette and expect an always-raised
   * card. Supporting it costs six lines and means the primitive can land
   * without a same-commit rewrite of twelve screens — which is how a
   * migration turns into twelve interpretations of the new system.
   *
   * Passing `colors` implies `kind="raised"`, exactly what those callers
   * get today. New code passes `tone` and names the kind.
   */
  colors?: ThemeColors;
  dark?: boolean;
}

export function Surface({
  kind,
  tone,
  level = 1,
  radius = radii.lg,
  padded = true,
  style,
  children,
  colors: legacyColors,
  dark,
}: SurfaceProps) {
  const resolvedTone: "light" | "dark" = tone ?? (dark ? "dark" : "light");
  const resolvedKind: SurfaceKind = kind ?? (legacyColors ? "raised" : "quiet");
  const c = legacyColors ?? (resolvedTone === "dark" ? proTheme.colors : customerTheme.colors);

  const base: ViewStyle = {
    borderRadius: radius,
    padding: padded ? spacing.lg : 0,
  };

  const skin: ViewStyle =
    resolvedKind === "raised"
      ? { backgroundColor: c.surface, ...elevation(level, resolvedTone === "dark") }
      : resolvedKind === "outlined"
        ? { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }
        : { backgroundColor: resolvedTone === "dark" ? c.surface : c.surfaceElevated };

  return <View style={[base, skin, style]}>{children}</View>;
}

/**
 * A hairline. The only other legal use of a border (§5): a functional
 * divider between two things that are genuinely separate.
 *
 * It exists as a component because "one more card" and "a line between two
 * rows" solve the same problem, and the line is almost always the right
 * one. Making it the easier thing to type is most of design-system work.
 */
export function Divider({
  tone = "light",
  inset = 0,
  color,
  style,
}: {
  tone?: "light" | "dark";
  inset?: number;
  /** An explicit hairline colour, for callers that already hold a palette. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = tone === "dark" ? proTheme.colors : customerTheme.colors;
  return (
    <View
      style={[styles.divider, { backgroundColor: color ?? c.border, marginHorizontal: inset }, style]}
    />
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth * 2 },
});
