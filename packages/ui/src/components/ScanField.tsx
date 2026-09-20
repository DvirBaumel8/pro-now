import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";

import { palette } from "../theme";

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * THE SEARCH, AS SOMETHING YOU CAN WATCH.
 *
 * Amit: "חייב שאתה מחפש מקצוען יהיה מפה שסורקת ומונפשת שיתן חווית חיפוש."
 * He is describing the part of the product that has no interface: dispatch
 * takes seconds to a minute, and for that whole time the customer is doing
 * the most anxious thing in the flow — waiting, having just asked a
 * stranger to come to their house. A spinner says "the app is busy". A
 * sweep says "we are looking, right now, near you."
 *
 * WHY A SCAN AND NOT A MAP. Every reason the Live Field exists applies
 * doubly here: there is no assignment yet, so there is no professional
 * whose position we could honestly draw, and a real map at this moment
 * invites the customer to read positions we have not earned the right to
 * show (/docs/12-PRIVACY.md). A radar sweep is geography-shaped without
 * being geography. It cannot leak what it does not contain.
 *
 * AND WHY THE BLIPS ARE NOT PROFESSIONALS. The dots that surface under the
 * sweep are deliberately abstract and deliberately few, and they are never
 * labelled or counted. They are not "4 plumbers near you" — that would be
 * fabricated supply (/CLAUDE.md §3), rendered as a picture so it does not
 * look like a claim. They say only: this system is out there, looking.
 *
 * MOTION IS GATED ON TRUTH (§7). `active` drives every animation, and when
 * the search ends the sweep stops. A search animation still turning after
 * the search is over is a screen lying slowly.
 */

export interface ScanFieldProps {
  width: number;
  height: number;
  /** False stops every animation dead. */
  active?: boolean;
  /** How long one full sweep takes. */
  periodMs?: number;
}

export function ScanField({ width, height, active = true, periodMs = 2600 }: ScanFieldProps) {
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height) * 0.62;

  const sweep = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      [sweep, ring1, ring2, ring3].forEach((v) => v.setValue(0));
      return;
    }
    const spin = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: periodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    // Three rings on the same period, offset by a third, so the field reads
    // as continuous expansion rather than as three separate pulses.
    const ringLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: periodMs,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const loops = [
      spin,
      ringLoop(ring1, 0),
      ringLoop(ring2, periodMs / 3),
      ringLoop(ring3, (periodMs * 2) / 3),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [active, periodMs, sweep, ring1, ring2, ring3]);

  /**
   * Blips at fixed positions, faded in and out by the sweep's phase so each
   * one lights as the beam passes it. Fixed rather than random because a
   * re-render must not teleport them — movement the customer cannot explain
   * reads as a glitch, and this screen's whole job is to feel reliable.
   */
  const blips = useMemo(
    () => [
      { a: 0.18, r: 0.42 },
      { a: 0.47, r: 0.68 },
      { a: 0.72, r: 0.36 },
      { a: 0.91, r: 0.58 },
    ],
    []
  );

  const ringProps = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.34, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }) }],
  });

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="scanBeam" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.signal500} stopOpacity={0.3} />
            <Stop offset="70%" stopColor={palette.signal500} stopOpacity={0.07} />
            <Stop offset="100%" stopColor={palette.signal500} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* A faint grid — orientation, not geography. */}
        <G opacity={0.5}>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={`h${f}`}
              x1={0}
              y1={height * f}
              x2={width}
              y2={height * f}
              stroke="rgba(247,243,250,0.05)"
              strokeWidth={1}
            />
          ))}
          {[0.25, 0.5, 0.75].map((f) => (
            <Line
              key={`v${f}`}
              x1={width * f}
              y1={0}
              x2={width * f}
              y2={height}
              stroke="rgba(247,243,250,0.05)"
              strokeWidth={1}
            />
          ))}
        </G>

        {/* Static range rings, so the expanding ones have something to expand through. */}
        {[0.34, 0.62, 0.9].map((f) => (
          <Circle
            key={f}
            cx={cx}
            cy={cy}
            r={maxR * f}
            stroke="rgba(247,243,250,0.07)"
            strokeWidth={1}
            fill="none"
          />
        ))}

        {/* Blips, lit as the beam crosses them. */}
        {blips.map((b, i) => {
          const x = cx + Math.cos(b.a * Math.PI * 2) * maxR * b.r;
          const y = cy + Math.sin(b.a * Math.PI * 2) * maxR * b.r;
          return (
            <ACircle
              key={i}
              cx={x}
              cy={y}
              r={3.5}
              fill={palette.signal300}
              opacity={sweep.interpolate({
                inputRange: [
                  Math.max(0, b.a - 0.12),
                  b.a,
                  Math.min(1, b.a + 0.22),
                  1,
                ],
                outputRange: [0, 0.9, 0, 0],
                extrapolate: "clamp",
              })}
            />
          );
        })}
      </Svg>

      {/*
        * THE BEAM lives outside the SVG, in a rotating Animated.View.
        * `<G>` takes no `style`, so an animated transform cannot be applied
        * to it — and even where it can, animating inside SVG runs on the JS
        * thread. A rotating view holding a static wedge runs on the native
        * driver and stays smooth while the app is doing real work, which on
        * this screen it is: dispatch is running.
        */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.beam,
          {
            width: maxR * 2,
            height: maxR * 2,
            left: cx - maxR,
            top: cy - maxR,
            transform: [
              { rotate: sweep.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
            ],
          },
        ]}
      >
        <Svg width={maxR * 2} height={maxR * 2}>
          <Defs>
            <RadialGradient id="scanBeamWedge" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={palette.signal500} stopOpacity={0.34} />
              <Stop offset="70%" stopColor={palette.signal500} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={palette.signal500} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Path
            d={`M ${maxR} ${maxR} L ${maxR * 2} ${maxR - maxR * 0.5} A ${maxR} ${maxR} 0 0 1 ${maxR * 2} ${maxR + maxR * 0.5} Z`}
            fill="url(#scanBeamWedge)"
          />
          <Line
            x1={maxR}
            y1={maxR}
            x2={maxR * 2}
            y2={maxR}
            stroke={palette.signal500}
            strokeWidth={1.5}
            strokeOpacity={0.6}
          />
        </Svg>
      </Animated.View>

      {/* Expanding rings, outside the SVG so they can use the native driver. */}
      {[ring1, ring2, ring3].map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: maxR * 2,
              height: maxR * 2,
              borderRadius: maxR,
              left: cx - maxR,
              top: cy - maxR,
            },
            ringProps(v),
          ]}
        />
      ))}

      {/* You are here. The only fixed point on the field. */}
      <View style={[styles.here, { left: cx - 7, top: cy - 7 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: palette.night900, overflow: "hidden" },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: palette.signal500,
  },
  beam: { position: "absolute" },
  here: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: palette.white,
    borderWidth: 3,
    borderColor: palette.signal500,
  },
});
