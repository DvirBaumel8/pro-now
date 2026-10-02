import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing, type } from "../theme";

/**
 * THE RING AROUND THE PERSON.
 *
 * The single change ChatGPT asked for on the Match screen, and it named the
 * reason precisely: the screen was explaining the match before the customer
 * had met anyone. "ברגע שיש provider אמיתי ומאושר, הייתי נותן לתמונה שלו פי
 * 2–3 יותר נוכחות… זו תהיה קפיצת הרושם הגדולה ביותר, כי היא משנה את המסך
 * מ'האלגוריתם מצא תוצאה' ל'זה האדם שעומד להגיע אליי'."
 *
 * So the portrait is now the hero, and this is what it sits inside: a ring
 * carrying the one fact that makes the moment urgent rather than
 * biographical — this person is online, right now, and can leave.
 *
 * WHY THE RING AND NOT A BADGE. A badge is read. A ring is seen, at the
 * same moment as the face, without costing a line of the layout — and it
 * scales with the portrait, which is the point of putting the state on the
 * person rather than beside them.
 *
 * MOTION IS GATED ON TRUTH (§7). The ring breathes only while `state` is
 * `ONLINE`; an assigned or offline professional gets the same ring, still.
 * A pulse that outlives the state it described is the most common way an
 * interface starts lying quietly.
 */

export type PresenceState = "ONLINE" | "ASSIGNED" | "OFFLINE";

export interface PresenceRingProps {
  state: PresenceState;
  /** The portrait's own size. The ring is drawn outside it. */
  size: number;
  /** "זמין עכשיו" — the label on the ring's chip. Omit to hide the chip. */
  labelHe?: string | null;
  children: React.ReactNode;
}

const COLOR: Record<PresenceState, string> = {
  ONLINE: palette.trust500,
  ASSIGNED: palette.signal500,
  OFFLINE: palette.ink300,
};

export function PresenceRing({ state, size, labelHe, children }: PresenceRingProps) {
  const halo = useRef(new Animated.Value(0)).current;
  const live = state === "ONLINE";

  useEffect(() => {
    if (!live) {
      halo.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [halo, live]);

  const gap = 10;
  const ringSize = size + gap * 2;
  const color = COLOR[state];

  return (
    <View style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      {live ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: color,
              opacity: halo.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
            },
          ]}
        />
      ) : null}

      <View
        style={[
          styles.ring,
          { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: color },
        ]}
      >
        {children}
      </View>

      {labelHe ? (
        <View style={[styles.chip, { backgroundColor: color }]}>
          <Text style={styles.chipText} numberOfLines={1}>
            {labelHe}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: { position: "absolute", borderWidth: 2 },
  chip: {
    position: "absolute",
    bottom: -12,
    paddingHorizontal: spacing.md,
    minHeight: 26,
    justifyContent: "center",
    borderRadius: radii.pill,
  },
  chipText: { ...type.microStrong, color: palette.ink900, writingDirection: "rtl" },
});
