import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import {
  directWorld,
  isSignificant,
  MOMENT_SPEC,
  nextBeatMs,
  depthScale,
  alongStreet,
  STREETS,
  type RunningMoment,
  type WorldMoment,
} from "@pro-now/types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";

/**
 * WORLD LIFE — the street, being a street.
 *
 * ---------------------------------------------------------------------
 * WHAT MOVES, AND WHY IT IS NOT TRAFFIC
 * ---------------------------------------------------------------------
 * Amit: *"חייב תנועתיות כלשהי לא תמונה מתה."* Then, looking at what that
 * first turned into: *"מה קשור המכוניות והאוטובוס, איפה שליח איפה משאית
 * קטנה טנדר?"*
 *
 * Both notes are right and the second is the sharper one. A private car
 * crossing the frame makes the picture move and says nothing; a courier on
 * a scooter makes the picture move and says what the product is. So
 * everything significant that crosses this street is one of ours on the way
 * to somebody, and the street is busy because the marketplace is.
 *
 * ---------------------------------------------------------------------
 * SCHEDULED, NOT LOOPED
 * ---------------------------------------------------------------------
 * The pacing belongs to `WorldDirector`, which is pure and tested: at most
 * two significant things at once, never two of the same, irregular gaps,
 * and frequent silence. This component only draws what the director
 * decides — so "does the world feel alive" is a question answered in tests
 * rather than by watching the screen and guessing.
 *
 * Everything animates on `transform` alone, on the native driver. This
 * screen is live during dispatch and a vehicle that stutters exactly as a
 * location update lands is worse than a still picture.
 */

/**
 * Which asset plays each moment, and how big it is.
 *
 * ---------------------------------------------------------------------
 * THEY DRIVE THE STREETS NOW
 * ---------------------------------------------------------------------
 * Each moment used to carry a `lane` — a fraction of world height it
 * crossed — and then, briefly, an angle on a ring. Both were wrong for the
 * same reason, which Amit named twice: *"רק רחוב, מצומצם"* and then *"גם
 * זה כיכר מדי… רוצה שיטיילו ברחובות."*
 *
 * Something crossing the frame says the world continues off-screen in two
 * directions. Something circling a ring says the world is one room. A
 * courier driving DOWN A STREET, past shops, small in the distance and
 * larger as it comes, says the world is a place with roads in it — which
 * is the thing being asked for, and it costs nothing extra because the
 * streets already exist in `world-neighbourhood.ts`.
 *
 * `street` is which road this moment happens on. Spreading them across
 * different streets is deliberate: two vehicles on the same road at once
 * is a convoy, and a convoy looks like a loop.
 */
const MOMENT_ASSET: Readonly<
  Record<WorldMoment, { assetId: string; widthRatio: number; street: number; at?: number }>
> = {
  COURIER_PASS: { assetId: "courier_scooter", widthRatio: 0.16, street: 0 },
  MOVER_PASS: { assetId: "moving_van", widthRatio: 0.22, street: 2 },
  TOW_PASS: { assetId: "tow_truck", widthRatio: 0.26, street: 3 },
  DOG_WALK: { assetId: "dog_walker", widthRatio: 0.14, street: 2 },
  // `at` is a point along the street: a light comes on in a shop, not in
  // mid-air.
  WINDOW_LIGHT: { assetId: "amb_window_light", widthRatio: 0.1, street: 0, at: 0.3 },
  BIRDS: { assetId: "amb_birds", widthRatio: 0.18, street: 1, at: 0.5 },
  CAT_APPEAR: { assetId: "amb_cat", widthRatio: 0.07, street: 2, at: 0.7 },
};

/**
 * How finely a street is sampled for the animation.
 *
 * Enough points that a bend never shows as a corner, few enough that the
 * interpolation stays cheap. The move runs on the native driver either way.
 */
const STREET_SAMPLES = 24;

interface Playing extends RunningMoment {
  /** Which way round the square. Decided once, at the start. */
  reversed: boolean;
  /**
   * Where on the ring this one enters, as an angle.
   *
   * Random per moment, so two vehicles that happen to overlap are two
   * things going round a square rather than one animation played twice.
   */
  from: number;
  driver: Animated.Value;
}

export interface WorldLifeProps {
  /** The world's size. Streets are laid out as fractions of this. */
  width: number;
  height: number;
  /**
   * What a vehicle's size is a fraction of: the viewport, not the world.
   * A courier at 16% of a 2.4-screen world is a courier the size of a bus.
   */
  sizeBasis?: number;
  sources?: WorldAssetSources;
  /** False holds the street completely still. */
  animate?: boolean;
  /**
   * What the customer is looking for, if anything.
   *
   * Makes that trade's own traffic more likely — a tow truck going past
   * while you wait for a tow truck. It never filters: the street stays
   * mixed, because a real one is, and because four tow trucks in ninety
   * seconds would be the world implying supply nobody counted.
   */
  departmentCode?: string | null;
}

