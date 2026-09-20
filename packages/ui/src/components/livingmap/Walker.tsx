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
  animate = true,
  onSettled,
}: WalkerProps) {
  const source = assetId ? sources[assetId] : undefined;

  const at = useRef<NormalizedPoint>(clampWalkable(startAt));
  const distance = useRef(0);
  const bob = useRef(new Animated.Value(0)).current;
  const lean = useRef(new Animated.Value(0)).current;

  /*
   * Facing is STATE and not another Animated value, deliberately. It
   * changes when somebody turns — a few times a walk — and a mirror is
   * not something to interpolate through: halfway between a figure and
   * its mirror image is a figure of zero width.
   */
  const [facing, setFacing] = useState<1 | -1>(1);

  /*
   * THE WALK.
   *
   * Driven by elapsed time rather than by a fixed step per frame, so a
   * phone that drops to 30fps walks at the same speed as one that does
   * not — it takes larger steps, which is right. A per-frame constant
   * would make the whole world's pace a property of the hardware.
   */
  useEffect(() => {
    if (!heading || !animate || !source) return;

    setFacing(facingFor(heading));

    let frame = 0;
    let last = Date.now();
    let lastReport = last;

    const tick = () => {
      const now = Date.now();
      const dt = Math.min(64, now - last); // a backgrounded tab must not teleport
      last = now;

      const next = clampWalkable(stepFrom(at.current, heading, dt));
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
      bob.setValue(bobAt(STEER_GAIT, distance.current));
      lean.setValue(leanAt(STEER_GAIT, distance.current, facingFor(heading)));

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
  }, [animate, bob, heading, lean, onSettled, source, u, v]);

  /*
   * STANDING STILL IS NOT MID-STRIDE.
   *
   * Releasing the pad leaves the figure wherever the last frame put it —
   * possibly at the top of a step, leaning. Settling the bob and the lean
   * back to zero is what makes letting go read as stopping rather than as
   * the animation being paused.
   */
  useEffect(() => {
    if (heading) return;
    const settle = Animated.parallel([
      Animated.timing(bob, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(lean, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]);
    settle.start();
    return () => settle.stop();
  }, [bob, heading, lean]);

  if (!source) return null;

  /*
   * SIZE. The avatar is the nearest thing in the world — it is the person
   * holding the phone — so it is drawn larger than a professional standing
   * in a doorway and larger than anything travelling the lane. Depth still
   * applies on top: walking up the street makes it smaller, exactly as it
   * does for everything else, because one depth rule for the whole world
   * is what stops a figure reading as a sticker.
   */
  const baseH = height * AVATAR_HEIGHT * Math.max(0, heightRatio);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [depthScale(0), depthScale(1)] });

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
          width: baseH * SHADOW.widthRatio * SHADOW_FIGURE_RATIO,
          height: baseH * SHADOW.widthRatio * SHADOW_FIGURE_RATIO * SHADOW.flatness,
          borderRadius: 999,
          backgroundColor: "rgba(14,10,20,1)",
          opacity: Animated.multiply(
            /*
             * Fading with the lift, read straight off the bob rather than
             * off a clock — so the shadow and the step can never disagree
             * about where the foot is.
             */
            bob.interpolate({
              inputRange: [-GAITS[STEER_GAIT].bob, 0],
              outputRange: [SHADOW.opacity * (1 - SHADOW.liftFade), SHADOW.opacity],
              extrapolate: "clamp",
            }),
            1
          ),
          transform: [
            {
              translateX: Animated.subtract(
                Animated.multiply(u, width),
                Animated.multiply(scale, (baseH * SHADOW.widthRatio * SHADOW_FIGURE_RATIO) / 2)
              ),
            },
            { translateY: Animated.multiply(v, height) },
            { scale },
          ],
        }}
      />

      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: baseH * FIGURE_ASPECT,
          height: baseH,
          transform: [
            // Centred horizontally on the walker's point.
            {
              translateX: Animated.subtract(
                Animated.multiply(u, width),
                Animated.multiply(scale, (baseH * FIGURE_ASPECT) / 2)
              ),
            },
            /*
             * The feet, not the middle. `scale` below grows the box about
             * its CENTRE, so half of any growth goes downward and a figure
             * that scales up sinks into the pavement. Subtracting half the
             * scaled height puts the bottom edge exactly on the point.
             * Amit saw the un-corrected version on the scooter and called
             * it what it was: *"כאילו הוא נופל."*
             */
            {
              translateY: Animated.subtract(
                Animated.multiply(v, height),
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
 * The avatar's height as a fraction of the world.
 *
 * Larger than `travellerHeight` and larger than `character`, because this
 * one figure is in the foreground by definition: it is where the customer
 * is standing.
 */
const AVATAR_HEIGHT = WORLD_SIZE.travellerHeight * 1.7;

/** A standing person is roughly this much wider than tall. */
const FIGURE_ASPECT = 0.42;

/** The shadow is sized off the figure's WIDTH, which is derived from its height. */
const SHADOW_FIGURE_RATIO = FIGURE_ASPECT;

const styles = StyleSheet.create({
  figure: { width: "100%", height: "100%" },
});
