import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

import {
  bobAt,
  clampWalkable,
  walkStep,
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
import { SHADOW } from "./shadowGeometry";

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
  /**
   * A shopfront's width as a fraction of the world, when it is not the
   * painted plate's 0.16. Everything alive is measured against it.
   */
  districtWidth?: number;
  /** The chosen avatar's world figure, or null for "not chosen / no art". */
  assetId: string | null;
  /**
   * The face to show while the walking figure has not been drawn.
   *
   * Drawn as a marker rather than as a figure — see `walkingFallbackFor`.
   * Null means show nothing, which stays the right answer for a customer
   * who skipped the picker.
   */
  fallbackAssetId?: string | null;
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
  fallbackAssetId = null,
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
  districtWidth,
  onSettled,
}: WalkerProps) {
  const figureSource = assetId ? sources[assetId] : undefined;
  /*
   * THE FIGURE IF IT EXISTS, THE FACE IF IT DOES NOT, NOTHING IF NEITHER.
   *
   * Until this, no `avatar_XX_world_back` had been drawn and `Walker`
   * returned null — so a customer chose a character, walked into the
   * street, and there was nobody in it. The marker below is the stand-in;
   * the moment the real figures land, `figureSource` resolves and this
   * whole branch stops being reached.
   */
  const markerSource = figureSource ? undefined : fallbackAssetId ? sources[fallbackAssetId] : undefined;
  const source = figureSource ?? markerSource;
  const asMarker = !figureSource && Boolean(markerSource);

  const at = useRef<NormalizedPoint>(clampWalkable(startAt));
  const distance = useRef(0);
  const bob = useRef(new Animated.Value(0)).current;
  const lean = useRef(new Animated.Value(0)).current;

  const [facing, setFacing] = useState<1 | -1>(1);
  /**
   * Whether the figure is actually taking steps right now.
   *
   * Not the same as "has somewhere to go": on the search tour the
   * destination stays set for the whole phase while the figure arrives,
   * waits, and sets off again. The settle below needs the first question,
   * not the second.
   */
  const [moving, setMoving] = useState(false);

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
    setMoving(true);

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
        /*
         * ARRIVED. The loop ends here, and saying so is what lets the
         * settle below run — see the note on `moving`.
         */
        setMoving(false);
        onSettled?.(at.current);
        return;
      }

      /*
       * ON THE PAVEMENT, NOT JUST INSIDE THE RECTANGLE.
       *
       * `clampWalkable` alone let the figure stand in a flowerbed, on a
       * bench, or in the middle of the road — the box covers almost the
       * whole plate. `walkStep` adds the plate's own reading of where
       * stone is, and refuses the step rather than sliding, so hitting a
       * kerb reads as reaching something rather than as the animation
       * failing.
       */
      const next = walkStep(at.current, stepFrom(at.current, h, dt, GAITS[gait].speed));
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
   * Letting go is stopping, immediately — the loop's own cleanup does not
   * run for a steered figure until the next render, and a figure that
   * keeps its stride for a frame after the thumb lifts reads as lag.
   */
  useEffect(() => {
    if (!heading && !target) setMoving(false);
  }, [heading, target]);

  /*
   * STANDING STILL IS NOT MID-STRIDE.
   *
   * Releasing the pad leaves the figure wherever the last frame put it —
   * possibly at the top of a step, leaning. Settling the bob and the lean
   * back to zero is what makes letting go read as stopping rather than as
   * the animation being paused.
   */
  useEffect(() => {
    /*
     * GATED ON MOVING, NOT ON HAVING A DESTINATION.
     *
     * This used to be `if (heading || target) return`, and `target` is the
     * search sweep's focus, which stays non-null for the whole search. So
     * the settle never ran while the figure walked the camera's tour: it
     * reached a shop, the loop ended, and it stood there for the two
     * seconds of the stop with one foot off the ground and the body tilted
     * at whatever angle the last frame happened to produce — `bobAt` and
     * `leanAt` are continuous in distance, so the stopping pose is
     * arbitrary rather than neutral.
     *
     * It read as a paused video, which is the exact thing the note above
     * says this must never look like, four times a search.
     */
    if (moving) return;
    const settle = Animated.parallel([
      Animated.timing(bob, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(lean, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]);
    settle.start();
    return () => settle.stop();
  }, [bob, lean, moving]);

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
  /*
   * ONE RULER, AND IT IS THE SHOPFRONT'S.
   *
   * `WORLD_SIZE.district` is a fraction of the painted plate, so on a real
   * street plan it is a shopfront a hundred metres wide and a customer
   * thirty-nine metres tall. `districtWidth` is the same quantity measured
   * in metres when the ground has metres — see `REAL_METRES` — and it
   * arrives from the same place `DistrictLayer` gets it, which is the only
   * reason the two cannot drift apart again.
   */
  const venueWidth = width * (districtWidth ?? WORLD_SIZE.district);
  const baseH =
    venueWidth * WORLD_SIZE.personOfVenue * WORLD_SIZE.avatarOfPerson * Math.max(0, heightRatio);

  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [depthScale(0), depthScale(1)] });

  /*
   * A PIN IS A DIFFERENT SHAPE FROM A PERSON.
   *
   * A standing figure is tall and narrow; a marker is nearly round with a
   * point under it. Sized off the same `baseH` so it stands the right
   * height against the shopfronts — a pin the size of a person's head is
   * as wrong as one the size of a shop — but with its own proportions, so
   * the face is big enough to recognise and the point lands on the ground
   * rather than floating with empty box beneath it.
   */
  const boxH = asMarker ? baseH * MARKER_HEIGHT : baseH;
  const figureW = asMarker ? boxH * MARKER_ASPECT : baseH * FIGURE_ASPECT;
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
          height: boxH,
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
                Animated.subtract(Animated.multiply(v, height), boxH / 2),
                Animated.multiply(scale, boxH / 2)
              ),
            },
            // The stride, in figure-heights and scaled with the figure.
            { translateY: Animated.multiply(Animated.multiply(bob, boxH), scale) },
            { scale },
            { rotate: lean.interpolate({ inputRange: [-4, 4], outputRange: ["-4deg", "4deg"] }) },
            { scaleX: facing },
          ],
        }}
      >
        {asMarker ? (
          /*
           * A PIN WITH THEIR FACE IN IT, NOT A FLOATING HEAD.
           *
           * The portrait is a bust. Standing one in the street at a
           * person's height reads as a head walking along on nothing,
           * which is worse than an empty street. A ringed circle with a
           * point at the bottom is a shape everybody already reads as
           * "somebody is here" — so the customer can see where they are
           * and that it is THEIR character, without the drawing
           * pretending to be a person.
           *
           * The pin is the full box, and the face sits in the round part,
           * so the point lands where the feet would and the contact shadow
           * beneath it stays correct with no special case.
           */
          <View style={styles.marker}>
            <View style={styles.markerRing}>
              <Image source={source} style={styles.markerFace} resizeMode="cover" />
            </View>
            <View style={styles.markerPoint} />
          </View>
        ) : (
          <Image source={source} style={styles.figure} resizeMode="contain" />
        )}
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

