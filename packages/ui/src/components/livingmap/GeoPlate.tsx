import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import {
  type NormalizedPoint,
  type WorldGeo,
  type WorldPlan,
  geoWidthMetres,
  groundProject,
  groundScale,
  pitchForMetres,
  planWorld,
  spineOf,
} from "@pro-now/types";

import { scale, spacing, type } from "../../theme";
import { dressGeo, projectDressing } from "./geoDressing";
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
  /**
   * HOW MUCH OF THE PLACE IS IN FRAME, IN METRES.
   *
   * Decides the tilt — see `pitchForMetres`. Close up the ground is the
   * world's own 3/4 and you are in the street; pulled back it flattens to
   * a plan and you are reading a map. One camera, one continuous ramp,
   * which is both ChatGPT's recommendation and the answer to Amit's
   * *"שיהיה אפשרות להגדיל את המפה ולראות מרחוק... שאדע לאן יש לי ללכת"*.
   *
   * Left out, the extract's full width, which is a plan — the honest
   * default for a caller that has not said how close it is standing.
   */
  metresAcross?: number;
  /**
   * THE PAINTED CITY IS UNDERNEATH, SO DO NOT DRAW ONE.
   *
   * -------------------------------------------------------------------
   * THE MISTAKE THIS PROP EXISTS TO UNDO
   * -------------------------------------------------------------------
   * Amit, after three rounds of tuning the drawn version:
   *
   *     "זה לא מספיק. מעדיף כבר את המפה הקודמת שעשינו. אני לא יכול עם
   *      המסך הכהה הזה. איפה העולם הקסום שבנינו?"
   *
   * He is right and the error was strategic rather than one of degree. I
   * was redrawing the city out of polygons and grading my way towards a
   * painting, and a few hundred flat shapes will never arrive there —
   * the plate has texture, bounced light and a hundred hours of
   * illustration in it. Each pass got closer and closer to something
   * nobody wanted.
   *
   * His own brief already said what to do, twice, and I read it as being
   * about buildings instead of about the material:
   *
   *     "לא מעניין אותי המבנים האמיתיים, רק הצורה של העיר, ועליה להלביש
   *      את העיר שלנו."
   *
   * So the painting stays the material and the extract contributes ONLY
   * the shape: the real street network is carved through the painted
   * city, with its own kerbs, lamps, trees and crossings, and the blocks
   * between the roads are the artwork we already have. Nothing is drawn
   * that the painting can draw better.
   */
  paintedGround?: boolean;
  /**
   * The city's own furniture: trees, lamps, lit windows, crossings.
   *
   * On by default, and it is not decoration in the dismissible sense.
   * Amit on the undressed version: *"חייב להטמיע את העיצוב שלנו במפה
   * האמיתית, שלא תהיה אפלה ככה. זה כל מה שבניתי עליו."* A street plan
   * with the lights off is a diagram; see `geoDressing.ts`.
   */
  dressed?: boolean;
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
  /*
   * AND THEN WARMED, WHICH IS A SEPARATE FIX FROM BRIGHTENED.
   *
   * Amit: *"חייב להטמיע את העיצוב שלנו במפה האמיתית, שלא תהיה אפלה ככה.
   * זה כל מה שבניתי עליו."* The values above were in order and the plate
   * was still not our city, because every one of them was a cold blue-
   * violet. The painted street is lit by sodium: the pavement is warm
   * stone, the asphalt takes the warmth back off it, and the contrast
   * between the two is as much in TEMPERATURE as in value. A correct
   * greyscale ramp in the wrong hue is a diagram of our city rather than
   * our city.
   */
  carriageway: "#46405F",
  /** Warm stone under a lamp, which is what a pavement is at night. */
  pavement: "#4A4056",
  /** Where the kerb catches the light. */
  kerb: "#6A5C6E",
  /*
   * ASPHALT OVER THE PAINTING IS A DIFFERENT COLOUR FROM ASPHALT ON ITS
   * OWN. On the night gradient a road has to be the LIGHTEST thing to be
   * found at all; over a lamp-lit painting it has to be the darkest, or
   * it reads as a grey ribbon laid on top of the city rather than as a
   * street cut through it. Warm, because the lamps either side of it are.
   */
  paintedAsphalt: "#2F2839",
  /** Blocks stay cool and dark so the lit street sits in front of them. */
  plot: "#1B1830",
  /** The façade: in shadow, but warm, because it faces a lit street. */
  wall: "#272138",
  /** The roof, catching what light there is from above. */
  plotRoof: "#342C46",
  roofEdge: "#4E4362",
  /** What a block drops on the pavement behind it. */
  blockShadow: "#100D1E",
} as const;

