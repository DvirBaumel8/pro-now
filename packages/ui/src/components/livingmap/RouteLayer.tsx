import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  assignmentRoute,
  bobAt,
  CUSTOMER_POINT,
  leanAt,
  vehicleHeight,
  type DepartmentCode,
  type Gait,
} from "@pro-now/types";

import { palette } from "../../theme";
import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
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
}: RouteLayerProps) {
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
    const route = assignmentRoute(department, 160);
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

    return { route, steps, travelled, d };
  }, [department, width, height]);

  const { route, steps, travelled, d } = table;

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
  const gait: Gait = vehicleAssetId === "dog_walker" ? "WALK" : vehicleAssetId === "courier_scooter" ? "RIDE" : "HAUL";

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {/* The route, drawn once and quietly: it is context, not the
            subject. The subject is the person moving along it. */}
        <Path d={d} stroke={palette.signal300} strokeWidth={2.5} strokeDasharray="7 9" fill="none" opacity={0.5} />
        <Circle
          cx={CUSTOMER_POINT.u * width}
          cy={CUSTOMER_POINT.v * height}
          r={7}
          fill={palette.nightText}
          opacity={0.95}
        />
      </Svg>

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
                  outputRange: travelled.map((d) => `${leanAt(gait, d, facing).toFixed(2)}deg`),
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
