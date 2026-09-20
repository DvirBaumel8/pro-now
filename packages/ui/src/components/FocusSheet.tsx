import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, palette, radii, spacing, type } from "../theme";

/**
 * THE LIGHT SHEET THAT RISES OUT OF THE DARK.
 *
 * ---------------------------------------------------------------------
 * WHY THE MONEY SCREEN IS NOT A ROUTE
 * ---------------------------------------------------------------------
 * When the customer app went dark, the quote stayed light — and the obvious
 * problem with that is the cut: navigating from a near-black tracking
 * screen straight into a full ivory page is a flash, and a flash reads as a
 * bug or as a different app.
 *
 * ChatGPT's answer is the right one and it is not a fade:
 *
 *   "אל תנווט ב־cut ממסך שחור למסך לבן. כשהמקצוען שולח הצעה, מתוך המסך
 *    הכהה עולה sheet בהיר מלמטה… הרקע הכהה נשאר מאחור ומוחשך מעט… כך הלבן
 *    אומר באופן עקבי: עכשיו עוצרים וקוראים לפני שמאשרים כסף. זה טקס, לא
 *    theme switch."
 *
 * That sentence is the whole component. The dark screen stays behind,
 * dimmed, so the customer can see they have not gone anywhere — they have
 * been handed something. And because the light always arrives the same way,
 * light acquires a meaning the app can rely on: **stop and read before you
 * agree to money.** A theme that arrives by navigation means nothing; a
 * surface that always arrives the same way becomes a signal.
 *
 * ---------------------------------------------------------------------
 * 78%, NOT FULL HEIGHT
 * ---------------------------------------------------------------------
 * Leaving the dark visible above the sheet is what makes it a sheet rather
 * than a page. It also leaves the live job on screen: the person is still
 * in your kitchen while you read his price, and hiding that completely
 * would make the quote feel like a document from nowhere.
 */

export interface FocusSheetProps {
  visible: boolean;
  /** The line at the top of the sheet: "דניאל שלח הצעת מחיר". */
  titleHe: string;
  onDismiss?: () => void;
  /** Reduced motion: renders the settled frame with no animation. */
  animate?: boolean;
  /** Fraction of the screen the sheet covers. */
  heightFraction?: number;
  /**
   * How far the world behind is dimmed.
   *
   * 0.55 is right for a quote: money deserves a screen of its own. It is
   * wrong for a professional's card at the end of a journey through the
   * world — ChatGPT: *"העולם לא מוחשך לגמרי: overlay שחור בערך 0.12–0.16
   * בלבד, בלי blur כבד."* The camera spent two and a half seconds getting
   * there; dimming the place away erases the arrival.
   */
  scrimOpacity?: number;
  width: number;
  height: number;
  children: React.ReactNode;
}

export function FocusSheet({
  visible,
  titleHe,
  onDismiss,
  animate = true,
  heightFraction = 0.78,
  scrimOpacity = 0.55,
  width,
  height,
  children,
}: FocusSheetProps) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      v.setValue(visible ? 1 : 0);
      return;
    }
    const a = Animated.timing(v, {
      toValue: visible ? 1 : 0,
      // Rising is slower than dismissing: arriving at a decision should
      // feel deliberate, leaving it should not feel laboured.
      duration: visible ? 380 : 240,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [visible, animate, v]);

  if (!visible) return null;

  const sheetH = Math.round(height * heightFraction);

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="box-none">
      {/*
        * The dark screen dims but does not disappear. Tapping it dismisses,
        * which is the one gesture people try first on a sheet.
        */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          { opacity: Animated.multiply(v, scrimOpacity / 0.55) },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="סגירה"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            width,
            height: sheetH,
            transform: [
              { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.grabber} />
        <Text style={styles.title} numberOfLines={1}>
          {titleHe}
        </Text>
        <View style={styles.body}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(9,7,13,0.55)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: customerTheme.colors.bg,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: "hidden",
    // Elevation only — a surface is raised or outlined, never both (§5).
    shadowColor: palette.ink900,
    shadowOpacity: 0.4,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: -10 },
    elevation: 20,
  },
  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: customerTheme.colors.border,
    marginTop: spacing.md,
  },
  title: {
    ...type.metaStrong,
    color: customerTheme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
  body: { flex: 1 },
});
