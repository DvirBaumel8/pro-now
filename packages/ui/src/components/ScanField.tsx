import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, RadialGradient, Stop } from "react-native-svg";

import { palette } from "../theme";

/**
 * THE SEARCH — a world being revealed, not airspace being swept.
 *
 * ---------------------------------------------------------------------
 * THE THIRD VERSION, AND THE BRIEF THAT PRODUCED IT
 * ---------------------------------------------------------------------
 * Version one was a radar: a rotating beam, range rings, blips lighting as
 * the sweep crossed them. Legible, instantly understood, and wrong — Amit:
 * *"שלא יראה כמו חיפוש ראדר של מטוס."* A radar's grammar is detection of an
 * adversary. Pointed at "who can come and help this person" it says the
 * professionals are targets.
 *
 * Version two removed the beam and had presences drift inward. Warmer, and
 * too empty: a handful of dots on black is not a search, it is a loading
 * state with better manners.
 *
 * The brief that settled it: *"אני כן רוצה משהו שמשלב סריקה של מפה חדשנית
 * וכיפית לעין שאין לאף אחד — סריקה של עולם חדש."*
 *
 * ---------------------------------------------------------------------
 * SO: A LATTICE THAT LIGHTS UP AS THE SEARCH REACHES IT
 * ---------------------------------------------------------------------
 * A network of nodes and links sits in the dark. A wavefront travels
 * outward from the customer, and everything it passes ignites and then
 * settles to a low glow — the world being discovered rather than scanned.
 * A few nodes wake into presences and travel back INWARD, toward the
 * customer, because that is the direction that is actually true: they are
 * coming to you.
 *
 * Two opposed motions, and the opposition is the idea. Discovery goes out;
 * people come in.
 *
 * ---------------------------------------------------------------------
 * WHY A LATTICE AND NOT STREETS
 * ---------------------------------------------------------------------
 * §11 forbids a stylised street drawing standing in for a map, and it is
 * right: drawn streets promise geography the screen does not have and
 * invite the customer to read a position we have not earned the right to
 * show (/docs/12-PRIVACY.md). A lattice makes no such claim. Nobody looks
 * at a node graph and asks "is that my building?" It reads as *system* —
 * coverage, reach, a network being queried — which is exactly what is
 * happening and exactly what we can say honestly.
 *
 * And the nodes are never counted and never labelled. "4 אינסטלטורים לידך"
 * drawn as dots is still fabricated supply, just rendered so it does not
 * look like a claim (/CLAUDE.md §3).
 *
 * ---------------------------------------------------------------------
 * HOW IT STAYS CHEAP
 * ---------------------------------------------------------------------
 * One `Animated.Value` drives everything. The lattice itself is static SVG
 * drawn once; the ignition is per-node opacity on the native driver, keyed
 * to each node's distance from the centre, so a node lights when the
 * wavefront reaches it without anything computing a wavefront. Dispatch is
 * doing real work while this renders, and an animation that stutters at
 * that moment is worse than none.
 */

export interface ScanFieldProps {
  width: number;
  height: number;
  /** False stops every animation dead. */
  active?: boolean;
  /** One full discovery wave, end to end. */
  periodMs?: number;
}

interface Node {
  x: number;
  y: number;
  /** 0 at the customer, 1 at the far edge. Decides when it ignites. */
  d: number;
  r: number;
}

