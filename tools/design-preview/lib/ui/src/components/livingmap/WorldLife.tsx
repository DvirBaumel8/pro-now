import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import {
  directWorld,
  isSignificant,
  MOMENT_SPEC,
  nextBeatMs,
  depthScale,
  alongStreet,
  ROAD,
  STREETS,
  bobAt,
  laneForGait,
  facingScaleX,
  sideViewTurnDeg,
  walkingStreet,
  leanAt,
  pathLength,
  travelMs,
  vehicleHeight,
  type Gait,
  type RunningMoment,
  type WorldMoment,
  PLATE_V_WEIGHT,
} from "@pro-now/demo-types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { livingPalette as P } from "./palette";
import { SHADOW } from "./shadowGeometry";
import { HAIR_PACK_V0 } from "./hairPack";

/**
 * The asset's own proportions, so a wide thing gets a wide box. Without
 * this the art is letterboxed inside a square and floats above the
 * ground — see the note where this is used.
 */
function shapeOf(assetId: string): number {
  const item = HAIR_PACK_V0[assetId];
  if (!item) return 1;
  return item.intrinsicHeight / item.intrinsicWidth;
}

/**
 * WORLD LIFE — the street, being a street.
 *
 * ---------------------------------------------------------------------
 * WHAT MOVES, AND WHY IT IS NOT TRAFFIC
 * ---------------------------------------------------------------------
 * Amit: *"חייב תנועתיות כלשהי לא תמונה מתה."* Then, looking at what that
 * first turned into: *"מה קשור המכוניות והאוטובוס, איפה שליח איפה משאית
 * קטנה טנדר?"*
 *
 * Both notes are right and the second is the sharper one. A private car
 * crossing the frame makes the picture move and says nothing; a courier on
 * a scooter makes the picture move and says what the product is. So
 * everything significant that crosses this street is one of ours on the way
 * to somebody, and the street is busy because the marketplace is.
 *
 * ---------------------------------------------------------------------
 * SCHEDULED, NOT LOOPED
 * ---------------------------------------------------------------------
 * The pacing belongs to `WorldDirector`, which is pure and tested: at most
 * two significant things at once, never two of the same, irregular gaps,
 * and frequent silence. This component only draws what the director
 * decides — so "does the world feel alive" is a question answered in tests
 * rather than by watching the screen and guessing.
 *
 * Everything animates on `transform` alone, on the native driver. This
 * screen is live during dispatch and a vehicle that stutters exactly as a
 * location update lands is worse than a still picture.
 */

/**
 * Which asset plays each moment, and how big it is.
 *
 * ---------------------------------------------------------------------
 * THEY DRIVE THE STREETS NOW
 * ---------------------------------------------------------------------
 * Each moment used to carry a `lane` — a fraction of world height it
 * crossed — and then, briefly, an angle on a ring. Both were wrong for the
 * same reason, which Amit named twice: *"רק רחוב, מצומצם"* and then *"גם
 * זה כיכר מדי… רוצה שיטיילו ברחובות."*
 *
 * Something crossing the frame says the world continues off-screen in two
 * directions. Something circling a ring says the world is one room. A
 * courier driving DOWN A STREET, past shops, small in the distance and
 * larger as it comes, says the world is a place with roads in it — which
 * is the thing being asked for, and it costs nothing extra because the
 * streets already exist in `world-neighbourhood.ts`.
 *
 * `street` is which road this moment happens on. Spreading them across
 * different streets is deliberate: two vehicles on the same road at once
 * is a convoy, and a convoy looks like a loop.
 */
