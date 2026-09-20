import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, View } from "react-native";

import { worldBox, type NormalizedPoint } from "@pro-now/types";

/**
 * WORLD VIEWPORT — the window the neighbourhood is seen through.
 *
 * ---------------------------------------------------------------------
 * THE BUG THIS EXISTS TO FIX
 * ---------------------------------------------------------------------
 * Amit: *"בחיפוש בעל מקצוע הוא לא לוקח אותי טיול, וכשהוא מוצא הוא לא מראה
 * לי את המקום או את בעל המקצוע הפנוי."*
 *
 * Both halves were one defect, and it is the kind that hides in plain
 * sight. When the world became a neighbourhood, venue positions became
 * WORLD coordinates — a point in a place 2.4 screens wide. But the layers
 * that draw them were still being handed the viewport's own width and
 * height, so `worldAnchor.u * width` squeezed the entire neighbourhood into
 * one screen. Every shop was on screen at once, which is why nothing ever
 * looked like travelling anywhere, and the camera's focus — also in world
 * coordinates — moved the ground under layers that were not moving with it,
 * so arriving at a venue arrived at nothing.
 *
 * So there is now one moving world layer and everything that lives in the
 * world goes inside it: the ground, the traffic, the shops, the people.
 * They share one coordinate system and one camera by construction, rather
 * than by three call sites agreeing.
 *
 * ---------------------------------------------------------------------
 * THE DRAG IS THE POINT, NOT A FEATURE
 * ---------------------------------------------------------------------
 * *"רוצה שיטיילו ברחובות."* Panning is clamped to the world rather than to
 * a small overhang, so a finger can actually travel — and it is clamped at
 * all so the edge of the plate never comes into view, which is the one
 * thing that turns a place back into a picture.
 *
 * A drag also takes the camera off automatic: once somebody has moved the
 * world themselves, having it slide back under them is the worst feeling a
 * map can produce. The sweep resumes only when the phase changes.
 */
export interface WorldViewportProps {
  width: number;
  height: number;
  /** Where to look, in world coordinates. */
  focus?: NormalizedPoint | null;
  /** 1 shows one screen of the world. Larger is closer in. */
  zoom?: number;
  /**
   * False when the plate is a single fitted image rather than the whole
   * neighbourhood. The world is then exactly one screen, and travelling to
   * a point would only crop into it — see WorldBackdrop for the same guard.
   */
  worldSized?: boolean;
  /** Lets the person drag the world around. */
  explorable?: boolean;
  /**
   * THE CAMERA FOLLOWS A PERSON RATHER THAN GOING TO A PLACE.
   *
   * Two Animated values in world coordinates — the walking customer's
   * position, written sixty times a second by `Walker`. When they are
   * here, the view is derived from them by interpolation, which means the
   * world moves on whatever driver the platform gives it and NOTHING
   * above this component re-renders while somebody walks.
   *
   * It also means the camera cannot lag behind the figure or lead it:
   * there is one number for where the customer is and both the figure and
   * the view are computed from it.
   *
   * Following also takes the drag away, because they are contradictory
   * gestures. Dragging says "the world moves and I am nowhere"; walking
   * says "I move and the world stays". Leaving both on would let somebody
   * pan the street away from their own avatar and then wonder why it snaps
   * back the moment they take a step.
   */
  follow?: { u: Animated.Value; v: Animated.Value } | null;
  animate?: boolean;
  /** Told the size of the world, so children can lay out in it. */
  /**
   * Children are told the world's size AND which part of it is on screen,
   * so a label or a card can tell whether it is about to hang off the
   * phone. `visibleLeft`/`visibleTop` are world pixels at the screen's
   * left/top edge.
   */
  children: (world: {
    width: number;
    height: number;
    visibleLeft: number;
    visibleTop: number;
  }) => React.ReactNode;
  onDragStart?: () => void;
}

