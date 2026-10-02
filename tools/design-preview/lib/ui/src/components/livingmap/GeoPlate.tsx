import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

import {
  type NormalizedPoint,
  type WorldGeo,
  type WorldPlan,
  geoWidthMetres,
  groundProject,
  metresToWorld,
  groundScale,
  pitchForMetres,
  planWorld,
  spineOf,
} from "@pro-now/demo-types";

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
   * WHETHER THE CITY BREATHES.
   *
   * Amit: *"תגיעו לתוצאה המושלמת של העיר שלנו על מפה אמיתית ותנועתיות."*
   * The ambient world — couriers, vans, walkers — is switched off on a
   * real street, because each of those has an IDENTITY and an identity on
   * a real street is a claim about an address. What is left is the kind
   * of movement that is about nobody: the lamps breathing and a breeze
   * going through the trees. See `AMBIENT_KINDS` in `geo-truth.ts`, which
   * is where the line between the two is drawn and tested.
   *
   * Two drivers for the whole plate, both on the native driver, both
   * animating a GROUP rather than each of two hundred nodes — a city that
   * costs two interpolations to be alive.
   */
  animate?: boolean;
  /**
   * Whether to scatter trees, lamps and their light over the ground.
   *
   * Left out, it follows `paintedGround`: off over a painted scene, on
   * over anything else. A MATERIAL ground — see `GROUND_MATERIAL_IDS` —
   * is the case that needs both: a painting underneath AND the props on
   * top, because the material deliberately contains nothing.
   */
  drawProps?: boolean;
  /**
   * A STONE PAVEMENT TO LAY ALONG THE REAL ROADS.
   *
   * -------------------------------------------------------------------
   * THE COMPOSITE THAT ENDS THE ARGUMENT
   * -------------------------------------------------------------------
   * Two grounds, each good at the half the other is bad at. The painted
   * plate is a city with light and depth in it and it has a road drawn
   * through it that fights the real one. A material tile is correct,
   * seamless and empty — a city with no buildings, which is the version
   * Amit rejected as *"המסך הכהה הזה"*.
   *
   * Neither has to win. The painted plate goes down as the ground, so
   * the blocks between the streets are that city; the real road corridor
   * is then laid over it in stone, which covers the painted road exactly
   * where the real one runs. What is left of the plate's own road reads
   * as a courtyard or a back lane, which is what those spaces are.
   *
   * Given as an SVG pattern rather than an image layer so it follows the
   * road's own stroke — the pavement is the road's shape, and anything
   * that has to be masked into that shape separately will one day be
   * masked slightly wrong.
   */
  paveSource?: { uri: string } | null;
  /** How much real ground one repeat of `paveSource` covers. */
  paveMetres?: number;
  /** Planted ground for the parks. Same idea as `paveSource`. */
  grassSource?: { uri: string } | null;
  /**
   * OUR OWN TREES AND LAMPS ON THE REAL MAP.
   *
   * Amit: *"במקום נקודות וריבועים — עצים ומנורות, להשתמש במה שיש לנו."*
   * Where the world's own palm and lamp art is available it stands on
   * the real street instead of the drawn lobes and dots.
   */
  treeSource?: { uri: string } | null;
  lampSource?: { uri: string } | null;
  /**
   * OUR BUILDINGS ON THE REAL BLOCKS.
   *
   * Amit: *"שיראה שהוואן והעולם שלנו הוא המפה האמיתית, מושתל על המפות
   * האמיתיות."* Where the city's own isometric buildings are available,
   * each real footprint carries one of them — chosen by the block's id,
   * so the same block always shows the same building — instead of a dark
   * box. The street network, and so the route, stays the real one.
   */
  buildingSources?: ReadonlyArray<{ uri: string }>;
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
/**
 * PLANTING, WHICH IS A DIFFERENT GREEN FROM FOLIAGE.
 *
 * `livingPalette.foliage` is a canopy seen from the side, lit from
 * above — far too saturated for ground cover, where it reads as a
 * highlighter stripe. Grass at night is almost grey, and what makes it
 * read as grass is the warmer edge where the pavement lighting reaches
 * it rather than the colour of the middle.
 */
