import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/**
 * Tab-bar glyphs.
 *
 * Separate from `Mark` on purpose. `Mark` is the SERVICE library — a broom
 * means cleaning, a bolt means electrical work. The tab bar is navigation,
 * and borrowing a service mark for it makes the bar say something about
 * trades that it does not mean: the professional's tab bar was showing a
 * broom for "משמרת" and the same broom again for "מאומת", because two
 * different tabs had been mapped onto one service icon.
 *
 * Six shapes, each used for exactly one destination, so the bar can be read
 * without reading the labels.
 */
export type NavGlyphName =
  | "home"
  | "list"
  | "person"
  | "wallet"
  | "shield"
  | "clock";

export function NavGlyph({
  name,
  size = 22,
  color = "#5A5266",
  strokeWidth = 1.9,
}: {
  name: NavGlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const c = {
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      {name === "home" && (
        <>
          <Path d="M3.5 10.5 12 3.5l8.5 7" {...c} />
          <Path d="M5.5 9.5V20h13V9.5" {...c} />
          <Path d="M9.8 20v-5.2h4.4V20" {...c} />
        </>
      )}
      {name === "list" && (
        <>
          <Path d="M8.5 6.5h11M8.5 12h11M8.5 17.5h11" {...c} />
          <Circle cx={4.5} cy={6.5} r={1.4} {...c} />
          <Circle cx={4.5} cy={12} r={1.4} {...c} />
          <Circle cx={4.5} cy={17.5} r={1.4} {...c} />
        </>
      )}
      {name === "person" && (
        <>
          <Circle cx={12} cy={8} r={3.8} {...c} />
          <Path d="M4.8 20c0-3.6 3.2-6 7.2-6s7.2 2.4 7.2 6" {...c} />
        </>
      )}
      {name === "wallet" && (
        <>
          <Rect x={3} y={6} width={18} height={13} rx={3} {...c} />
          <Path d="M3 10h18" {...c} />
          <Circle cx={16.5} cy={14.5} r={1.5} {...c} />
        </>
      )}
      {name === "shield" && (
        <>
          <Path d="M12 3 19 5.8v5.4c0 4.4-2.9 7.7-7 9.3-4.1-1.6-7-4.9-7-9.3V5.8z" {...c} />
          <Path d="M8.8 12.2 11 14.4l4.2-4.4" {...c} />
        </>
      )}
      {name === "clock" && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...c} />
          <Path d="M12 6.8V12l3.4 2.1" {...c} />
        </>
      )}
    </Svg>
  );
}
