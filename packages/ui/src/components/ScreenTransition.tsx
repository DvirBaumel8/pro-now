import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

/**
 * How one screen becomes the next.
 *
 * Amit: "המעברים בין הכרטיסיות שיהיו יותר חלקות וחדשניות." The prototype
 * swapped bodies instantly, which is not a neutral choice — an instant cut
 * makes every navigation feel like a page load, and on a phone it also
 * destroys the sense that you moved somewhere rather than that something
 * was replaced.
 *
 * The transition is deliberately small: 260ms, a short rise and a fraction
 * of scale. Anything longer starts costing real time on a screen someone
 * opened because their kitchen is flooding, and a flashy transition is the
 * first thing that feels dated. Motion here is for continuity, not for
 * show.
 *
 * `depth` is what makes it read as navigation rather than as a fade:
 * going forward, the new screen rises slightly and settles; coming back, it
 * arrives from the opposite direction. The direction carries the
 * information, which is the difference between animation and decoration.
 */

export interface ScreenTransitionProps {
  /** Changing this key replays the transition. Usually the route name. */
  transitionKey: string;
  direction?: "forward" | "back";
  /** Reduced-motion: renders the settled frame with no animation. */
  animate?: boolean;
  children: React.ReactNode;
}

export function ScreenTransition({
  transitionKey,
  direction = "forward",
  animate = true,
  children,
}: ScreenTransitionProps) {
  const v = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) {
      v.setValue(1);
      return;
    }
    v.setValue(0);
    const a = Animated.timing(v, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [transitionKey, animate, v]);

  const from = direction === "back" ? -18 : 18;

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: v,
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
