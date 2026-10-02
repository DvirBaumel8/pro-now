import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { depthScale, type Errand } from "@pro-now/types";

/**
 * THE THINGS WORTH CROSSING THE STREET FOR.
 *
 * ---------------------------------------------------------------------
 * WHY THEY ARE MARKS AND NOT OBJECTS
 * ---------------------------------------------------------------------
 * What is actually there — a cat under a bench, a light that comes on —
 * belongs to the artwork, and none of that artwork exists yet. Drawing a
 * cat now would be inventing the thing the city is supposed to provide,
 * and this project has twice been burned by an intermediate that looked
 * finished enough to argue about.
 *
 * So what is drawn is the smallest honest thing: a soft glow on the
 * pavement that says *something is here*. It is not a cat and does not
 * pretend to be. When the real objects land they take these positions and
 * the glow becomes what it should always have been — a hint under
 * something real.
 *
 * ---------------------------------------------------------------------
 * AND THEY LEAVE WHEN THEY ARE FOUND
 * ---------------------------------------------------------------------
 * A marker that stays after you have reached it turns the street into a
 * checklist you are failing to clear. Found is gone.
 */
export interface ErrandLayerProps {
  errands: readonly Errand[];
  /** Ids already reached; those draw nothing. */
  found: readonly string[];
  /** The world's size in points — NOT the viewport's. */
  width: number;
  height: number;
  animate?: boolean;
}

export function ErrandLayer({ errands, found, width, height, animate = true }: ErrandLayerProps) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      pulse.setValue(0);
      return;
    }
    /*
     * One driver for every marker, so a street full of them costs one
     * animation rather than eight. They pulse in unison, which reads as
     * the city breathing rather than as eight separate timers.
     */
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animate, pulse]);

  const waiting = errands.filter((e) => !found.includes(e.id));
  if (waiting.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {waiting.map((e) => {
        // The same depth rule as everything else: further up the street
        // is smaller, or the marks sit on a different ground than the city.
        const s = depthScale(e.at.v);
        const d = SIZE * s;
        return (
          <Animated.View
            key={e.id}
            style={{
              position: "absolute",
              left: e.at.u * width - d / 2,
              top: e.at.v * height - (d * FLATNESS) / 2,
              width: d,
              height: d * FLATNESS,
              borderRadius: 999,
              backgroundColor: "rgba(255,214,140,0.5)",
              opacity: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 0.8, 0.35] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.85, 1.1, 0.85] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/** Wide enough to aim at on a phone, small enough not to be a landmark. */
const SIZE = 34;

/** Flat, because it lies on the pavement rather than standing on it. */
const FLATNESS = 0.4;
