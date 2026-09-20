import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, View } from "react-native";

import { WORLD_EXTENT, type NormalizedPoint } from "@pro-now/types";

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
  animate = true,
  children,
  onDragStart,
}: WorldViewportProps) {
  const worldW = width * (worldSized ? WORLD_EXTENT.width : 1) * zoom;
  const worldH = height * (worldSized ? WORLD_EXTENT.height : 1) * zoom;

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
        onMoveShouldSetPanResponder: (_e, g) => explorable && Math.hypot(g.dx, g.dy) > 12,
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
    [dragged, explorable, height, onDragStart, width, worldH, worldW]
  );

  const transform = dragged
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
