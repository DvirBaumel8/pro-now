import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet } from "react-native";

import {
  clampPan,
  NO_PAN,
  panOffsetFor,
  resolveScene,
  scenePlacementViolations,
  type SceneBox,
  type ScenePlacement,
  type CameraState,
  type WorldAssetManifest,
  type WorldPan,
} from "@pro-now/demo-types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { PlayableObject } from "./PlayableObject";

/**
 * WORLD STAGE — the only thing that turns a scene into pixels.
 *
 * It owns no art and no layout opinions. It resolves placements against the
 * manifest, draws them back to front, and complains loudly in development
 * when a composition breaks a rule from
 * `/docs/03c-LIVING-MAP-ART-DIRECTION.md`.
 *
 * ---------------------------------------------------------------------
 * WHY THE CHECK RUNS AT RENDER
 * ---------------------------------------------------------------------
 * Same reason as `livingMapViolations`. The previous world satisfied every
 * written rule and missed the intent entirely, and the rules that DID apply
 * — safe zones, size bands, depth — lived in prose. A rule that can be
 * checked and is not checked is a rule that will be broken by whoever is
 * making one screen look right at 11pm.
 *
 * It never throws. A broken composition still renders, because a developer
 * needs to see what they made in order to fix it.
 */
export interface WorldStageProps {
  manifest: WorldAssetManifest;
  placements: readonly ScenePlacement[];
  box: SceneBox;
  /** Absent until the art pack lands. Every slot then draws a grey box. */
  sources?: WorldAssetSources;
  quiet?: boolean;
  /**
   * Which discoveries have been made. Present means the world is playable;
   * absent means it is scenery. Play is offered only while someone is
   * actually on the way — there is nothing to wait pleasantly for before
   * that.
   */
  foundIds?: readonly string[];
  onFound?: (discoveryId: string) => void;
  animate?: boolean;
  /**
   * Lets the person drag the world around to look at it.
   *
   * This is the "travel" Amit asked for — *"ממש חווית טיול בין
   * השבילים של בעלי המקצוע"* — and it only means anything once a
   * ground asset exists to travel over, which is why it is off by default.
   */
  explorable?: boolean;
  /**
   * Where the camera is looking, and how close.
   *
   * ChatGPT's reframing, and the best note of the round: *"אל תחשבו על
   * המפה כעל background שהמשתמש גורר. המצלמה עצמה הופכת למספרת הסיפור."*
   * Wide while searching, in to the district when matches appear, closer
   * on the one being considered, back out for the journey.
   */
  camera?: CameraState;
}

