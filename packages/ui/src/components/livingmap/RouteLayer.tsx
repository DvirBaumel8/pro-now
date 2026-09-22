import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  alongRoute,
  assignmentRoute,
  curvatureBetween,
  vehiclePose,
  bobAt,
  CUSTOMER_POINT,
  depthScale,
  leanAt,
  vehicleHeight,
  type DepartmentCode,
  type Gait,
  type NormalizedPoint,
} from "@pro-now/types";

import { palette } from "../../theme";
import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { SHADOW } from "./shadowGeometry";
import { HAIR_PACK_V0 } from "./hairPack";

/**
 * How tall the traveller is drawn, as a share of the viewport, and which
 * way the art faces.
 *
 * WIDTH IS NOT THE MEASUREMENT. A tow truck with a car on its back is
 * nearly three times as wide as it is tall; a dog walker is taller than
 * they are wide. Sizing everything by width put a truck across half the
 * neighbourhood and reduced the walker to a smudge. Height is what "how big
 * is this thing on the street" actually means, so height is what is set and
 * width follows from the file.
 *
 * FACING is the other half. The art was drawn facing left, and the lane
 * runs from the trade's district down to the customer — so most of the
 * journey is travelled to the right, and un-flipped the professional
 * reverses towards your house for the whole trip. The flip is decided from
 * the direction of travel on the route itself rather than set per asset,
 * because a route that ever runs the other way should turn the vehicle
 * round rather than need a second file.
 */
/*
 * AND MEASURED AGAINST THE PERSON, NOT AGAINST THE PLATE.
 *
 * This was a share of the WORLD's height, which already fixed the first
 * fault — sized against the screen, the scooter stayed the same size
 * while the camera pulled back, so on the wide shot it was a motorcycle
 * the size of a building. But the world's height comes from the artwork's
 * aspect ratio and the figures come from a shopfront's width, so the
 * vehicle and the people beside it were on two different rulers again and
 * a new plate would have silently changed the relationship between them.
 *
 * `vehicleHeight` puts it on the one ruler everything alive uses, and
 * gives each vehicle a multiple that says something true about it rather
 * than one number for a scooter and a flatbed truck alike. See
 * `VEHICLE_OF_PERSON`.
 */

function shapeOf(assetId: string): number {
  const item = HAIR_PACK_V0[assetId];
  if (!item) return 1;
  return item.intrinsicHeight / item.intrinsicWidth;
}

/**
 * THE PROFESSIONAL, COMING DOWN OUR STREETS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS REPLACES A DOTTED CURVE ON A GRID
 * ---------------------------------------------------------------------
 * Amit: *"גם את העמוד הזה נצטרך לעשות שאיש המקצוע הנכון נוסע אליך ורואים
 * אותו זז במפה שבנינו."*
 *
 * The tracking screen was the last one still happening somewhere else: an
 * abstract dark grid with a dotted line across it. Every screen before it
 * takes place in the neighbourhood, and then — at the one moment the
 * customer actually cares, when a stranger is on the way to their home —
 * the product changes language.
 *
 * ---------------------------------------------------------------------
 * A JOURNEY, NOT A LOCATION
 * ---------------------------------------------------------------------
 * This is the only screen where position is real, and that makes it the
 * easiest place to lie by accident. So what moves here is driven by
 * PROGRESS — the fraction of the server's own ETA that has elapsed — and
 * not by coordinates. The professional really is that far through the trip;
 * where they physically are is not claimed, the streets are ours, and the
 * screen says so in a line beneath it.
 *
 * See `assignment-route.ts`: the types have nowhere to put a latitude, so
 * this cannot quietly become a map.
 */
