import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

import {
  bobAt,
  clampWalkable,
  depthScale,
  facingFor,
  GAITS,
  leanAt,
  stepFrom,
  STEER_GAIT,
  WORLD_SIZE,
  type Gait,
  type Heading,
  type NormalizedPoint,
} from "@pro-now/types";

import { EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { SHADOW } from "./contactShadow";

/**
 * THE CUSTOMER, IN THE STREET.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS FOR
 * ---------------------------------------------------------------------
 * Amit: *"אני רוצה גם שהלקוח יגדיר לעצמו אווטאר בהתחלה… ואיתו הוא יטייל
 * בין העסקים, וכל החוויה תהיה דרך האווטאר של הלקוח."* And on what the
 * walk is supposed to feel like: *"רוצה חוויה של טיול ברחוב בין מגוון
 * העסקים שלנו — שירגישו כמו VR."*
 *
 * A map you drag has no you in it. The moment there is a figure with a
 * back, the same pixels moving the same way stop being a map being panned
 * and become a street being walked down. That is the entire difference,
 * and it costs one sprite.
 *
 * ---------------------------------------------------------------------
 * WHY THE LOOP LIVES HERE AND NOT IN THE SCENE
 * ---------------------------------------------------------------------
 * A walk is sixty positions a second. Keeping that in the scene's state
 * would re-render the whole neighbourhood — every shopfront, every
 * district, the traffic — sixty times a second to move one figure.
 *
 * So the position is `Animated.Value`s that this component is handed and
 * writes into directly. Nothing above it re-renders while somebody walks,
 * and the camera reads the same two values (see `WorldViewport.follow`),
 * so the view and the figure cannot drift apart: there is only one number
 * for where the customer is.
 *
 * ---------------------------------------------------------------------
 * AND IT DRAWS NOTHING WITHOUT ART
 * ---------------------------------------------------------------------
 * No avatar chosen, or the file has not arrived, and this renders null —
 * not a placeholder body. A grey rectangle walking down the street is
 * worse than no customer at all, and the app must not imply the customer
 * looks like anything it has not been told.
 */
export interface WalkerProps {
  /** The chosen avatar's world figure, or null for "not chosen / no art". */
  assetId: string | null;
  /**
   * How tall this figure is, as a fraction of a standing person.
   *
   * Comes from the roster rather than from anything this component can
   * work out: a dog and a person are the same number of pixels of PNG and
   * only the roster knows which is which. See `AvatarOption.heightRatio`.
   */
  heightRatio?: number;
  sources?: WorldAssetSources;
  /** The world's size in points — NOT the viewport's. */
  width: number;
  height: number;
  /** Written by this component; read by the camera. Created by the scene. */
  u: Animated.Value;
  v: Animated.Value;
  /** Where the walk starts and, once walking, where it currently is. */
  startAt: NormalizedPoint;
  /** The live heading from the pad. Null means standing still. */
  heading: Heading;
  /**
   * SOMEWHERE TO WALK TO, WITHOUT ANYBODY STEERING.
   *
   * Amit, on what the search should feel like: *"הרדאר שלנו עובר בלי
   * כפתור לחיצות, עם הדמות בין הרחובות ומחפש איש מקצוע."* While dispatch
   * is checking, nobody should be handed a control — the screen's job is
   * to show that something is happening, not to give somebody something
   * to do. But the figure should not be standing still either, because
   * the thing being shown is a search.
   *
   * So the scene hands the walker a destination and it walks there on its
   * own, using the same gait, the same bob and the same contact shadow as
   * a steered walk. Nothing about the motion is a special case; only who
   * chose the direction is different.
   *
   * `heading` wins when both are set: a thumb on the pad always beats the
   * camera.
   */
  autoTo?: NormalizedPoint | null;
  /**
   * Walking or running.
   *
   * The gait carries its own speed, stride length, rise and lean — see
   * `GAITS` — so this one word changes all four together. That is the
   * point of the table: a run built by multiplying a walk's speed gives
   * tiny frantic steps, which reads as a video played fast.
   */
  gait?: Gait;
  animate?: boolean;
  /** Told where the customer got to, rarely — for the scene to remember. */
  onSettled?: (at: NormalizedPoint) => void;
}

/** How often the walk reports upward. Not the frame rate — see below. */
const REPORT_MS = 700;

export function Walker({
  assetId,
  heightRatio = 1,
  sources = EMPTY_ASSET_SOURCES,
  width,
  height,
  u,
  v,
  startAt,
  heading,
  autoTo = null,
  gait = STEER_GAIT,
  animate = true,
  onSettled,
}: WalkerProps) {
  const source = assetId ? sources[assetId] : undefined;

  const at = useRef<NormalizedPoint>(clampWalkable(startAt));
  const distance = useRef(0);
  const bob = useRef(new Animated.Value(0)).current;
  const lean = useRef(new Animated.Value(0)).current;

  const [facing, setFacing] = useState<1 | -1>(1);

  /*
   * THE WALK.
   *
   * Driven by elapsed time rather than by a fixed step per frame, so a
   * phone that drops to 30fps walks at the same speed as one that does
   * not — it takes larger steps, which is right. A per-frame constant
   * would make the whole world's pace a property of the hardware.
   */
  /*
   * ONE LOOP FOR BOTH KINDS OF WALKING.
   *
   * A steered walk holds a heading until the thumb moves; an automatic
   * one recomputes the heading every frame from where it is going. They
   * are the same walk otherwise, and keeping them in one loop is what
   * stops the two from drifting into different gaits, different bobs and
   * two different bugs.
   */
  const target = heading ? null : autoTo;

  useEffect(() => {
    if ((!heading && !target) || !animate || !source) return;

    let frame = 0;
    let last = Date.now();
    let lastReport = last;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min(64, now - last); // a backgrounded tab must not teleport
      last = now;

      /*
       * Which way to face. Steered, it is the thumb. Automatic, it is
       * recomputed from the remaining distance — and `dv` is weighted by
       * the same 0.6 the rest of the world uses, so a destination up the
       * street is not mistaken for one beside you.
       */
      const h: Heading = heading ?? headingToward(at.current, target!);
      if (!h) {
        onSettled?.(at.current);
        return;
      }

      const next = clampWalkable(stepFrom(at.current, h, dt, GAITS[gait].speed));
      /*
       * Distance is measured from what actually moved, not from the time
       * elapsed. Walking into the edge of the world stops the figure; if
       * the bob kept advancing it would march on the spot, which is the
       * single most obvious tell that a character is a sprite.
       */
      const movedU = next.u - at.current.u;
      const movedV = (next.v - at.current.v) * 0.6;
      const moved = Math.hypot(movedU, movedV);
      at.current = next;
      distance.current += moved;

      u.setValue(next.u);
      v.setValue(next.v);
      bob.setValue(bobAt(gait, distance.current));
      lean.setValue(leanAt(gait, distance.current, facingFor(h)));

      if (now - lastReport > REPORT_MS) {
        lastReport = now;
        onSettled?.(next);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      onSettled?.(at.current);
    };
  }, [animate, bob, gait, heading, lean, onSettled, source, target, u, v]);

  /*
   * Facing is STATE and not another Animated value, deliberately. It
   * changes when somebody turns — a few times a walk — and a mirror is
   * not something to interpolate through: halfway between a figure and
   * its mirror image is a figure of zero width.
   */
  useEffect(() => {
    if (heading) setFacing(facingFor(heading));
  }, [heading]);

  /*
   * STANDING STILL IS NOT MID-STRIDE.
   *
   * Releasing the pad leaves the figure wherever the last frame put it —
   * possibly at the top of a step, leaning. Settling the bob and the lean
   * back to zero is what makes letting go read as stopping rather than as
   * the animation being paused.
   */
  useEffect(() => {
    if (heading || target) return;
    const settle = Animated.parallel([
      Animated.timing(bob, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(lean, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]);
    settle.start();
    return () => settle.stop();
  }, [bob, heading, lean, target]);

  if (!source) return null;

  /*
   * SIZE, MEASURED AGAINST THE BUILDINGS RATHER THAN AGAINST THE WORLD.
   *
   * This used to be a fraction of the world's HEIGHT while the
   * professionals standing in doorways were a fraction of a shopfront's
   * WIDTH. Two rulers, nothing keeping them in step, and the result
   * shipped: the customer stood 2.75 times the height of the
   * professional in the next doorway — taller than a two-storey shop.
   *
   * Now both come from `personOfVenue`, so they cannot drift again, and
   * the avatar's small extra size is `avatarOfPerson`: a number with a
   * reason (it is the nearest figure in the world) rather than an
   * accident of which quantity somebody reached for first.
   *
   * Depth still applies on top: walking up the street makes it smaller,
   * exactly as it does for everything else.
   */
  const venueWidth = width * WORLD_SIZE.district;
  const baseH =
    venueWidth * WORLD_SIZE.personOfVenue * WORLD_SIZE.avatarOfPerson * Math.max(0, heightRatio);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [depthScale(0), depthScale(1)] });

  const figureW = baseH * FIGURE_ASPECT;
  const shadowW = figureW * SHADOW.widthRatio;
  const shadowH = shadowW * SHADOW.flatness;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/*
        * THE SHADOW IS A SIBLING, NOT A CHILD.
        *
        * It has to stay on the ground while the figure rises off it, so it
        * must not inherit the figure's bob. See `contactShadow.ts`.
        */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: shadowW,
          height: shadowH,
          borderRadius: 999,
          backgroundColor: "rgba(14,10,20,1)",
          /*
           * Fading with the lift, read straight off the bob rather than
           * off a clock — so the shadow and the step can never disagree
           * about where the foot is.
           */
          opacity: bob.interpolate({
            inputRange: [-GAITS[gait].bob, 0],
            outputRange: [SHADOW.opacity * (1 - SHADOW.liftFade), SHADOW.opacity],
            extrapolate: "clamp",
          }),
          transform: [
            /*
             * CENTRED ON THE GROUND POINT, BOTH WAYS.
             *
             * A transform's scale is about the box's CENTRE, so the
             * visual centre of a box at `translate` stays at
             * `translate + size/2` whatever the scale — which means the
             * offset is half the UNSCALED size and must not be multiplied
             * by it. I had it scaled, and the ellipse crept sideways and
             * downward out from under the feet as the figure walked up
             * the street. It is the same arithmetic the scooter needed.
             */
            { translateX: Animated.subtract(Animated.multiply(u, width), shadowW / 2) },
            { translateY: Animated.subtract(Animated.multiply(v, height), shadowH / 2) },
            { scale },
          ],
        }}
      />

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: figureW,
          height: baseH,
          transform: [
            /*
             * Centred horizontally on the walker's point — by half the
             * UNSCALED width, because scale is about the centre and so
             * leaves the centre where the translate put it.
             */
            { translateX: Animated.subtract(Animated.multiply(u, width), figureW / 2) },
            /*
             * The feet, not the middle. `scale` below grows the box about
             * its CENTRE, so half of any growth goes downward and a figure
             * that scales up sinks into the pavement. After scaling by s
             * the bottom edge sits at `top + h * (1 + s) / 2`, so that is
             * what has to be subtracted — not `s * h / 2`, which is what I
             * wrote first and which left the figure hovering above the
             * road with a gap that changed as it walked. Amit saw exactly
             * this on the scooter: *"כאילו הוא נופל."*
             */
            {
              translateY: Animated.subtract(
                Animated.subtract(Animated.multiply(v, height), baseH / 2),
                Animated.multiply(scale, baseH / 2)
              ),
            },
            // The stride, in figure-heights and scaled with the figure.
            { translateY: Animated.multiply(Animated.multiply(bob, baseH), scale) },
            { scale },
            { rotate: lean.interpolate({ inputRange: [-4, 4], outputRange: ["-4deg", "4deg"] }) },
            { scaleX: facing },
          ],
        }}
      >
        <Image source={source} style={styles.figure} resizeMode="contain" />
      </Animated.View>
    </View>
  );
}

/**
 * Which of the eight headings points at a destination.
 *
 * Null once the figure is close enough to have arrived — without that, a
 * walker oscillates across its target forever, one step past and one step
 * back, which reads as a figure having a seizure on the pavement.
 */
function headingToward(from: NormalizedPoint, to: NormalizedPoint): Heading {
  const du = to.u - from.u;
  // The 3/4 weighting, so a destination up the street is not mistaken
  // for one beside you. The whole world measures depth this way.
  const dv = (to.v - from.v) * 0.6;
  if (Math.hypot(du, dv) < ARRIVED) return null;
  const deg = (Math.atan2(du, -dv) * 180) / Math.PI;
  return COMPASS[Math.round(((deg + 360) % 360) / 45) % 8]!;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

/** Close enough. See `headingToward`. */
const ARRIVED = 0.02;

/** A standing person is roughly this much wider than tall. */
const FIGURE_ASPECT = 0.42;


const styles = StyleSheet.create({
  figure: { width: "100%", height: "100%" },
});
