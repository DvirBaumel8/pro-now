import React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

/**
 * Service marks.
 *
 * /docs/03-DESIGN-SYSTEM.md §Personality rules out "cartoon trade icons",
 * and §Content rules asks for "one consistent icon library". These are that
 * library: a single geometric line system — 24×24 box, 1.8 stroke, round
 * caps and joins, no fills, no colour of their own. They inherit `color`
 * from the caller so one mark works on the warm customer surface and on the
 * dark professional surface without a second asset.
 *
 * They are marks, not illustrations. Photography carries the warmth
 * (see `ImageSlot`); the marks carry the wayfinding.
 */

export type MarkName =
  | "plumbing"
  | "electrical"
  | "climate"
  | "locksmith"
  | "moving"
  | "painting"
  | "appliance"
  | "cleaning"
  | "handyman"
  | "garden";

export interface MarkProps {
  name: MarkName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Mark({ name, size = 24, color = "#14151A", strokeWidth = 1.8 }: MarkProps) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      {name === "plumbing" && (
        <>
          <Path d="M7 3v5a4 4 0 0 0 4 4h2a4 4 0 0 1 4 4v5" {...common} />
          <Rect x={4} y={2} width={6} height={3} rx={1.2} {...common} />
          <Rect x={14} y={19} width={6} height={3} rx={1.2} {...common} />
        </>
      )}

      {name === "electrical" && (
        <>
          <Path d="M13 2 5.5 13.2h5.2L10 22l8-11.4h-5.3z" {...common} />
        </>
      )}

      {name === "climate" && (
        <>
          <Rect x={3} y={4} width={18} height={8} rx={2.6} {...common} />
          <Line x1={6.5} y1={8} x2={17.5} y2={8} {...common} />
          <Path d="M8 15c0 2-1.5 2-1.5 4" {...common} />
          <Path d="M12 15c0 2-1.5 2-1.5 4" {...common} />
          <Path d="M16 15c0 2-1.5 2-1.5 4" {...common} />
        </>
      )}

      {name === "locksmith" && (
        <>
          <Circle cx={8.5} cy={8.5} r={4.5} {...common} />
          <Path d="M11.8 11.8 20 20" {...common} />
          <Path d="M17.2 17.2l-2 2M19 15.4l-2 2" {...common} />
        </>
      )}

      {name === "moving" && (
        <>
          <Path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" {...common} />
          <Path d="M3 8.5 12 13l9-4.5M12 13v7" {...common} />
        </>
      )}

      {name === "painting" && (
        <>
          <Rect x={4} y={3} width={13} height={6} rx={1.6} {...common} />
          <Path d="M17 6h2.2A1.8 1.8 0 0 1 21 7.8V11a2 2 0 0 1-2 2h-7" {...common} />
          <Rect x={9.5} y={13} width={5} height={8} rx={2} {...common} />
        </>
      )}

      {name === "appliance" && (
        <>
          <Rect x={4} y={3} width={16} height={18} rx={3} {...common} />
          <Circle cx={12} cy={13} r={4.2} {...common} />
          <Line x1={7.5} y1={7} x2={11} y2={7} {...common} />
        </>
      )}

      {name === "cleaning" && (
        <>
          <Path d="M12 3v8" {...common} />
          <Path d="M8 11h8l1.5 10h-11z" {...common} />
          <Line x1={10.5} y1={14.5} x2={10} y2={21} {...common} />
          <Line x1={13.5} y1={14.5} x2={14} y2={21} {...common} />
        </>
      )}

      {name === "handyman" && (
        <>
          <Path d="M14.5 3.5a4.5 4.5 0 0 0-5.9 5.9L3.5 14.5 6 17l5.1-5.1a4.5 4.5 0 0 0 5.9-5.9L14.2 8.8 12 6.6z" {...common} />
          <Path d="M15 15l5.5 5.5" {...common} />
        </>
      )}

      {name === "garden" && (
        <>
          <Path d="M12 21v-7" {...common} />
          <Path d="M12 14c-4 0-6-2.5-6-6 4 0 6 2.5 6 6z" {...common} />
          <Path d="M12 14c4 0 6-2.5 6-6-4 0-6 2.5-6 6z" {...common} />
        </>
      )}
    </Svg>
  );
}

// ---------------------------------------------------------------------
// Wayfinding marks used outside the service taxonomy
// ---------------------------------------------------------------------

export function ClockMark({ size = 16, color = "#5B5F57", strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} fill="none" />
      <Path d="M12 7v5.2l3.2 2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function PinMark({ size = 16, color = "#5B5F57", strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      <Circle cx={12} cy={10} r={2.6} stroke={color} strokeWidth={strokeWidth} fill="none" />
    </Svg>
  );
}

export function ShieldCheckMark({ size = 16, color = "#0FA47F", strokeWidth = 1.8 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2.8 19 5.5v6c0 4.6-3 8-7 9.7-4-1.7-7-5.1-7-9.7v-6z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M8.8 12.2 11 14.4l4.2-4.4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function StarMark({ size = 14, color = "#F5A524", filled = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2 6.6 20.1l1-6.1L3.2 9.7l6.1-.9z"
        fill={filled ? color : "none"}
        stroke={color}
        strokeWidth={filled ? 0 : 1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowMark({ size = 16, color = "#14151A", strokeWidth = 1.8, direction = "left" as "left" | "right" }) {
  const d = direction === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