/**
 * The marker's height, as a fraction of the figure it stands in for.
 *
 * Shorter than a person on purpose: a pin is a sign above a spot, not a
 * body. Tall enough to be seen from across the street, short enough that
 * nobody reads it as the finished character.
 */
const MARKER_HEIGHT = 0.82;
/** Nearly round — the ring plus the point beneath it. */
const MARKER_ASPECT = 0.84;


const styles = StyleSheet.create({
  figure: { width: "100%", height: "100%" },

  /*
   * The marker occupies the same box the figure would, so everything that
   * positions a walker — the centring, the feet-not-middle arithmetic, the
   * bob, the contact shadow — works on it unchanged.
   */
  marker: { width: "100%", height: "100%", alignItems: "center", justifyContent: "flex-start" },
  markerRing: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(20,14,28,0.9)",
  },
  markerFace: { width: "100%", height: "100%" },
  /*
   * The point, drawn as a rotated square with its lower half showing
   * below the ring — a triangle without an SVG, which keeps this one
   * component free of a renderer it does not otherwise need.
   */
  markerPoint: {
    width: "34%",
    aspectRatio: 1,
    marginTop: "-17%",
    transform: [{ rotate: "45deg" }],
    backgroundColor: "rgba(255,255,255,0.92)",
  },
});
