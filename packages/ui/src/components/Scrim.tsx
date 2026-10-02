import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * A DARKENING OVER THE WORLD, WITH NO EDGES IN IT.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS NOT THREE VIEWS
 * ---------------------------------------------------------------------
 * The first version of the welcome screen's scrim was exactly that: three
 * absolutely positioned `View`s at 55%, 18% and 86% opacity, stacked down
 * the screen. It is the obvious way to do a gradient without a gradient,
 * and the screenshot showed precisely what is wrong with it — two hard
 * horizontal lines across the artwork, at the boundaries, like a picture
 * printed on three strips of tape.
 *
 * A gradient has no boundaries to show. React Native has no gradient
 * primitive, but `react-native-svg` is already a dependency (it draws every
 * mark in the product), and an SVG `linearGradient` renders as one smooth
 * fill on both native and web.
 *
 * ---------------------------------------------------------------------
 * THE STOPS ARE THE DESIGN
 * ---------------------------------------------------------------------
 * Not a uniform wash. A uniform 50% overlay is the usual answer to "make
 * the text readable", and it makes the art muddy everywhere while making
 * the text legible nowhere. Instead: a little at the very top so a status
 * bar and a wordmark have something to sit on, almost nothing through the
 * upper middle where the world should simply be the world, then deepening
 * steadily to solid behind the text and the controls.
 */
export interface ScrimProps {
  width: number;
  height: number;
  /** The colour being faded in. Defaults to the product's night. */
  color?: string;
  /**
   * Opacity at each stop, top to bottom. The default is tuned for a full
   * screen of world with the content resting on the lower half.
   */
  stops?: readonly { at: number; opacity: number }[];
}

const DEFAULT_STOPS = [
  { at: 0, opacity: 0.62 },
  { at: 0.14, opacity: 0.16 },
  { at: 0.4, opacity: 0.22 },
  { at: 0.58, opacity: 0.72 },
  { at: 0.74, opacity: 0.92 },
  { at: 1, opacity: 0.97 },
] as const;

export function Scrim({ width, height, color = "#100C16", stops = DEFAULT_STOPS }: ScrimProps) {
  // A stable id per instance is unnecessary here — the gradient is defined
  // inside its own <Svg>, so the reference cannot collide with another.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            {stops.map((s) => (
              <Stop key={s.at} offset={s.at} stopColor={color} stopOpacity={s.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill="url(#scrim)" />
      </Svg>
    </View>
  );
}
