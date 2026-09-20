import React, { useCallback, useRef } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";

import type { Heading } from "@pro-now/types";

import { type } from "../../theme";
import { gaitFor, headingFrom, intensityFrom } from "./steerPad";

export { headingFrom, intensityFrom, gaitFor, DEADZONE, RUN_AT } from "./steerPad";

/**
 * THE CONTROL THAT WALKS YOU DOWN THE STREET.
 *
 * ---------------------------------------------------------------------
 * WHY THIS AND NOT A DRAG
 * ---------------------------------------------------------------------
 * Amit: *"אפשר להוסיף מסך שליטה קטן של חצים שאפשר לכוון את הנסיעה, לקדם
 * את זה לעבר חווית משחק."*
 *
 * The two gestures look almost identical and mean opposite things. A drag
 * moves the world under a fixed viewer: what changes is the camera, the
 * person is nowhere, and what you are doing is reading a map. A steer
 * moves a person through a world that stays where it is; the camera
 * follows because it is watching them.
 *
 * Same pixels crossing the same screen. The difference in how it reads is
 * the whole of "like VR", and it is why this control does not pan.
 *
 * ---------------------------------------------------------------------
 * A PAD, NOT FOUR BUTTONS
 * ---------------------------------------------------------------------
 * Four arrow buttons give four headings and a thumb that has to find the
 * right one. A pad gives eight from one continuous gesture and, more
 * importantly, lets somebody CHANGE direction without lifting — which is
 * what walking round a corner is. The arrows are still drawn, because a
 * blank circle does not explain itself, but they are marks on a surface
 * rather than separate targets.
 *
 * ---------------------------------------------------------------------
 * AND IT LETS GO
 * ---------------------------------------------------------------------
 * Releasing stops the walk. A control that keeps you moving after you have
 * taken your thumb off is the classic way to make somebody feel they are
 * not driving — and on a screen where the point is that YOU are the one in
 * the street, that is the one feeling it cannot afford.
 */

export interface SteerPadProps {
  /** Called as the heading changes, and with null when the thumb lifts. */
  onHeading?: (h: Heading) => void;
  /**
   * Called when the walk becomes a run, or stops being one.
   *
   * Reported as a gait rather than as a number, because that is the whole
   * of what anything downstream needs and it changes a handful of times
   * in a walk instead of every frame. See `intensityFrom`.
   */
  onGait?: (g: "WALK" | "RUN") => void;
  /** Hidden entirely when there is no avatar to walk. */
  visible?: boolean;
  size?: number;
}

export function SteerPad({ onHeading, onGait, visible = true, size = 116 }: SteerPadProps) {
  const current = useRef<Heading>(null);
  const gait = useRef<"WALK" | "RUN">("WALK");

  const emit = useCallback(
    (h: Heading) => {
      // Only on change: a heading fired every frame would re-render the
      // world sixty times a second to say the same thing.
      if (current.current === h) return;
      current.current = h;
      onHeading?.(h);
    },
    [onHeading]
  );

  const emitGait = useCallback(
    (g: "WALK" | "RUN") => {
      if (gait.current === g) return;
      gait.current = g;
      onGait?.(g);
    },
    [onGait]
  );

  /*
   * The gesture is read from the CENTRE of the pad rather than from where
   * the thumb first landed. Landing off-centre and holding still should
   * mean "walk that way", which is how a thumbstick behaves and is not
   * how a drag behaves.
   */
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const dx = locationX - size / 2;
        const dy = locationY - size / 2;
        emit(headingFrom(dx, dy, size / 2));
        emitGait(gaitFor(intensityFrom(dx, dy, size / 2)));
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        const dx = locationX - size / 2;
        const dy = locationY - size / 2;
        emit(headingFrom(dx, dy, size / 2));
        emitGait(gaitFor(intensityFrom(dx, dy, size / 2)));
      },
      onPanResponderRelease: () => {
        emit(null);
        emitGait("WALK");
      },
      onPanResponderTerminate: () => {
        emit(null);
        emitGait("WALK");
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <View
      style={[styles.pad, { width: size, height: size, borderRadius: size / 2 }]}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="הליכה ברחוב"
      accessibilityHint="החליקו לכיוון שאליו תרצו ללכת"
    >
      {/* Marks on a surface, not four targets. See the header. */}
      <Text style={[styles.arrow, styles.up]}>▲</Text>
      <Text style={[styles.arrow, styles.down]}>▼</Text>
      <Text style={[styles.arrow, styles.left]}>◀</Text>
      <Text style={[styles.arrow, styles.right]}>▶</Text>
      <View style={styles.hub} />
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * DARK ENOUGH TO EXIST ON A SUNLIT PAVEMENT.
   *
   * The first values were tuned against the dark dispatch screen and
   * vanished the moment the pad was put on the street in daylight — a
   * control you cannot find is not a control, and this one is the whole
   * interaction.
   */
  pad: {
    backgroundColor: "rgba(12,9,18,0.82)",
    borderWidth: 1.5,
    borderColor: "rgba(247,243,250,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  hub: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(247,243,250,0.3)",
  },
  arrow: { position: "absolute", ...type.caption, color: "rgba(247,243,250,0.95)" },
  up: { top: 8 },
  down: { bottom: 8 },
  left: { left: 10 },
  right: { right: 10 },
});