export function ScanField({ width, height, active = true, periodMs = 3400 }: ScanFieldProps) {
  const cx = width / 2;
  const cy = height / 2;

  const wave = useRef(new Animated.Value(0)).current;
  const travel = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      wave.setValue(0);
      travel.setValue(0);
      return;
    }
    const w = Animated.loop(
      Animated.timing(wave, {
        toValue: 1,
        duration: periodMs,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const t = Animated.loop(
      Animated.timing(travel, {
        toValue: 1,
        duration: periodMs * 1.4,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    w.start();
    t.start();
    return () => {
      w.stop();
      t.stop();
    };
  }, [active, periodMs, wave, travel]);

  /**
   * A TRIANGULAR LATTICE, JITTERED — deterministically.
   *
   * A perfect grid reads as graph paper and a random scatter reads as
   * noise; an offset lattice with a fixed pseudo-random nudge reads as an
   * organic network. The nudge comes from a hash of the row and column
   * rather than `Math.random`, so a re-render never teleports a node.
   * Movement the customer cannot explain reads as a glitch, and this screen
   * exists to feel dependable at the moment they are least sure.
   */
  const { nodes, links, maxD } = useMemo(() => {
    const step = Math.max(46, Math.round(Math.min(width, height) / 7));
    const jitter = (a: number, b: number) => {
      const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
      return (h - Math.floor(h) - 0.5) * step * 0.42;
    };
    const out: Node[] = [];
    const reach = Math.hypot(width, height) / 2;
    for (let row = -1; row * step < height + step; row++) {
      for (let col = -1; col * step < width + step; col++) {
        const x = col * step + (row % 2 ? step / 2 : 0) + jitter(row, col);
        const y = row * step * 0.88 + jitter(col, row);
        const d = Math.hypot(x - cx, y - cy) / reach;
        if (d > 1.05) continue;
        out.push({ x, y, d, r: 1.6 + (1 - d) * 2.2 });
      }
    }
    /*
     * Links only between near neighbours, and only a bounded number, so the
     * lattice reads as a network rather than as a mesh. A fully connected
     * field turns into texture and stops saying "connections".
     */
    const ls: { x1: number; y1: number; x2: number; y2: number; d: number }[] = [];
    for (let i = 0; i < out.length; i++) {
      const a = out[i]!;
      for (let j = i + 1; j < out.length; j++) {
        const b = out[j]!;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < step * 1.12) {
          ls.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, d: Math.min(a.d, b.d) });
        }
      }
    }
    return { nodes: out, links: ls, maxD: 1.05 };
  }, [width, height, cx, cy]);

  /**
   * The presences that come back toward the customer. Five, from fixed
   * angles, offset in time so the field never empties.
   */
  const travellers = useMemo(() => {
    const reach = Math.min(width, height) * 0.44;
    return [0.06, 0.29, 0.52, 0.71, 0.9].map((angle, i) => {
      const a = angle * Math.PI * 2;
      return {
        fromX: cx + Math.cos(a) * reach,
        fromY: cy + Math.sin(a) * reach * 0.9,
        delay: i * 0.19,
        size: 6 + (i % 3),
      };
    });
  }, [cx, cy, width, height]);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* The lattice, drawn once and left there. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="worldBloom" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.signal500} stopOpacity={0.15} />
            <Stop offset="60%" stopColor={palette.signal500} stopOpacity={0.05} />
            <Stop offset="100%" stopColor={palette.signal500} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={cx} cy={cy} r={Math.max(width, height) * 0.6} fill="url(#worldBloom)" />
        {links.map((l, i) => (
          <Line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke="rgba(247,243,250,0.06)"
            strokeWidth={1}
          />
        ))}
        {nodes.map((n, i) => (
          <Circle key={i} cx={n.x} cy={n.y} r={n.r} fill="rgba(247,243,250,0.1)" />
        ))}
      </Svg>

      {/*
        * IGNITION. Each node carries its own copy of the wave, shifted by
        * how far it is from the customer — so the light appears to travel
        * outward without anything actually computing a wavefront.
        */}
      {nodes.map((n, i) => {
        const at = n.d / maxD;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.spark,
              {
                width: n.r * 2.6,
                height: n.r * 2.6,
                borderRadius: n.r * 1.3,
                left: n.x - n.r * 1.3,
                top: n.y - n.r * 1.3,
                opacity: wave.interpolate({
                  inputRange: [
                    Math.max(0, at - 0.1),
                    at,
                    Math.min(1, at + 0.16),
                    1,
                  ],
                  outputRange: [0, 0.95, 0.12, 0.12],
                  extrapolate: "clamp",
                }),
                transform: [
                  {
                    scale: wave.interpolate({
                      inputRange: [Math.max(0, at - 0.1), at, Math.min(1, at + 0.16), 1],
                      outputRange: [0.6, 1.5, 1, 1],
                      extrapolate: "clamp",
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}

      {/* And the people, coming the other way. */}
      {travellers.map((tr, i) => {
        const phase = Animated.modulo(Animated.add(travel, tr.delay), 1);
        return (
          <Animated.View
            key={`t${i}`}
            pointerEvents="none"
            style={[
              styles.presence,
              {
                width: tr.size,
                height: tr.size,
                borderRadius: tr.size / 2,
                left: tr.fromX - tr.size / 2,
                top: tr.fromY - tr.size / 2,
                opacity: phase.interpolate({
                  inputRange: [0, 0.2, 0.85, 1],
                  outputRange: [0, 1, 0.7, 0],
                }),
                transform: [
                  { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, cx - tr.fromX] }) },
                  { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, cy - tr.fromY] }) },
                  { scale: phase.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.7, 1.2, 0.4] }) },
                ],
              },
            ]}
          />
        );
      })}

      {/* You are here — the origin of the world, and its destination. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            left: cx - 46,
            top: cy - 46,
            opacity: wave.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.55, 0.1, 0.05] }),
            transform: [
              { scale: wave.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.3] }) },
            ],
          },
        ]}
      />
      <View style={[styles.here, { left: cx - 9, top: cy - 9 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: palette.night900, overflow: "hidden" },
  spark: { position: "absolute", backgroundColor: palette.signal300 },
  presence: { position: "absolute", backgroundColor: palette.white },
  halo: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: palette.signal300,
  },
  here: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.white,
    borderWidth: 4,
    borderColor: palette.signal500,
  },
});
