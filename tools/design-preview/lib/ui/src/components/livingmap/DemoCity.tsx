import React, { useMemo } from "react";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { livingPalette as P } from "./palette";

/**
 * THE DEMO CITY — an invented Israeli neighbourhood, at night.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS AND WHY IT IS ALLOWED TO
 * ---------------------------------------------------------------------
 * There is no maps vendor yet; picking one is a business decision
 * (/CLAUDE.md §4). ChatGPT's instruction was to draw no street until there
 * is one — and §11 forbids a stylised street drawing standing in for a map,
 * for a good reason: drawn streets promise geography the screen lacks.
 *
 * Amit overruled it with his eyes open:
 *
 *   "אני רואה את ההגבלות שאין מפות, אז מבחינתי כרגע תמציאו משהו שיראה
 *    ריאליזם וידמה כאילו עיר בישראל, לא משנה לי."
 *
 * So this is drawn, and three things keep it from being a lie:
 *
 * 1. It renders ONLY under the `DEMO_WORLD` adapter, whose type carries
 *    `illustrativeOnly: true`. Configure a real provider and this file is
 *    never reached.
 * 2. `livingMapViolations` refuses to place a real position over it, so a
 *    professional's actual location can never appear on invented streets —
 *    the one failure that would make this fiction convincing.
 * 3. The HUD says so once, quietly.
 *
 * ---------------------------------------------------------------------
 * WHAT MAKES IT READ AS ISRAEL IN HALF A SECOND
 * ---------------------------------------------------------------------
 * Not the street plan; every city has streets. It is the roofs. Israeli
 * blocks of flats carry solar panels and their water tanks, and nothing
 * else in the world looks like that from above. Then a boulevard with a
 * planted median and ficus trees, four storeys rather than towers, air
 * conditioners bolted to the flanks, a corner kiosk with its awning out,
 * a bus shelter.
 *
 * ---------------------------------------------------------------------
 * AND WHY IT IS ONE STATIC DRAWING
 * ---------------------------------------------------------------------
 * Nothing here animates. Movement in SVG means changing `d` or `cx`, which
 * runs on the JS thread and stutters exactly when the device is busy — and
 * this screen exists while dispatch is running. Every moving thing in the
 * Living Map is a sibling `Animated.View` on the native driver, over this.
 */

export interface DemoCityProps {
  width: number;
  height: number;
}

/** One block of flats, with the roof that gives the country away. */
function Block({
  x,
  y,
  w,
  h,
  floors,
  lit,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  floors: number;
  lit: number;
  tone: string;
}) {
  const winW = w / 5;
  const windows: React.ReactNode[] = [];
  let n = 0;
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < 3; c++) {
      const on = n < lit;
      n++;
      windows.push(
        <Rect
          key={`${r}-${c}`}
          x={x + winW * 0.55 + c * winW * 1.35}
          y={y + 10 + r * ((h - 16) / floors)}
          width={winW * 0.8}
          height={Math.max(3, (h - 18) / floors - 5)}
          rx={1.5}
          fill={on ? P.window : P.windowOff}
          opacity={on ? 0.92 : 0.5}
        />
      );
    }
  }

  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={2} fill={tone} />
      {/* a lit face, so the block has a light source rather than a flat fill */}
      <Rect x={x} y={y} width={w * 0.34} height={h} fill="#FFFFFF" opacity={0.045} />
      {windows}

      {/* balconies — the horizontal rhythm every Israeli block has */}
      {Array.from({ length: floors }).map((_, r) => (
        <Rect
          key={`b${r}`}
          x={x - 2}
          y={y + 8 + r * ((h - 16) / floors) + Math.max(3, (h - 18) / floors - 5)}
          width={w + 4}
          height={2}
          fill="#000000"
          opacity={0.22}
        />
      ))}

      {/*
        * THE ROOF: solar panels and their tanks. The single detail that
        * says Israel faster than any sign could, and the reason this reads
        * as a place rather than as "a city".
        */}
      <Rect x={x - 3} y={y - 4} width={w + 6} height={4} rx={1} fill={P.roofEdge} />
      <G opacity={0.95}>
        <Rect x={x + 4} y={y - 11} width={w * 0.34} height={7} rx={1} fill={P.solarPanel} />
        <Rect x={x + 6} y={y - 12} width={w * 0.3} height={1.5} fill="#FFFFFF" opacity={0.25} />
        <Rect x={x + w * 0.46} y={y - 13} width={9} height={9} rx={4.5} fill={P.solarTank} />
        <Rect x={x + w * 0.62} y={y - 10} width={w * 0.28} height={6} rx={1} fill={P.solarPanel} />
      </G>

      <Rect x={x + w - 6} y={y + h * 0.35} width={5} height={4} rx={1} fill={P.acUnit} />
      <Rect x={x + w - 6} y={y + h * 0.62} width={5} height={4} rx={1} fill={P.acUnit} />
    </G>
  );
}

