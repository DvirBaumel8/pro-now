import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { elevation, radii, spacing, type } from "../theme";
import type { ThemeColors } from "./primitives";

/**
 * A modal sheet that rises from the bottom.
 *
 * Several actions in this product are not screens: calling through a relay,
 * sharing a live trip, confirming something irreversible. Pushing a whole
 * screen for those loses the context they are about — you stop seeing the
 * job while deciding something about the job.
 *
 * The scrim is tappable to dismiss, and there is always a visible close
 * affordance. A sheet you can only leave by completing it is a trap, and
 * the one place that is justified — an irreversible confirm — should say so
 * in words rather than by removing the exit.
 */
export function Sheet({
  visible,
  onClose,
  colors,
  dark = false,
  titleHe,
  children,
  width,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  dark?: boolean;
  titleHe: string;
  children: React.ReactNode;
  width: number;
  height: number;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: visible ? 1 : 0,
      duration: visible ? 280 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, v]);

  if (!visible) return null;

  return (
    /*
     * zIndex, not JSX order.
     *
     * The sheet is a sibling of the tab bar, and siblings paint in order —
     * so the tab bar sat ON TOP of the sheet's primary button. The button
     * was visible, looked pressable, and every tap went to whichever tab
     * happened to be underneath it. A modal that the chrome can intercept is
     * not a modal, and relying on "render it last" makes every future screen
     * one reordering away from the same bug.
     */
    <View
      style={[StyleSheet.absoluteFill, { width, height, zIndex: 60 }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: v }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="סגירה" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface },
          elevation(3, dark),
          {
            opacity: v,
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) }],
          },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <View style={styles.headRow}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
            style={styles.close}
          >
            <Text style={[styles.closeGlyph, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {titleHe}
          </Text>
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(10,7,14,0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  grabber: { alignSelf: "center", width: 38, height: 4, borderRadius: 2, marginBottom: spacing.md },
  headRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  title: { ...type.h3, writingDirection: "rtl" },
  // 44x44 minimum. It was 23x34 — a glyph with 4px of padding, which on a
  // phone is a control you aim at rather than press.
  close: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  closeGlyph: { fontSize: 26, lineHeight: 26 },
});
