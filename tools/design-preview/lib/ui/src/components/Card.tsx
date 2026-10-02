import React from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { customerDarkTheme, customerTheme, depth, elevation, radii, spacing } from "../theme";

/**
 * THE CUSTOMER'S CARD. One shape, one depth recipe, one radius.
 *
 * Amit: "קו עיצובי אחיד בין הכרטיסים של הלקוח." The reason there wasn't
 * one is worth writing down, because it is the same failure the Visual
 * System was created to stop, one level lower: the system named `Surface`
 * as the only container, and then eleven screens each wrote their own card
 * style anyway — `radii.lg` here and `radii.xl` there, `spacing.md` of
 * padding on one and `spacing.lg` on the next, a hairline on some and a
 * shadow on others. Every one was a reasonable local choice. Together they
 * are why the app reads as assembled rather than designed.
 *
 * A rule that lives in prose gets re-interpreted per screen. A rule that
 * lives in a component gets imported.
 *
 * THREE VARIANTS, AND THEY MEAN DIFFERENT THINGS:
 *
 *   `raised`  the default. A dark panel lifted by a lit top edge — the
 *             only elevation that exists on a near-black surface, since a
 *             dark shadow cast into darkness is nothing (see theme
 *             `depth`).
 *   `bright`  the scarce one. A light card on the dark app, spent only
 *             where the customer must TOUCH or READ CLOSELY (§0): the
 *             capture field, the money, the group of services that can
 *             actually happen right now. If everything is bright, the
 *             brightness has stopped meaning "act here".
 *   `flat`    a grouping wash with no elevation, for a card inside a card.
 *
 * `onPress` makes it a button with a real pressed state, so a tappable
 * card never has to be wrapped in a Pressable that swallows its radius.
 */

export type CardVariant = "raised" | "bright" | "flat";

export interface CardProps {
  variant?: CardVariant;
  /** Vertical rhythm: `lg` padding by default, `sm` for dense lists. */
  density?: "comfortable" | "compact";
  onPress?: () => void;
  accessibilityLabelHe?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function Card({
  variant = "raised",
  density = "comfortable",
  onPress,
  accessibilityLabelHe,
  style,
  children,
}: CardProps) {
  const pad = density === "compact" ? spacing.md : spacing.lg;

  const skin: ViewStyle =
    variant === "bright"
      ? { backgroundColor: customerTheme.colors.surface, ...elevation(3) }
      : variant === "flat"
        ? { backgroundColor: depth.panel.low }
        : { backgroundColor: depth.panel.mid, ...depth.litEdge(0.07) };

  const base: ViewStyle = { borderRadius: radii.xl, padding: pad };

  if (!onPress) return <View style={[base, skin, style]}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabelHe}
      style={({ pressed }) => [
        base,
        skin,
        pressed && (variant === "bright" ? styles.pressedBright : styles.pressedDark),
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** The hairline inside a card, between two rows that are genuinely separate. */
export function CardDivider({ variant = "raised" }: { variant?: CardVariant }) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor:
            variant === "bright"
              ? customerTheme.colors.border
              : "rgba(247,243,250,0.09)",
        },
      ]}
    />
  );
}

/** The dark card's own text colours, so callers never guess. */
export const cardColors = {
  raised: customerDarkTheme.colors,
  flat: customerDarkTheme.colors,
  bright: customerTheme.colors,
} as const;

const styles = StyleSheet.create({
  pressedDark: { backgroundColor: depth.panel.high },
  pressedBright: { opacity: 0.94 },
  divider: { height: StyleSheet.hairlineWidth * 2, marginVertical: spacing.md },
});
