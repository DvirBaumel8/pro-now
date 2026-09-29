import React, { useEffect, useRef, useMemo } from "react";
import { Animated, Pressable, Easing, StyleSheet, Text, View } from "react-native";
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
  PLATE_V_WEIGHT,
} from "@pro-now/types";

import { palette, radii, type as type_ } from "../../theme";
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
  /**
   * Tapping the traveller on the real plan. Amit: *"שיהיה אפשר ללחוץ על
   * הרכב — לעשות זום אין לפרטי המקצוען שבדרך."*
   */
  onPressTraveller?: () => void;
  /**
   * THE GROUND UNDERNEATH IS A REAL STREET PLAN, NOT OUR PAINTING.
   *
   * Amit, on the tracking screen: *"תראה איך נראה המסלול שלו ותראה את
   * הגודל הלא הגיוני שלו."* He is describing something measurable. The
   * traveller is sized off the PEOPLE RULER — a fraction of the width of
   * a shopfront in the illustrated plate, which is how a scooter ends up
   * the right size next to a painted person. A real extract has no
   * shopfronts and no painted people: it is a street plan whose blocks
   * are buildings seen from above. The same ruler then puts a figure the
   * height of a city block on it.
   *
   * It is also the same mistake the district markers and the ambient
   * traffic already refuse to make — both switch off on a real extract,
   * because a drawing placed on somebody's actual street is a claim
   * about that street (see `geo-truth.ts`, `roadIsMeasuredFor`). The
   * traveller cannot switch off, because it is the one thing the screen
   * is about. So on a plan it is drawn as a MARKER: a symbol, sized in
   * screen points, which is what a plan uses and what cannot be the
   * wrong size relative to a map it was never drawn for.
   */
  plan?: boolean;
  /**
   * WHO THE MARKER IS, said on the plan itself.
   *
   * Amit, looking at the plan: *"מה מבינים מהמסך הזה של המסלול הכחול עם
   * הכתום?"* Nothing, was the honest answer. A dashed line between two
   * dots is a diagram of something, and which dot is the professional,
   * which is your home and which way the journey runs were all left for
   * the viewer to work out. On the illustrated plate none of that needs
   * saying — a van is a van and it is driving towards a house — and the
   * plan has no such picture to lean on, so it says it in words.
   *
   * Only on the plan: labels over the painting would be a diagram laid
   * on top of a scene that is already telling you the same thing.
   */
  travellerLabelHe?: string;
  /** Minutes left, shown beside his name on a street plan. */
  travellerMinutes?: number | null;
  /**
   * ---------------------------------------------------------------------
   * THE WORK ITSELF, WHICH THIS SCREEN USED TO SLEEP THROUGH
   * ---------------------------------------------------------------------
   * Amit: *"אני חייב משהו שירוץ בזמן העבודה ולא חלון מת, חייב פה יותר
   * תנועה וחיים בזמן העבודה... אנימציות של הבעל מקצוע עובדות בעסק
   * שבנינו."*
   *
   * Once the van has arrived, `progress` is 1 and it parks. The street
   * keeps its ambient traffic, and the one thing the customer is actually
   * waiting on — a person in their flat, working — is not on the screen
   * at all. So the busiest half of a job is the stillest picture in the
   * product.
   *
   * THIS IS NOT AN INVENTION, and the distinction is the only reason it
   * is allowed. Everywhere else in this world, motion without a fact
   * behind it is forbidden. Here the fact is the job's own state: the
   * server says IN_PROGRESS, which means a professional is at that
   * address doing the work. Drawing somebody working is a rendering of a
   * state the server asserts, exactly as the van moving is a rendering of
   * an ETA it asserts.
   *
   * What it must not do is claim DETAIL it does not have. It shows a
   * figure and a light, not a specific task: no sparks from a specific
   * tool, no progress bar, no "he is now testing the seal". The state
   * says that work is happening and nothing about what.
   */
  atWork?: boolean;
  /** The figure to draw working — the trade's own, from `WORLD_DISTRICTS`. */
  workerAssetId?: string;
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

