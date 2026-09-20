import { TRANSITIONS, transitionDirection, type NavDirection, type TransitionShape } from "@pro-now/types";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

/**
 * How one screen becomes the next.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS COMPONENT NO LONGER DECIDES
 * ---------------------------------------------------------------------
 * It used to own the whole transition: one animation, played for every
 * navigation in the product. Amit: *"אין חלונות מעבר אין עניין מזה"*, and
 * then *"תעבוד על כל המעברי עמוד."*
 *
 * The shape of a transition is not a property of the component that plays
 * it — it is a fact about the two screens either side of it, and that fact
 * now lives in `navigation-flow.ts`, where it is testable without a
 * renderer. This component's whole job is to play what it is handed.
 *
 * The important consequence is that NOTHING PASSES A DIRECTION. A screen
 * does not announce that it is a back; the component works it out from
 * where you were and where you are. That is what makes the phone's own back
 * gesture, the on-screen back control and a deep link all agree — they are
 * the same move, so they are the same animation, by construction rather
 * than by everyone remembering.
 *
 * ---------------------------------------------------------------------
 * WHY IT SLIDES, AND WHY LEFT IS FORWARD
 * ---------------------------------------------------------------------
 * It used to rise 18px and fade. A vertical nudge reads as a REFRESH — the
 * motion a list makes when it reloads. It says "this content changed", not
 * "you went somewhere". Screens here are places, so arriving at one should
 * read as travel. The app is Hebrew: reading runs right to left, so going
 * forward the new screen arrives from the LEFT, the direction the eye is
 * already travelling, and coming back reverses it.
 *
 * ---------------------------------------------------------------------
 * WHY THE OLD SCREEN IS NOT ANIMATED OUT
 * ---------------------------------------------------------------------
 * Only `opacity` and `transform` run off the JS thread. Keeping the
 * outgoing screen mounted to slide it away means holding two full screens —
 * two worlds, two maps — alive at once on a phone, and the incoming one
 * then stutters exactly when it is most visible. One layer arriving over a
 * settled background is the honest trade.
 */

export interface ScreenTransitionProps {
  /**
   * The identity of the screen being shown: build it with `screenKey` so
   * two categories count as two screens. Changing it replays the
   * transition.
   */
  transitionKey: string;
  /**
   * Where you are, so the direction can be worked out. `name` is the route
   * name; `side` separates the customer's journey from the professional's.
   * Omit it and everything is lateral — correct for a surface with no
   * journey, wrong for the app.
   */
  screen?: { side: "customer" | "pro" | "gate"; name: string };
  /**
   * An override, for the rare move whose direction is not its depth. Almost
   * nothing should pass this; if a screen needs it, the depth table is
   * probably wrong.
   */
  direction?: NavDirection;
  /** Reduced-motion: renders the settled frame with no animation. */
  animate?: boolean;
  children: React.ReactNode;
}

export function ScreenTransition({
  transitionKey,
  screen,
  direction,
  animate = true,
  children,
}: ScreenTransitionProps) {
  const v = useRef(new Animated.Value(animate ? 0 : 1)).current;

  /*
   * The screen we came FROM, and the shape currently playing.
   *
   * Both are refs, and the shape is CHOSEN ONCE per move rather than
   * recomputed on every render. That is not a micro-optimisation — a parent
   * re-render halfway through a slide (the world ticks, a timer fires, an
   * availability reading arrives) would otherwise recompute the direction
   * from a `previous` that now equals `screen`, swap the animation's start
   * offset underneath it and make the screen visibly jump.
   */
  const previous = useRef<{ side: "customer" | "pro" | "gate"; name: string } | null>(null);
  const playing = useRef<{ key: string; shape: TransitionShape } | null>(null);

  if (playing.current === null || playing.current.key !== transitionKey) {
    const resolved: NavDirection =
      direction ?? (screen ? transitionDirection(previous.current, screen) : "lateral");
    playing.current = { key: transitionKey, shape: TRANSITIONS[resolved] };
    if (screen) previous.current = screen;
  }
  const shape = playing.current.shape;

  useEffect(() => {
    if (!animate) {
      v.setValue(1);
      return;
    }
    v.setValue(0);
    const a = Animated.timing(v, {
      toValue: 1,
      duration: shape.durationMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
    /*
     * Keyed on the move itself. `shape` is in the list because the linter
     * is right to want it, and it is safe because it is one of three frozen
     * objects chosen once per move — so it changes exactly when
     * `transitionKey` does and never mid-flight.
     */
  }, [transitionKey, animate, v, shape]);

  /*
   * ---------------------------------------------------------------------
   * POINTS, NOT PERCENTAGES — AND THE REASON IS THE NATIVE DRIVER
   * ---------------------------------------------------------------------
   * This was `"-22%"`, which is the right idea and does not survive the
   * trip to a phone. React Native's native driver converts only colours,
   * `deg` and `rad` when it serialises an interpolation's output range;
   * a percentage string falls through and is handed to the native module
   * as a string. On Android that is a failed cast, and on iOS
   * `doubleValue` quietly reads "-22%" as -22 POINTS — a nudge instead of
   * a slide, on every screen change in the product.
   *
   * It looked correct only because the gallery runs on react-native-web,
   * where `useNativeDriver` is ignored and the JS interpolation handles
   * the string properly. A defect that is invisible in the place you
   * review and certain in the place you ship.
   *
   * So the share of the width is resolved to points here, against the
   * measured layout. The move still reads the same on a small phone and
   * a large one — it is the same fraction, worked out one step earlier.
   */
  const [width, setWidth] = useState(0);
  const from = shape.fromX * width;

  return (
    <Animated.View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        // Only on a real change: onLayout fires on every re-layout and a
        // setState per fire would re-render the screen mid-transition.
        setWidth((was: number) => (Math.abs(was - w) > 0.5 ? w : was));
      }}
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: v.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [shape.fromOpacity, Math.max(shape.fromOpacity, 0.85), 1],
          }),
          transform: [
            { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