/*
 * THE RATIOS ARE SHARES OF THE WORLD, NOT OF THE PHONE.
 *
 * They were shares of the viewport, and a dog walker at 0.14 of the phone
 * came out as tall as a shopfront — a person standing in the middle of the
 * road, bigger than the building behind them. Same fault as the districts
 * and the route: a size measured against the screen stops meaning anything
 * the moment the camera moves. See `WORLD_SIZE`.
 *
 * Everything travels the MAIN street now. The four streets are an idealised
 * model and only the main one lines up with the road actually painted on
 * this plate; a van driving down "רחוב השוק" was a van driving through a
 * row of balconies.
 *
 * ---------------------------------------------------------------------
 * AND THE MAIN STREET DID NOT LINE UP EITHER
 * ---------------------------------------------------------------------
 * That paragraph was half right, and the half it got wrong is the one
 * that was on screen. `STREETS[0]` runs straight down u≈0.5 — and u≈0.5
 * is where the SHOPS are, because the middle of this plate is a
 * pedestrian square. Six of the eleven measured shopfronts sit within a
 * few hundredths of that line. So the scooter rode up the square and
 * through the front of the gym, hovering over its awning; the tow truck
 * crossed the flowerbeds. Twice reported, as *"כל המכוניות והבניינים
 * והנסיעה מבולגנת"*, and twice looked for in the wrong place, because
 * the note above said the main street was the one that fitted.
 *
 * `CARRIAGEWAY` is where the road actually is: measured off the plate by
 * `tools/design-preview/measure-road.mjs` rather than designed, running
 * down the right-hand side and leaving at the bottom-right corner. The
 * traffic drives that, and `street` on a moment is kept only because the
 * ambient moments still index a line to sit beside.
 */
const MOMENT_ASSET: Readonly<
  Record<
    WorldMoment,
    {
      assetId: string;
      widthRatio: number;
      street: number;
      at?: number;
      gait?: Gait;
      /** Rendered by this file rather than loaded. See WINDOW_LIGHT. */
      drawn?: boolean;
    }
  >
> = {
  COURIER_PASS: { assetId: "courier_scooter", widthRatio: 0.11, street: 0, gait: "RIDE" },
  MOVER_PASS: { assetId: "moving_van", widthRatio: 0.15, street: 0, gait: "HAUL" },
  TOW_PASS: { assetId: "tow_truck", widthRatio: 0.17, street: 0, gait: "HAUL" },
  DOG_WALK: { assetId: "dog_walker", widthRatio: 0.06, street: 0, gait: "WALK" },
  // `at` is a point along the street: a light comes on in a shop, not in
  // mid-air.
  /*
   * DRAWN, NOT LOADED.
   *
   * `amb_window_light` has been on the missing-art list since the world
   * was built, and it should never have been on it. A cat is a drawing
   * and a bird is a drawing; a light coming on is a GRADIENT, and asking
   * a draughtsman for one is asking them to hand-paint something the
   * renderer can make exactly, at any size, in any of the palette's
   * colours.
   *
   * So this moment is marked `drawn` and renders as warm light instead of
   * waiting for a file. `amb_birds` and `amb_cat` keep waiting, because
   * they are figures and a script cannot invent a convincing animal.
   */
  WINDOW_LIGHT: { assetId: "amb_window_light", widthRatio: 0.07, street: 0, at: 0.3, drawn: true },
  BIRDS: { assetId: "amb_birds", widthRatio: 0.12, street: 0, at: 0.5 },
  CAT_APPEAR: { assetId: "amb_cat", widthRatio: 0.03, street: 0, at: 0.7 },
};

/**
 * How finely a street is sampled for the animation.
 *
 * Enough points that a bend never shows as a corner, few enough that the
 * interpolation stays cheap. The move runs on the native driver either way.
 */
/**
 * How finely a road is sampled.
 *
 * 24 was enough when the only things read off the path were position and
 * scale, which change slowly. The gait does not: a walker takes about
 * sixteen strides down the main street, and a sine sampled fewer than a
 * few times per cycle and then linearly interpolated does not come back as
 * a step — it comes back as an arbitrary wobble, which is exactly the
 * "bad animation" this was meant to fix. 160 gives about ten samples per
 * stride, and the cost is four arrays of numbers per moving thing.
 */
const STREET_SAMPLES = 160;

interface Playing extends RunningMoment {
  /** Which way round the square. Decided once, at the start. */
  reversed: boolean;
  /**
   * Where on the ring this one enters, as an angle.
   *
   * Random per moment, so two vehicles that happen to overlap are two
   * things going round a square rather than one animation played twice.
   */
  from: number;
  driver: Animated.Value;
}

export interface WorldLifeProps {
  /** The world's size. Streets are laid out as fractions of this. */
  width: number;
  height: number;
  /** Kept for callers that have not moved to world-relative sizes. */
  sizeBasis?: number;
  sources?: WorldAssetSources;
  /** False holds the street completely still. */
  animate?: boolean;
  /**
   * What the customer is looking for, if anything.
   *
   * Makes that trade's own traffic more likely — a tow truck going past
   * while you wait for a tow truck. It never filters: the street stays
   * mixed, because a real one is, and because four tow trucks in ninety
   * seconds would be the world implying supply nobody counted.
   */
  departmentCode?: string | null;
  /** Dark enough for a shop light to come on — see `world-daylight.ts`. */
  lampsLit?: boolean;
}

