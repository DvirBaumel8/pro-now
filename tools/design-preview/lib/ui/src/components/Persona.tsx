import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import { palette, radii, type } from "../theme";

/**
 * An illustrated person.
 *
 * PRO NOW's screens were grey where the people go, and a marketplace that
 * looks unpopulated is a marketplace nobody joins. But the honest fix is
 * narrow: /docs/03-DESIGN-SYSTEM.md requires real licensed photography for
 * real professionals and forbids generated faces standing in for them.
 *
 * The distinction this component rests on is between a *portrait* and a
 * *character*. A photorealistic face invites the viewer to believe a
 * specific person exists and is available — that is fabricated supply
 * wearing a friendly expression. A flat vector character invites nobody to
 * believe anything: it is visibly a drawing, the way a boarding-pass icon is
 * visibly a drawing. It warms the layout without making a claim.
 *
 * So these are deliberately illustrative — no rendering, no texture, no
 * attempt at likeness — and they are never presented as a photograph of the
 * person named beside them. Where a real professional's own photo exists,
 * `ImageSlot`/`RingedAvatar` take it and this component steps aside.
 *
 * The features are derived from a stable seed, so the same person is drawn
 * the same way on every screen they appear on. Variety across the cast is
 * the point: this product serves a city, and a wall of identical avatars
 * quietly says otherwise.
 */

export interface PersonaProps {
  /** Stable seed — use the professional/customer id, not the display name. */
  seed: string;
  size?: number;
  /** Ring colour; omit for no ring. */
  ring?: string;
  /** Draws a small live dot at the bottom-left of the ring. */
  live?: boolean;
  liveColor?: string;
  style?: StyleProp<ViewStyle>;
  /** Spoken description. Defaults to a neutral "illustration" label. */
  label?: string;
}

// Deliberately broad. A marketplace that serves a whole city should look
// like it, and a palette of three near-identical tones does not.
const SKIN = ["#F2D2B6", "#E8BE9A", "#D49E75", "#B57A50", "#8D5A36", "#5F3A22"];
const HAIR = ["#1C1218", "#3B2418", "#6B4226", "#A9663A", "#C9A227", "#8E8E99", "#2E2A4A"];
const CLOTH = [
  palette.signal500,
  palette.trust500,
  palette.sun500,
  "#4A6FE3",
  "#7A4AE3",
  "#2E8B7A",
  "#C93C1C",
  "#3A3244",
];

/** FNV-1a — small, stable across platforms, and good enough to decorrelate. */
function hash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length] as T;
}

export function Persona({
  seed,
  size = 56,
  ring,
  live = false,
  liveColor = palette.trust300,
  style,
  label,
}: PersonaProps) {
  const h = hash(seed);
  const skin = pick(SKIN, h);
  const hair = pick(HAIR, h >> 3);
  const cloth = pick(CLOTH, h >> 6);
  const hairStyle = (h >> 9) % 5;
  const facialHair = (h >> 12) % 4 === 0;
  const glasses = (h >> 14) % 3 === 0;
  const bg = pick([palette.signal100, palette.trust100, palette.sun100, palette.ink100], h >> 17);

  const stroke = ring ? Math.max(2, size * 0.045) : 0;
  const inner = size - stroke * 2;

  return (
    <View
      accessibilityLabel={label ?? "איור של אדם"}
      style={[{ width: size, height: size }, style]}
    >
      {ring ? (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={(size - stroke) / 2}
            stroke={ring}
            strokeWidth={stroke}
            fill="none"
          />
        </Svg>
      ) : null}

      <View
        style={{
          position: "absolute",
          top: stroke,
          left: stroke,
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          overflow: "hidden",
          backgroundColor: bg,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          {/* Shoulders */}
          <Path d="M8 100c0-21 19-34 42-34s42 13 42 34z" fill={cloth} />
          {/* Collar detail, so the torso is not a flat blob */}
          <Path d="M50 66l-9 11 9 9 9-9z" fill="rgba(255,255,255,0.22)" />
          {/* Neck */}
          <Rect x={43} y={54} width={14} height={16} rx={7} fill={skin} />
          {/* Head */}
          <Ellipse cx={50} cy={40} rx={20} ry={22} fill={skin} />
          {/* Ears */}
          <Circle cx={29} cy={42} r={4} fill={skin} />
          <Circle cx={71} cy={42} r={4} fill={skin} />

          <Hair style={hairStyle} color={hair} />

          {/* Eyes — simple marks, never an expression that reads as a mood */}
          <Circle cx={42} cy={40} r={2.4} fill={palette.ink900} />
          <Circle cx={58} cy={40} r={2.4} fill={palette.ink900} />

          {glasses ? (
            <G stroke={palette.ink700} strokeWidth={1.6} fill="none">
              <Circle cx={42} cy={40} r={7} />
              <Circle cx={58} cy={40} r={7} />
              <Path d="M49 40h2" />
            </G>
          ) : null}

          {/* Mouth — a calm, closed curve. Not a grin. */}
          <Path d="M44 49c2 2.6 10 2.6 12 0" stroke={palette.ink700} strokeWidth={1.8} fill="none" strokeLinecap="round" />

          {facialHair ? (
            <Path d="M36 46c2 9 6 13 14 13s12-4 14-13c-4 5-8 7-14 7s-10-2-14-7z" fill={hair} opacity={0.9} />
          ) : null}
        </Svg>
      </View>

      {live ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: size * 0.26,
            height: size * 0.26,
            borderRadius: size * 0.13,
            backgroundColor: liveColor,
            borderWidth: Math.max(1.5, size * 0.035),
            borderColor: palette.white,
          }}
        />
      ) : null}
    </View>
  );
}

