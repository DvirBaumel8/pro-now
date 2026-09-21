import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import {
  type NormalizedPoint,
  type WorldGeo,
  type WorldPlan,
  planWorld,
  spineOf,
} from "@pro-now/types";

import { scale, spacing, type } from "../../theme";
import { livingPalette } from "./palette";

/**
 * THE REAL STREET PLAN, DRAWN IN OUR OWN INK.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS INSTEAD OF
 * ---------------------------------------------------------------------
 * The obvious way to put a product on a real map is to render somebody
 * else's tiles and place markers over them. Amit ruled that out before it
 * was proposed, in the sentence that specified this whole change:
 *
 *     "במקום בתים אמיתיים יהיו את המבנים והדמויות שלנו? ורק הצורה של
 *      המפה תהיה אמיתית?"
 *
 * Yes — and that is not a compromise, it is the better build. A tile is a
 * photograph of a city at a fixed moment in somebody else's art direction;
 * the instant one is on screen our shopfronts are stickers on a postcard
 * and the night palette the whole world was designed in is gone. Geometry
 * is different. A road centreline is a fact with no styling attached, so it
 * can be true AND ours.
 *
 * So this component takes a `WorldGeo` — real ways, real areas, real
 * bounds — and paints it with `livingPalette`: the same asphalt, the same
 * night, the same lane markings as the illustrated plate. Stand it next to
 * the painting and it is recognisably the same city. Stand it next to the
 * real street and every junction is in the right place.
 *
 * ---------------------------------------------------------------------
 * WHY SVG AND NOT A CANVAS OR A TILE LAYER
 * ---------------------------------------------------------------------
 * A neighbourhood extract is a few hundred paths. That is a size SVG is
 * good at and a size where a canvas's imperative redraw would have to be
 * hand-tuned against the same Animated transforms everything else in this
 * folder already rides for free. The plate is drawn ONCE at world size and
 * then panned and zoomed by the existing camera, exactly like the painted
 * webp — so nothing above it learns that the ground changed.
 *
 * ---------------------------------------------------------------------
 * THE ORDER THINGS ARE PAINTED IN
 * ---------------------------------------------------------------------
 * Night, water, green, squares, then roads from the widest class down, then
 * kerbs, then lane markings, then plots on top of the lot. Plots last is
 * deliberate and it is the one place this differs from a cartographer: a
 * map draws buildings under the roads because the road matters. This is a
 * world, and the buildings are where the shops are, so they sit proud of
 * the ground the way the painted plate's do.
 */

export interface GeoPlateProps {
  geo: WorldGeo;
  /** The world box, in points — the same one `worldBox` returns. */
  width: number;
  height: number;
  /**
   * Show the extract's attribution line.
   *
   * ODbL is not a formality and `geoViolations` refuses an uncredited real
   * extract outright, but the credit still has to appear where somebody can
   * read it. A caller that renders its own credit line can turn this off;
   * a caller that turns it off and renders nothing has broken a licence.
   */
  attribution?: boolean;
  /** Draw the derived spine brighter, so the drivable street reads. */
  highlightSpine?: boolean;
}