function Ficus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <G>
      <Ellipse cx={x} cy={y + 2 * s} rx={9 * s} ry={2.6 * s} fill="#000000" opacity={0.25} />
      <Rect x={x - 1.4 * s} y={y - 9 * s} width={2.8 * s} height={10 * s} rx={1.2 * s} fill={P.trunk} />
      <Circle cx={x} cy={y - 15 * s} r={8 * s} fill={P.foliage} />
      <Circle cx={x - 4 * s} cy={y - 12 * s} r={5.5 * s} fill={P.foliageDark} />
      <Circle cx={x + 4 * s} cy={y - 13 * s} r={5 * s} fill={P.foliageLight} />
    </G>
  );
}

function StreetLamp({ x, y, h = 26 }: { x: number; y: number; h?: number }) {
  return (
    <G>
      <Rect x={x - 1} y={y - h} width={2} height={h} fill={P.lamp} />
      <Path d={`M ${x} ${y - h} q 0 -5 7 -5`} stroke={P.lamp} strokeWidth={2} fill="none" />
      <Circle cx={x + 7} cy={y - h - 5} r={3.4} fill={P.lampGlow} />
      <Path d={`M ${x + 7} ${y - h - 3} L ${x + 19} ${y} L ${x - 5} ${y} Z`} fill={P.lampGlow} opacity={0.1} />
    </G>
  );
}