function Hair({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 0: // cropped
      return <Path d="M30 38c0-13 9-20 20-20s20 7 20 20c-3-8-10-11-20-11s-17 3-20 11z" fill={color} />;
    case 1: // long, past the shoulders
      return (
        <G fill={color}>
          <Path d="M28 40c0-15 10-23 22-23s22 8 22 23c0 6-2 9-2 9V34c-6-6-14-7-20-7s-14 1-20 7v15s-2-3-2-9z" />
          <Path d="M26 40c-2 14-1 24 2 30 2-10 1-20 2-26zM74 40c2 14 1 24-2 30-2-10-1-20-2-26z" />
        </G>
      );
    case 2: // curls
      return (
        <G fill={color}>
          <Circle cx={38} cy={24} r={9} />
          <Circle cx={50} cy={20} r={10} />
          <Circle cx={62} cy={24} r={9} />
          <Circle cx={32} cy={33} r={7} />
          <Circle cx={68} cy={33} r={7} />
        </G>
      );
    case 3: // head covering — part of the city, not an exception
      return (
        <G>
          <Path d="M27 44c0-16 10-26 23-26s23 10 23 26c0 8-3 14-3 14l-4-22c-5-6-10-8-16-8s-11 2-16 8l-4 22s-3-6-3-14z" fill={color} />
          <Path d="M27 44c-3 12-2 22 1 30h8l-5-30zM73 44c3 12 2 22-1 30h-8l5-30z" fill={color} opacity={0.85} />
        </G>
      );
    default: // tied back
      return (
        <G fill={color}>
          <Path d="M30 38c0-14 9-21 20-21s20 7 20 21c-3-9-10-12-20-12s-17 3-20 12z" />
          <Circle cx={72} cy={36} r={6} />
        </G>
      );
  }
}

/**
 * A row of overlapping personas — "who is around right now".
 *
 * It is decorative reassurance, not a roster, so it takes a `count` the
 * server actually reported and draws at most a handful of faces for it. It
 * must never be fed an invented number: the caller passes the same count the
 * supply pill shows, or does not render this at all.
 */
export function PersonaStack({
  seeds,
  size = 34,
  max = 4,
  overlap = 0.34,
  ringColor = palette.white,
}: {
  seeds: string[];
  size?: number;
  max?: number;
  overlap?: number;
  ringColor?: string;
}) {
  const shown = seeds.slice(0, max);
  const extra = seeds.length - shown.length;
  return (
    <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
      {shown.map((seed, i) => (
        <View key={seed} style={{ marginRight: i === 0 ? 0 : -size * overlap }}>
          <Persona seed={seed} size={size} ring={ringColor} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginRight: -size * overlap,
            backgroundColor: palette.ink100,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: ringColor,
          }}
        >
          <Text style={{ ...type.caption, fontSize: size * 0.3, color: palette.ink700, fontWeight: "700" }}>
            +{extra}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const personaRadius = radii.pill;
