import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { radii, spacing, type } from "../theme";
import type { ThemeColors } from "./primitives";

/**
 * The map surface behind the signature screen
 * (/docs/03-DESIGN-SYSTEM.md §Signature screen — "full-screen map, pulse
 * from customer location, ... professional marker appears").
 *
 * Two deliberate decisions:
 *
 * 1. **This is a stylised placeholder, not a map.** It renders an abstract
 *    street grid so the composition, the pulse and the sheet can be designed
 *    and reviewed before a maps vendor is chosen — and the vendor is an
 *    open business decision (/CLAUDE.md §4). It carries no geography and
 *    must never be shipped as if it showed the customer's real
 *    surroundings; the production surface is the MapsRoutingProvider's.
 *
 * 2. **No professional markers are scattered on it.** The design system
 *    forbids that explicitly, and it would also be fabricated supply
 *    (/CLAUDE.md §3). Exactly one marker is drawn, and only once the server
 *    has actually assigned someone.
 *
 * Accessibility: the map is decorative, so the real state is always carried
 * by `statusText` as live-region text, per §Accessibility ("accessible map
 * alternative/status text").
 */

export interface MapSurfaceProps {
  colors: ThemeColors;
  dark?: boolean;
  /** Screen-reader and visible status line. The map never carries state alone. */
  statusText?: string;
  /** Draws the searching pulse from the customer pin. */
  pulsing?: boolean;
  /** Draws a single assigned-professional marker and the route to the pin. */
  showAssignedMarker?: boolean;
  height?: number;
  /** Pushes the status pill down, so a floating header card cannot cover it. */
  statusTopOffset?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function MapSurface({
  colors,
  dark = false,
  statusText,
  pulsing = false,
  showAssignedMarker = false,
  height = 320,
  statusTopOffset,
  style,
  children,
}: MapSurfaceProps) {
  // /docs/03-DESIGN-SYSTEM.md asks the professional surfaces for "strong map
  // presence". A map that reads as pale texture fails that: the customer
  // must feel located, and the professional must feel dispatched.
  const road = dark ? "rgba(243,245,243,0.2)" : "rgba(20,21,26,0.10)";
  const roadMajor = dark ? "rgba(243,245,243,0.3)" : "rgba(20,21,26,0.16)";
  const block = dark ? "rgba(243,245,243,0.1)" : "rgba(20,21,26,0.05)";
  const blockAlt = dark ? "rgba(243,245,243,0.06)" : "rgba(20,21,26,0.032)";
  const water = dark ? "rgba(15,164,127,0.18)" : "rgba(15,164,127,0.13)";

  return (
    <View
      style={[
        { height, borderRadius: radii.lg, overflow: "hidden", backgroundColor: dark ? "#141C1A" : "#EAE7DF" },
        style,
      ]}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 390 320"
        // Without `slice` the viewBox letterboxes and the map collapses into a
        // band across the middle of a tall screen, leaving dead space above
        // and below. It must cover.
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        {/* Blocks */}
        <Rect x={18} y={20} width={96} height={70} rx={8} fill={block} />
        <Rect x={132} y={12} width={120} height={58} rx={8} fill={blockAlt} />
        <Rect x={270} y={24} width={104} height={84} rx={8} fill={block} />
        <Rect x={10} y={112} width={78} height={92} rx={8} fill={blockAlt} />
        <Rect x={108} y={96} width={128} height={78} rx={8} fill={block} />
        <Rect x={256} y={128} width={118} height={66} rx={8} fill={blockAlt} />
        <Rect x={24} y={228} width={130} height={74} rx={8} fill={block} />
        <Rect x={176} y={198} width={92} height={104} rx={8} fill={block} />
        <Rect x={288} y={214} width={88} height={88} rx={8} fill={blockAlt} />

        {/* A park / water body, for a little organic relief against the grid */}
        <Path d="M296 104c26-14 62-6 78 14-12 24-44 34-72 24-18-7-22-28-6-38z" fill={water} />

        {/* Street grid */}
        <Line x1={0} y1={100} x2={390} y2={100} stroke={roadMajor} strokeWidth={7} />
        <Line x1={0} y1={210} x2={390} y2={210} stroke={road} strokeWidth={5} />
        <Line x1={98} y1={0} x2={98} y2={320} stroke={road} strokeWidth={5} />
        <Line x1={246} y1={0} x2={246} y2={320} stroke={roadMajor} strokeWidth={7} />
        <Line x1={0} y1={56} x2={390} y2={56} stroke={road} strokeWidth={3} />
        <Line x1={170} y1={100} x2={170} y2={320} stroke={road} strokeWidth={3} />
        <Line x1={0} y1={268} x2={390} y2={268} stroke={road} strokeWidth={3} />
        <Line x1={322} y1={0} x2={322} y2={320} stroke={road} strokeWidth={3} />

        {showAssignedMarker ? (
          <Path
            d="M300 76 C 262 96, 250 140, 214 158"
            stroke={colors.action}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeDasharray="1 9"
            fill="none"
          />
        ) : null}
      </Svg>

      {/* Customer pin, dead centre — the sheet rises beneath it */}
      <View style={styles.centre} pointerEvents="none">
        {pulsing ? <Pulse color={colors.action} /> : null}
        <View style={[styles.pinOuter, { borderColor: colors.surface }]}>
          <View style={[styles.pinInner, { backgroundColor: colors.action }]} />
        </View>
      </View>

      {showAssignedMarker ? (
        <View style={styles.proMarker} pointerEvents="none">
          <View style={[styles.proMarkerDot, { backgroundColor: colors.textPrimary, borderColor: colors.surface }]} />
        </View>
      ) : null}

      {statusText ? (
        <View style={[styles.statusWrap, statusTopOffset ? { top: statusTopOffset } : null]} pointerEvents="none">
          <View style={[styles.statusPill, { backgroundColor: dark ? "rgba(11,15,14,0.82)" : "rgba(255,255,255,0.9)" }]}>
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.statusText, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {statusText}
            </Text>
          </View>
        </View>
      ) : null}

      {children}
    </View>
  );
}

/** Expanding rings from the customer pin. Reduced-motion safe: opacity only. */
function Pulse({ color }: { color: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ring = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ])
      );
    const loops = [ring(a, 0), ring(b, 1200)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [a, b]);

  const mk = (v: Animated.Value) => ({
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 3.4] }) }],
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.32, 0] }),
  });

  return (
    <>
      <Animated.View style={[styles.ring, { borderColor: color }, mk(a)]} />
      <Animated.View style={[styles.ring, { borderColor: color }, mk(b)]} />
    </>
  );
}

const styles = StyleSheet.create({
  centre: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 2 },
  pinOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  pinInner: { width: 14, height: 14, borderRadius: 7 },

  proMarker: { position: "absolute", top: "20%", left: "72%" },
  proMarkerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  statusWrap: { position: "absolute", top: spacing.md, left: 0, right: 0, alignItems: "center" },
  statusPill: { paddingHorizontal: spacing.lg, paddingVertical: 8, borderRadius: radii.pill },
  statusText: { ...type.captionStrong, writingDirection: "rtl" },
});
