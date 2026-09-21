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
   *
   * `following` IS PART OF THAT ANSWER, AND LEAVING IT OUT WAS A LIE.
   *
   * `visibleLeft` is read from `to.current` — the camera's own travel
   * target. That is the truth while the camera is travelling and while it
   * is parked, and it is the truth during a drag because the drag writes
   * its own ref. It is NOT the truth while the viewport is following
   * somebody: then the transform comes from `followTransform`, which
   * interpolates the followed point's Animated values and clamps them at
   * the edges of the plate, and `to.current` still holds whatever the last
   * `focus` asked for. The two disagreed by a factor of two on the wait
   * screen — the camera was clamped at half the offset the number claimed
   * — so the one card that uses it to stay on the phone slid a quarter of
   * itself off the right edge and stayed there for the whole wait.
   *
   * There is no honest plain number to hand over in that case: the
   * position lives in Animated values precisely so that walking does not
   * re-render the neighbourhood, and reading it back per frame would undo
   * that. So the flag says the offsets are stale and a caller that needs
   * to be exact must not use them. See `VenueLayer`.
   */
  children: (world: {
    width: number;
    height: number;
    visibleLeft: number;
    visibleTop: number;
    following: boolean;
  }) => React.ReactNode;
  onDragStart?: () => void;
  /**
   * BUMP THIS WHEN THE STORY MOVES ON.
   *
   * A hand-dragged world stays where it was put — that is the rule, and it
   * is right. What was missing was the other half of it: `dragged` was set
   * by the pan responder and NEVER cleared, by anything, anywhere. One
   * sideways drag and the camera was dead for the rest of the session.
   *
   * What that looked like: a customer without a walking figure drags the
   * street to look around, then taps a shop. The journey runs, the phase
   * changes, every camera shot is computed — and the world does not move a
   * pixel. The pull-back-and-push-in Amit asked for ("רוצה שיקח אותי בזום
   * אווט לבית העסק הרצוי ואז זום אין") silently did nothing, permanently,
   * after one drag, and there was no way back short of leaving the screen.
   *
   * So the host changes this number whenever the camera is being given a
   * genuinely new intent — a phase change, a journey starting — and the
   * drag is released. Not on every focus change: the sweep moves the focus
   * five times a second, and honouring that would snatch the world back
   * from under somebody's thumb.
   */
  recentreKey?: number;
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
  recentreKey = 0,
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

  /*
   * Read as numbers so the effect below can depend on the VALUES rather
   * than on the object — see the long note at the end of that effect.
   */
  const focusU = focus?.u ?? null;
  const focusV = focus?.v ?? null;

  /*
   * DRAGGING WITHOUT RE-RENDERING THE NEIGHBOURHOOD.
   *
   * This used to be `useState`, written by `onPanResponderMove` — sixty
   * times a second. That is viewport state, so `children(world)` was
   * re-invoked and `WorldStage`, `WorldLife`, `DistrictLayer`,
   * `VenueLayer`, `ErrandLayer` and `Walker` all re-rendered, none of them
   * memoised. `WorldLife` alone rebuilt a 160-sample path per vehicle on
   * every one of those renders, along with five interpolation nodes that
   * had to be detached from and reattached to the native view.
   *
   * So panning the world stuttered, and the traffic driving down the
   * street stuttered with it — on the exact gesture the world exists to
   * invite (*"רוצה שיטיילו ברחובות"*).
   *
   * The position is an Animated pair now, written by the responder and
   * read by the transform, so a drag re-renders nothing at all. `dragging`
   * is still state, because the transform has to CHOOSE this pair over the
   * travel interpolation — but it changes once when a drag begins rather
   * than sixty times while it continues.
   */
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragAt = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const travel = useRef(new Animated.Value(1)).current;
  const from = useRef(offsetFor(focus));
  const to = useRef(offsetFor(focus));

  /*
   * The story moved on, so the camera takes the world back. See
   * `recentreKey` — the drag holds until something means to move us.
   */
  useEffect(() => {
    setDragging(false);
  }, [recentreKey]);

  /*
   * Following overrides dragging by construction (see `transform`), so a
   * drag left behind when the camera picks somebody up would come back the
   * moment they were put down. Released here rather than left to rot.
   */
  useEffect(() => {
    if (follow) setDragging(false);
  }, [follow]);

  useEffect(() => {
    // A hand-dragged world stays where it was put.
    if (dragging) return;
    const next = offsetFor(focus);
    if (next.x === to.current.x && next.y === to.current.y) return;
    from.current = to.current;
    to.current = next;
    travel.setValue(0);
    if (!animate) {
      travel.setValue(1);
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
    const anim = Animated.timing(travel, {
      toValue: 1,
      duration: 1200,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
    /*
     * THE SCALARS, NOT THE OBJECT — AND WHY IT MATTERED SO MUCH.
     *
     * `focus` is `sweep.camera.focus`, and `sweepFrame` returns a fresh
     * `{ u, v }` literal every time it is called — five times a second
     * during the whole search. Depending on the object meant this effect
     * re-ran at 5 Hz, and React runs the PREVIOUS cleanup before the new
     * body: `anim.stop()` fired first, then the equality guard above
     * returned early and started nothing.
     *
     * So the camera lunged about a sixth of the way towards the next
     * shop, stopped dead, sat frozen for the rest of the two-second stop,
     * and then snapped the remaining five-sixths in one frame when the
     * sweep moved on. The camera tour the entire SEARCHING phase is built
     * around played as a stutter-and-snap loop — which is the exact thing
     * the sweep was written to fix ("אני חייב שבזמן חיפוש במפה תהיה
     * תזוזה בין מספרות").
     *
     * The u and v are constant within a stop, so on the scalars the
     * effect runs once per move and the 1200ms ease plays out whole.
     */
  }, [animate, dragging, focusU, focusV, offsetFor, travel]);

  /*
   * How much of the last zoom is still showing. 1 means "the layout is
   * the picture"; anything else is a zoom in flight. See `transform`.
   */
  const zoomScale = useRef(new Animated.Value(1)).current;
  const lastZoom = useRef(zoom);
  useEffect(() => {
    if (lastZoom.current === zoom) return;
    const from = lastZoom.current / zoom;
    lastZoom.current = zoom;
    if (!animate) {
      zoomScale.setValue(1);
      return;
    }
    zoomScale.setValue(from);
    const anim = Animated.timing(zoomScale, {
      toValue: 1,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, zoom, zoomScale]);

  const startAt = useRef({ x: 0, y: 0 });
  const responder = useMemo(
    () =>
      PanResponder.create({
        // A threshold, so a tap on a shop still reaches the shop. Without
        // it the responder swallows every touch and nothing is tappable.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => explorable && !follow && Math.hypot(g.dx, g.dy) > 12,
        onPanResponderGrant: () => {
          startAt.current = dragAt.current.x === 0 && dragAt.current.y === 0 ? to.current : dragAt.current;
          dragX.setValue(startAt.current.x);
          dragY.setValue(startAt.current.y);
          // One render per drag, not one per move: the transform has to
          // switch to reading the pair, and that is all this is for.
          setDragging(true);
          onDragStart?.();
        },
        onPanResponderMove: (_e, g) => {
          const x = Math.min(0, Math.max(width - worldW, startAt.current.x + g.dx));
          const y = Math.min(0, Math.max(height - worldH, startAt.current.y + g.dy));
          dragAt.current = { x, y };
          dragX.setValue(x);
          dragY.setValue(y);
        },
      }),
    [dragX, dragY, explorable, follow, height, onDragStart, width, worldH, worldW]
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

  /*
   * ---------------------------------------------------------------------
   * THE ZOOM, AS A MOVE RATHER THAN A CUT
   * ---------------------------------------------------------------------
   * Amit, twice: *"הפלואו קופץ לא טוב"* and *"גם באיתור המסך קופץ."*
   *
   * `zoom` decides how big the world's LAYOUT is, and every child's
   * position is a fraction of that — which is exactly why the coordinates
   * stay honest, and exactly why a change of zoom landed in one frame.
   * The search moves through four shots, so the screen jumped four times
   * on the one screen the customer stares at while waiting.
   *
   * Animating the layout size is not an option: every child would
   * re-measure sixty times a second, on the screen that draws the whole
   * neighbourhood. So the layout goes to the NEW zoom immediately and a
   * transform carries the picture from the old one — `scale` from
   * `oldZoom / newZoom` back to 1. Nothing re-renders; it runs on the
   * same driver as everything else here.
   *
   * THE PART THAT IS NOT OBVIOUS: a scale is about the layer's own
   * centre, and the layer is up to 1.85 screens wide with its centre
   * usually off-screen. Left alone, zooming would slide the world
   * sideways as it grew. So the scale is paired with a compensating
   * translate that keeps whatever is at the middle of the PHONE where it
   * is — the same point the eye is already on:
   *
   *     screen(p) = tx + w/2 + (p - w/2) * s
   *     e         = (cx - tx - w/2) * (1 - s)
   *
   * `tx` is whichever offset is in play, animated or not, so the
   * correction is built out of `Animated.subtract`/`multiply` rather than
   * numbers and holds while the camera is also travelling or following.
   */
  const baseTransform = followTransform
    ? followTransform
    : dragging
    ? [{ translateX: dragX }, { translateY: dragY }]
    : [
        {
          translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [from.current.x, to.current.x] }),
        },
        {
          translateY: travel.interpolate({ inputRange: [0, 1], outputRange: [from.current.y, to.current.y] }),
        },
      ];

  const tX = baseTransform[0]!.translateX as Animated.Animated;
  const tY = baseTransform[1]!.translateY as Animated.Animated;
  const oneMinusScale = Animated.subtract(1, zoomScale);
  const transform = [
    ...baseTransform,
    { translateX: Animated.multiply(Animated.subtract(width / 2 - worldW / 2, tX), oneMinusScale) },
    { translateY: Animated.multiply(Animated.subtract(height / 2 - worldH / 2, tY), oneMinusScale) },
    { scale: zoomScale },
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
          /*
           * The plate's offset is negative when it is slid left, so the
           * world coordinate at the screen's left edge is its negation.
           *
           * Read from the drag's own ref rather than from state, since the
           * drag no longer re-renders — which means this value is the one
           * from the START of the current drag rather than a live reading.
           * That is the same staleness the plain-number version had
           * between renders, and the two callers use it only to decide
           * which quarter of the world to draw.
           */
          visibleLeft: -(dragging ? dragAt.current.x : to.current.x),
          visibleTop: -(dragging ? dragAt.current.y : to.current.y),
          /* Whether the two numbers above mean anything. See `children`. */
          following: followTransform !== null,
        })}
      </Animated.View>
    </View>
  );
}