export function WorldStage({
  manifest,
  placements,
  box,
  sources = EMPTY_ASSET_SOURCES,
  quiet,
  foundIds,
  onFound,
  animate = true,
  explorable = false,
  camera,
}: WorldStageProps) {
  const [pan, setPan] = useState<WorldPan>(NO_PAN);
  const start = useRef<WorldPan>(NO_PAN);

  /*
   * A DRAG THRESHOLD, SO PLAY STILL WORKS.
   *
   * The world is both draggable and touchable, and those fight: a
   * responder that claims every touch swallows the tap that opens the
   * barbershop's shutter. So the pan only takes over after the finger has
   * travelled far enough to be a drag rather than a tap, and a tap reaches
   * the object underneath untouched.
   */
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => Math.hypot(g.dx, g.dy) > 12,
        onPanResponderGrant: () => {
          start.current = pan;
        },
        onPanResponderMove: (_e, g) => {
          setPan(
            clampPan({
              x: start.current.x + g.dx / box.width,
              y: start.current.y + g.dy / box.height,
            })
          );
        },
      }),
    [box.height, box.width, pan]
  );
  const interactionByKey = useMemo(
    () => new Map(placements.filter((p) => p.interaction).map((p) => [p.key, p.interaction!])),
    [placements]
  );
  const resolved = useMemo(() => resolveScene(manifest, placements, box), [manifest, placements, box]);

  /*
   * ONE DRIVER FOR THE WHOLE MOVE.
   *
   * Zoom and both translations are read from a single animated value, so
   * the camera can never arrive at its new position in pieces — a push-in
   * that finishes its zoom before its pan is a lurch, not a move. And a
   * single value means the whole thing rides the native driver: this
   * screen is live during dispatch, and a camera move that stutters
   * exactly when a location update lands is worse than no camera move.
   */
  const shot = useRef(new Animated.Value(0)).current;
  const from = useRef<CameraState | null>(null);
  const to = useRef<CameraState | null>(camera ?? null);

  useEffect(() => {
    if (!camera) return;
    /*
     * FOCUS COUNTS AS A CHANGE.
     *
     * This compared only `shot` and `zoom`, which was invisible until the
     * search sweep arrived and then broke it completely: every stop on the
     * sweep is the same shot at the same zoom, looking somewhere else. The
     * camera would have sat still through the entire search — the exact
     * fault Amit reported — because the one field that differed was the
     * one not being read.
     */
    if (
      to.current &&
      camera.shot === to.current.shot &&
      camera.zoom === to.current.zoom &&
      camera.focus.u === to.current.focus.u &&
      camera.focus.v === to.current.focus.v
    )
      return;
    from.current = to.current;
    to.current = camera;
    shot.setValue(0);
    if (!animate) {
      shot.setValue(1);
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
    const anim = Animated.timing(shot, {
      toValue: 1,
      duration: camera.durationMs ?? 900,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, camera, shot]);

  const a = from.current ?? camera ?? null;
  const b = to.current ?? camera ?? null;
  const lens =
    a && b
      ? {
          transform: [
            { scale: shot.interpolate({ inputRange: [0, 1], outputRange: [a.zoom, b.zoom] }) },
            {
              translateX: shot.interpolate({
                inputRange: [0, 1],
                outputRange: [(0.5 - a.focus.u) * box.width * a.zoom, (0.5 - b.focus.u) * box.width * b.zoom],
              }),
            },
            {
              translateY: shot.interpolate({
                inputRange: [0, 1],
                outputRange: [(0.5 - a.focus.v) * box.height * a.zoom, (0.5 - b.focus.v) * box.height * b.zoom],
              }),
            },
          ],
        }
      : null;

  if (__DEV__) {
    const violations = scenePlacementViolations(manifest, placements, box);
    for (const v of violations) console.warn(`[WorldStage] ${v}`);
  }

  return (
    /*
     * `box-none` rather than `none`: the stage itself takes no touches, but
     * a playable object inside it must be able to. Anything that is not an
     * interactive object passes straight through to the HUD beneath.
     */
    <Animated.View
      style={[styles.stage, { width: box.width, height: box.height }, lens]}
      pointerEvents={onFound || explorable ? "box-none" : "none"}
      {...(explorable ? responder.panHandlers : {})}
    >
      {resolved.map((placement) => {
        // Nearer bands travel further, which is what turns a slide into
        // depth. See PARALLAX in world-assets.ts for why it stays gentle.
        const { dx, dy } = panOffsetFor(placement.layer, pan, box);
        const moved = { ...placement, left: placement.left + dx, top: placement.top + dy };

        const interaction = onFound ? interactionByKey.get(placement.key) : undefined;
        if (!interaction) {
          /*
           * NOTHING, NOT A GREY BOX.
           *
           * The stage is the world Amit shows people. The ugly
           * placeholder earns its place in the gallery, where a missing
           * asset should shout — here it is a rectangle labelled
           * `shared_scooter_01` parked in the middle of the street, which
           * is what the walk test caught. An absent object is better
           * represented by the pavement it will stand on.
           */
          return (
            <AssetSlot
              key={placement.key}
              placement={moved}
              sources={sources}
              quiet={quiet}
              pending="none"
            />
          );
        }
        return (
          <PlayableObject
            key={placement.key}
            placement={moved}
            interaction={interaction}
            sources={sources}
            quiet={quiet}
            animate={animate}
            found={(foundIds ?? []).includes(interaction.discoveryId)}
            onFound={onFound!}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: "absolute",
    left: 0,
    top: 0,
    overflow: "hidden",
  },
});