export function WorldLife({
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  animate = true,
  departmentCode = null,
  lampsLit,
  sizeBasis,
}: WorldLifeProps) {
  const basis = sizeBasis ?? width;
  /*
   * How tall the world is drawn compared with how wide. A direction
   * expressed in fractions is not a direction on screen until this is
   * applied — see `roadScreenAngleDeg`, which exists because a road
   * that looks gentle in u/v is 82 degrees on a plate this tall.
   */
  const worldAspect = width > 0 ? height / width : 1;
  void basis;
  const [playing, setPlaying] = useState<Playing[]>([]);
  /** What is on the street, readable without waiting for a render. */
  const playingRef = useRef<Playing[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Every traffic animation currently running, so unmount can stop them. */
  const running = useRef<Animated.CompositeAnimation[]>([]);

  /*
   * ---------------------------------------------------------------------
   * THE ANIMATION IS STARTED OUTSIDE THE STATE UPDATER
   * ---------------------------------------------------------------------
   * All of this used to live inside `setPlaying(current => ...)` — a
   * reducer that created an `Animated.Value` and called `.start()` on it.
   * A state updater must be pure, and React is allowed to call it twice:
   * under StrictMode every vehicle started two animations against two
   * values, one of which nothing ever rendered and nothing ever stopped.
   *
   * A ref mirror of what is playing lets the decision be made, the
   * animation started once, and the state set once — in that order, all
   * outside the updater. The mirror is written in the same breath as the
   * state so the two cannot disagree about what is on the street.
   */
  const beat = useCallback(() => {
    const current = playingRef.current;
    const decision = directWorld({
      now: Date.now(),
      running: current,
      roll: Math.random(),
      reducedMotion: !animate,
      departmentCode,
      /*
       * A light comes on when it gets dark, and the sky over this street
       * is the viewer's own hour — so a lit window at one in the
       * afternoon would contradict the wash above it on the same screen.
       */
      lampsLit,
    });

    const kept = current.filter((p) => decision.running.some((r) => r.moment === p.moment));

    if (!decision.start) {
      playingRef.current = kept;
      setPlaying(kept);
      timer.current = setTimeout(beat, nextBeatMs(Math.random()));
      return;
    }

    const driver = new Animated.Value(0);
    const startSpec = MOMENT_ASSET[decision.start];
    const travelling = isSignificant(decision.start);
    const startGait: Gait = startSpec.gait ?? "DRIVE";
    /*
     * THE LENGTH OF THE PATH ACTUALLY TAKEN.
     *
     * This measured `ROAD` for everything, and the dog walker now takes
     * the pavement — a different path, a different length. `travelMs`
     * turns a distance into a time at the gait's own speed, so measuring
     * one path and walking another is exactly the "walking versus being
     * dragged" fault `world-motion.ts` is built to avoid: the figure
     * would cover the pavement at road speed.
     */
    const lane =
      laneForGait(startGait) === "ROAD"
        ? ROAD
        : travelling
          ? walkingStreet()
          : STREETS[startSpec.street % STREETS.length]!;
    const duration = travelling
      ? travelMs(startGait, pathLength(lane.path))
      : MOMENT_SPEC[decision.start].durationMs;

    /*
     * LINEAR, and this matters as much as the gait. Traffic was eased in
     * and out, so a van accelerated from nothing, cruised, and slowed to
     * a halt in the middle of a road for no reason at all. Easing belongs
     * to a camera, which is making a decision; a van is just driving.
     */
    const anim = Animated.timing(driver, {
      toValue: 1,
      duration,
      easing: travelling ? Easing.linear : Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });

    running.current.push(anim);
    /*
     * REMOVED WHEN IT ENDS, NOT ONLY WHEN THE SCREEN DOES.
     *
     * The list was only ever cleared on unmount, so a finished animation
     * stayed in it. The street starts one every few seconds and a customer
     * watches this screen for the length of a trip, so a twenty-minute
     * wait retained several hundred dead composites. Invisible, and a leak
     * on the screen that stays open longest.
     */
    anim.start(() => {
      const i = running.current.indexOf(anim);
      if (i >= 0) running.current.splice(i, 1);
    });

    const next = [
      ...kept,
      {
        moment: decision.start,
        startedAt: Date.now(),
        // The director culls by this, so what is playing and what it
        // believes is playing cannot drift apart.
        durationMs: duration,
        reversed: Math.random() < 0.5,
        from: Math.random() * Math.PI * 2,
        driver,
      },
    ];
    playingRef.current = next;
    setPlaying(next);

    timer.current = setTimeout(beat, nextBeatMs(Math.random()));
  }, [animate, departmentCode]);

  useEffect(() => {
    if (!animate) {
      setPlaying([]);
      playingRef.current = [];
      return;
    }
    timer.current = setTimeout(beat, nextBeatMs(Math.random()));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      /*
       * Every traffic animation stopped on the way out. They were started
       * and never stopped, so leaving this screen left a frame callback
       * per vehicle running against a view that no longer existed — and
       * the street starts a new one every few seconds, so the count only
       * went up.
       */
      for (const anim of running.current) anim.stop();
      running.current = [];
    };
  }, [animate, beat]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {playing.map((p) => {
        const spec = MOMENT_ASSET[p.moment];
        // Nothing is loaded for a moment whose art has not arrived. An
        // invisible courier is better than a grey rectangle sliding down
        // the road pretending to be one — but a moment this file DRAWS
        // has nothing to wait for.
        if (!spec.drawn && !sources[spec.assetId]) return null;

        const significant = isSignificant(p.moment);
        /*
         * A BOX THE SHAPE OF THE THING IN IT, SIZED AGAINST THE PERSON.
         *
         * This was one number per vehicle, a share of the world's WIDTH,
         * drawn into a SQUARE box with `contain`. Both halves wrong, and
         * they compound:
         *
         * The sizes were not anybody's height. Measured against a person
         * standing on the same pavement, the tow truck — a flatbed with a
         * car on its back — came out EXACTLY as tall as a pedestrian, and
         * the dog walker, a grown adult, came out at 0.71 of one.
         *
         * And a square box letterboxes a wide asset and centres it. The
         * tow truck's art is 496x184, so it drew 0.063 of the world tall
         * inside a 0.17 box and floated a clear 0.054 above where its
         * wheels belonged — most of a person's height, in mid-air, with
         * the careful "wheels on the tarmac" correction below faithfully
         * aligning the bottom of a box that was mostly empty.
         *
         * Every screenshot of a vehicle hanging over a shopfront was
         * this. `VenueLayer` had the identical fault with the buildings
         * and the fix is the same one: the box takes the asset's own
         * aspect ratio, and the size that is set is the HEIGHT, from the
         * one ruler everything alive shares. See `VEHICLE_OF_PERSON`.
         */
        const gait: Gait = spec.gait ?? "DRIVE";
        const ratio = shapeOf(spec.assetId);
        const base = significant
          ? vehicleHeight(width, spec.assetId)
          : width * spec.widthRatio * ratio;
        const w = base / ratio;

        /*
         * ONE DRIVER, THREE READINGS.
         *
         * x, y and scale all come from the same 0..1 value, so a vehicle
         * can never be at a position whose size belongs somewhere else —
         * and because all three are transforms, the circuit runs off the JS
         * thread. This screen is live during dispatch; a van that stutters
         * exactly as a location update lands is worse than a still one.
         */
        /*
         * The road this one is on, walked end to end. `p.from` decides
         * which end it enters from, so two couriers on one street are not
         * the same animation twice.
         */
        /*
         * Vehicles take the measured road; the still moments do not.
         *
         * A window lighting up and a cat appearing are things that happen
         * BESIDE the traffic — "a light comes on in a shop, not in
         * mid-air", and not in the middle of the carriageway either. They
         * keep the square's own spine, which is the line the shops stand
         * along, and it is the one thing `STREETS` is still right about.
         */
        /*
         * THE ROAD IS FOR THINGS WITH WHEELS.
         *
         * This was `significant ? ROAD : ...`, and the dog walker is a
         * significant moment — so a person with a dog walked down the
         * middle of the carriageway. Derived from the gait now, so a
         * walking thing cannot be given the road. See `laneForGait`.
         */
        /*
         * A pedestrian takes the pavement that CROSSES the frame, not the
         * one that runs into it. See `walkingStreet`: on street 0 the dog
         * walker covered 727 vertical pixels against 214 horizontal, which
         * reads as bouncing on the spot rather than as walking past.
         *
         * Still moments keep their own street — they are standing
         * somewhere specific, and `at` is measured along it.
         */
        const street =
          laneForGait(gait) === "ROAD"
            ? ROAD
            : significant
              ? walkingStreet()
              : STREETS[spec.street % STREETS.length]!;
        const path = Array.from({ length: STREET_SAMPLES }, (_, i) => {
          const t = i / (STREET_SAMPLES - 1);
          const at = alongStreet(street, p.reversed ? 1 - t : t);
          return { u: at.u, v: at.v, scale: depthScale(at.v) };
        });
        const steps = path.map((_, i) => i / (path.length - 1));

        /*
         * HOW FAR IT HAS COME, AT EVERY SAMPLE.
         *
         * The gait is driven by distance travelled rather than by a clock —
         * see `world-motion.ts` for why that is the whole difference
         * between walking and being dragged. So the path is measured as it
         * is walked, and the bob and the lean are sampled at exactly the
         * points the position is sampled at. They cannot drift apart,
         * because they are readings of the same journey.
         */
        const facing: 1 | -1 = p.reversed ? -1 : 1;
        /*
         * MEASURED ONCE, CUMULATIVELY.
         *
         * This was `path.map((_, i) => pathLength(path.slice(0, i + 1)))`
         * — for 160 samples that is 12,800 array copies and 12,700
         * distance calculations, per moving item, per render, and the
         * scene re-renders up to twenty times a second during a journey.
         * Roughly half a million square roots a second to describe four
         * vehicles driving down a street.
         *
         * A running total is the same numbers in one pass. The 0.6
         * weighting on `dv` is the world's own 3/4 rule and matches
         * `pathLength`, which this replaces — the two must agree or the
         * gait drifts against the position it is supposed to belong to.
         */
        /*
         * Which way it is going, read off the path it is walking rather
         * than off which end it started from — a street can curve, and
         * `reversed` only ever knew about the ends.
         */
        const goingRight = (path[path.length - 1]?.u ?? 0) >= (path[0]?.u ?? 0);
        const mirror = facingScaleX(spec.assetId, goingRight);
        /*
         * How far this thing may be turned towards the road it is on.
         * Wheels only: a person walking is not a rigid body pointing
         * along a carriageway, and turning the dog walker would tip
         * somebody over on a flat pavement.
         */
        const wheeled = gait === "RIDE" || gait === "HAUL";
        const turn = wheeled
          ? sideViewTurnDeg(path[0]!, path.at(-1)!, worldAspect) *
            /*
             * Signed so the nose goes DOWN the screen when the thing is
             * travelling towards the camera. The mirror below flips the
             * whole box, so the sign is taken against it or the turn
             * comes out backwards on one of the two directions.
             */
            (path.at(-1)!.v > path[0]!.v ? 1 : -1) *
            mirror
          : 0;

        const travelled: number[] = [];
        {
          let total = 0;
          for (let i = 0; i < path.length; i += 1) {
            if (i > 0) {
              const a = path[i - 1]!;
              const b = path[i]!;
              total += Math.hypot(b.u - a.u, (b.v - a.v) * PLATE_V_WEIGHT);
            }
            travelled.push(total);
          }
        }
        const still =
          spec.at !== undefined ? alongStreet(STREETS[spec.street % STREETS.length]!, spec.at) : null;

        const travelStyle = significant
          ? {
              transform: [
                {
                  translateX: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.u * width - w / 2),
                  }),
                },
                {
                  /*
                   * THE WHEELS ON THE TARMAC, NOT NEAR IT.
                   *
                   * `scale` below grows the box about its CENTRE, so after
                   * scaling by s the bottom edge sits at
                   * `top + base * (1 + s) / 2`. Subtracting only half the
                   * unscaled height leaves a gap that changes with depth:
                   * `depthScale` runs 0.74 to 1.18, so a van drifts about
                   * a fifth of its own height as it drives down the
                   * street, sinking into the road when near and hovering
                   * when far.
                   *
                   * This is the fourth place this exact mistake has been
                   * made — RouteLayer and Walker both carry the same
                   * correction and the same comment, and Amit named the
                   * symptom the first time: *"כאילו הוא נופל."* Anything
                   * that scales and stands on the ground needs this line.
                   */
                  translateY: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.v * height - (base * (1 + q.scale)) / 2),
                  }),
                },
                {
                  /*
                   * THE STEP. One rise and fall per stride of ground
                   * covered, scaled with distance so a figure far up the
                   * street bobs as little as it is small. Listed before
                   * `scale` so it is in the same space as the position
                   * above it.
                   */
                  translateY: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: travelled.map((d, i) => bobAt(gait, d) * base * path[i]!.scale),
                  }),
                },
                {
                  scale: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.scale),
                  }),
                },
                {
                  /*
                   * TWO ROTATIONS IN ONE, AND THE SECOND IS AN ADMISSION.
                   *
                   * `leanAt` is the walk's own rock, and it is zero for
                   * anything on wheels.
                   *
                   * `turn` is the other one. Amit: *"למה המכוניות
                   * והאופנועים נוסעים ככ עקום ולא אמיתי עדיין?"* He had
                   * reported the traffic twice before and both answers
                   * were placement — a scooter through the pedestrian
                   * square, a tow truck through the flowerbeds. Both
                   * were real and neither was this.
                   *
                   * This one is the art. The carriageway measured off
                   * this plate runs 82 degrees from horizontal — almost
                   * straight down the screen, towards the camera — and
                   * every delivered vehicle is drawn BROADSIDE. So a van
                   * on that road is side-on to its own direction of
                   * travel for the whole journey, and no transform
                   * repairs that: a side view turned 82 degrees is a van
                   * standing on its nose.
                   *
                   * `sideViewTurnDeg` turns it as far as broadside art
                   * can bear and no further, which makes it visibly
                   * angled into the road instead of perfectly level
                   * across it. That is an improvement and it is not the
                   * fix. The fix is a vehicle drawn from behind — see
                   * `vehicle-motion.ts`, where the measurement lives
                   * with a test that changes its own answer the day
                   * either the plate or the art does.
                   */
                  rotate: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: travelled.map((d) => `${(leanAt(gait, d, facing) + turn).toFixed(2)}deg`),
                  }),
                },
                /*
                 * ---------------------------------------------------------
                 * FACING THE WAY IT IS ACTUALLY GOING
                 * ---------------------------------------------------------
                 * Amit: *"המשאית סתם מרחפת נגד הכיוון ולא נראית נוסעת
                 * בכלל."*
                 *
                 * This was `p.reversed ? -1 : 1` — mirror the sprite if it
                 * entered from the far end — and it is wrong twice over.
                 *
                 * `reversed` says which END it started at, not which way it
                 * is pointing on screen. And the rule assumed every sprite
                 * is drawn facing the same way. They are not: the van and
                 * the tow truck have their cabs on the LEFT, the courier's
                 * scooter has its front wheel on the RIGHT, and the dog
                 * walker faces the camera and has no side at all. One
                 * global flip cannot be right for three different facts,
                 * and for the van it was right in neither direction — it
                 * drove backwards up the street and backwards down it.
                 *
                 * So the mirror is worked out from the path the thing is
                 * actually travelling, against what its own art faces. A
                 * sprite with no side is never mirrored, because flipping
                 * a person who is looking at you does nothing except
                 * swap which hand holds the lead.
                 */
                { scaleX: mirror },
              ],
              opacity: 1,
            }
          : {
              transform: [
                { translateX: (still?.u ?? 0.5) * width - w / 2 },
                { translateY: (still?.v ?? 0.5) * height - base / 2 },
                { scale: depthScale(still?.v ?? 0.5) },
              ],
              opacity: p.driver.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            };

        /*
         * THE SHADOW, AS A SIBLING.
         *
         * Everything that moved through this world floated. `Walker` — the
         * customer's own figure — has had a contact shadow since it was
         * written, and nothing else did: not the courier, not the van, not
         * the tow truck, not the dog walker. In a 3/4 illustrated street a
         * figure with no patch of dark under it reads as a sticker on a
         * photograph, and the art direction says the artwork ships with no
         * baked shadow precisely BECAUSE the engine draws one.
         *
         * A sibling and not a child, for two reasons the geometry module
         * already names: it must not rise with the bob — it is on the
         * ground while the figure is in the air, and it fades instead —
         * and it must not lean with the stride, because tarmac does not
         * tilt.
         *
         * So it repeats the position and the depth scale and takes neither
         * the bob nor the rotation.
         */
        /*
         * Light casts none. The ellipse goes under things that stand on
         * the ground; a window lighting up is not standing anywhere.
         */
        const castsShadow = !spec.drawn;
        const shadowW = w * SHADOW.widthRatio;
        const shadowH = shadowW * SHADOW.flatness;

        const shadowStyle = path
          ? {
              transform: [
                {
                  translateX: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.u * width - shadowW / 2),
                  }),
                },
                {
                  // The GROUND point, which is the bottom of the figure's
                  // box rather than its middle — so the ellipse sits where
                  // the wheels are, not where the roof is.
                  translateY: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.v * height - shadowH / 2),
                  }),
                },
                {
                  scale: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.scale),
                  }),
                },
              ],
              opacity: SHADOW.opacity,
            }
          : {
              transform: [
                { translateX: (still?.u ?? 0.5) * width - shadowW / 2 },
                { translateY: (still?.v ?? 0.5) * height - shadowH / 2 },
                { scale: depthScale(still?.v ?? 0.5) },
              ],
              opacity: p.driver.interpolate({
                inputRange: [0, 0.25, 0.75, 1],
                outputRange: [0, SHADOW.opacity, SHADOW.opacity, 0],
              }),
            };

        return (
          <React.Fragment key={`${p.moment}-${p.startedAt}`}>
            {castsShadow ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: shadowW,
                    height: shadowH,
                  },
                  shadowStyle,
                ]}
              >
                {/*
                  * THREE ELLIPSES, NOT ONE.
                  *
                  * A single flat ellipse has a hard rim, and a hard dark
                  * rim on warm stone reads as a DISC the figure is
                  * standing on rather than as a shadow — which is why a
                  * figure with one can look more detached from the ground
                  * than a figure with none. Amit: *"סתם מרחפת."*
                  *
                  * Concentric, same ink, each wider and fainter. The
                  * falloff is drawn rather than blurred, so it is
                  * identical on every platform — the whole reason this
                  * shadow is code and not a platform shadow. See `SHADOW.rings`.
                  */}
                {SHADOW.rings.map((ring) => (
                  <View
                    key={ring.scale}
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: (shadowW * (1 - ring.scale)) / 2,
                      top: (shadowH * (1 - ring.scale)) / 2,
                      width: shadowW * ring.scale,
                      height: shadowH * ring.scale,
                      borderRadius: 999,
                      backgroundColor: `rgba(14,10,20,${ring.alpha})`,
                    }}
                  />
                ))}
              </Animated.View>
            ) : null}

          <Animated.View
            style={[{ position: "absolute", left: 0, top: 0, width: w, height: base }, travelStyle]}
          >
            {spec.drawn ? (
              /*
               * A WINDOW COMING ON.
               *
               * Two circles of the palette's own window amber: a small
               * bright core where the glass is, and a wide soft halo for
               * the light spilling onto the street around it. No border,
               * no frame, no shape that claims to be a building — the
               * shopfronts are somebody's drawing and this is only the
               * light in one of them.
               *
               * The fade in and out is the opacity the still moments
               * already have, which is exactly the right curve for this:
               * a light comes on, stays, and goes off.
               */
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: w,
                    height: base,
                    borderRadius: 999,
                    backgroundColor: P.lampGlow,
                    opacity: 0.16,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: w * 0.3,
                    top: base * 0.3,
                    width: w * 0.4,
                    height: base * 0.4,
                    borderRadius: 999,
                    backgroundColor: P.window,
                    opacity: 0.7,
                  }}
                />
              </View>
            ) : (
            <AssetSlot
              placement={{
                key: p.moment,
                assetId: spec.assetId,
                item: {
                  id: spec.assetId,
                  file: "",
                  intrinsicWidth: 1,
                  intrinsicHeight: 1,
                  anchor: { x: 0.5, y: 1 },
                  role: "PRESENCE",
                  theme: "SHARED",
                  defaultWidthRatio: spec.widthRatio,
                  critical: false,
                },
                layer: "PRESENCE",
                left: 0,
                top: 0,
                width: w,
                height: base,
                depthOrder: 0,
              }}
              sources={sources}
              quiet
              pending="none"
            />
            )}
          </Animated.View>
          </React.Fragment>
        );
      })}
    </View>
  );
}
