import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * THE BAND THE WORDS SIT ON.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A GRADIENT AND NOT A FLAT PANEL
 * ---------------------------------------------------------------------
 * It used to be a flat translucent rectangle, and the comment justifying
 * that said two bands at different opacities would read the same as a
 * gradient at this scale "for none of the cost". That was wrong, and the
 * walk test is what showed it: a screenshot of the street has a hard
 * horizontal line ruled across the picture at seventeen percent of the
 * height, with the same trees darker above it and lighter below.
 *
 * The eye does not read that as a scrim. It reads it as a seam — as two
 * images badly joined — which is the exact failure the whole world is
 * built to avoid. And it is the most damaging place to have one, because
 * it sits across the top of every screen where the city is the subject.
 *
 * `react-native-svg` is already a dependency here (RouteLayer draws the
 * route with it), so the gradient costs nothing but this file.
 *
 * The darkening is slightly STRONGER at the very top than the flat band
 * was and reaches zero at the bottom edge, so the text is no less legible
 * while the band itself has no edge to see.
 */
export interface ScrimBandProps {
  width: number;
  height: number;
  /** "top" darkens downward from the top; "bottom" darkens upward. */
  edge: "top" | "bottom";
  /** How dark it is at the strong end. */
  strength?: number;
}

export function ScrimBand({ width, height, edge, strength = 0.72 }: ScrimBandProps) {
  if (width <= 0 || height <= 0) return null;
  const id = `scrim-${edge}`;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.band,
        edge === "top" ? { top: 0 } : { bottom: 0 },
        { height },
      ]}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1={edge === "top" ? "0" : "1"} x2="0" y2={edge === "top" ? "1" : "0"}>
            <Stop offset="0" stopColor="#0B0918" stopOpacity={strength} />
            {/*
             * The middle stop is what stops this looking like a fade and
             * makes it look like light falling off. A straight ramp from
             * full to nothing is visible as a ramp; weighting it so most
             * of the darkening happens in the first third leaves the lower
             * two-thirds almost clear, which is where the city is.
             */}
            <Stop offset="0.45" stopColor="#0B0918" stopOpacity={strength * 0.34} />
            <Stop offset="1" stopColor="#0B0918" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: "absolute", left: 0, right: 0 },
});
