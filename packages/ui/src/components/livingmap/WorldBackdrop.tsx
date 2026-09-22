import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { type WorldGeo, geoAspect, metresAcrossAt, roadIsMeasuredFor, worldBox, worldZoomFor } from "@pro-now/types";

import { palette } from "../../theme";
import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { DistrictLayer } from "./DistrictLayer";
import { WorldGround } from "./WorldGround";
import { WorldLife } from "./WorldLife";

/**
 * WORLD BACKDROP — the neighbourhood, behind a screen that is not the map.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit, about the welcome screen: *"גם העמוד הזה לא ברמה בכלל של מה שעשינו
 * עד עכשיו."* He is right, and the gap is not a styling gap. Every other
 * screen in this product happens somewhere — there is a world behind it,
 * with depth and something moving in it. The first screen anyone sees was a
 * flat ivory page with a headline, two large empty gaps and a row of
 * invented cartoon faces. It did not look like the same product, because it
 * was not built out of the same material.
 *
 * And separately, he asked for this directly a while ago:
 *
 *     "חייב להשתמש גם במפה הזאת שאנחנו כל כך משקיעים בה במסך הראשי."
 *
 * ---------------------------------------------------------------------
 * WHAT IT IS NOT
 * ---------------------------------------------------------------------
 * Not the Living Map. There is no dispatch here, no candidates, no venues,
 * nothing interactive and nothing that could be mistaken for supply. It is
 * the place, drifting slowly, with the street's own life running over it —
 * which is exactly as much as a screen that is *about* something else
 * should show.
 *
 * ---------------------------------------------------------------------
 * AND WHAT HAPPENS BEFORE THE ART ARRIVES
 * ---------------------------------------------------------------------
 * The neighbourhood plate is being drawn as this is written. Until it
 * lands, this draws the night gradient alone rather than a grey labelled
 * rectangle: on an interior screen that placeholder is useful because it
 * proves a placement, but as the backdrop of the first screen a giant grey
 * box with an id printed on it is worse than an honest empty sky.
 */
export interface WorldBackdropProps {
  width: number;
  height: number;
  /**
   * Anything that belongs IN the world rather than on top of it.
   *
   * The route and the vehicle used to be drawn as a sibling of this
   * component, in viewport coordinates, while the ground panned and zoomed
   * underneath them — so the scooter's world position was plotted against
   * the phone and it ended up standing on a pavement it had never been
   * placed on. Amit: *"הנסיעה מבולגנת ממש."*
   *
   * Passed the world's real size in points, so a child can lay itself out
   * in the same space the ground is drawn in and move with it.
   */
  children?: (world: { width: number; height: number }) => React.ReactNode;
  sources?: WorldAssetSources;
  /**
   * The ground plate. Defaults to the neighbourhood, falling back to the
   * street plate that exists today so the screen is never blank in a build
   * where only the old asset is present.
   */
  groundAssetId?: string;
  fallbackGroundAssetId?: string;
  /** False holds everything still. */
  animate?: boolean;
  /** Makes this trade's own traffic more likely. See WorldLife. */
  departmentCode?: string | null;
  /**
   * Where in the neighbourhood to look, in world space.
   *
   * Absent means the resting view. Given a point, the backdrop travels
   * there — which is what turns tapping a category into *going somewhere*
   * rather than opening a page. Amit: *"לחיצה לא פותחת דף קטגוריה משעמם —
   * היא מכניסה את המשתמש לתוך אותו עולם, ממקדת את האזור הרלוונטי."*
   *
   * The move is a transform on the native driver, so it stays smooth on a
   * screen that may be receiving dispatch updates at the same time.
   */
  focus?: { u: number; v: number } | null;
  /**
   * How much of the world is showing.
   *
   * Left out, a backdrop fits the whole neighbourhood, which is almost
   * always what a backdrop wants: it is the place this product happens in,
   * not a close-up of one corner of it.
   *
   * The default used to be 1.18, a number that meant "slightly zoomed" back
   * when the plate was exactly one screen. The moment the real
   * neighbourhood arrived — 2.4 screens wide — that same 1.18 started
   * meaning *show a twentieth of it*, and the welcome screen went back to
   * being a picture of asphalt. Amit spotted it immediately: *"למה זה עדיין
   * התמונה עם הזום אין הזה?"*
   */
  zoom?: number;
  /**
   * A REAL STREET PLAN TO STAND ON, INSTEAD OF THE PAINTING.
   *
   * -------------------------------------------------------------------
   * WHAT SWITCHING THIS ON ACTUALLY DOES
   * -------------------------------------------------------------------
   * Amit: *"אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו והקוד שלנו
   * יושב עליה."* This is that seam, and it is one prop because the whole
   * design of the world was aimed at making it one prop: everything in
   * here is placed in `{u,v}`, so swapping what `{u,v}` MEANS moves the
   * entire city at once.
   *
   * Three things change when it is present, and the third is the one that
   * matters:
   *
   *   1. The ground is `GeoPlate` — real ways and plots, our ink.
   *   2. The world box takes the extract's aspect instead of the plate's,
   *      so the projection is not stretched. Same rule as `PLATE_ASPECT`,
   *      same reason.
   *   3. THE AMBIENT LIFE GOES OUT. `WorldLife` and `DistrictLayer` are
   *      invention — a courier nobody dispatched, eleven shopfronts no
   *      business rents — and on an invented street that is atmosphere,
   *      while on a real one it is a claim about an address. `geo-truth.ts`
   *      is the written-down version of this and the tests are there; the
   *      enforcement is here, where the components actually mount.
   *
   * Point 3 is why this is not simply a nicer backdrop. A real map costs
   * the world its crowd, and the honest response is fewer figures rather
   * than the same figures somewhere real.
   */
  geo?: WorldGeo | null;
}

