import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { palette } from "../theme";

/**
 * THE LIVE FIELD — the one thing in this product that is supposed to be
 * recognisable without the logo.
 *
 * ChatGPT's answer to "what would make this unmistakable rather than merely
 * clean": stop looking for a signature colour or corner radius, because
 * those are copied in an afternoon. Make NOW ITSELF the visual identity —
 * one live surface that recurs everywhere and whose STATE is the design.
 *
 *   IDLE      a quiet field. Nothing is happening and the screen says so.
 *   SEARCHING the field breathes outward from the customer's position.
 *   MATCHED   a single presence resolves out of it.
 *   ROUTE     the two points connect and the line is the subject.
 *
 * WHY IT IS A FIELD AND NOT A MAP. A real map invites reading — street
 * names, landmarks, "is that my building?" — and every one of those
 * questions is a promise about precision we must not make before
 * assignment, because a customer who can locate a professional on a street
 * has been given that professional's position (/docs/12-PRIVACY.md). A
 * field carries movement and direction with no geography at all. It cannot
 * leak what it does not contain.
 *
 * AND WHY THE MOTION IS HONEST. Each state animates only while it is true.
 * A searching pulse that keeps breathing after the search ended is a
 * screen lying slowly, and slow lies are the ones people believe.
 */

export type LiveFieldState = "IDLE" | "SEARCHING" | "MATCHED" | "ROUTE";

export interface LiveFieldProps {
  state: LiveFieldState;
  width: number;
  height: number;
  /** Light surfaces get the ivory field; dark ones the night field. */
  tone?: "light" | "dark";
  children?: React.ReactNode;
}

export function LiveField({ state, width, height, tone = "dark", children }: LiveFieldProps) {
  const dark = tone === "dark";
  const bg = dark ? palette.night800 : palette.sandDeep;
  const grid = dark ? "rgba(247,243,250,0.055)" : "rgba(23,18,31,0.05)";
  const accent = palette.signal500;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (state !== "SEARCHING" && state !== "MATCHED") {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: state === "SEARCHING" ? 2600 : 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const cx = width / 2;
  const cy = height * 0.56;
  const ring = Math.min(width, height) * 0.42;

  return (
    <View style={[styles.wrap, { width, height, backgroundColor: bg }]}>
      {/* The field itself: a loose grid that fades at the edges. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="lfFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={bg} stopOpacity="0.92" />
            <Stop offset="0.35" stopColor={bg} stopOpacity="0" />
            <Stop offset="0.72" stopColor={bg} stopOpacity="0.3" />
            <Stop offset="1" stopColor={bg} stopOpacity="0.96" />
          </LinearGradient>
        </Defs>

        <G>
          {Array.from({ length: 7 }).map((_, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={(height / 6) * i}
              x2={width}
              y2={(height / 6) * i}
              stroke={grid}
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <Line
              key={`v${i}`}
              x1={(width / 5) * i}
              y1={0}
              x2={(width / 5) * i}
              y2={height}
              stroke={grid}
              strokeWidth={1}
            />
          ))}
        </G>

        {/* The route, when there is one. The line IS the subject here. */}
        {state === "ROUTE" ? (
          <Path
            d={`M${width * 0.12} ${height * 0.74} C ${width * 0.32} ${height * 0.74}, ${
              width * 0.34
            } ${height * 0.3}, ${width * 0.52} ${height * 0.3} S ${width * 0.74} ${
              height * 0.56
            }, ${width * 0.9} ${height * 0.42}`}
            stroke={accent}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray="1 8"
            fill="none"
          />
        ) : null}

        <Rect width={width} height={height} fill="url(#lfFade)" />
      </Svg>

      {/* One expanding ring — presence, not a radar sweep. */}
      {state === "SEARCHING" || state === "MATCHED" ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: ring * 2,
              height: ring * 2,
              borderRadius: ring,
              borderColor: accent,
              left: cx - ring,
              top: cy - ring,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.36, 0] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) },
              ],
            },
          ]}
        />
      ) : null}

      {state === "ROUTE" ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={width} height={height}>
            <Circle cx={width * 0.12} cy={height * 0.74} r={5} fill={dark ? "#F7F3FA" : "#17121F"} />
            <Circle cx={width * 0.9} cy={height * 0.42} r={5} fill={accent} />
          </Svg>
        </View>
      ) : null}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  ring: { position: "absolute", borderWidth: 1.5 },
});