export interface RouteLayerProps {
  /** The world's size; the route is laid out as fractions of it. */
  width: number;
  height: number;
  /** What the vehicle's size is a fraction of: the viewport. */
  sizeBasis?: number;
  department: DepartmentCode;
  /**
   * How far through the trip, 0..1, from the server's ETA.
   *
   * Null when the ETA is unknown: the journey then holds at the start
   * rather than creeping forward at an invented speed.
   */
  progress: number | null;
  /** Which asset is travelling. A courier's scooter, a mover's van. */
  vehicleAssetId?: string;
  sources?: WorldAssetSources;
  animate?: boolean;
  /**
   * THE ROAD, WHEN THERE IS A ROAD.
   *
   * -------------------------------------------------------------------
   * WHAT THIS REPLACES, AND WHY IT IS A DIFFERENT KIND OF THING
   * -------------------------------------------------------------------
   * `assignmentRoute` bends a curve between a shop and a customer and
   * then nudges it towards a carriageway that was measured off a
   * painting. It is three legs and two constants, and it is as close to a
   * road as a drawing can get when there is no road.
   *
   * Amit has made the same complaint about it more than once — *"הדמויות
   * זזות ונוסעות לא טוב ומציאותי על הכביש"*, *"חייב שהכלי רכב יסעו כמו
   * שצריך על הכביש"* — and every answer so far has been a better curve.
   *
   * On a real extract there is a street network, and a route stops being
   * a shape to tune and becomes a path to find: `routeAlongRoads` runs
   * Dijkstra over the junctions and the van turns left because the
   * turning is there. Given here, it is used instead of the curve; the
   * gait, the depth, the easing and the bob are unchanged, because those
   * were never the part that was wrong.
   *
   * It carries no time on it. See `world-routing.ts` — the distance is
   * along drawn geometry with no traffic and no one-way streets in it,
   * and `progress` still comes from the server's own ETA.
   */
  path?: readonly NormalizedPoint[] | null;
  /**
   * How long the drawn path is, in metres.
   *
   * Only used to turn curvature into 1/metres so a corner leans the same
   * on every phone. It is a DRAWN length and never a duration — see
   * `CRUISE_MS`.
   */
  pathMetres?: number;
}

/** Radians to degrees, because the transform wants degrees. */
const DEGREES = 180 / Math.PI;

/**
 * The speed a corner is taken at, for the purposes of leaning.
 *
 * The layer does not know a real speed — `progress` comes from the
 * server's ETA and the drawn distance is not a journey — so the lean is
 * computed at a plausible town speed rather than invented from a
 * duration. Nine metres a second is about thirty kilometres an hour.
 *
 * It is deliberately a CONSTANT and not derived from the ETA: dividing a
 * drawn length by a promised time produces a speed, and a speed shown
 * back to a customer is an invented ETA wearing a different hat.
 */
const CRUISE_MS = 9;

/** A unit vector from one point to the next. */
function unit(a: NormalizedPoint, b: NormalizedPoint): NormalizedPoint {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const len = Math.hypot(du, dv) || 1;
  return { u: du / len, v: dv / len };
}