export function WorldViewport({
  width,
  height,
  focus = null,
  zoom = 1,
  worldSized = true,
  explorable = false,
  follow = null,
  animate = true,
  children,
  onDragStart,
}: WorldViewportProps) {
  /*
   * The world box takes the PLATE's aspect, not the phone's. See
   * `worldBox` — a box shaped like the screen centre-crops the artwork,
   * which put every measured coordinate somewhere slightly different on
   * every device.
   */
  const box = worldBox(width, height, zoom, worldSized);
  const worldW = box.width;
  const worldH = box.height;

  /** Where the plate sits so a world point lands mid-screen. */
  const offsetFor = useMemo(
    () => (f: NormalizedPoint | null) => {
      if (!worldSized || !f) return { x: (width - worldW) / 2, y: (height - worldH) / 2 };
      // Clamped so the edge of the world never enters the frame — looking
      // past the end of the plate is what makes a place look like a photo.
      return {
        x: Math.min(0, Math.max(width - worldW, width / 2 - f.u * worldW)),
        y: Math.min(0, Math.max(height - worldH, height / 2 - f.v * worldH)),
      };
    },
    [height, width, worldH, worldSized, worldW]
  );

  const [dragged, setDragged] = useState<{ x: number; y: number } | null>(null);
  const travel = useRef(new Animated.Value(1)).current;
  const from = useRef(offsetFor(focus));
  const to = useRef(offsetFor(focus));

  useEffect(() => {
    // A hand-dragged world stays where it was put.
    if (dragged) return;
    const next = offsetFor(focus);
    if (next.x === to.current.x && next.y === to.current.y) return;
    from.current = to.current;
    to.current = next;
    travel.setValue(0);
    if (!animate) {
      travel.setValue(1);
      return;
    }
    Animated.timing(travel, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, dragged, focus, offsetFor, travel]);

  const startAt = useRef({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        // A threshold, so a tap on a shop still reaches the shop. Without
        // it the responder swallows every touch and nothing is tappable.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => explorable && !follow && Math.hypot(g.dx, g.dy) > 12,
        onPanResponderGrant: () => {
          startAt.current = dragged ?? to.current;
          onDragStart?.();
        },
        onPanResponderMove: (_e, g) => {
          setDragged({
            x: Math.min(0, Math.max(width - worldW, startAt.current.x + g.dx)),
            y: Math.min(0, Math.max(height - worldH, startAt.current.y + g.dy)),
          });
        },
      }),
    [dragged, explorable, follow, height, onDragStart, width, worldH, worldW]
  );

  /*
   * FOLLOWING, AS ARITHMETIC RATHER THAN AS A LOOP.
   *
   * The offset that puts a world point mid-screen is `width/2 - u*worldW`,
   * clamped so the edge of the plate never comes into frame. `interpolate`
   * clamps on its INPUT, so the bounds are expressed as the two values of
   * `u` at which the offset would hit them — which is the same clamp,
   * written where Animated can apply it without JS.
   */
  const followTransform = useMemo(() => {
    if (!follow || !worldSized) return null;
    const axis = (value: Animated.Value, screen: number, world: number) => {
      const span = world - screen;
      // A world no larger than the screen has nothing to follow across.
      if (span <= 0) return new Animated.Value((screen - world) / 2);
      const low = screen / 2 / world;
      const high = (world - screen / 2) / world;
      return value.interpolate({
        inputRange: [low, high],
        outputRange: [0, -span],
        extrapolate: "clamp",
      });
    };
    return [
      { translateX: axis(follow.u, width, worldW) },
      { translateY: axis(follow.v, height, worldH) },
    ];
  }, [follow, height, width, worldH, worldSized, worldW]);

  const transform = followTransform
    ? followTransform
    : dragged
    ? [{ translateX: dragged.x }, { translateY: dragged.y }]
    : [
        {
          translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [from.current.x, to.current.x] }),
        },
        {
          translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [from.current.y, to.current.y] }),
        },
      ];

  return (
    /*
     * THE RESPONDER LIVES ON THE WINDOW, NOT ON THE WORLD.
     *
     * It was attached to the moving layer, and dragging did nothing at all.
     * The reason is easy to miss: that layer is `WORLD_EXTENT` times the
     * viewport and slid mostly off-screen, so the part of it under the
     * finger was usually a region the responder could not claim — and once
     * a drag did start, the layer moved out from under the gesture it was
     * tracking.
     *
     * The window never moves, so a responder on it sees every drag
     * wherever the world happens to be. `box-none` keeps it out of the way
     * of taps, which still reach the shops underneath: the 12px threshold
     * below is what separates "opening a shop" from "walking down the
     * street".
     */
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      {...(explorable ? responder.panHandlers : {})}
    >
      <Animated.View
        style={{ position: "absolute", left: 0, top: 0, width: worldW, height: worldH, transform }}
        pointerEvents="box-none"
      >
        {children({
          width: worldW,
          height: worldH,
          // The plate's offset is negative when it is slid left, so the
          // world coordinate at the screen's left edge is its negation.
          visibleLeft: -(dragged?.x ?? to.current.x),
          visibleTop: -(dragged?.y ?? to.current.y),
        })}
      </Animated.View>
    </View>
  );
}
