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
  | "garden"
  | "furniture"
  | "pest"
  | "glass"
  | "sealing"
  | "carpentry"
  | "tv"
  | "gas"
  | "solar"
  | "tiling"
  | "drywall"
  | "curtains"
  | "alarm"
  | "fitness"
  | "wellness"
  | "grooming"
  | "learning";

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

      {/* Flat-pack assembly: an allen key over a panel. */}
      {name === "furniture" && (
        <>
          <Rect x={3} y={6} width={12} height={12} rx={1.6} {...common} />
          <Line x1={3} y1={11} x2={15} y2={11} {...common} />
          <Path d="M17 6h4v4M21 6l-4.5 4.5" {...common} />
          <Path d="M16.5 10.5 15 18" {...common} />
        </>
      )}

      {/* Pest control: a spray canister, not an insect. Nobody wants a bug
          drawn on their home screen. */}
      {name === "pest" && (
        <>
          <Rect x={7} y={8} width={8} height={13} rx={2.4} {...common} />
          <Path d="M9.5 8V5.5h3V8" {...common} />
          <Path d="M15 6h3M15 9h4M15 12h2.5" {...common} />
          <Line x1={9.5} y1={13} x2={12.5} y2={13} {...common} />
        </>
      )}

      {name === "glass" && (
        <>
          <Rect x={3.5} y={3.5} width={17} height={17} rx={2} {...common} />
          <Line x1={12} y1={3.5} x2={12} y2={20.5} {...common} />
          <Line x1={3.5} y1={12} x2={20.5} y2={12} {...common} />
          <Path d="M15.5 6.5 19 10" {...common} />
        </>
      )}

      {/* Sealing / waterproofing: a drop stopped by a surface. */}
      {name === "sealing" && (
        <>
          <Path d="M12 3s5 5.6 5 9a5 5 0 0 1-10 0c0-3.4 5-9 5-9z" {...common} />
          <Line x1={3} y1={21} x2={21} y2={21} {...common} />
        </>
      )}

      {name === "carpentry" && (
        <>
          <Path d="M3 17.5 13 7.5l3.5 3.5L6.5 21z" {...common} />
          <Path d="M13 7.5 16.5 4l3.5 3.5L16.5 11" {...common} />
          <Line x1={5} y1={19.5} x2={8} y2={16.5} {...common} />
        </>
      )}

      {/* Screen / antenna work. */}
      {name === "tv" && (
        <>
          <Rect x={3} y={4} width={18} height={12} rx={2.2} {...common} />
          <Line x1={9} y1={20} x2={15} y2={20} {...common} />
          <Line x1={12} y1={16} x2={12} y2={20} {...common} />
        </>
      )}

      {name === "gas" && (
        <>
          <Path d="M12 3c0 3-3 4-3 7a3 3 0 0 0 6 0c0-1.4-.8-2.3-1.5-3.2" {...common} />
          <Path d="M7 13a5.5 5.5 0 0 0 10 0" {...common} />
          <Rect x={8} y={17} width={8} height={4} rx={1.4} {...common} />
        </>
      )}

      {name === "solar" && (
        <>
          <Path d="M4 16h16l-2-9H6z" {...common} />
          <Line x1={9} y1={7} x2={8} y2={16} {...common} />
          <Line x1={15} y1={7} x2={16} y2={16} {...common} />
          <Line x1={5} y1={11.5} x2={19} y2={11.5} {...common} />
          <Line x1={12} y1={16} x2={12} y2={21} {...common} />
        </>
      )}

      {name === "tiling" && (
        <>
          <Rect x={3} y={3} width={7.5} height={7.5} rx={1.2} {...common} />
          <Rect x={13.5} y={3} width={7.5} height={7.5} rx={1.2} {...common} />
          <Rect x={3} y={13.5} width={7.5} height={7.5} rx={1.2} {...common} />
          <Rect x={13.5} y={13.5} width={7.5} height={7.5} rx={1.2} {...common} />
        </>
      )}

      {/* Plaster / drywall: a trowel. */}
      {name === "drywall" && (
        <>
          <Path d="M3 14 14 3l7 7-11 11z" {...common} />
          <Line x1={10} y1={7} x2={17} y2={14} {...common} />
        </>
      )}

      {name === "curtains" && (
        <>
          <Line x1={3} y1={4} x2={21} y2={4} {...common} />
          <Path d="M7 4v13c0 2-1 3-2 3M17 4v13c0 2 1 3 2 3" {...common} />
          <Path d="M7 4c2 4 2 10 0 16M17 4c-2 4-2 10 0 16" {...common} />
        </>
      )}

      {/* A dumbbell. Not a running figure: most of what happens here is
          strength work in a living room, not a jog. */}
      {name === "fitness" && (
        <>
          <Line x1={9} y1={12} x2={15} y2={12} {...common} />
          <Rect x={5.5} y={8.5} width={3.5} height={7} rx={1.2} {...common} />
          <Rect x={15} y={8.5} width={3.5} height={7} rx={1.2} {...common} />
          <Line x1={3} y1={10.5} x2={3} y2={13.5} {...common} />
          <Line x1={21} y1={10.5} x2={21} y2={13.5} {...common} />
        </>
      )}

      {/* A folded treatment table. A body outline would put a person on the
          home screen; the equipment says the same thing without one. */}
      {name === "wellness" && (
        <>
          <Rect x={3} y={8} width={18} height={5} rx={2} {...common} />
          <Path d="M6 13v6M18 13v6" {...common} />
          <Path d="M9 5.5c0 1.2-1 1.6-1 2.5M15 5.5c0 1.2-1 1.6-1 2.5" {...common} />
        </>
      )}

      {name === "grooming" && (
        <>
          <Circle cx={6} cy={17.5} r={2.6} {...common} />
          <Circle cx={6} cy={6.5} r={2.6} {...common} />
          <Path d="M8.3 8.3 19 19M8.3 15.7 19 5" {...common} />
        </>
      )}

      {name === "learning" && (
        <>
          <Path d="M12 6.5 3.5 9.8 12 13l8.5-3.2z" {...common} />
          <Path d="M6.5 11.3V16c0 1.6 2.5 2.8 5.5 2.8s5.5-1.2 5.5-2.8v-4.7" {...common} />
          <Line x1={20.5} y1={9.8} x2={20.5} y2={14} {...common} />
        </>
      )}

      {name === "alarm" && (
        <>
          <Path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" {...common} />
          <Circle cx={12} cy={11} r={2.4} {...common} />
          <Line x1={12} y1={13.4} x2={12} y2={16} {...common} />
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