/** A polyline as an SVG path, in the plate's own 0..1000 user space. */
function toPath(points: readonly NormalizedPoint[], sx: number, sy: number, close = false): string {
  if (points.length === 0) return "";
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(p.u * sx).toFixed(2)},${(p.v * sy).toFixed(2)}`)
    .join(" ");
  return close ? `${d} Z` : d;
}

/*
 * ROADS ARE STROKED, NOT FILLED.
 *
 * A carriageway is a centreline with a width, so a stroked path with
 * round joins gives correct junctions for free — two roads meeting produce
 * a filled corner rather than the notch a pair of filled polygons would.
 * The kerb is the same path stroked wider underneath, which is how a kerb
 * works in the world as well.
 */
const KERB_METRES = 2.6;

/**
 * THE ROAD IS THE BRIGHT THING.
 *
 * ---------------------------------------------------------------------
 * TWO WRONG VERSIONS, AND THE RULE THAT DECIDED THE THIRD
 * ---------------------------------------------------------------------
 * The first version painted the carriageway in `livingPalette.asphalt`
 * (#262238) on the night (#1D1A33): nine points of difference, so the
 * street network was invisible and the city read as an empty field.
 *
 * The second lifted the asphalt and added a pavement and a kerb either
 * side, which produced three pale bands of almost the same value stacked
 * on each other — a road drawn as a smear. Brightness was never the
 * problem; CONTRAST WITHIN THE ROAD was.
 *
 * The rule every legible night map follows, and it is the opposite of a
 * daylight one: at night you see the lit surfaces, so the ROADS are the
 * bright ribbons and the blocks between them are dark. The painted plate
 * gets this for free because its asphalt is a photograph with lamps in it.
 * Drawn as flat shapes it has to be said explicitly.
 *
 * So: carriageway lightest, pavement a step down from it, ground below
 * that, buildings darkest of all. Four values, in order, and the street
 * network is the first thing the eye finds.
 */
const ROAD_INK = {
  carriageway: "#403A5E",
  pavement: "#2B2742",
  plot: "#191630",
} as const;

export function GeoPlate({ geo, width, height, attribution = true, highlightSpine = true }: GeoPlateProps) {
  const plan: WorldPlan = useMemo(() => planWorld(geo), [geo]);
  const spineId = useMemo(() => spineOf(plan)?.id ?? null, [plan]);

  /*
   * A FIXED USER SPACE, NOT THE POINT SIZE.
   *
   * The plate is re-laid-out on every zoom step and on every rotation, and
   * rebuilding several hundred path strings each time is the one thing
   * that would make this drop frames. In a 0..1000 space the paths are
   * constant and only the viewBox-to-box mapping changes, so React sees
   * the same strings and the SVG scales on the GPU.
   */
  const S = 1000;
  const sy = S / plan.aspect;

  const { water, green, squares, plots, roadsByKind } = useMemo(() => {
    const byKind: Record<string, Array<{ id: string; d: string; halfWidth: number }>> = {
      ARTERIAL: [],
      STREET: [],
      SERVICE: [],
      PATH: [],
    };
    for (const w of plan.ways) {
      byKind[w.kind]!.push({ id: w.id, d: toPath(w.points, S, sy), halfWidth: w.halfWidth });
    }
    return {
      water: plan.areas.filter((a) => a.kind === "WATER").map((a) => toPath(a.ring, S, sy, true)),
      green: plan.areas.filter((a) => a.kind === "GREEN").map((a) => toPath(a.ring, S, sy, true)),
      squares: plan.areas.filter((a) => a.kind === "SQUARE").map((a) => toPath(a.ring, S, sy, true)),
      plots: plan.areas.filter((a) => a.kind === "PLOT").map((a) => toPath(a.ring, S, sy, true)),
      roadsByKind: byKind,
    };
  }, [plan, sy]);

  /* Widths in the fixed user space: a world unit is S wide. */
  const kerb = (halfWidth: number) => (halfWidth * 2 + kerbWorld(plan)) * S;
  const carriage = (halfWidth: number) => halfWidth * 2 * S;

  const order: Array<keyof typeof roadsByKind> = ["PATH", "SERVICE", "STREET", "ARTERIAL"];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${S} ${sy}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="geoNight" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={livingPalette.nightTop} />
            <Stop offset="1" stopColor={livingPalette.nightBottom} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={S} height={sy} fill="url(#geoNight)" />

        {water.map((d, i) => (
          <Path key={`w${i}`} d={d} fill={livingPalette.solarPanel} opacity={0.85} />
        ))}
        {green.map((d, i) => (
          <G key={`g${i}`}>
            <Path d={d} fill={livingPalette.foliageDark} opacity={0.9} />
            <Path d={d} fill="none" stroke={livingPalette.foliage} strokeWidth={2} />
          </G>
        ))}
        {squares.map((d, i) => (
          <Path key={`s${i}`} d={d} fill={livingPalette.blockB} opacity={0.9} />
        ))}

        {/*
          PAVEMENT, THEN KERB, THEN CARRIAGEWAY — three strokes of the same
          path, widest first.

          The first version drew two and the street vanished: in the night
          palette the asphalt (#262238) and the ground behind it (#1D1A33)
          are nine points apart, so a road was a slightly different shade of
          dark with a dashed line on it. A real street is legible at night
          because of its EDGES — a lit pavement either side and a kerb
          between — and that is what was missing, not brightness.

          Round caps and joins mean two roads meeting produce a filled
          corner rather than the notch a pair of polygons would leave.
        */}
        {order.map((kind) =>
          roadsByKind[kind]!.map((r) => (
            <Path
              key={`pv${r.id}`}
              d={r.d}
              fill="none"
              stroke={ROAD_INK.pavement}
              strokeWidth={kerb(r.halfWidth)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))
        )}
        {order.map((kind) =>
          roadsByKind[kind]!.map((r) => (
            <Path
              key={`k${r.id}`}
              d={r.d}
              fill="none"
              stroke={ROAD_INK.carriageway}
              strokeWidth={carriage(r.halfWidth)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))
        )}
        {/*
          LANE MARKINGS ONLY WHERE THERE ARE LANES.
          A dashed centre line down a 4m service lane is a drawing of a road
          that does not exist; the same line down an 11m avenue is the thing
          that makes it read as a road at all.
        */}
        {roadsByKind.ARTERIAL!.map((r) => (
          <Path
            key={`m${r.id}`}
            d={r.d}
            fill="none"
            stroke={livingPalette.laneMark}
            strokeWidth={Math.max(1, carriage(r.halfWidth) * 0.035)}
            strokeDasharray={`${carriage(r.halfWidth) * 0.5},${carriage(r.halfWidth) * 0.55}`}
            opacity={0.45}
          />
        ))}
        {highlightSpine && spineId
          ? roadsByKind.ARTERIAL!.filter((r) => r.id === spineId).map((r) => (
              <Path
                key={`sp${r.id}`}
                d={r.d}
                fill="none"
                stroke={livingPalette.lampGlow}
                strokeWidth={carriage(r.halfWidth) + 2}
                opacity={0.1}
                strokeLinecap="round"
              />
            ))
          : null}

        {/* The plots our shops stand on. */}
        {/*
          QUIET. Amit, about the painted plate: *"החנויות נראות אותו דבר
          ללא הבדל ולא מספיק בולטות."* Real extracts make that worse before
          they make it better — a neighbourhood has hundreds of buildings
          and eleven of them are ours, so drawn at full contrast the plots
          are a field of identical rectangles with our shopfronts lost in
          it. They are context: dark, low-contrast, no outline, and the
          only bright things in the world are the ones you can walk into.
        */}
        {plots.map((d, i) => (
          <Path
            key={`p${i}`}
            d={d}
            fill={ROAD_INK.plot}
            opacity={i % 3 === 0 ? 0.95 : i % 3 === 1 ? 0.8 : 0.65}
          />
        ))}

        {/*
          A FIXTURE MAY NOT PASS FOR A PLACE.

          `real: false` means this geometry is nowhere, and a picture of
          nowhere that looks like a picture of somewhere is the failure
          this whole change exists to avoid.

          The first version was a pill in a corner. It lasted one
          screenshot: at walking zoom the corner of the world is off
          screen, so the picture of nowhere was unlabelled exactly when
          somebody was looking at it, and where it WAS on screen it landed
          on the screen's own chrome. A watermark is tiled into the ground
          instead — it cannot be panned away from, it cannot collide with a
          control, and it scales with the city rather than with the phone.
        */}
        {/* Street lamps at the junctions of the spine, for warmth. */}
        {spineId
          ? plan.ways
              .filter((w) => w.id === spineId)
              .flatMap((w) =>
                w.points.map((p, i) => (
                  <Circle
                    key={`l${w.id}_${i}`}
                    cx={p.u * S}
                    cy={p.v * sy}
                    r={6}
                    fill={livingPalette.lampGlow}
                    opacity={0.12}
                  />
                ))
              )
          : null}
      </Svg>

      {!geo.real ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {watermarkRows(height).map((y) => (
            <Text key={`fx${y}`} style={[styles.watermark, { top: y }]}>
              שכונת בדיקה · לא מקום אמיתי
            </Text>
          ))}
        </View>
      ) : null}

      {attribution && geo.real && geo.attribution ? (
        <View style={styles.creditWrap} pointerEvents="none">
          <Text style={styles.credit}>{geo.attribution}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Where the fixture watermark repeats — in POINTS, not in the plate's
 * coordinate space.
 *
 * Two wrong versions before this one, and they were wrong in opposite
 * directions. A pill in the corner could be panned off screen, so the
 * picture of nowhere went unlabelled exactly while somebody was looking at
 * it. Text inside the SVG could not be panned away from, but it is drawn
 * in the plate's own space — and the plate is laid out at world size, two
 * and a half thousand points across, so nine units of type came out as
 * headline-sized orange Hebrew that buried the city it was captioning.
 *
 * A warning that cannot be seen past is as useless as one that can be
 * scrolled away. Points, tiled: eleven-point type every 190 points of
 * world, which is a couple of rows per screen at any zoom and legible at
 * none of them for longer than a glance.
 */
const WATERMARK_STEP = 190;

function watermarkRows(heightPoints: number): number[] {
  const rows: number[] = [];
  for (let y = 60; y < heightPoints; y += WATERMARK_STEP) rows.push(y);
  return rows;
}

/** The pavement either side of a carriageway, in world units. */
function kerbWorld(plan: WorldPlan): number {
  return plan.widthMetres === 0 ? 0 : (KERB_METRES * 2) / plan.widthMetres;
}

const styles = StyleSheet.create({
  watermark: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    ...type.caption,
    fontSize: 11,
    letterSpacing: 2,
    color: "rgba(232,114,76,0.28)",
    writingDirection: "rtl",
  },
  creditWrap: { position: "absolute", left: spacing.sm, bottom: spacing.xs },
  credit: {
    ...type.caption,
    fontSize: scale.micro,
    color: "rgba(247,243,250,0.45)",
    writingDirection: "rtl",
  },
});