export function WorldBackdrop({
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  groundAssetId = "world_neighbourhood",
  fallbackGroundAssetId = "shared_ground_street",
  animate = true,
  departmentCode = null,
  focus = null,
  zoom,
  geo = null,
  children,
}: WorldBackdropProps) {
  const assetId = sources[groundAssetId] ? groundAssetId : fallbackGroundAssetId;
  const hasArt = Boolean(sources[assetId]);
  /*
   * Only the neighbourhood plate is a WORLD — 2.4 screens across, with more
   * of it than fits. A hero plate is a single picture: blowing it up and
   * sliding it would crop into it rather than reveal anything.
   */
  /*
   * A real extract is a world in the same sense the neighbourhood plate
   * is: larger than the viewport, with corners you have not turned. So it
   * takes the world-plate path — clamped camera, 2.4 screens across —
   * rather than the single-picture path the hero plates use.
   */
  const isWorldPlate = geo !== null || assetId === "world_neighbourhood";

  /*
   * Fit the neighbourhood by default; the fallback single-street plate is
   * already one screen and only needs its old gentle push-in.
   */
  const lens = zoom ?? (isWorldPlate ? worldZoomFor("WIDE") : 1.18);

  /*
   * A SLOW DRIFT, NOT A PAN.
   *
   * The world moves a few percent over half a minute and turns around. It
   * is below the threshold where anyone would call it an animation, which
   * is the point: the screen should feel like it is somewhere rather than
   * like it is playing something at you. And it is a transform on the
   * native driver, so it costs nothing while the person reads.
   */
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!animate) {
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 26000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 26000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate, drift]);

  /*
   * TRAVELLING TO A DISTRICT.
   *
   * One driver, interpolated into both translations, so the camera cannot
   * arrive horizontally before it arrives vertically — which reads as a
   * swerve rather than a journey. The plate is drawn at `WORLD_EXTENT`
   * times the viewport, so a focus of (0.5, 0.5) is the middle of the
   * whole neighbourhood rather than the middle of the screen.
   */
  /*
   * ---------------------------------------------------------------------
   * THE CAMERA HOLDS ITS POSITION, NOT A PROGRESS BAR
   * ---------------------------------------------------------------------
   * This used to be a 0-to-1 driver interpolating between a remembered
   * `from` and a `to`, reset to 0 on every change of focus. On the
   * tracking screen the focus changes once a second, so a 1400ms ease was
   * interrupted at about 70% of its length, every second, for the whole
   * trip — and because `from` was set to the previous TARGET rather than
   * to where the plate actually was, `setValue(0)` snapped the unfinished
   * remainder forward before easing again.
   *
   * A hitch once a second, and a camera permanently behind the vehicle it
   * was following.
   *
   * Two values holding the actual position fix it by construction:
   * `Animated.timing` resumes from wherever a value currently IS, so a
   * new target mid-move is a redirect rather than a restart. It is the
   * pattern `RouteLayer` already used and the reason that file never had
   * this bug.
   */
  const camU = useRef(new Animated.Value(focus?.u ?? 0.5)).current;
  const camV = useRef(new Animated.Value(focus?.v ?? 0.5)).current;

  useEffect(() => {
    const next = focus ?? { u: 0.5, v: 0.5 };
    if (!animate) {
      camU.setValue(next.u);
      camV.setValue(next.v);
      return;
    }
    /*
     * A CURVE THAT SURVIVES BEING INTERRUPTED.
     *
     * This was `Easing.inOut(Easing.cubic)`, which has zero velocity at
     * both ends — fine for a move that runs to completion, wrong for a
     * value that is continuously re-targeted. On the tracking screen the
     * focus changes as the professional advances, and every change
     * restarted the ease from a standstill: the camera crept, paused,
     * crept, paused, once a second, for the whole trip. On the one screen
     * somebody watches for twenty minutes.
     *
     * `Easing.out` starts at full speed, so a re-target mid-flight reads
     * as a redirect rather than as a fresh start.
     */
    const move = Animated.parallel([
      Animated.timing(camU, {
        toValue: next.u,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(camV, {
        toValue: next.v,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    move.start();
    return () => move.stop();
    /*
     * THE SCALARS, NOT THE OBJECT.
     *
     * `focus` on the tracking screen is `routeAt(department, progress).at`,
     * and `routeAt` rebuilds a 48-element route on every call — so `.at` is
     * a brand-new object on every render, and the screen re-renders at
     * least once a second from its own ETA clock. Depending on the object
     * meant this stopped and restarted the move every second even when the
     * route had quantised to the SAME sample: the camera was being told to
     * re-ease towards a point it was already approaching.
     */
  }, [animate, camU, camV, focus?.u, focus?.v]);

  /*
   * THE PLATE IS THE WHOLE NEIGHBOURHOOD, NOT ONE SCREEN OF IT.
   *
   * Drawn at `WORLD_EXTENT` times the viewport and then slid, so there is
   * genuinely more of it than fits — which is the property Amit asked for
   * twice and the reason the plaza was thrown away. Sizing it to the
   * viewport and calling a translation "travel" would have slid an empty
   * edge into view.
   */
  /*
   * AND ONLY WHEN THE PLATE IS ACTUALLY THE NEIGHBOURHOOD.
   *
   * The fallback plate is a single street, drawn to fit one screen. Blowing
   * that up to 2.4x and sliding it does not reveal more world — there is no
   * more world in the file — it just crops into the tarmac, which is
   * exactly what the first screen showed the moment this was switched on.
   *
   * So the world-sized plate applies to the world-sized asset, and the
   * fallback is shown fitted, as it was. The screen degrades to the smaller
   * truth instead of pretending the bigger one is there.
   */
  // Same rule as the live world: the box is the plate's shape, so a
  // measured coordinate is a plate pixel. See `worldBox`.
  const wb = worldBox(width, height, lens, isWorldPlate, geo ? geoAspect(geo.bounds) : undefined);
  const worldW = wb.width;
  const worldH = wb.height;

  // How far the plate sits so a given world point lands mid-screen.
  /*
   * CLAMPED, SO THE EDGE OF THE WORLD NEVER ENTERS THE FRAME.
   *
   * `WorldViewport` has always clamped this; the backdrop did not, and it
   * did not matter while the camera only ever looked near the middle. It
   * started mattering the moment the camera FOLLOWED somebody: the
   * professional's route ends at the customer, low in the world, so the
   * focus walked past what the plate could cover and the frame filled with
   * black down one side and along the bottom. Looking past the end of the
   * plate is what turns a place back into a photograph.
   */

  /*
   * The clamp expressed where Animated can apply it: the two values of
   * the focus at which the offset would hit the edge of the plate. Same
   * arithmetic as `shift`, written so it needs no JS per frame.
   */
  const axis = (value: Animated.Value, screen: number, world: number) => {
    if (!isWorldPlate) return new Animated.Value((screen - world) / 2);
    const span = world - screen;
    if (span <= 0) return new Animated.Value((screen - world) / 2);
    return value.interpolate({
      inputRange: [screen / 2 / world, (world - screen / 2) / world],
      outputRange: [0, -span],
      extrapolate: "clamp",
    });
  };

  const travelTransform = [
    { translateX: axis(camU, width, worldW) },
    { translateY: axis(camV, height, worldH) },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, styles.night]} pointerEvents="none">
      {geo ? (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: worldW,
            height: worldH,
            transform: travelTransform,
          }}
        >
          {/*
            THE SAME GROUND THE STROLL SCREEN STANDS ON — the painted
            city in the blocks, the real road corridor laid over it in
            stone, and the roads that stopped in the middle of the map
            reclaimed as lawn. See `WorldGround`, which is where that
            decision lives once.
          */}
          <WorldGround
            width={worldW}
            height={worldH}
            sources={sources}
            geo={geo}
            /* Derived from the lens this backdrop is actually at — see
               `metresAcrossAt`, and the screen that asserted one and used
               another. */
            metresAcross={metresAcrossAt(lens, geo.bounds)}
            animate={animate}
          />
        </Animated.View>
      ) : null}
      {!geo && hasArt ? (
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: worldW,
            height: worldH,
            transform: [
              ...travelTransform,
              { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [width * 0.04, -width * 0.04] }) },
              { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [height * 0.02, -height * 0.02] }) },
            ],
          }}
        >
          <AssetSlot
            placement={{
              key: "backdrop",
              assetId,
              item: {
                id: assetId,
                file: "",
                intrinsicWidth: 1,
                intrinsicHeight: 1,
                anchor: { x: 0.5, y: 0.5 },
                role: "GROUND",
                theme: "SHARED",
                defaultWidthRatio: 1,
                critical: false,
              },
              layer: "GROUND_LAYER",
              left: 0,
              top: 0,
              width: worldW,
              height: worldH,
              depthOrder: 0,
            }}
            sources={sources}

            pending="none"
          />
        </Animated.View>
      ) : null}

      {/*
        * The street's own life: a courier, a van, a light. Nothing here is
        * supply — see WorldLife, which knows nothing about candidates.
        *
        * It lives INSIDE the moving plate, because its positions are world
        * coordinates. Outside it, a courier would drive across the screen
        * while the street it is supposed to be on slid the other way.
        */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: worldW,
          height: worldH,
          transform: travelTransform,
        }}
        pointerEvents="none"
      >
        {/*
          * The trades, standing in their own streets. Without them the
          * backdrop is a photograph of a road — which is exactly what Amit
          * said about the first screen. Quiet: no signs, because on a
          * screen that is about something else the world is atmosphere.
          */}
        {/*
          * ONLY OVER THE LIVE WORLD.
          *
          * The district positions belong to `world-neighbourhood.ts` — a
          * specific layout of four streets. The welcome screen's hero plate
          * is a different picture with its own shops already painted into
          * it, so placing our buildings on top put a salon standing in the
          * middle of the road. A layout laid over the wrong map is not a
          * layout.
          */}
        {/*
          * AND NOT ON A REAL STREET. See `geo` above: a district marker is
          * a shopfront with a trade name on it, standing on whatever plot
          * is underneath — which on a real extract is somebody's building.
          */}
        {isWorldPlate && !geo ? (
          <DistrictLayer
            width={worldW}
            height={worldH}
            sizeBasis={width}
            sources={sources}

          />
        ) : null}

        {/*
          * Ambient traffic is invention. It stays off real roads — and off
          * any painting that is not the one the road was measured on.
          *
          * This screen can be given a different ground (`welcome_hero`),
          * and the traffic kept driving at the old plate's coordinates:
          * a scooter across a café terrace, because the terrace is where
          * the other picture's road used to be. Amit: *"עפים בלי קשר
          * קטנוע משאית... נראה לא אמיתי."* See `roadIsMeasuredFor`.
          */}
        {!roadIsMeasuredFor({ groundAssetId: assetId, realMap: geo !== null }) ? null : (
        <WorldLife
          width={worldW}
          height={worldH}
          sizeBasis={width}
          sources={sources}
          animate={animate}
          departmentCode={departmentCode}
        />
        )}

        {/* In the world, not over it. See `children` above. */}
        {children?.({ width: worldW, height: worldH })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The night of the rest of the product, so the first screen is made of
  // the same material as everything after it.
  night: { backgroundColor: palette.night900, overflow: "hidden" },
});
