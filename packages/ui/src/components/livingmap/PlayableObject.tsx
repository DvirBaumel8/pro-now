import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet } from "react-native";

import type { ResolvedPlacement, WorldInteraction } from "@pro-now/types";

import { AssetSlot, type WorldAssetSources } from "./AssetSlot";

/**
 * PLAYABLE OBJECT — a piece of the city that answers when touched.
 *
 * ---------------------------------------------------------------------
 * THE WORLD IS THE GAME
 * ---------------------------------------------------------------------
 * There is no game layer here. ChatGPT's rule, after Amit rejected the
 * orbs: *"GameLayer לא צריך להיות layer שמונח מעל Living Map. Living Map
 * הוא המשחק."* So this wraps an ordinary world object and gives it a
 * response, rather than floating a token on top of the scene.
 *
 * The difference the person feels is the one that matters: tapping a
 * collectible is a chore, and shaking a tree until the pigeons come out is
 * a thing you show someone.
 *
 * ---------------------------------------------------------------------
 * ONLY TRANSFORM AND OPACITY
 * ---------------------------------------------------------------------
 * Every animation here runs on the native driver, which can animate those
 * two and nothing else. That is not a style preference: this screen is
 * live during dispatch, and an animation on the JS thread stutters exactly
 * when a location update arrives. A shutter that hitches while the ETA is
 * being redrawn is worse than no shutter.
 *
 * Reduced motion collapses every interaction to its settled frame. The
 * discovery still registers — the person is not locked out of the world
 * because they asked the phone to stop moving.
 */
export interface PlayableObjectProps {
  placement: ResolvedPlacement;
  interaction: WorldInteraction;
  sources: WorldAssetSources;
  found: boolean;
  onFound: (discoveryId: string) => void;
  animate?: boolean;
  quiet?: boolean;
}

export function PlayableObject({
  placement,
  interaction,
  sources,
  found,
  onFound,
  animate = true,
  quiet,
}: PlayableObjectProps) {
  const play = useRef(new Animated.Value(0)).current;
  const running = useRef(false);
  /*
   * The composite currently playing, so it can be stopped if this object
   * goes away mid-shake.
   *
   * It does go away: when the phase leaves ASSIGNED_ROUTE the stage drops
   * `onFound` and every PlayableObject unmounts back into a plain
   * AssetSlot. A shake in flight at that moment kept a frame callback
   * alive against a view that no longer existed.
   */
  const current = useRef<Animated.CompositeAnimation | null>(null);

  const run = useCallback(() => {
    onFound(interaction.discoveryId);
    if (!animate || running.current) return;
    running.current = true;
    play.setValue(0);
    const anim = Animated.sequence([
      Animated.timing(play, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(play, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    current.current = anim;
    anim.start(() => {
      running.current = false;
      current.current = null;
    });
  }, [animate, interaction.discoveryId, onFound, play]);

  useEffect(() => () => current.current?.stop(), []);

  /*
   * One shape of motion per animation, and each is a small piece of
   * physical behaviour rather than a generic bounce:
   *
   *   RUSTLE         a shake that decays — a tree pushed and let go
   *   OPEN_SHUTTER   rises and stays risen while the light is on
   *   DRIVE_BY       travels sideways, out and back into its parking spot
   */
  const transform =
    interaction.animation === "RUSTLE"
      ? [
          { translateX: play.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -5, 4, -2, 0] }) },
          { scaleY: play.interpolate({ inputRange: [0, 0.4, 1], outputRange: [1, 1.04, 1] }) },
        ]
      : interaction.animation === "OPEN_SHUTTER"
        ? [
            { translateY: play.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
            { scale: play.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
          ]
        : [
            {
              translateX: play.interpolate({
                inputRange: [0, 1],
                outputRange: [0, placement.width * 1.4],
              }),
            },
          ];

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        {
          transform,
          /*
           * Found objects settle a touch brighter and stay that way, so a
           * second look at the street shows what has already been tried
           * without a badge or a tick being pasted onto the art.
           */
          opacity: found ? 1 : 0.94,
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={run}
        accessibilityRole="button"
        accessibilityLabel={interaction.labelHe}
        accessibilityState={{ selected: found }}
        style={{
          position: "absolute",
          left: placement.left,
          top: placement.top,
          width: placement.width,
          height: placement.height,
        }}
      >
        {/*
          * The slot draws at the origin because the pressable already
          * carries the rectangle — otherwise the art would be offset twice.
          */}
        <AssetSlot
          placement={{ ...placement, left: 0, top: 0 }}
          sources={sources}
          quiet={quiet}
          /* Nothing rather than a labelled rectangle. See WorldStage. */
          pending="none"
        />
      </Pressable>
    </Animated.View>
  );
}