export function DemoCity({ width, height }: DemoCityProps) {
  /**
   * The layout, from the viewport. A boulevard down the middle with a
   * planted median, two cross streets and a roundabout — the shape of
   * almost every neighbourhood built in Israel since the seventies.
   */
  const L = useMemo(
    () => ({
      boulevardX: width * 0.5,
      boulevardW: Math.max(46, width * 0.13),
      cross1Y: height * 0.3,
      cross2Y: height * 0.72,
      crossH: Math.max(26, height * 0.055),
      circleY: height * 0.51,
      circleR: Math.max(30, width * 0.085),
    }),
    [width, height]
  );

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="cityNight" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={P.nightTop} />
          <Stop offset="100%" stopColor={P.nightBottom} />
        </LinearGradient>
      </Defs>

      <Rect width={width} height={height} fill="url(#cityNight)" />

      {/* ---- roads ---- */}
      <Rect x={L.boulevardX - L.boulevardW / 2} y={0} width={L.boulevardW} height={height} fill={P.asphalt} />
      <Rect x={0} y={L.cross1Y} width={width} height={L.crossH} fill={P.asphalt} />
      <Rect x={0} y={L.cross2Y} width={width} height={L.crossH} fill={P.asphalt} />

      <Circle cx={L.boulevardX} cy={L.circleY} r={L.circleR} fill={P.asphalt} />
      <Circle cx={L.boulevardX} cy={L.circleY} r={L.circleR * 0.46} fill={P.median} />
      <Ficus x={L.boulevardX} y={L.circleY + 6} s={0.85} />

      {Array.from({ length: Math.ceil(height / 26) }).map((_, i) => {
        const y = i * 26;
        if (Math.abs(y - L.circleY) < L.circleR + 6) return null;
        return (
          <Line
            key={`lm${i}`}
            x1={L.boulevardX}
            y1={y}
            x2={L.boulevardX}
            y2={y + 12}
            stroke={P.laneMark}
            strokeWidth={1.6}
            opacity={0.5}
          />
        );
      })}

      {[0.06, 0.16, 0.82].map((f, i) => (
        <Rect
          key={`med${i}`}
          x={L.boulevardX - 4}
          y={height * f}
          width={8}
          height={height * 0.07}
          rx={4}
          fill={P.median}
        />
      ))}

      {[L.cross1Y, L.cross2Y].map((cy, i) =>
        Array.from({ length: 5 }).map((_, k) => (
          <Rect
            key={`z${i}-${k}`}
            x={L.boulevardX - L.boulevardW / 2 + 5 + k * (L.boulevardW / 5.6)}
            y={cy + (i === 0 ? L.crossH + 3 : -7)}
            width={L.boulevardW / 9}
            height={5}
            fill={P.laneMark}
            opacity={0.55}
          />
        ))
      )}

      {/* ---- the blocks ---- */}
      <Block x={width * 0.06} y={height * 0.09} w={width * 0.22} h={height * 0.15} floors={4} lit={7} tone={P.blockA} />
      <Block x={width * 0.7} y={height * 0.08} w={width * 0.24} h={height * 0.17} floors={4} lit={5} tone={P.blockB} />
      <Block x={width * 0.05} y={height * 0.4} w={width * 0.2} h={height * 0.17} floors={4} lit={9} tone={P.blockB} />
      <Block x={width * 0.72} y={height * 0.39} w={width * 0.22} h={height * 0.19} floors={5} lit={8} tone={P.blockA} />
      <Block x={width * 0.08} y={height * 0.81} w={width * 0.23} h={height * 0.14} floors={3} lit={4} tone={P.blockC} />
      <Block x={width * 0.69} y={height * 0.8} w={width * 0.24} h={height * 0.15} floors={4} lit={6} tone={P.blockB} />

      {/* ---- the corner kiosk, awning out ---- */}
      <G>
        <Rect x={width * 0.33} y={height * 0.19} width={width * 0.12} height={height * 0.05} rx={2} fill={P.kiosk} />
        <Rect x={width * 0.32} y={height * 0.185} width={width * 0.14} height={4} rx={2} fill={P.awning} />
        <Rect
          x={width * 0.345}
          y={height * 0.205}
          width={width * 0.09}
          height={height * 0.026}
          fill={P.window}
          opacity={0.85}
        />
      </G>

      {/* ---- a bus shelter ---- */}
      <G opacity={0.9}>
        <Rect x={width * 0.56} y={height * 0.63} width={width * 0.1} height={3} rx={1.5} fill={P.shelter} />
        <Rect x={width * 0.56} y={height * 0.63} width={2} height={height * 0.035} fill={P.shelter} />
        <Rect x={width * 0.655} y={height * 0.63} width={2} height={height * 0.035} fill={P.shelter} />
        <Rect
          x={width * 0.58}
          y={height * 0.638}
          width={width * 0.055}
          height={height * 0.02}
          fill={P.window}
          opacity={0.5}
        />
      </G>

      {/* ---- pavement trees and lamps ---- */}
      <Ficus x={width * 0.31} y={height * 0.42} />
      <Ficus x={width * 0.31} y={height * 0.6} s={0.9} />
      <Ficus x={width * 0.67} y={height * 0.33} s={0.95} />
      <Ficus x={width * 0.67} y={height * 0.86} />
      <Ficus x={width * 0.2} y={height * 0.68} s={0.8} />
      <StreetLamp x={width * 0.36} y={height * 0.5} />
      <StreetLamp x={width * 0.62} y={height * 0.24} />
      <StreetLamp x={width * 0.62} y={height * 0.78} />
      <StreetLamp x={width * 0.36} y={height * 0.93} />
    </Svg>
  );
}