/**
 * The marker's diameter, in SCREEN points — see `plan`.
 *
 * 18 is a map pin, not a character: big enough to find at a glance on a
 * dark plan, small enough that it reads as a symbol sitting on a street
 * rather than as something standing in it.
 */
const MARKER = 18;

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
  onPressTraveller,
  plan = false,
  travellerLabelHe,
  travellerMinutes = null,
  atWork = false,
  workerAssetId,
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
        run += Math.hypot(b.u - a.u, (b.v - a.v) * PLATE_V_WEIGHT);
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

  /*
   * THE WORKING LOOP.
   *
   * One slow dip and rise, two and a half seconds a cycle. Somebody
   * crouching to a task and straightening up again — not a walk's bob,
   * which is three times faster and reads as bouncing, and not a jitter,
   * which reads as a broken sprite.
   *
   * It does not start until there is work: an idle loop running behind
   * every other phase is a frame callback nobody asked for, on the one
   * screen that stays open for an hour.
   */
  const workBeat = useRef(new Animated.Value(0)).current;
  /* The destination breathes, so the eye finds it first. */
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!plan) return;
    const a = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [plan, pulse]);
  useEffect(() => {
    if (!atWork || !animate) {
      workBeat.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(workBeat, {
          toValue: 1,
          duration: 1250,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(workBeat, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [atWork, animate, workBeat]);

  const workerSource = workerAssetId ? sources[workerAssetId] : undefined;
  const workerW = w * 0.62;
  const workerH = workerW * 1.9;

  /*
   * ON THE REAL PLAN, THE TRADE'S OWN VEHICLE.
   *
   * Amit: *"במפה האמיתית — שהמסלול של המקצוען יראו בבירור את הרכב המתאים
   * מתקדם במסלול."* A dot said "somebody"; the van with the trade's colours
   * says who. Screen-sized for the same reason the dot was (see below), and
   * it can be tapped.
   */
  const planVehicle = plan && Boolean(sources[vehicleAssetId]);
  const PV_W = 74;
  const PV_H = PV_W * shapeOf(vehicleAssetId);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Svg width={width} height={height} pointerEvents="none">
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
        {/* On a street plan the route IS the map (Amit, 2026-09-29): a glow, a
            solid coral road and a bright dash — readable at a glance. */}
        {plan ? (
          <Path d={d} stroke={palette.signal500} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.22} />
        ) : null}
        <Path
          d={d}
          stroke="#161228"
          strokeWidth={plan ? 9 : 6.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity={plan ? 0.7 : 0.38}
        />
        {plan ? (
          <Path d={d} stroke={palette.signal500} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.95} />
        ) : null}
        <Path
          d={d}
          stroke={plan ? "#FFE3DA" : palette.signal300}
          strokeWidth={plan ? 2 : 2.5}
          strokeDasharray={plan ? "4 10" : "7 9"}
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

      {/* ----------------------------------------------------------------
          SOMEBODY IS IN THERE, WORKING.

          Amit: *"חייב פה יותר תנועה וחיים בזמן העבודה... אנימציות של
          הבעל מקצוע עובדות בעסק שבנינו."*

          A warm patch of light at the door, and the trade's own figure
          over it, dipping and straightening on a two-and-a-half second
          cycle. The light is drawn rather than loaded — the same reason
          the shop windows are: light is a gradient, not a picture.

          The figure is the one from `WORLD_DISTRICTS` for this trade, so
          a plumber's job shows a plumber. If that art has not arrived
          the glow still shows: a lit window with nobody visible in it is
          honest, and better than a grey rectangle standing in for a
          person.
          ---------------------------------------------------------------- */}
      {atWork && !plan ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: CUSTOMER_POINT.u * width - workerW * 0.9,
              top: CUSTOMER_POINT.v * height - workerW * 0.55,
              width: workerW * 1.8,
              height: workerW * 1.1,
              borderRadius: 999,
              backgroundColor: palette.sun500,
              opacity: workBeat.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.17] }),
            }}
          />

          {workerSource ? (
            <>
              {/* On the ground, under the figure, and not inheriting its dip. */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: CUSTOMER_POINT.u * width - (workerW * SHADOW.widthRatio) / 2,
                  top: CUSTOMER_POINT.v * height - (workerW * SHADOW.widthRatio * SHADOW.flatness) / 2,
                  width: workerW * SHADOW.widthRatio,
                  height: workerW * SHADOW.widthRatio * SHADOW.flatness,
                  borderRadius: 999,
                  backgroundColor: `rgba(14,10,20,${SHADOW.opacity})`,
                }}
              />
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: CUSTOMER_POINT.u * width - workerW / 2,
                  // The feet on the ground point, not the middle of the box.
                  top: CUSTOMER_POINT.v * height - workerH,
                  width: workerW,
                  height: workerH,
                  transform: [
                    {
                      // A dip, not a bob: down into the work and back up.
                      translateY: workBeat.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, workerH * 0.06],
                      }),
                    },
                  ],
                }}
              >
                <AssetSlot
                  placement={{
                    key: "at-work",
                    assetId: workerAssetId!,
                    item: {
                      id: workerAssetId!,
                      file: "",
                      intrinsicWidth: 1,
                      intrinsicHeight: 1,
                      anchor: { x: 0.5, y: 1 },
                      role: "CHARACTER",
                      theme: "SHARED",
                      defaultWidthRatio: 0.05,
                      critical: false,
                    },
                    layer: "WORLD_OBJECT",
                    left: 0,
                    top: 0,
                    width: workerW,
                    height: workerH,
                    depthOrder: 0,
                  }}
                  sources={sources}
                  quiet
                  pending="none"
                />
              </Animated.View>
            </>
          ) : null}
        </>
      ) : null}

      {/* ----------------------------------------------------------------
          ON A REAL PLAN, A MARKER.

          See `plan` above. Everything else here is drawn on the ruler
          that the illustrated plate establishes — a fraction of a
          shopfront's width — and a street plan has no shopfronts, so the
          same arithmetic puts a person the height of a city block on it.
          Amit: *"תראה את הגודל הלא הגיוני שלו."*

          Sized in SCREEN points and not in world fractions, so it is the
          same size at every zoom and cannot be wrong relative to a map it
          was never drawn against. It carries no depth scale, no bob and
          no lean: those describe a figure in an illustration, and this is
          a symbol on a plan. It still moves along exactly the same route
          at exactly the same progress, because that is the one thing on
          this screen that is real.
          ---------------------------------------------------------------- */}
      {plan && travellerLabelHe ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: [
              {
                translateX: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.u * width + MARKER),
                }),
              },
              {
                /*
                 * BELOW the marker, not above it. The map band carries a
                 * status chip across its top, and a label above a marker
                 * near the top of the frame lands underneath it.
                 */
                translateY: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.v * height + MARKER * 0.6),
                }),
              },
            ],
          }}
        >
          <View style={styles.planChip} accessibilityLabel={travellerMinutes ? `${travellerLabelHe}, עוד ${travellerMinutes} דקות` : travellerLabelHe}>
            <Text style={styles.planChipText}>
              {travellerMinutes ? `${travellerLabelHe} · ${travellerMinutes} דק׳` : travellerLabelHe}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/*
        * AND THE OTHER END OF IT, which is the one the customer is
        * standing in. Without this the plan has two marks on it and no
        * way to tell which is which — see `travellerLabelHe`.
        */}
      {plan ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: CUSTOMER_POINT.u * width - 60,
            top: CUSTOMER_POINT.v * height - 66,
            width: 120,
            alignItems: "center",
          }}
          accessibilityLabel="הבית שלך — היעד"
        >
          <View style={styles.homePill}>
            <Text style={styles.homePillText}>הבית שלך</Text>
          </View>
          <View style={styles.homeStem} />
          <Animated.View style={[styles.homePulse, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }], opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }) }]} />
        </View>
      ) : null}

      {planVehicle ? (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: PV_W,
            height: PV_H + 14,
            transform: [
              { translateX: driver.interpolate({ inputRange: steps, outputRange: route.map((s) => s.at.u * width - PV_W / 2) }) },
              /* Wheels on the road line, not parked above it on the roofs. */
              { translateY: driver.interpolate({ inputRange: steps, outputRange: route.map((s) => s.at.v * height - PV_H * 0.72) }) },
              /* Nose first: the drawing faces left, so it is mirrored while
                 the road runs to the right. */
              {
                scaleX: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s, i) => {
                    const a = route[Math.max(0, i - 1)]!.at.u, b2 = route[Math.min(route.length - 1, i + 1)]!.at.u;
                    return b2 - a > 0.0005 ? -1 : 1;
                  }),
                }),
              },
            ],
          }}
        >
          <Pressable
            onPress={onPressTraveller}
            disabled={!onPressTraveller}
            accessibilityRole="button"
            accessibilityLabel={travellerLabelHe ? `${travellerLabelHe} — פרטים` : "המקצוען בדרך — פרטים"}
            style={{ width: PV_W, height: PV_H + 14, alignItems: "center" }}
          >
            <View
              style={{
                position: "absolute", bottom: 2, width: PV_W * 0.8, height: 12, borderRadius: 999,
                backgroundColor: "#000", opacity: 0.35,
              }}
            />
            <AssetSlot
              placement={{
                key: "plan-vehicle",
                assetId: vehicleAssetId,
                item: {
                  id: vehicleAssetId, file: "", intrinsicWidth: 1, intrinsicHeight: 1,
                  anchor: { x: 0.5, y: 1 }, role: "VEHICLE", theme: "SHARED", defaultWidthRatio: 0.05, critical: false,
                } as never,
                layer: "WORLD_OBJECT", left: 0, top: 0, width: PV_W, height: PV_H, depthOrder: 0,
              }}
              sources={sources}
              quiet
              pending="none"
            />
          </Pressable>
        </Animated.View>
      ) : null}

      {plan && !planVehicle ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: MARKER,
            height: MARKER,
            borderRadius: 999,
            backgroundColor: palette.signal300,
            borderWidth: 3,
            borderColor: "rgba(14,10,20,0.85)",
            transform: [
              {
                translateX: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.u * width - MARKER / 2),
                }),
              },
              {
                translateY: driver.interpolate({
                  inputRange: steps,
                  outputRange: route.map((s) => s.at.v * height - MARKER / 2),
                }),
              },
            ],
          }}
        />
      ) : null}

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
      {sources[vehicleAssetId] && !plan ? (
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

      {sources[vehicleAssetId] && !plan ? (
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

/*
 * The plan's two captions. Plated rather than bare, for the reason the
 * accessibility audit exists to catch: words lying on artwork with
 * nothing behind them are unreadable wherever the artwork happens to be
 * light, and a street plan is light exactly where the streets are.
 */
const styles = StyleSheet.create({
  planChip: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(18,12,26,0.9)",
    borderWidth: 1.5,
    borderColor: palette.signal500,
  },
  planChipText: { ...type_.caption, color: "#FFFFFF", fontWeight: "800", writingDirection: "rtl" },
  homePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: palette.signal500,
    shadowColor: palette.signal500,
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  homePillText: { ...type_.caption, color: "#17121F", fontWeight: "900", writingDirection: "rtl" },
  homeStem: { width: 3, height: 16, backgroundColor: palette.signal500 },
  homePulse: { position: "absolute", bottom: -14, width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: palette.signal500 },
  planLabel: {
    ...type_.caption,
    color: palette.nightText,
    backgroundColor: "rgba(14,10,20,0.82)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    textAlign: "right",
    writingDirection: "rtl",
    overflow: "hidden",
  },
});