export function RouteLayer({
  width,
  height,
  sizeBasis,
  department,
  progress,
  vehicleAssetId = "courier_scooter",
  sources = EMPTY_ASSET_SOURCES,
  animate = true,
  path = null,
  pathMetres = 0,
}: RouteLayerProps) {
  const routeMetres = pathMetres;
  // `width`/`height` are the WORLD's size in points.
  const basis = sizeBasis ?? width;
  void basis;
  /*
   * Sampled finely enough for the gait. See STREET_SAMPLES in WorldLife:
   * a sine read at three points per cycle and interpolated linearly is a
   * wobble, not a step.
   */
  /*
   * THE WHOLE TABLE, BUILT ONCE PER TRIP.
   *
   * Everything below — the route, the step table, the cumulative
   * distances, the SVG path and the five interpolation output arrays —
   * depends only on the trade and the size of the world. None of it
   * changes while a professional drives down the street, and all of it was
   * being rebuilt on every render.
   *
   * That mattered because this screen re-renders at least once a second
   * from its own ETA clock, forever, while somebody watches. 160 samples
   * meant 160 `alongStreet` and `depthScale` calls, five 160-entry output
   * arrays, 320 `bobAt`/`leanAt` evaluations, 160 `toFixed` strings, a
   * 160-segment path string — and five fresh interpolation nodes that had
   * to be detached from and reattached to the native view. On a mid-range
   * Android that is a dropped frame once a second: the scooter's own
   * smooth native-driven motion hitching in time with the ETA text
   * updating, which is precisely what this file exists to avoid.
   */
  const table = useMemo(() => {
    /*
     * Resampled at even DISTANCE, not at even point index — a real
     * route's points are junctions and are nowhere near evenly spaced,
     * so stepping by index makes a van crawl down a long straight and
     * then leap across four turns in a row. `alongRoute` measures.
     */
    const route =
      path && path.length >= 2
        ? (() => {
            const asRoute = { path: [...path], drive: [...path], metres: 0 };
            let previous = alongRoute(asRoute, 0).at;
            return Array.from({ length: 160 }, (_, i) => {
              const at = alongRoute(asRoute, i / 159).at;
              /*
               * The same three fields the curve produces, computed the
               * same way — depth from `v` alone, and facing from the
               * direction of travel, so a van turning a corner turns
               * round rather than sliding sideways.
               */
              const sample = { at, scale: depthScale(at.v), facingLeft: at.u < previous.u };
              previous = at;
              return sample;
            });
          })()
        : assignmentRoute(department, 160);
    const steps = route.map((_, i) => i / (route.length - 1));

    /*
     * A RUNNING TOTAL, NOT A SLICE PER SAMPLE.
     *
     * This was `route.map((_, i) => pathLength(route.slice(0, i + 1)))` —
     * for 160 samples, 160 array copies, 160 maps and 12,720 `Math.hypot`
     * calls to compute a number each step already knows from the one
     * before it. `WorldLife` was fixed for exactly this and the same line
     * was left standing here.
     *
     * `dv` carries the same 0.6 weighting the rest of the world uses, and
     * it has to: the gait is a function of distance, so a different
     * weighting here would drift the stride against the position.
     */
    const travelled: number[] = [];
    let run = 0;
    for (let i = 0; i < route.length; i += 1) {
      if (i > 0) {
        const a = route[i - 1]!.at;
        const b = route[i]!.at;
        run += Math.hypot(b.u - a.u, (b.v - a.v) * 0.6);
      }
      travelled.push(run);
    }

    const d = route
      .map(
        (s, i) =>
          `${i === 0 ? "M" : "L"}${(s.at.u * width).toFixed(1)} ${(s.at.v * height).toFixed(1)}`
      )
      .join(" ");

    /*
     * HOW HARD EACH SAMPLE IS TURNING.
     *
     * Computed here with everything else that depends only on the route,
     * for the reason the whole table exists: this screen re-renders once
     * a second from its own ETA clock, and a curvature pass per render
     * is 160 more things to do every second for a number that has not
     * changed.
     *
     * `travelled` is in world units with the depth weighting in it, so
     * it is turned into metres against the route's own length — a
     * curvature is 1/metres and a curvature in 1/world-units would lean
     * a van twice as hard on a taller phone.
     */
    const totalWorld = travelled.at(-1) ?? 0;
    const metres = totalWorld > 0 ? routeMetres / totalWorld : 0;
    const cornerLean = route.map((_, i) => {
      if (i === 0 || i >= route.length - 1) return 0;
      const before = unit(route[i - 1]!.at, route[i]!.at);
      const after = unit(route[i]!.at, route[i + 1]!.at);
      const run = (travelled[i + 1]! - travelled[i - 1]!) * metres;
      const curve = curvatureBetween(before, after, run);
      return vehiclePose({ distance: 0, speed: CRUISE_MS, heading: after }, 0, curve).lean;
    });

    return { route, steps, travelled, d, cornerLean };
  }, [department, width, height, path, routeMetres]);

  const { route, steps, travelled, d, cornerLean } = table;

  /*
   * THE VEHICLE EASES TO THE NEW PROGRESS; IT DOES NOT JUMP TO IT.
   *
   * Server updates arrive every few seconds, so a position bound straight
   * to `progress` would tick forward in visible hops. Animating between the
   * last value and the new one turns a sequence of readings into a vehicle
   * that is driving — without inventing any progress of its own, because it
   * only ever moves between two numbers the server actually gave.
   */
  const driver = useRef(new Animated.Value(progress ?? 0)).current;
  useEffect(() => {
    const to = progress ?? 0;
    if (!animate) {
      driver.setValue(to);
      return;
    }
    /*
 * STOPPED ON THE WAY OUT.
 *
 * A one-shot `timing` that is started and never stopped keeps a frame
 * callback alive against a node whose view has already gone. It is
 * invisible until a screen is opened and closed a few times, and then it
 * is a slow leak on the one screen that stays live during dispatch.
 *
 * Every `Animated.loop` in this codebase already cleaned up; it was only
 * the single shots that were missed.
 */
    const anim = Animated.timing(driver, {
      toValue: to,
      duration: 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, driver, progress]);

  /*
   * Sized by HEIGHT, drawn at the file's own proportions. See above.
   */
  const h = vehicleHeight(width, vehicleAssetId);
  const w = h / shapeOf(vehicleAssetId);

  /*
   * Which way it is pointing. The art faces left; the trip runs mostly to
   * the right, so it is flipped when the route's net travel is rightwards.
   * Taken from the route's two ends rather than from the current step, so
   * the vehicle does not flip back and forth on a bend.
   */
  const netTravel = (route[route.length - 1]?.at.u ?? 0) - (route[0]?.at.u ?? 0);
  const facing: 1 | -1 = netTravel > 0 ? -1 : 1;

  /*
   * THE PROFESSIONAL IS TRAVELLING, NOT SLIDING.
   *
   * The same gait the street's own traffic uses — see `world-motion.ts`.
   * It matters more here than anywhere: this is the one screen where
   * somebody is watching a single figure for minutes at a time, and a
   * sticker being dragged down a road holds up badly under that.
   *
   * The dog walker arrives on foot and everything else on wheels, which is
   * a fact about the trade rather than a choice about the animation.
   */
  /*
   * A PERSON WALKS. A VAN HAULS. NOTHING RIDES ANY MORE.
   *
   * `travelAssetFor` returns the professional's own figure for every
   * trade that does not travel in a vehicle, so the common case here is
   * now somebody on foot rather than a courier on two wheels — and the
   * gait is what makes that legible: WALK bobs once per stride and leans
   * into the step, HAUL is heavy and level. Reading the asset id keeps
   * the two from drifting apart the way a hard-coded gait would.
   */
  const gait: Gait = vehicleAssetId.startsWith("character_")
    ? "WALK"
    : vehicleAssetId === "dog_walker"
      ? "WALK"
      : vehicleAssetId === "courier_scooter"
        ? "RIDE"
        : "HAUL";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/*
          THE ROUTE, LEGIBLE OVER A LIT CITY.

          One 2.5pt dash at half opacity in `signal300`. Against the old
          dark grid that was a quiet line; over the painted neighbourhood,
          where the pavement under it is the brightest thing on screen, it
          was not a quiet line, it was an invisible one. The tracking shot
          had a professional standing on a street with no indication of
          where he had come from or where he was going, which is most of
          what this screen is for.

          The fix is the one the streets themselves already use: a DARK
          casing under a LIGHT dash. The casing gives the line its own
          local contrast so it does not depend on what it is crossing, and
          the dash stays the same warm signal colour it has always been.
          Still quiet — the moving figure is the subject — but present.
        */}
        <Path
          d={d}
          stroke="#161228"
          strokeWidth={6.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={0.38}
        />
        <Path
          d={d}
          stroke={palette.signal300}
          strokeWidth={2.5}
          strokeDasharray="7 9"
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
        {/*
          AND THE END OF IT IS A PLACE, NOT A DOT.

          A 7pt disc in the body text colour is a dot on a diagram; on a
          painted street it is a dropped pebble. Where the professional is
          going is the second most important thing on this screen, so it
          gets the same casing treatment and a ring, which reads as a
          destination at any distance the ROUTE shot reaches.
        */}
        <Circle
          cx={CUSTOMER_POINT.u * width}
          cy={CUSTOMER_POINT.v * height}
          r={11}
          fill="#161228"
          opacity={0.45}
        />
        <Circle
          cx={CUSTOMER_POINT.u * width}
          cy={CUSTOMER_POINT.v * height}
          r={7.5}
          fill="none"
          stroke={palette.signal300}
          strokeWidth={2.5}
          opacity={0.95}
        />
        <Circle
          cx={CUSTOMER_POINT.u * width}
          cy={CUSTOMER_POINT.v * height}
          r={3}
          fill={palette.nightText}
          opacity={0.95}
        />
      </Svg>

      {/*
        * THE SHADOW UNDER THE ONE FIGURE THE CUSTOMER IS WATCHING.
        *
        * This is the professional on their way, and it floated. Every
        * other layer did too — `Walker`, the customer's own figure, was
        * the only thing in the world with a patch of dark under it.
        *
        * A sibling rather than a child, so it stays on the ground while
        * the figure bobs over it and does not lean when the figure leans.
        * The arithmetic is the same as `Walker`'s, and the same trap: the
        * offset is half the UNSCALED size, because a transform's scale is
        * about the box's centre.
        */}
      {sources[vehicleAssetId] ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: w * SHADOW.widthRatio,
            height: w * SHADOW.widthRatio * SHADOW.flatness,
            borderRadius: 999,
            backgroundColor: "rgba(14,10,20,1)",
            opacity: SHADOW.opacity,
            transform: [
              {
                translateX: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.u * width - (w * SHADOW.widthRatio) / 2),
                }),
              },
              {
                // The ground point, not the middle of the figure's box.
                translateY: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map(
                    (s) => s.at.v * height - (w * SHADOW.widthRatio * SHADOW.flatness) / 2
                  ),
                }),
              },
              {
                scale: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.scale),
                }),
              },
            ],
          }}
        />
      ) : null}

      {sources[vehicleAssetId] ? (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: w,
            height: h,
            transform: [
              {
                translateX: driver.interpolate({
                  inputRange: steps,
                  // Centre-anchored, because the scale below is about the
                // centre: any other anchor slides sideways as it grows.
                outputRange: route.map((s) => s.at.u * width - w / 2),
                }),
              },
              {
                /*
                 * WHY THE SCALE IS BAKED INTO THIS NUMBER.
                 *
                 * Amit: *"התצוגה מוזרה של הקטנוע כאילו הוא נופל."* He is
                 * describing a real thing. `scale` below is applied about
                 * the box's CENTRE — that is what a transform does — and it
                 * changes along the route, because nearer is larger. So as
                 * the scooter came down the street the box grew and shrank
                 * around its middle and the wheels rose off the road and
                 * sank back into it, over and over. It reads as falling
                 * because it is falling: half the growth goes downward.
                 *
                 * The fix is arithmetic rather than a transform-origin,
                 * which react-native-web does not reliably animate. After
                 * scaling by `s` about the centre, the bottom edge sits at
                 * `top + h * (1 + s) / 2`. Setting that equal to the point
                 * on the road gives the `top` below — so the wheels stay on
                 * the tarmac at every size.
                 */
                translateY: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.v * height - (h * (1 + s.scale)) / 2),
                }),
              },
              // Nearer means larger: the same depth rule the whole world uses.
              {
                // One rise and fall per stride of ground covered, scaled
                // down with distance so a figure far up the street bobs as
                // little as it is small.
                translateY: driver.interpolate({
                  inputRange: steps,
                  outputRange: travelled.map((d, i) => bobAt(gait, d) * h * route[i]!.scale),
                }),
              },
              {
                scale: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.scale),
                }),
              },
              {
                // Leaning into the walk. Zero for anything on wheels.
                rotate: driver.interpolate({
                  inputRange: steps,
                  /*
                   * THE STRIDE'S LEAN, PLUS THE BODY ROLL OF A CORNER.
                   *
                   * `leanAt` is the cyclic half — a walk rocks, a van
                   * does not. `cornerLean` is the other kind: it is zero
                   * on a straight road and at a crawl, and it comes from
                   * the curvature of the path the router found. See
                   * `vehicle-motion.ts`; ChatGPT's line was *"רכב לא
                   * עושה אנימציה, הוא מגיב לכוחות"*, and the difference
                   * is that this one is silent when nothing is
                   * happening.
                   */
                  outputRange: travelled.map(
                    (d, i) =>
                      `${(leanAt(gait, d, facing) + cornerLean[i]! * DEGREES).toFixed(2)}deg`
                  ),
                }),
              },
              // Turned to face the way it is going, not mirrored art.
              { scaleX: facing },
            ],
          }}
        >
          <AssetSlot
            placement={{
              key: "assigned-vehicle",
              assetId: vehicleAssetId,
              item: {
                id: vehicleAssetId,
                file: "",
                intrinsicWidth: 1,
                intrinsicHeight: 1,
                anchor: { x: 0.5, y: 1 },
                role: "VEHICLE",
                theme: "SHARED",
                defaultWidthRatio: 0.18,
                critical: false,
              },
              layer: "PRESENCE",
              left: 0,
              top: 0,
              width: w,
              height: h,
              depthOrder: 0,
            }}
            sources={sources}
            quiet
            pending="none"
          />
        </Animated.View>
      ) : null}
    </View>
  );
}
