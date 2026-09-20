import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  assignmentRoute,
  bobAt,
  CUSTOMER_POINT,
  leanAt,
  pathLength,
  WORLD_SIZE,
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
 * A share of the WORLD's height, not of the phone's. Sized against the
 * screen, the scooter stayed the same size while the camera pulled back —
 * so on the wide journey shot it was a motorcycle the size of a building,
 * and on the close shot a speck. See `WORLD_SIZE`.
 */
const TRAVELLER_HEIGHT = WORLD_SIZE.travellerHeight;

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
  const route = assignmentRoute(department, 160);
  const steps = route.map((_, i) => i / (route.length - 1));

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
    Animated.timing(driver, {
      toValue: to,
      duration: 1200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [animate, driver, progress]);

  /*
   * Sized by HEIGHT, drawn at the file's own proportions. See above.
   */
  const h = height * TRAVELLER_HEIGHT;
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
  const travelled = route.map((_, i) => pathLength(route.slice(0, i + 1).map((r) => r.at)));

  // The road already travelled, so the customer can see the shape of the
  // trip rather than only its current point.
  const d = route
    .map((s, i) => `${i === 0 ? "M" : "L"}${(s.at.u * width).toFixed(1)} ${(s.at.v * height).toFixed(1)}`)
    .join(" ");

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