export function GeoPlate({
  geo,
  width,
  height,
  attribution = true,
  highlightSpine = true,
  metresAcross,
  dressed = true,
  paintedGround = false,
}: GeoPlateProps) {
  const plan: WorldPlan = useMemo(() => planWorld(geo), [geo]);
  const spineId = useMemo(() => spineOf(plan)?.id ?? null, [plan]);
  const pitch = useMemo(
    () => pitchForMetres(metresAcross ?? geoWidthMetres(geo.bounds)),
    [geo.bounds, metresAcross]
  );

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

  /*
   * EVERY DRAWN POINT GOES THROUGH THE SAME GROUND PLANE.
   *
   * Not a transform on the layer — see `groundProject`, which explains
   * why. The consequence here is that a road's WIDTH is no longer one
   * number: a carriageway eleven metres wide is eleven metres at the
   * near edge and seven at the horizon, because that is what a tilted
   * plane does. Stroking it at a constant width would give a road that
   * converges in its centreline and not in its kerbs, which is the
   * uncanny half-perspective every cheap map has.
   *
   * So a way is split into short runs and each run is stroked at its own
   * depth's width. Ten runs is enough for the eye at any zoom this world
   * reaches, and it keeps the node count in the hundreds.
   */
  const { water, green, squares, plots, roadsByKind } = useMemo(() => {
    const gp = (n: NormalizedPoint) => groundProject(n, pitch);
    const byKind: Record<string, Array<{ id: string; d: string; halfWidth: number }>> = {
      ARTERIAL: [],
      STREET: [],
      SERVICE: [],
      PATH: [],
    };
    for (const w of plan.ways) {
      for (const run of splitByDepth(w.points, pitch)) {
        byKind[w.kind]!.push({
          id: `${w.id}_${run.key}`,
          d: toPath(run.points.map(gp), S, sy),
          halfWidth: w.halfWidth * run.scale,
        });
      }
    }
    const ring = (pts: readonly NormalizedPoint[]) => toPath(pts.map(gp), S, sy, true);
    return {
      water: plan.areas.filter((a) => a.kind === "WATER").map((a) => ring(a.ring)),
      green: plan.areas.filter((a) => a.kind === "GREEN").map((a) => ring(a.ring)),
      squares: plan.areas.filter((a) => a.kind === "SQUARE").map((a) => ring(a.ring)),
      plots: plan.areas.filter((a) => a.kind === "PLOT").map((a) => ring(a.ring)),
      roadsByKind: byKind,
    };
  }, [plan, sy, pitch]);

  const dressing = useMemo(
    () => (dressed ? projectDressing(dressGeo(plan), pitch) : null),
    [plan, pitch, dressed]
  );

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

        {paintedGround ? null : <Rect x={0} y={0} width={S} height={sy} fill="url(#geoNight)" />}

        {(paintedGround ? [] : water).map((d, i) => (
          <Path key={`w${i}`} d={d} fill={livingPalette.solarPanel} opacity={0.85} />
        ))}
        {(paintedGround ? [] : green).map((d, i) => (
          <G key={`g${i}`}>
            <Path d={d} fill={livingPalette.foliageDark} opacity={0.9} />
            <Path d={d} fill="none" stroke={livingPalette.foliage} strokeWidth={2} />
          </G>
        ))}
        {(paintedGround ? [] : squares).map((d, i) => (
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
        {/*
          OVER A PAINTING THE PAVEMENT IS A LIT EDGE, NOT A SLAB.

          Painted over the artwork, a solid pavement stroke erases the
          city either side of every road — which is the whole reason the
          painting is underneath. So the outer stroke is a soft warm
          glow: the light a kerb throws onto the buildings beside it,
          letting the artwork show through it.
        */}
        {order.map((kind) =>
          roadsByKind[kind]!.map((r) => (
            <Path
              key={`pv${r.id}`}
              d={r.d}
              fill="none"
              stroke={paintedGround ? livingPalette.lampGlow : ROAD_INK.pavement}
              strokeWidth={kerb(r.halfWidth) * (paintedGround ? 1.5 : 1)}
              opacity={paintedGround ? 0.12 : 1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))
        )}
        {paintedGround
          ? order.map((kind) =>
              roadsByKind[kind]!.map((r) => (
                <Path
                  key={`pw${r.id}`}
                  d={r.d}
                  fill="none"
                  stroke={ROAD_INK.pavement}
                  strokeWidth={kerb(r.halfWidth)}
                  opacity={0.55}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))
            )
          : null}
        {order.map((kind) =>
          roadsByKind[kind]!.map((r) => (
            <Path
              key={`k${r.id}`}
              d={r.d}
              fill="none"
              stroke={paintedGround ? ROAD_INK.paintedAsphalt : ROAD_INK.carriageway}
              strokeWidth={carriage(r.halfWidth)}
              opacity={paintedGround ? 0.9 : 1}
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
          ? roadsByKind.ARTERIAL!.filter((r) => r.id.startsWith(`${spineId}_`)).map((r) => (
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
        {/*
          BUILDINGS, AS MASSES.

          Wall first at the footprint, then the roof lifted above it, so
          the band between the two IS the façade — a box seen from the
          world's own 3/4 rather than a polygon lying on a plan. See
          `geoDressing.ts`; the flat version was the single biggest
          reason the real map read as a diagram.
        */}
        {paintedGround
          ? null
          : dressing
          ? dressing.blocks.map((b) => (
              <G key={`b${b.id}`}>
                {/* Grounding. Without it a block floats over the
                    pavement it is supposed to be standing on. */}
                <Path
                  d={toPath(b.foot.map((q) => ({ u: q.u + b.rise * 0.18, v: q.v + b.rise * 0.16 })), S, sy, true)}
                  fill={ROAD_INK.blockShadow}
                  opacity={0.55}
                />
                <Path d={toPath(b.foot, S, sy, true)} fill={ROAD_INK.wall} />
                <Path d={toPath(b.roof, S, sy, true)} fill={ROAD_INK.plotRoof} />
                <Path
                  d={toPath(b.roof, S, sy, true)}
                  fill="none"
                  stroke={ROAD_INK.roofEdge}
                  strokeWidth={1}
                  opacity={0.55}
                />
                {b.roofThings.map((t, k) =>
                  t.kind === "TANK" ? (
                    <Circle
                      key={`rt${k}`}
                      cx={t.at.u * S}
                      cy={t.at.v * sy}
                      r={Math.max(1, t.r * S * 0.8)}
                      fill={livingPalette.solarTank}
                      opacity={0.75}
                    />
                  ) : t.kind === "PANEL" ? (
                    <Rect
                      key={`rt${k}`}
                      x={(t.at.u - t.r * 1.5) * S}
                      y={(t.at.v - t.r * 0.5) * sy}
                      width={Math.max(1.4, t.r * 3 * S)}
                      height={Math.max(1, t.r * sy)}
                      fill={livingPalette.solarPanel}
                      opacity={0.85}
                    />
                  ) : (
                    <Rect
                      key={`rt${k}`}
                      x={(t.at.u - t.r * 0.6) * S}
                      y={(t.at.v - t.r * 0.6) * sy}
                      width={Math.max(1, t.r * 1.2 * S)}
                      height={Math.max(1, t.r * 1.2 * sy)}
                      fill={livingPalette.acUnit}
                      opacity={0.6}
                      rx={0.6}
                    />
                  )
                )}
              </G>
            ))
          : plots.map((d, i) => (
              <Path key={`p${i}`} d={d} fill={ROAD_INK.plot} opacity={0.9 - (i % 3) * 0.1} />
            ))}

        {/*
          THE CITY'S OWN FURNITURE.

          Trees, lamps, lit windows and crossings, all computed from the
          real geometry — see `geoDressing.ts`. This is the part Amit was
          asking for: *"חייב להטמיע את העיצוב שלנו במפה האמיתית."* The
          geometry was never the thing that was missing.

          Drawn after the plots so a canopy overhangs a façade, which is
          what a street tree does, and before the shopfronts, which belong
          to the layers above this one.
        */}
        {dressing ? (
          <>
            {dressing.crossings.map((c, i) => {
              const n = { u: -c.along.v, v: c.along.u };
              const bars = 5;
              return (
                <G key={`x${i}`}>
                  {Array.from({ length: bars }, (_, k) => {
                    const t = (k - (bars - 1) / 2) * c.halfWidth * 0.42;
                    const ax = (c.at.u + c.along.u * t) * S;
                    const ay = (c.at.v + c.along.v * t) * sy;
                    return (
                      <Path
                        key={k}
                        d={`M${(ax - n.u * c.halfWidth * S).toFixed(2)},${(ay - n.v * c.halfWidth * sy).toFixed(2)} L${(ax + n.u * c.halfWidth * S).toFixed(2)},${(ay + n.v * c.halfWidth * sy).toFixed(2)}`}
                        stroke={livingPalette.laneMark}
                        strokeWidth={Math.max(1, c.halfWidth * S * 0.16)}
                        opacity={0.3}
                        strokeLinecap="butt"
                      />
                    );
                  })}
                </G>
              );
            })}

            {/* Lamp pools first — the trees and the windows sit in them. */}
            {dressing.lamps.map((l, i) => (
              <Circle
                key={`lg${i}`}
                cx={l.at.u * S}
                cy={l.at.v * sy}
                r={l.r * S}
                fill={livingPalette.lampGlow}
                opacity={0.11}
              />
            ))}
            {dressing.lamps.map((l, i) => (
              <Circle
                key={`lp${i}`}
                cx={l.at.u * S}
                cy={l.at.v * sy}
                r={Math.max(1.1, l.r * S * 0.12)}
                fill={livingPalette.lampGlow}
                opacity={0.85}
              />
            ))}

            {/* Lit windows. Four amber squares turn a footprint into a
                building with people in it, and cost four nodes. */}
            {/* A halo on the lit ones, so the façade glows rather than
                being speckled. Cheap: one extra rect, no filter.
                Over a painting there are no drawn façades to light. */}
            {(paintedGround ? [] : dressing.windows).map((w, i) =>
              w.lit ? (
                <Rect
                  key={`wg${i}`}
                  x={(w.at.u - w.w * 1.1) * S}
                  y={(w.at.v - w.up - w.h * 1.1) * sy}
                  width={Math.max(1.6, w.w * 2.2 * S)}
                  height={Math.max(1.6, w.h * 2.2 * sy)}
                  fill={livingPalette.window}
                  opacity={0.12}
                  rx={1.2}
                />
              ) : null
            )}
            {(paintedGround ? [] : dressing.windows).map((w, i) => (
              <Rect
                key={`wn${i}`}
                x={(w.at.u - w.w / 2) * S}
                y={(w.at.v - w.up - w.h / 2) * sy}
                width={Math.max(0.8, w.w * S)}
                height={Math.max(0.8, w.h * sy)}
                fill={w.lit ? livingPalette.window : livingPalette.windowOff}
                opacity={w.lit ? 0.95 : 0.2}
                rx={0.5}
              />
            ))}

            {/* Trees last of the ground dressing, so a canopy overhangs
                the kerb and the windows behind it. */}
            {dressing.trees.map((t, i) => (
              <G key={`tr${i}`}>
                {/*
                  A CANOPY IS A DARK MASS WITH A LIT TOP, NOT A GREEN DOT.
                  The first version drew a flat mid-green circle and the
                  street filled with what looked like markers. The
                  painting's trees are almost black in the shade with one
                  lit edge where the lamp reaches them — so: shadow,
                  dark body, one small highlight off-centre.
                */}
                <Circle
                  cx={t.at.u * S}
                  cy={t.at.v * sy + t.r * sy * 0.45}
                  r={t.r * S * 0.75}
                  fill="#0B0917"
                  opacity={0.5}
                />
                <Circle
                  cx={t.at.u * S}
                  cy={t.at.v * sy}
                  r={t.r * S}
                  fill={t.tone === 2 ? livingPalette.foliage : livingPalette.foliageDark}
                  opacity={0.92}
                />
                <Circle
                  cx={t.at.u * S - t.r * S * 0.3}
                  cy={t.at.v * sy - t.r * sy * 0.34}
                  r={t.r * S * 0.36}
                  fill={livingPalette.foliageLight}
                  opacity={t.tone === 0 ? 0.3 : 0.5}
                />
              </G>
            ))}
          </>
        ) : null}

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

/**
 * A way cut into runs of roughly equal depth, each with its own scale.
 *
 * On a tilted plane a road narrows with distance. One stroke at one width
 * gives a road whose centreline converges and whose kerbs do not — the
 * uncanny half-perspective. Runs fix it, and the runs OVERLAP by a point
 * so no seam shows where two widths meet.
 */
function splitByDepth(
  points: readonly NormalizedPoint[],
  pitch: number
): Array<{ key: string; points: NormalizedPoint[]; scale: number }> {
  if (pitch <= 0 || points.length < 2) {
    return [{ key: "flat", points: [...points], scale: 1 }];
  }
  const BANDS = 8;
  const band = (v: number) => Math.max(0, Math.min(BANDS - 1, Math.floor(v * BANDS)));
  const out: Array<{ key: string; points: NormalizedPoint[]; scale: number }> = [];
  let run: NormalizedPoint[] = [points[0]!];
  let current = band(points[0]!.v);
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    const b = band(p.v);
    run.push(p);
    if (b !== current) {
      out.push({ key: `${out.length}`, points: run, scale: groundScale((current + 0.5) / BANDS, pitch) });
      // Overlap by the shared point, so the widths butt rather than gap.
      run = [p];
      current = b;
    }
  }
  if (run.length >= 2) {
    out.push({ key: `${out.length}`, points: run, scale: groundScale((current + 0.5) / BANDS, pitch) });
  }
  return out.length > 0 ? out : [{ key: "flat", points: [...points], scale: 1 }];
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
