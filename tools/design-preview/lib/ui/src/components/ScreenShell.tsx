import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { customerTheme, palette, proTheme } from "../theme";
import { LiveField, type LiveFieldState } from "./LiveField";

/**
 * Every screen's outer frame — and the place the tone rule is enforced.
 *
 * Visual System v1 §12: the customer's app is light, the professional's is
 * dark, and a dark customer surface has to be justified by a LIVE state.
 * That rule survived about a day as prose. It survives permanently as a
 * required prop: a customer screen that wants a dark surface must name the
 * live state that earns it, and there is no way to write "dark because it
 * looks good" without writing something visibly untrue.
 *
 * The shell also owns the background, which is how §11 gets enforced by
 * construction. A screen chooses `field`, `map` or `none`; it cannot reach
 * past the shell and draw streets of its own.
 */

export type ScreenTone = "light" | "dark";
export type ScreenSide = "customer" | "pro";

export interface ScreenShellProps {
  side: ScreenSide;
  width: number;
  height: number;
  /**
   * Defaults to the side's own tone. A customer screen may override to dark
   * ONLY by naming `liveState`, which is the thing that justifies it.
   */
  tone?: ScreenTone;
  /**
   * The live state this screen is in. Required to darken a customer screen,
   * and required by `background: "field"`.
   */
  liveState?: LiveFieldState;
  background?: "none" | "field";
  /** How tall the background band is. Full height when omitted. */
  backgroundHeight?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function ScreenShell({
  side,
  width,
  height,
  tone,
  liveState,
  background = "none",
  backgroundHeight,
  style,
  children,
}: ScreenShellProps) {
  const wanted = tone ?? (side === "pro" ? "dark" : "light");

  /*
   * The rule, applied rather than documented. A customer screen that asks
   * for dark without a live state gets light — silently correct instead of
   * silently wrong, and the mistake shows up in review as a screen that
   * refuses to darken rather than as a screen nobody notices is off-system.
   */
  const effective: ScreenTone =
    side === "customer" && wanted === "dark" && !liveState ? "light" : wanted;

  const bg =
    effective === "dark"
      ? side === "pro"
        ? proTheme.colors.bg
        : palette.night900
      : customerTheme.colors.bg;

  return (
    <View style={[styles.screen, { width, height, backgroundColor: bg }, style]}>
      {background === "field" && liveState ? (
        <View style={styles.bg} pointerEvents="none">
          <LiveField
            state={liveState}
            width={width}
            height={backgroundHeight ?? height}
            tone={effective}
          />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
  bg: { ...StyleSheet.absoluteFillObject },
});