export function WorldLife({
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  animate = true,
  departmentCode = null,
  sizeBasis,
}: WorldLifeProps) {
  const basis = sizeBasis ?? width;
  const [playing, setPlaying] = useState<Playing[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beat = useCallback(() => {
    setPlaying((current) => {
      const decision = directWorld({
        now: Date.now(),
        running: current,
        roll: Math.random(),
        reducedMotion: !animate,
        departmentCode,
      });

      const kept = current.filter((p) => decision.running.some((r) => r.moment === p.moment));
      if (!decision.start) return kept;

      const driver = new Animated.Value(0);
      Animated.timing(driver, {
        toValue: 1,
        duration: MOMENT_SPEC[decision.start].durationMs,
        easing: isSignificant(decision.start) ? Easing.linear : Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();

      return [...kept, { moment: decision.start, startedAt: Date.now(), reversed: Math.random() < 0.5, from: Math.random() * Math.PI * 2, driver }];
    });

    timer.current = setTimeout(beat, nextBeatMs(Math.random()));
  }, [animate, departmentCode]);

  useEffect(() => {
    if (!animate) {
      setPlaying([]);
      return;
    }
    timer.current = setTimeout(beat, nextBeatMs(Math.random()));
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [animate, beat]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {playing.map((p) => {
        const spec = MOMENT_ASSET[p.moment];
        // Nothing is drawn for a moment whose art has not arrived. An
        // invisible courier is better than a grey rectangle sliding down
        // the road pretending to be one.
        if (!sources[spec.assetId]) return null;

        const base = basis * spec.widthRatio;
        const w = base;
        const significant = isSignificant(p.moment);

        /*
         * ONE DRIVER, THREE READINGS.
         *
         * x, y and scale all come from the same 0..1 value, so a vehicle
         * can never be at a position whose size belongs somewhere else —
         * and because all three are transforms, the circuit runs off the JS
         * thread. This screen is live during dispatch; a van that stutters
         * exactly as a location update lands is worse than a still one.
         */
        /*
         * The road this one is on, walked end to end. `p.from` decides
         * which end it enters from, so two couriers on one street are not
         * the same animation twice.
         */
        const street = STREETS[spec.street % STREETS.length]!;
        const path = Array.from({ length: STREET_SAMPLES }, (_, i) => {
          const t = i / (STREET_SAMPLES - 1);
          const at = alongStreet(street, p.reversed ? 1 - t : t);
          return { u: at.u, v: at.v, scale: depthScale(at.v) };
        });
        const steps = path.map((_, i) => i / (path.length - 1));
        const still =
          spec.at !== undefined ? alongStreet(STREETS[spec.street % STREETS.length]!, spec.at) : null;

        const travelStyle = significant
          ? {
              transform: [
                {
                  translateX: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.u * width - base / 2),
                  }),
                },
                {
                  translateY: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.v * height - base / 2),
                  }),
                },
                {
                  scale: p.driver.interpolate({
                    inputRange: steps,
                    outputRange: path.map((q) => q.scale),
                  }),
                },
                // Facing. Round one way or round the other.
                { scaleX: p.reversed ? -1 : 1 },
              ],
              opacity: 1,
            }
          : {
              transform: [
                { translateX: (still?.u ?? 0.5) * width - base / 2 },
                { translateY: (still?.v ?? 0.5) * height - base / 2 },
                { scale: depthScale(still?.v ?? 0.5) },
              ],
              opacity: p.driver.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0, 1, 1, 0] }),
            };

        return (
          <Animated.View
            key={`${p.moment}-${p.startedAt}`}
            style={[{ position: "absolute", left: 0, top: 0, width: w, height: w }, travelStyle]}
          >
            <AssetSlot
              placement={{
                key: p.moment,
                assetId: spec.assetId,
                item: {
                  id: spec.assetId,
                  file: "",
                  intrinsicWidth: 1,
                  intrinsicHeight: 1,
                  anchor: { x: 0.5, y: 1 },
                  role: "PRESENCE",
                  theme: "SHARED",
                  defaultWidthRatio: spec.widthRatio,
                  critical: false,
                },
                layer: "PRESENCE",
                left: 0,
                top: 0,
                width: w,
                height: w,
                depthOrder: 0,
              }}
              sources={sources}
              quiet
              pending="none"
            />
          </Animated.View>
        );
      })}
    </View>
  );
}