const GREEN_INK = {
  /*
   * DESATURATED TOWARDS THE CITY.
   *
   * A park is not a green patch on a grey map; it is a dark block with
   * planting in it, like every other block, and the only thing that says
   * "green" from above is the hue being slightly off neutral. Saturated,
   * it was the brightest thing on the wide shot — which is a place
   * nobody is going, outranking eleven places somebody might.
   */
  grass: "#1C2D24",
  verge: "#3E7255",
  /* Undergrowth close up; the thing that makes a park read far away. */
  mass: "#274A37",
  massDark: "#15241C",
} as const;

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
  /*
   * THE ROOF, AND WHY IT GOT DARKER.
   *
   * At walking distance a pale roof is a building catching the street
   * lighting. Pulled back to the whole neighbourhood there are two
   * hundred of them, and pale roofs make a field of grey rectangles with
   * our shopfronts somewhere in it. The city has to be DARK for the lit
   * things — the windows, the lamps, our shops — to be the ones the eye
   * finds. Same rule as the plots, one level of light up.
   */
  plotRoof: "#2A2440",
  roofEdge: "#3D3656",
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
  animate = true,
  drawProps,
  paveSource = null,
  paveMetres = 14,
  grassSource = null,
  treeSource = null,
  lampSource = null,
  buildingSources = [],
}: GeoPlateProps) {
  /*
   * PROPS FOLLOW THE GROUND, NOT THE MODE.
   *
   * Over the scene plate there is nothing to add — it has better palms
   * than any circle this file can draw. Over a MATERIAL ground there is
   * nothing but stone, and the trees, lamps and benches are what turn it
   * back into our city. So the default is "draw them unless a painted
   * scene is underneath", and the material path overrides it.
   */
  const props = drawProps ?? !paintedGround;
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
  /* One repeat of the paving, in the plate's own user space. */
  const paveTile = Math.max(8, metresToWorld(geo.bounds, paveMetres) * S);

  /*
   * ---------------------------------------------------------------------
   * HOW MUCH TREE IS WORTH DRAWING
   * ---------------------------------------------------------------------
   * A canopy is a shadow, five lobes and up to five highlights: eleven
   * nodes, which is right when it is forty points across and absurd when
   * it is three. With three hundred trees that is 3,300 of the 3,900 SVG
   * nodes this plate produces, and react-native-svg on a mid-range
   * Android does not draw four thousand nodes while the camera is moving.
   *
   * The props only appear over the MATERIAL, which only appears when the
   * camera has pulled back — so in practice every drawn tree is small.
   * Past this distance it becomes a shadow and one disc, which is what it
   * looks like anyway, and the plate drops to about a thousand nodes.
   */
  const detailedTrees = (metresAcross ?? 0) <= 220;


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

  /*
   * WHAT IS LEFT OF PLANTING WHEN YOU STAND BACK.
   *
   * Amit, on the wide shot: *"הפארקים עדיין במבט רחוק לא טובים."*
   *
   * At two hundred and eighty metres across a four-metre canopy is about
   * five points wide, and there are three hundred of them. Drawn as a
   * disc each — with a dark contact shadow under each — the screen got a
   * fine green speckle over the pavements, the roads and the roofs
   * alike. It reads as mould on the city, and it is worst in the parks,
   * because that is where the discs are densest and where they cover the
   * one shape that was supposed to be legible.
   *
   * The fix is not a better disc. At this size there is no drawing that
   * five points can carry, so what has to change is HOW MANY things are
   * being asked to carry it: a park is one mass, not ninety dots, and a
   * street tree at this distance is nothing at all. So past the detail
   * distance only the park planting is drawn, without shadows, and the
   * kerbside trees are simply not there — which is also what they look
   * like from a helicopter.
   */
  const drawnTrees = useMemo(
    () => (detailedTrees ? (dressing?.trees ?? []) : (dressing?.trees ?? []).filter((t) => t.inPark)),
    [detailedTrees, dressing]
  );

  /*
   * ONE BREEZE AND ONE BREATH.
   *
   * A sine loop each, at lengths that do not divide into one another, so
   * the two never come back into phase and the street never looks like it
   * is on a timer. 9.4s and 6.1s — the numbers matter only in that they
   * are coprime enough for the eye.
   */
  const breeze = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  /*
   * The slowest of the three, and deliberately the longest: a road
   * catching light is a thing you notice having happened rather than
   * a thing you watch happening.
   */
  const sheen = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      breeze.setValue(0);
      breath.setValue(0);
      return;
    }
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(breeze, 9400);
    const b = loop(breath, 6100);
    const c = loop(sheen, 13700);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [animate, breeze, breath, sheen]);

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
          {paveSource ? (
            <Pattern
              id="geoPave"
              patternUnits="userSpaceOnUse"
              width={paveTile}
              height={paveTile}
            >
              {/*
                A STRING, NOT A SOURCE OBJECT.

                `react-native-svg`'s Image takes a require() result or a
                URI on native, and on web it wants the plain string —
                handed `{uri}` there it renders the broken-image glyph,
                tiled, which on a park is a wall of grey icons. Passing
                the string works on both.
              */}
              <SvgImage
                href={paveSource.uri}
                x={0}
                y={0}
                width={paveTile}
                height={paveTile}
                preserveAspectRatio="xMidYMid slice"
              />
              {/*
                WASHED TO THE PAINTING'S OWN PAVEMENT, NOT TO DUSK.

                0.42 first, which is the right amount of night for stone
                on its own and far too little for stone laid over a lit
                painting: the pavements came out brighter than the city
                and the streets read as pale ribbons crossing it. The
                target is not "dark", it is "the same value as the
                pavement the plate already draws", so the real corridor
                disappears into the city instead of being laid on it.
              */}
              <Rect
                x={0}
                y={0}
                width={paveTile}
                height={paveTile}
                fill={livingPalette.nightBottom}
                opacity={0.66}
              />
            </Pattern>
          ) : null}
          {grassSource ? (
            <Pattern id="geoGrass" patternUnits="userSpaceOnUse" width={paveTile} height={paveTile}>
              <SvgImage
                href={grassSource.uri}
                x={0}
                y={0}
                width={paveTile}
                height={paveTile}
                preserveAspectRatio="xMidYMid slice"
              />
            </Pattern>
          ) : null}
        </Defs>

        {paintedGround ? null : <Rect x={0} y={0} width={S} height={sy} fill="url(#geoNight)" />}

        {/*
          NIGHT, OVER A MATERIAL THAT DOES NOT HAVE ANY.

          The scene plate is a painting of a city at night and brings its
          own light. A material tile is just stone: laid down raw it
          reads as noon, which is the exact mood Amit rejected. So over a
          material the ground is washed down to dusk here, and the lamp
          pools above punch back through it — which is also the right way
          round physically. The lamps make the light; the file does not.
        */}
        {paintedGround && props ? (
          <Rect x={0} y={0} width={S} height={sy} fill={livingPalette.nightTop} opacity={0.7} />
        ) : null}

        {(paintedGround ? [] : water).map((d, i) => (
          <Path key={`w${i}`} d={d} fill={livingPalette.solarPanel} opacity={0.85} />
        ))}
        {/*
          AND NOT OVER A PAINTING EITHER.

          This drew the reclaimed lawns over the plate so a closed road
          would not show through the park that replaced it. Four rounds
          of trying to make that park look like anything — texture,
          masses, denser planting, a softer edge — and it stayed a flat
          green shape against a photorealistic street, because a drawn
          park cannot compete with a painted one at arm's length.

          The answer was in the problem. `pruneDeadEnds` removes the
          ROAD; it does not have to add anything. Over the painting the
          reclaimed ground simply shows the plate's own city, which is
          beautiful and is already there — the street we do not draw is
          the street that is not there. The green is drawn over the
          MATERIAL, where the ground really is bare and something has to
          be.
        */}
        {(props ? green : []).map((d, i) => (
          <G key={`g${i}`}>
            {/*
              A PARK, NOT A GREEN SLAB.

              Flat `foliage` at full strength came out as a highlighter
              stripe across the city — a placeholder, which on a real
              street is worse than the road it replaced. Dark planting
              tone, a soft lit edge where the street lamps reach it, and
              the canopies `dressGeo` scatters inside it are what make it
              read as ground rather than as a shape somebody filled in.
            */}
            {/*
              ROUNDED, BECAUSE A PARK DOES NOT HAVE CORNERS WHERE THE
              ROAD ENDED.

              The lawn is built from the centreline of the way it
              replaced, so its ends are square and its corners are
              mitred — which reads as a green rectangle laid on the city.
              Stroking the same path in the same colour with round joins
              and caps rounds it off for one extra node, and widens it by
              a couple of metres, which is about the verge a road has
              either side of it anyway.
            */}
            <Path
              d={d}
              fill={grassSource ? "url(#geoGrass)" : GREEN_INK.grass}
              stroke={grassSource ? "url(#geoGrass)" : GREEN_INK.grass}
              strokeWidth={8}
              strokeLinejoin="round"
              strokeLinecap="round"
              /*
               * OPAQUE OVER A PAINTING.
               *
               * Translucent, it was a green film over a brightly lit
               * pavement and never got darker than a highlighter however
               * far the colour was pushed — the pavement underneath was
               * doing all the work. A lawn REPLACED the road; it does
               * not tint it.
               */
              opacity={1}
            />
            {/*
              A SOFT EDGE, NOT AN OUTLINE.

              A bright stroke round a park reads as a selected region on
              a map — Amit, on the wide shot: *"הפארקים עדיין במבט רחוק
              לא טובים."* What a park actually has at its edge is lighter,
              drier ground where it meets the pavement, so the edge is a
              wide, faint band INSIDE the shape rather than a line on it.
            */}
            <Path
              d={d}
              fill="none"
              stroke={GREEN_INK.verge}
              strokeWidth={5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.16}
            />
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
                  stroke={paveSource ? "url(#geoPave)" : ROAD_INK.pavement}
                  strokeWidth={kerb(r.halfWidth)}
                  opacity={paveSource ? 1 : 0.55}
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
        {/*
          BUILDINGS BELONG WITH THE PROPS, NOT WITH THE ABSENCE OF A
          PAINTING.

          This was gated on `paintedGround`, which conflated two
          different questions — "is there art underneath" and "is there a
          city underneath". Over the scene plate both answers are yes, so
          the gate was right by accident. Over a MATERIAL both are no,
          and the gate suppressed every building: the wide shot came back
          as a flat grey field with roads and eleven shopfronts on it,
          which is a wireframe and is what Amit was looking at when he
          said *"הכל נראה לא טוב"*.
        */}
        {props && dressing && buildingSources.length > 0
          ? [...dressing.blocks]
              .sort((a, b) => Math.max(...a.foot.map((q) => q.v)) - Math.max(...b.foot.map((q) => q.v)))
              .map((b) => {
                const us = b.foot.map((q) => q.u), vs = b.foot.map((q) => q.v);
                const u0 = Math.min(...us), u1 = Math.max(...us), v0 = Math.min(...vs), v1 = Math.max(...vs);
                /* Inside its own block: a building that spills over the
                   kerb puts the road — and the van on it — under a roof. */
                const bw = (u1 - u0) * S, bh = (v1 - v0) * sy;
                const w = Math.min(bw * 1.12, bh * 1.9);
                const h = w * 0.72;
                let hash = 0;
                for (let k = 0; k < b.id.length; k++) hash = (hash * 31 + b.id.charCodeAt(k)) >>> 0;
                const src = buildingSources[hash % buildingSources.length]!;
                return (
                  <SvgImage
                    key={`bi${b.id}`}
                    href={src.uri}
                    x={((u0 + u1) / 2) * S - w / 2}
                    y={v1 * sy - h}
                    width={w}
                    height={h}
                    preserveAspectRatio="xMidYMax meet"
                  />
                );
              })
          : null}
        {!props || buildingSources.length > 0
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
                {/* See `Block.tone`: one number per block, so the city
                    has texture rather than two hundred identical roofs. */}
                <Path d={toPath(b.roof, S, sy, true)} fill={roofTone(b.tone)} />
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
            {/*
              PLANTING MASSES, WHICH ARE WHAT A PARK LOOKS LIKE FROM
              ABOVE. Drawn before the roads' light and the trees, because
              they are the ground of the park rather than things standing
              on it. See `dressGeo`.
            */}
            {/*
              MASSES ARE A FAR-VIEW DEVICE.

              They exist because a four-metre canopy is a dot when the
              whole neighbourhood is in frame. Standing in the street the
              same twenty-metre mass is a green balloon the size of a
              building — which is what it looked like the first time
              they were drawn at both distances. So they come with the
              material, which is also the ground that only appears when
              the camera has pulled back.
            */}
            {(props ? dressing.shrubs : []).map((h, i) => (
              <Circle
                key={`sb${i}`}
                cx={h.at.u * S}
                cy={h.at.v * sy}
                r={h.r * S}
                fill={h.tone === 1 ? GREEN_INK.mass : GREEN_INK.massDark}
                /*
                 * Stronger over a painting than over the material. On
                 * stone the whole park is drawn and the masses are one
                 * layer of several; over the plate the park is the ONLY
                 * drawn thing in a painted street, so a faint mass reads
                 * as a flat green shape with a smudge on it.
                 */
                opacity={0.55}
              />
            ))}
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

            {/*
              A LAMP IS A POST WITH A LIT HEAD ON IT. The dot on its own
              read as a pin; the post is what says the light is three
              metres up and standing on this pavement.
            */}
            {lampSource ? (props ? dressing.lamps : []).map((l, i) => {
              const h = Math.max(22, l.r * 2.4 * sy), w = h * 0.36;
              return (
                <SvgImage key={`lpi${i}`} href={lampSource.uri} x={l.at.u * S - w / 2} y={l.at.v * sy - h} width={w} height={h} preserveAspectRatio="xMidYMax meet" />
              );
            }) : null}
            {(props && !lampSource ? dressing.lamps : []).map((l, i) => (
              <G key={`lp${i}`}>
                <Rect
                  x={l.at.u * S - Math.max(0.5, l.r * S * 0.025)}
                  y={(l.at.v - l.r * 0.42) * sy}
                  width={Math.max(1, l.r * S * 0.05)}
                  height={Math.max(2, l.r * 0.42 * sy)}
                  fill={livingPalette.lamp}
                  opacity={0.9}
                />
                <Circle
                  cx={l.at.u * S}
                  cy={(l.at.v - l.r * 0.42) * sy}
                  r={Math.max(1.2, l.r * S * 0.1)}
                  fill={livingPalette.lampGlow}
                  opacity={0.95}
                />
              </G>
            ))}

            {/* Lit windows. Four amber squares turn a footprint into a
                building with people in it, and cost four nodes. */}
            {/* A halo on the lit ones, so the façade glows rather than
                being speckled. Cheap: one extra rect, no filter.
                Over a painting there are no drawn façades to light. */}
            {(props ? dressing.windows : []).map((w, i) =>
              w.lit ? (
                <Rect
                  key={`wg${i}`}
                  x={(w.at.u - w.w * 1.1) * S}
                  y={(w.at.v - w.up - w.h * 1.1) * sy}
                  width={Math.max(1.6, w.w * 2.2 * S)}
                  height={Math.max(1.6, w.h * 2.2 * sy)}
                  fill={livingPalette.window}
                  opacity={0.22}
                  rx={1.2}
                />
              ) : null
            )}
            {(props ? dressing.windows : []).map((w, i) => (
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

      {/*
        TWO MOVING LAYERS, TWO DRIVERS, AND THE REST OF THE CITY HELD
        STILL.

        These are out of the base drawing because a transform inside an
        `<Svg>` cannot ride React Native's native driver — so they are
        their own transparent SVGs stacked over it, each wrapped in one
        `Animated.View`. The cost of the city being alive is therefore two
        interpolations rather than four hundred animated nodes, and both
        of them run off the JS thread while dispatch updates come in.

        Neither says anything about anybody: see `AMBIENT_KINDS`. The
        lamps breathe and the trees move in a breeze, and that is the
        whole of what a real street is allowed to invent.
      */}
      {dressing ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1.12] }),
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={width} height={height} viewBox={`0 0 ${S} ${sy}`} preserveAspectRatio="none">
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
          </Svg>
        </Animated.View>
      ) : null}

      {/*
        LIGHT ON THE ASPHALT.

        First on ChatGPT's list of what buys the most life per unit of
        risk: *"אור חי: pools של פנסים עם flicker כמעט בלתי מורגש...
        reflections עדינים על אספלט. זה נותן חיים בלי לטעון שמישהו נמצא
        שם."* It is the carriageways drawn a second time in lamplight at
        a very low opacity, breathing on their own clock — so the streets
        look wet under the lamps rather than painted on.
      */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: sheen.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
        ]}
        pointerEvents="none"
      >
        <Svg width={width} height={height} viewBox={`0 0 ${S} ${sy}`} preserveAspectRatio="none">
          {order.map((kind) =>
            roadsByKind[kind]!.map((r) => (
              <Path
                key={`sh${r.id}`}
                d={r.d}
                fill="none"
                stroke={livingPalette.lampGlow}
                strokeWidth={carriage(r.halfWidth) * 0.55}
                opacity={0.05}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))
          )}
        </Svg>
      </Animated.View>

      {dressing ? (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                {
                  translateX: breeze.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width * 0.0016, width * 0.0016],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Svg width={width} height={height} viewBox={`0 0 ${S} ${sy}`} preserveAspectRatio="none">
          {/* Trees last of the ground dressing, so a canopy overhangs
              the kerb and the windows behind it. */}
            {/*
              THE PAINTING ALREADY HAS BETTER TREES THAN THESE.

              Drawn over it, a green disc beside a painted palm reads as a
              marker somebody dropped on the city. The drawn canopies are
              for the case where there is no artwork underneath; over a
              painting the layer that moves is the lamplight.
            */}
          {/*
            NOTHING DRAWN OVER A PAINTING, INCLUDING THE PARKS.

            The park trees used to be the exception: a reclaimed lawn had
            nothing painted on it, so its canopies were drawn either way.
            That stopped being true when the lawn stopped being drawn —
            over the plate the reclaimed ground shows the painted city,
            which already has trees on it, and two flat canopies landing
            in the middle of it were the last thing on that screen that
            looked drawn.
          */}
          {treeSource ? (props ? drawnTrees : []).map((t, i) => {
              const h = Math.max(30, t.r * 6 * sy), w = h * 0.8;
              return (
                <SvgImage key={`tri${i}`} href={treeSource.uri} x={t.at.u * S - w / 2} y={t.at.v * sy + t.r * sy * 0.6 - h} width={w} height={h} preserveAspectRatio="xMidYMax meet" />
              );
            }) : null}
          {(props && !treeSource ? drawnTrees : []).map((t, i) => (
              <G key={`tr${i}`}>
                {/*
                  A CONTACT SHADOW IS A CLOSE-UP DEVICE. Far away it is a
                  dark dot under a light dot, and two dots at five points
                  apart are one muddy dot.
                */}
                {detailedTrees ? (
                  <Circle
                    cx={t.at.u * S}
                    cy={t.at.v * sy + t.r * sy * 0.5}
                    r={t.r * S * 0.85}
                    fill="#0B0917"
                    opacity={0.45}
                  />
                ) : null}
                {detailedTrees ? (
                  <>
                    {/*
                      A CANOPY IS SEVERAL MASSES, NOT A DISC.

                      Two versions before this one. A flat mid-green
                      circle filled the street with what looked like map
                      markers; darkening it made them look like holes. A
                      tree reads as a tree because its outline is lumpy
                      and because one side of it is catching the light
                      from the lamp it stands next to.
                    */}
                    {t.lobes.map((l, k) => (
                      <Circle
                        key={`lb${k}`}
                        cx={(t.at.u + l.du * t.r) * S}
                        cy={(t.at.v + l.dv * t.r) * sy}
                        r={l.r * t.r * S}
                        fill={t.tone === 2 ? livingPalette.foliage : livingPalette.foliageDark}
                        opacity={0.95}
                      />
                    ))}
                    {t.lobes.map((l, k) =>
                      l.lit > 0.25 ? (
                        <Circle
                          key={`lt${k}`}
                          cx={(t.at.u + l.du * t.r * 1.05) * S}
                          cy={(t.at.v + l.dv * t.r * 1.05 - t.r * 0.12) * sy}
                          r={l.r * t.r * S * 0.62}
                          fill={livingPalette.foliageLight}
                          opacity={0.14 + l.lit * 0.3}
                        />
                      ) : null
                    )}
                  </>
                ) : (
                  /*
                    PARK PLANTING, MERGED INTO ITS OWN MASS.

                    The lobes are still drawn — they are what gives the
                    canopy a lumpy edge — but bigger, darker and soft, so
                    that neighbouring trees in a park OVERLAP into one
                    continuous body of green instead of staying ninety
                    separate circles. That body is the thing the eye is
                    meant to find from up here; an individual tree in it
                    is not, and was never going to be.
                  */
                  t.lobes.map((l, k) => (
                    <Circle
                      key={`fm${k}`}
                      cx={(t.at.u + l.du * t.r * 0.8) * S}
                      cy={(t.at.v + l.dv * t.r * 0.8) * sy}
                      r={l.r * t.r * S * 1.35}
                      fill={t.tone === 2 ? livingPalette.foliage : livingPalette.foliageDark}
                      opacity={0.5}
                    />
                  ))
                )}
              </G>
            ))}
          </Svg>
        </Animated.View>
      ) : null}

      {!geo.real ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Said once and readably, by the screen that shows the map (TrackingBody). */}
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

/**
 * A roof's own colour, from its block's tone.
 *
 * Four steps rather than a continuous blend: a continuous one produces
 * two hundred roofs that are all almost the same, which is the problem
 * it was meant to solve. Mostly the cool default, one in five warmer,
 * one in eight darker — about what a street of buildings looks like from
 * above at night.
 */
function roofTone(tone: number): string {
  if (tone > 0.82) return "#3A3050";
  if (tone > 0.6) return "#322A4A";
  if (tone < 0.14) return "#221D38";
  return ROAD_INK.plotRoof;
}

/** The pavement either side of a carriageway, in world units. */
function kerbWorld(plan: WorldPlan): number {
  return plan.widthMetres === 0 ? 0 : (KERB_METRES * 2) / plan.widthMetres;
}

const styles = StyleSheet.create({
  demoTag: { position: "absolute", left: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(14,10,20,0.72)", borderWidth: 1, borderColor: "rgba(247,243,250,0.18)" },
  demoTagText: { color: "rgba(247,243,250,0.85)", fontSize: scale.micro, fontWeight: "700", writingDirection: "rtl" },
  watermark: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    ...type.micro,
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
