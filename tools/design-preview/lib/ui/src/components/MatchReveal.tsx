import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { palette, spacing } from "../theme";

/**
 * THE MOMENT SOMEONE IS FOUND.
 *
 * Amit: "ברגע שמוצא מקצוען שיהיה איזה אווירה של מצאנו מישהו, אווירה שמחה,
 * איזה אפקט שנותן הרגשה של זכייה. התמונת פרופיל של הבן אדם והמקצוע חשובים
 * מאוד שיקפצו ישר."
 *
 * The emotional shape of this flow is a dip and a lift: you have just asked
 * a stranger to come to your house, you wait through a scan not knowing if
 * anyone will answer, and then someone does. Every product in this category
 * spends that second on a cross-fade. It is the one second where a person
 * feels relief, and relief is the feeling PRO NOW is actually selling.
 *
 * So the reveal is a spring, not a fade. Three things arrive in sequence —
 * a ring of light, then the person, then who they are — because sequence is
 * what makes an arrival feel like an arrival rather than a screen change.
 *
 * WHAT IT DOES NOT DO. No confetti, no trophy, no sound. This is somebody's
 * blocked drain at eleven at night, not a level-up; celebration that
 * overshoots the occasion reads as a product enjoying itself. The joy here
 * is "someone is coming", and one warm burst of light carries that without
 * making a customer with a flooded kitchen feel patronised.
 *
 * REDUCED MOTION: `animate={false}` renders the identical final frame with
 * nothing moving. The layout is the same either way, so nothing shifts.
 */

export interface MatchRevealProps {
  /** Flip to true when the match actually arrives. */
  revealed: boolean;
  animate?: boolean;
  /** The portrait. Enters first, with the spring. */
  portrait: React.ReactNode;
  /** Name, trade, facts. Enter second, staggered. */
  identity?: React.ReactNode;
  width: number;
}

export function MatchReveal({
  revealed,
  animate = true,
  portrait,
  identity,
  width,
}: MatchRevealProps) {
  const burst = useRef(new Animated.Value(0)).current;
  const person = useRef(new Animated.Value(0)).current;
  const who = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!revealed) {
      [burst, person, who].forEach((v) => v.setValue(0));
      return;
    }
    if (!animate) {
      burst.setValue(1);
      person.setValue(1);
      who.setValue(1);
      return;
    }
    const run = Animated.sequence([
      // 1. Light arrives first, so the person lands INTO something.
      Animated.timing(burst, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        // 2. The person, on a spring with a little overshoot. The overshoot
        //    is the whole feeling: a value that settles past its target and
        //    back reads as something ARRIVING, where a linear fade reads as
        //    something being drawn.
        Animated.spring(person, {
          toValue: 1,
          friction: 6,
          tension: 78,
          useNativeDriver: true,
        }),
        // 3. Who they are, a beat later.
        Animated.sequence([
          Animated.delay(140),
          Animated.timing(who, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);
    run.start();
    return () => run.stop();
  }, [revealed, animate, burst, person, who]);

  const size = Math.min(width * 0.86, 340);

  return (
    <View style={styles.wrap}>
      {/* The burst: one expanding halo of warm light, once. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.burst,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: burst.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0.5, 0] }),
            transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.25] }) }],
          },
        ]}
      />

      <Animated.View
        style={{
          opacity: person,
          transform: [
            { scale: person.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) },
          ],
        }}
      >
        {portrait}
      </Animated.View>

      {identity ? (
        <Animated.View
          style={[
            styles.identity,
            {
              opacity: who,
              transform: [
                { translateY: who.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
              ],
            },
          ]}
        >
          {identity}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  burst: {
    position: "absolute",
    backgroundColor: palette.signal500,
  },
  identity: { alignSelf: "stretch", marginTop: spacing.xl },
});
