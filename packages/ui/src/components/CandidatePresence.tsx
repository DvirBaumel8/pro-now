import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { palette, type } from "../theme";
import { ProviderPortrait } from "./ProviderPortrait";

/**
 * CANDIDATE PRESENCE — real people, in a layer that has no geography.
 *
 * ---------------------------------------------------------------------
 * THE ONE RULE THIS FILE EXISTS TO ENFORCE
 * ---------------------------------------------------------------------
 * The `ProWorld` behind this is an illustration: a made-up neighbourhood
 * with made-up houses and a van that means nothing. Putting a professional
 * *into* that world would quietly turn it into a map — "there are three
 * plumbers two streets north of you" — which is fabricated supply drawn so
 * that it does not look like a claim (/CLAUDE.md §3). It is the most
 * tempting lie available on this screen, because it is the one that would
 * make it feel best.
 *
 * ChatGPT drew the line and it is now the architecture:
 *
 *   *"AmbientEntity לעולם לא מקבל providerId. CandidatePresence חייב
 *    eligibleCandidateId אמיתי… אבל גם אז, בזמן החיפוש, אני לא נותן לה
 *    מיקום גיאוגרפי. היא לא יושבת ליד הבניין הזה."*
 *
 * So candidates live HERE, in an orbit above the world, and:
 *
 * 1. **Every presence requires a real `candidateId`.** The type has no
 *    optional escape and no "placeholder" variant. If the server returned
 *    nobody, this renders nothing — an empty orbit over a lively world is
 *    the honest picture of "still looking".
 * 2. **There is no position prop, and there must never be one.** Presences
 *    are placed on an orbit by their index. Their location on screen
 *    carries no information, which is exactly why it cannot mislead.
 * 3. **The count is the server's count.** Three presences mean three
 *    eligible candidates. Never a decorative extra to fill the ring.
 *
 * ---------------------------------------------------------------------
 * AND WHY THEY MOVE THE WAY THEY DO
 * ---------------------------------------------------------------------
 * A rejected candidate dissolves softly rather than vanishing, because a
 * disappearance reads as a bug. The chosen one drifts toward the centre —
 * but on an orbit, slowly, unmistakably not a journey. A presence that
 * travelled in a straight line across the world would be describing a
 * route, and it has no route to describe.
 */

export type CandidateState =
  /** Returned by dispatch, eligibility not yet decided. */
  | "CHECKING"
  /** Passed eligibility. Still one of several. */
  | "ELIGIBLE"
  /** Ruled out. Fades, rather than blinking out. */
  | "RULED_OUT"
  /** The match. Grows, and everything else recedes. */
  | "CHOSEN";

export interface Candidate {
  /**
   * The server's id for a REAL eligible candidate. Required, with no
   * optional or placeholder form — see rule 1 above. A component that
   * cannot be given a fake person cannot display one.
   */
  candidateId: string;
  displayNameHe: string;
  /** Their approved photo, when one exists. Never invented. */
  photoUri?: string | null;
  state: CandidateState;
}

export interface CandidatePresenceProps {
  /** Exactly what dispatch returned. Empty renders nothing. */
  candidates: Candidate[];
  width: number;
  height: number;
  active?: boolean;
  /*
   * DELIBERATELY ABSENT: no `positions`, no `lat`, no `lng`, no `distance`.
   * This layer is an orbit, not a map. See the header.
   */
}

const RING_COLOURS = ["#E8724C", "#F4B942", "#5FC3A4", "#6FA8DC", "#C48BE8"];

export function CandidatePresence({
  candidates,
  width,
  height,
  active = true,
}: CandidatePresenceProps) {
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      orbit.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, orbit]);

  if (candidates.length === 0) return null;

  const cx = width / 2;
  const cy = height * 0.52;
  const radius = Math.min(width, height) * 0.34;

  return (
    <View style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      {candidates.map((c, i) => {
        /*
         * Placed by INDEX on a ring, not by any property of the person.
         * Where a presence sits says nothing, which is the only way a
         * position can be safe.
         */
        const a = (i / Math.max(candidates.length, 3)) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius * 0.62;
        const colour = RING_COLOURS[i % RING_COLOURS.length]!;

        const chosen = c.state === "CHOSEN";
        const out = c.state === "RULED_OUT";
        const size = chosen ? 84 : 54;

        return (
          <Animated.View
            key={c.candidateId}
            style={[
              styles.bubble,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: colour,
                left: x - size / 2,
                top: y - size / 2,
                opacity: out ? 0.16 : c.state === "CHECKING" ? 0.7 : 1,
                transform: [
                  // A slow bob on the orbit. Not a journey.
                  {
                    translateY: orbit.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [0, -7, 0, 7, 0],
                    }),
                  },
                  /*
                   * The chosen one drifts toward the middle — on the orbit,
                   * slowly, and only a fraction of the way. Travelling all
                   * the way in a straight line would describe a route, and
                   * there is no route to describe.
                   */
                  { translateX: chosen ? (cx - x) * 0.55 : 0 },
                  { translateY: chosen ? (cy - y) * 0.55 : 0 },
                ],
              },
            ]}
          >
            <ProviderPortrait
              photoUri={c.photoUri}
              displayNameHe={c.displayNameHe}
              size={size - 8}
              shape="circle"
              tone="light"
            />
            {c.state === "CHECKING" ? (
              <View style={[styles.checking, { backgroundColor: colour }]}>
                <Text style={styles.checkingText}>בודקים</Text>
              </View>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    borderWidth: 3,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#3A2A24",
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  checking: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingVertical: 2,
  },
  checkingText: { ...type.micro, fontWeight: "700", color: palette.white, writingDirection: "rtl" },
});
