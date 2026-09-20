import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

/**
 * A soft light behind the one thing that matters.
 *
 * WHY THIS EXISTS. The dark build was correct and flat, and Amit's verdict
 * — "עדיין לא נראה מספיק זוהר וחדשני" — is a real deficit rather than a
 * taste note. On a near-black surface `elevation()` casts a dark shadow
 * into darkness and produces nothing, so every panel sat at exactly the
 * same depth and the screen read as one sheet of black. Light is the only
 * depth cue a dark interface has.
 *
 * AND WHY THIS IS NOT THE "HEAVY GRADIENTS" THE BRIEF FORBIDS.
 * /docs/03-DESIGN-SYSTEM.md rules out gradients, and it is right about the
 * thing it was ruling out: a two-hue fill sliding from one brand colour to
 * another, which is how a product looks dated within a year. This is a
 * different instrument. One hue, a maximum around 0.16 alpha, fading to
 * fully transparent — a light source, not a fill. Nothing is coloured by
 * it; something near it is lit.
 *
 * The distinction that keeps it honest: a glow may sit BEHIND content and
 * never ON it, and it never carries information. If a screen would lose a
 * fact by deleting its glow, the glow was being used as a chip.
 */

export type GlowColor = "signal" | "trust" | "neutral";

const RGB: Record<GlowColor, string> = {
  signal: "255,92,56",
  trust: "15,164,127",
  neutral: "247,243,250",
};

export interface GlowProps {
  color?: GlowColor;
  width: number;
  height: number;
  /** Peak alpha at the centre. The ceiling is deliberately low. */
  intensity?: number;
  /** 0 = top of the box, 1 = bottom. Where the light source sits. */
  originY?: number;
  originX?: number;
  /** How wide the light spreads, as a fraction of the box. */
  spread?: number;
}

export function Glow({
  color = "signal",
  width,
  height,
  intensity = 0.14,
  originX = 0.5,
  originY = 0.42,
  spread = 0.85,
}: GlowProps) {
  const rgb = RGB[color];
  const id = `glow-${color}-${Math.round(width)}-${Math.round(height)}-${Math.round(originY * 100)}`;
  const peak = Math.min(intensity, 0.2);

  return (
    <View style={[StyleSheet.absoluteFill, styles.wrap]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={`rgb(${rgb})`} stopOpacity={peak} />
            <Stop offset="45%" stopColor={`rgb(${rgb})`} stopOpacity={peak * 0.42} />
            <Stop offset="100%" stopColor={`rgb(${rgb})`} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={width * originX}
          cy={height * originY}
          rx={width * spread}
          ry={height * spread * 0.78}
          fill={`url(#${id})`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
});
