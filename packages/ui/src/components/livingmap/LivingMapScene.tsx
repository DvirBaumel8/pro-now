import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import {
  foundHeadlineHe,
  LIVING_MAP_TIMING,
  livingMapViolations,
  availabilityScenes,
  beatAt,
  cameraFor,
  venueAssetFor,
  cardMayShow,
  JOURNEY_TOTAL_MS,
  RETURN,
  shotForBeat,
  worldZoomFor,
  sweepFrame,
  districtFor,
  layOutVenues,
  searchingDetailHe,
  type CameraShot,
  type DiscoveryState,
  type LivingMapState,
  type PlayDrawerActionId,
} from "@pro-now/types";

import { palette, radii, spacing, tabular, type } from "../../theme";
import { DemoCity } from "./DemoCity";
import { HAIR_PACK_V0, HAIR_SCENE } from "./hairPack";
import { WorldStage } from "./WorldStage";
import { WorldViewport } from "./WorldViewport";
import type { WorldAssetSources } from "./AssetSlot";
import { MatchSheet } from "./MatchSheet";
import { DistrictLayer } from "./DistrictLayer";
import { VenueLayer } from "./VenueLayer";
import { WorldLife } from "./WorldLife";
import { PlayDrawer } from "./PlayDrawer";
import { livingPalette as P } from "./palette";

/**
 * THE LIVING MAP — one mounted scene that changes shape four times.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS ONE SCENE AND NOT FOUR SCREENS
 * ---------------------------------------------------------------------
 * Amit's complaint about the flow was not about any single screen: *"לא
 * נגיש והמעבר כרגע ממש לא חלק… לא מובן המעברים בין הכרטיסים."* Building
 * four beautiful screens would have been that same mistake with better art,
 * which is exactly what ChatGPT's spec forbids:
 *
 *   "אל תבנו עכשיו SearchScreen.tsx מהמם ואז FoundScreen.tsx מהמם… הכול
 *    צריך להיות אותו mounted scene. אל תנווט בין screens."
 *
 * So the city is mounted once and never unmounts. The four phases are
 * different arrangements of the same layers, with the transition durations
 * living in `LIVING_MAP_TIMING` so the scene cannot disagree with itself.
 *
 * ---------------------------------------------------------------------
 * THE LAYER STACK, IN ORDER
 * ---------------------------------------------------------------------
 *     MapAdapter          the demo city now, real tiles later
 *     WorldDecoration     theme accents. No coordinates, ever.
 *     CandidatePresence   real people only, on an orbit with no geography
 *     Journey             assigned jobs only
 *     MiniGame            optional, and never over the ETA or safety
 *     HUD                 the words, which live outside the world
 *
 * The separation is in the types (see `living-map.ts`), so a developer
 * cannot put a candidate at a lat/lng: `CandidatePresence` has `lat?:
 * never`. This file could not break the rule if it tried.
 *
 * ---------------------------------------------------------------------
 * AND WHY EVERY ANIMATION IS A TRANSFORM
 * ---------------------------------------------------------------------
 * Only `opacity` and `transform` run on the native driver. Animating an
 * SVG `d` or `cx` runs on the JS thread and stutters precisely when the
 * device is busy — which, on this screen, it is: dispatch is running. So
 * the city is painted once and everything that moves is an `Animated.View`
 * over it.
 */

export interface LivingMapSceneProps {
  state: LivingMapState;
  /** Already formatted by the caller from a real ETA. Null when unknown. */
  etaMinutes: number | null;
  arrivalClockHe: string | null;
  serviceNameHe: string;
  /** True once the server is checking eligibility — drives the sub-line. */
  checkingEligibility?: boolean;
  /**
   * Which department the request belongs to. Decides the district — the
   * venue art, the character and the sign over the door.
   */
  departmentCode?: string;
  onAccept?: () => void;
  onAnother?: () => void;
  onSafety?: () => void;
  /** Reduced motion: renders the settled frame of every phase. */
  animate?: boolean;
  /**
   * The art pack, once it exists. Present — even empty — switches the world
   * from the old SVG drawing to the composed stage. See the swap below.
   */
  worldSources?: WorldAssetSources;
  /**
   * The world becomes playable only while someone is on the way. Passing
   * this turns scenery into things that answer when touched, and brings up
   * the drawer that makes a dead end impossible.
   */
  discoveries?: DiscoveryState;
  onFound?: (discoveryId: string) => void;
  onPlayAction?: (id: PlayDrawerActionId) => void;
  /**
   * How much room to leave clear at the top of the HUD.
   *
   * The screen above may be floating a control there — the back control,
   * in practice — and the headline was landing underneath it, with "ביטול
   * הבקשה" printed straight through "מחפשים מי זמין עכשיו". The scene does
   * not know what the control is and should not: it is told how much space
   * is taken, and moves out of the way.
   */
  topInset?: number;
  /**
   * Opening a shop opens the professional it stands for.
   *
   * Amit: *"כל חנות כזו בעצם תהיה הכרטיס, שם יקפוץ פרופיל המקצוען."* That
   * is the right model and it closes a gap: the venue was decorative, and a
   * building you cannot open is a picture of a choice rather than a choice.
   *
   * Deliberately absent during SEARCHING. While dispatch is still checking,
   * opening somebody's profile would present them as an option before the
   * server has said they are one.
   */
  onOpenProfile?: (candidateId: string) => void;
  /**
   * Whether the professional's card is currently on screen.
   *
   * The scene needs to know, because closing it is a camera move rather
   * than a dismissal. ChatGPT: *"בסיום נשארים באזור הרלוונטי עם שאר
   * המועמדים הזמינים — לא חוזרים אוטומטית ל-WIDE/Home. כך הוא יכול לגרור
   * מיד למספרה הבאה."*
   *
   * Snapping back to the wide shot would make comparing two professionals
   * mean taking the whole journey again, every time.
   */
  profileOpen?: boolean;
  width: number;
  height: number;
}

/**
 * How often the sweep clock is read.
 *
 * Not a frame rate — the camera move itself runs on the native driver and
 * does not need JS at 60Hz. This only has to be fine enough to notice when
 * one stop ends and the next begins, and coarse enough that a screen which
 * is live during dispatch is not re-rendering constantly while somebody
 * waits.
 */
const SWEEP_TICK_MS = 200;

export function LivingMapScene({
  state,
  etaMinutes,
  arrivalClockHe,
  serviceNameHe,
  checkingEligibility = false,
  departmentCode,
  onAccept,
  onAnother,
  onSafety,
  worldSources,
  discoveries,
  onFound,
  onPlayAction,
  animate = true,
  topInset = 0,
  onOpenProfile,
  profileOpen = false,
  width,
  height,
}: LivingMapSceneProps) {
  const { phase, candidates, theme } = state;

  /*
   * THE INVARIANT IS CHECKED AT RENDER, IN DEVELOPMENT.
   *
   * Every rule in `livingMapViolations` describes a screen that would look
   * completely convincing and be false — a second chosen candidate, a real
   * position over invented streets. A silent console warning is worth more
   * than a comment nobody reads, and it fires the moment a fixture drifts.
   */
  const violations = livingMapViolations(state);
  if (violations.length > 0 && typeof console !== "undefined") {
    console.warn("[LivingMap] refusing to vouch for this scene:", violations);
  }

  const chosen = candidates.find((c) => c.state === "CHOSEN") ?? null;
  const visible = candidates.filter((c) => c.state !== "RULED_OUT");

  /*
   * THE CAMERA, DRIVEN BY THE PHASE.
   *
   * Venues are the avatars of the candidates the server actually returned
   * — three barbershops are three choices, never three addresses — so the
   * camera has somewhere real to look without anybody's position being
   * claimed. See `virtual-venue.ts` for why that distinction is the whole
   * design.
   */
  const venues = useMemo(
    () => layOutVenues(visible.map((c) => c.candidateId), theme === "HAIR" ? "HAIR" : "HOME"),
    [theme, visible]
  );

  /*
   * WHICH TRADE'S WORLD THIS IS.
   *
   * The scene asks the district table and knows nothing else about trades.
   * That is what makes "focus on everything, not just the barbershop" a
   * data change rather than a rewrite: a new department is a row in
   * `WORLD_DISTRICTS` plus two image files, and this file never moves.
   */
  const district = districtFor(departmentCode ?? "");

  /*
   * WHO IS STANDING OUTSIDE.
   *
   * Availability is the server's answer, never worked out here. A screen
   * that decided for itself who was free would be a screen that could be
   * wrong about it — and the whole reason this is honest is that it is the
   * same fact a "זמין עכשיו" badge would have carried, drawn as a scene.
   */
  const availability = useMemo(
    () =>
      availabilityScenes({
        candidateIds: visible.map((c) => c.candidateId),
        availableCandidateIds: visible.filter((c) => c.state !== "CHECKING").map((c) => c.candidateId),
        departmentCode: departmentCode ?? "",
      }),
    [departmentCode, visible]
  );
  /*
   * ---------------------------------------------------------------------
   * THE JOURNEY TO A SHOP
   * ---------------------------------------------------------------------
   * Amit: *"רוצה שיקח אותי בזום אווט לבית העסק הרצוי ואז זום אין לבית העסק,
   * שפותח כרטיס מקצוען."* ChatGPT wrote the timing and it is implemented
   * beat for beat in `arrival-journey.ts` — pulled back, a near-stop, the
   * travel, the close-in, a held moment of having arrived, and only then
   * the card.
   *
   * The clock is the whole mechanism: `beatAt` decides the shot and
   * `cardMayShow` decides whether the card is allowed on screen yet, so the
   * two can never disagree about where we are in the move.
   */
  const [journeyMs, setJourneyMs] = useState<number | null>(null);
  const travellingTo = useRef<string | null>(null);

  /** Bumped once per journey, and the only thing the clock effect watches. */
  const [journeyStartedAt, setJourneyStartedAt] = useState(0);

  const startJourney = useCallback((candidateId: string) => {
    travellingTo.current = candidateId;
    setJourneyMs(0);
    setJourneyStartedAt(Date.now());
  }, []);

  useEffect(() => {
    if (journeyMs === null) return;
    if (!animate) {
      setJourneyMs(JOURNEY_TOTAL_MS);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => {
      const t = Date.now() - startedAt;
      setJourneyMs(t);
      if (t >= JOURNEY_TOTAL_MS) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
    /*
     * Keyed on the START of a journey, not on its clock.
     *
     * `journeyMs` deliberately is not a dependency: it changes every 50ms,
     * and depending on it would tear this effect down and stand a new
     * interval up twenty times a second — each one starting its own clock
     * from zero, so the camera would never leave the first beat.
     */
  }, [animate, journeyStartedAt]);

  const journeyBeat = journeyMs === null ? null : beatAt(journeyMs);

  /*
   * THE WAY BACK.
   *
   * Closing the card does not undo the journey — it steps out one level, to
   * the street the customer is standing in, with the other candidates still
   * around them. Timed to ChatGPT's spec: the camera starts moving while
   * the card is still going down, so the two read as one gesture rather
   * than as a dismissal followed by an animation.
   */
  const [restingAt, setRestingAt] = useState<"DISTRICT" | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (profileOpen) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;

    const id = setTimeout(() => {
      setJourneyMs(null);
      travellingTo.current = null;
      setRestingAt(RETURN.restsAt);
    }, RETURN.cameraStartMs);
    return () => clearTimeout(id);
  }, [profileOpen]);

  // Any change of phase is a new part of the story; the rest is released.
  useEffect(() => setRestingAt(null), [phase]);

  /*
   * THE CARD IS GATED ON THE CAMERA, NOT ON A TIMEOUT.
   *
   * ChatGPT asked for this as an enforced rule rather than a convention:
   * *"FocusSheet cannot become visible before cameraState === VENUE &&
   * arrivalHoldCompleted === true."* Somebody will eventually try to save
   * the 150ms hold, and this is what stops that from silently working.
   */
  useEffect(() => {
    if (journeyMs === null || !travellingTo.current) return;
    if (!cardMayShow(journeyMs)) return;
    const id = travellingTo.current;
    travellingTo.current = null;
    onOpenProfile?.(id);
  }, [journeyMs, onOpenProfile]);

  const shot: CameraShot =
    restingAt !== null
      ? restingAt
      : journeyBeat !== null
      ? shotForBeat(journeyBeat)
      : phase === "SEARCHING"
        ? "WIDE"
        : phase === "CANDIDATES_FOUND"
          ? "DISTRICT"
          : phase === "MATCH_REVEAL"
            ? "VENUE"
            : "ROUTE";

  /*
   * ---------------------------------------------------------------------
   * THE CAMERA SEARCHES
   * ---------------------------------------------------------------------
   * Amit: *"אני חייב שבזמן חיפוש במפה לבעל מקצוע תהיה תזוזה בין מספרות,
   * לדוגמא, עד שמוצא. חייב עוד תנועות."*
   *
   * The street already had things crossing it. The camera did not move at
   * all, and that is what made the wait read as a picture with animation
   * over it. A camera travelling from shop to shop is the same seconds
   * spent saying something true: dispatch is checking candidates, one after
   * another, right now.
   *
   * The clock ticks only while searching, and `sweepFrame` is pure, so what
   * the camera does is decided in `search-sweep.ts` and tested there rather
   * than judged by watching the screen.
   */
  const [sweepMs, setSweepMs] = useState(0);
  useEffect(() => {
    if (phase !== "SEARCHING" || !animate) {
      setSweepMs(0);
      return;
    }
    const startedAt = Date.now();
    const id = setInterval(() => setSweepMs(Date.now() - startedAt), SWEEP_TICK_MS);
    return () => clearInterval(id);
  }, [animate, phase]);

  const sweep = useMemo(
    () => sweepFrame({ venues, elapsedMs: sweepMs, reducedMotion: !animate }),
    [animate, sweepMs, venues]
  );

  const camera = useMemo(
    () =>
      journeyBeat !== null
        ? cameraFor({ shot, venues, chosenCandidateId: travellingTo.current ?? chosen?.candidateId ?? null })
        : phase === "SEARCHING" && venues.length > 0 && animate
          ? sweep.camera
          : cameraFor({ shot, venues, chosenCandidateId: chosen?.candidateId ?? null }),
    [animate, chosen?.candidateId, journeyBeat, phase, shot, sweep.camera, venues]
  );

  /** One driver per transition, so each phase can be reasoned about alone. */
  const found = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const route = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const to = (v: Animated.Value, value: number, duration: number) =>
      Animated.timing(v, {
        toValue: value,
        duration: animate ? duration : 0,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });

    const seq = Animated.parallel([
      to(found, phase === "SEARCHING" ? 0 : 1, LIVING_MAP_TIMING.searchingToFound),
      to(reveal, phase === "MATCH_REVEAL" || phase === "ASSIGNED_ROUTE" ? 1 : 0, LIVING_MAP_TIMING.foundToReveal),
      to(route, phase === "ASSIGNED_ROUTE" ? 1 : 0, LIVING_MAP_TIMING.revealToRoute),
    ]);
    seq.start();
    return () => seq.stop();
  }, [phase, animate, found, reveal, route]);

  useEffect(() => {
    if (!animate || phase !== "SEARCHING") {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [animate, phase, pulse]);

  const cx = width / 2;
  const cy = height * 0.5;
  const accent = P.themeAccent[state.theme];

  const headline =
    phase === "SEARCHING"
      ? "מחפשים מי זמין עכשיו"
      : phase === "CANDIDATES_FOUND"
        ? (foundHeadlineHe(candidates) ?? "מחפשים מי זמין עכשיו")
        : phase === "MATCH_REVEAL"
          ? "מצאנו לך התאמה"
          : chosen
            ? `${firstName(chosen.displayNameHe)} בדרך אליך`
            : "בדרך אליך";

  const detail =
    phase === "SEARCHING"
      ? searchingDetailHe({ checkingEligibility, anyCandidateSeen: candidates.length > 0 })
      : phase === "CANDIDATES_FOUND"
        ? "בוחרים את ההתאמה המתאימה לבקשה שלך"
        : null;

  return (
    <View style={[styles.scene, { width, height }]}>
      {/* ---------------- LAYER 1 — the map adapter ---------------- */}
      {/*
        * The demo city. It renders only because the adapter is
        * illustrative; a real provider replaces this layer and the five
        * above it stay exactly as they are.
        */}
      {/* ---------------------------------------------------------------
          ONE WORLD LAYER.
          ---------------------------------------------------------------
          Amit: *"בחיפוש הוא לא לוקח אותי טיול, וכשהוא מוצא הוא לא מראה לי
          את המקום או את בעל המקצוע."*

          Both halves were one defect. Venue positions became world
          coordinates when the world became a neighbourhood, but the ground,
          the traffic and the shops were each still being handed the
          VIEWPORT's width and height — so the whole neighbourhood was
          squeezed into one screen (nothing to travel to) and the camera
          moved the ground out from under layers that stayed put (arriving
          at a venue arrived at nothing).

          Now everything that lives in the world is inside one moving layer
          and is told the world's size, so they share a coordinate system
          and a camera by construction rather than by three call sites
          agreeing with each other.
          --------------------------------------------------------------- */}
      <WorldViewport
        width={width}
        height={height}
        focus={camera.focus}
        /*
         * THE SHOT DECIDES HOW MUCH WORLD IS SHOWN, NOT camera.zoom.
         *
         * `CameraState.zoom` was written when the world was exactly one
         * screen, so 1 meant "resting". The world is now 2.4 screens wide,
         * and passing that 1 straight through silently meant *show 40% of
         * it* — with DISTRICT and VENUE pushing in from there until the
         * screen was a van and some asphalt. Amit: *"איפה המבט על? הכל בזום
         * אין."*
         *
         * `worldZoomFor` translates the shot where the extent is known, so
         * WIDE fits the whole neighbourhood.
         */
        zoom={worldZoomFor(camera.shot)}
        /*
         * Only the neighbourhood plate is a world. The fallback street
         * plate is one screen, and blowing it up to travel across would
         * crop into the tarmac rather than reveal anything.
         */
        worldSized={Boolean(worldSources?.["world_neighbourhood"])}
        explorable={Boolean(worldSources)}
        animate={animate}
      >
        {(world) => (
          <>
            {/*
              * THE SWAP, AS ONE CONDITION. `DemoCity` is the flat SVG world
              * that was rejected; it stays only so the screen is not a
              * black rectangle before the art lands. The moment real assets
              * are registered the stage takes over completely.
              */}
            {worldSources ? (
              <WorldStage
                manifest={HAIR_PACK_V0}
                placements={HAIR_SCENE}
                box={{
                  width: world.width,
                  height: world.height,
                  safeTop: Math.round(height * HUD_SHARE),
                  safeBottom: Math.round(height * SHEET_SHARE),
                }}
                sources={worldSources}
                foundIds={discoveries?.found}
                onFound={phase === "ASSIGNED_ROUTE" ? onFound : undefined}
                animate={animate}
              />
            ) : (
              <DemoCity width={world.width} height={world.height} />
            )}

            {/*
              * Couriers, a removals van, a tow truck, a dog walker — all of
              * them somebody working, which is what makes this the
              * marketplace rather than a traffic simulator. Nothing draws
              * until its art exists.
              */}
            {worldSources ? (
              <WorldLife
                departmentCode={departmentCode}
                width={world.width}
                height={world.height}
                sizeBasis={width}
                sources={worldSources}
                animate={animate}
              />
            ) : null}

            {/*
              * THE NEIGHBOURHOOD'S OWN TRADES — eleven of them, across four
              * streets, most of them off-screen at any moment. This is what
              * makes the tour worth taking: Amit was dragging past an empty
              * road because only the matched candidates were ever drawn.
              *
              * A district is a PLACE and carries no name, rating or
              * availability. A venue below is a PERSON. See DistrictLayer
              * for why confusing the two would be the most expensive
              * mistake available on this screen.
              */}
            <DistrictLayer
              width={world.width}
              height={world.height}
              sizeBasis={width}
              sources={worldSources}
              activeDepartment={(departmentCode as never) ?? null}

            />

            {/*
              * THE CANDIDATES, AS PLACES. Each match gets a virtual shop:
              * a building is a metaphor for a candidate, never an address,
              * and `VirtualVenue` makes that a compile error rather than a
              * promise.
              */}
            {venues.length > 0 ? (
              <VenueLayer
                venues={venues}
                candidates={visible}
                width={world.width}
                height={world.height}
                sizeBasis={width}
                visibleLeft={world.visibleLeft}
                sources={worldSources}
                /*
                 * A DIFFERENT SHOPFRONT PER CANDIDATE.
                 *
                 * Three hairdressers used to draw three identical
                 * buildings, which reads as one shop copied rather than
                 * three businesses. The variant is chosen by the
                 * candidate's position in the list and means nothing else:
                 * it is not a rank, a price band or a quality signal.
                 */
                assetIdForCandidate={(candidateId) =>
                  venueAssetFor(
                    district,
                    visible.findIndex((c) => c.candidateId === candidateId)
                  )
                }
                availability={availability}
                characterAssetId={district.characterWorldAssetId}
                selectedCandidateId={chosen?.candidateId ?? null}
                /*
                 * A tap starts the JOURNEY, it does not open the card. The
                 * card is opened by the clock above, once the camera has
                 * arrived and held — which is the difference between being
                 * taken somewhere and having a sheet appear.
                 */
                onSelect={phase === "SEARCHING" ? undefined : startJourney}
                /*
                 * No wake-up animation during the search: `found` is 0 then,
                 * and driving the opacity from it would leave the street
                 * empty for the camera to tour.
                 */
                progress={phase === "SEARCHING" ? undefined : found}
                muted={phase === "SEARCHING"}
              />
            ) : null}
          </>
        )}
      </WorldViewport>

      {/* ---------------------------------------------------------------
          THE TRADE'S COLOUR, AND THE SEARCH ITSELF.
          ---------------------------------------------------------------
          Screen-space, above the world and below the HUD — and that is the
          point of keeping them out of the moving layer. The wash belongs to
          the screen, not to a place, and the pulse comes out of where the
          CUSTOMER is, which is here, not somewhere in the neighbourhood.
          Dragging the world must not drag the pulse off with it.
          --------------------------------------------------------------- */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.themeWash,
          {
            backgroundColor: accent,
            opacity: route.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.05] }),
          },
        ]}
      />

      {phase === "SEARCHING" ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              left: cx - 90,
              top: cy - 90,
              borderColor: accent,
              opacity: pulse.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.4, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1.6] }) }],
            },
          ]}
        />
      ) : null}

      {/* The scrim that lets the person come forward out of the city. */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          {
            /*
             * The scrim is for the REVEAL, not for the journey. It darkens
             * hard so the person can come forward out of the city, then
             * eases back once he is on his way — because from that point
             * the city is the thing worth watching again, and a permanently
             * dimmed world is just a dark screen with a name on it.
             */
            /*
             * MUCH LIGHTER THAN IT WAS. The old value blacked the city out
             * to lift a centred portrait off it. The portrait is in the
             * sheet now, so the scrim only has to separate foreground from
             * background — and the approved composition gives the world
             * 65–70% of the screen, which a heavy scrim would take back.
             */
            opacity: Animated.subtract(
              reveal.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
              route.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] })
            ),
          },
        ]}
      />

      {/*
        * A SCRIM UNDER THE WORDS. The city is busy by design, and white
        * type over a lit window is unreadable — the audit measures this and
        * so does anyone holding the phone. Two soft bands, top and bottom,
        * so the HUD always has something to sit on without the world
        * having to be dimmed everywhere.
        */}
      <View style={[styles.scrimTop, { height: height * HUD_SHARE }]} pointerEvents="none" />
      {/*
        * No bottom band during the reveal — the match sheet is a real
        * surface and a scrim under it would just be a second, softer sheet.
        */}
      {phase === "MATCH_REVEAL" ? null : (
        <View style={[styles.scrimBottom, { height: height * 0.18 }]} pointerEvents="none" />
      )}

      {/* ---------------- LAYER 6 — the HUD ---------------- */}
      {/*
        * The words live OUTSIDE the world. ChatGPT: *"אל תכתוב HAIR /
        * GARAGE / SHOP על הבניינים… העברית צריכה להיות ב-HUD."* A label on
        * a building on a map is a business at a place; a label in the HUD
        * is the app talking.
        */}
      <View style={[styles.hudTop, topInset ? { top: spacing.xl + topInset } : null]} pointerEvents="none">
        {/*
          * ONE THING IN THE TOP BAND AT A TIME.
          *
          * Through the search and the reveal it holds the headline and the
          * job brief. Once he is on his way the ETA takes the band over
          * completely — the spec pins the ETA to the top, and the drawer
          * below already names who is coming, so repeating "דניאל בדרך
          * אליך" up here would be the same sentence twice with the ETA
          * drawn across it.
          */}
        {phase === "ASSIGNED_ROUTE" ? (
          etaMinutes !== null ? (
            <>
              <Text style={styles.eta}>{etaMinutes} דק׳</Text>
              <Text style={styles.etaLabel}>
                {arrivalClockHe ? `הגעה משוערת ${arrivalClockHe}` : "אליך"}
              </Text>
            </>
          ) : (
            <Text style={styles.etaLabel}>זמן ההגעה יתעדכן כשייצא לדרך</Text>
          )
        ) : (
          <>
            <Text style={styles.headline} numberOfLines={2}>
              {headline}
            </Text>
            {detail ? <Text style={styles.detail}>{detail}</Text> : null}
            <View style={styles.brief}>
              <Text style={styles.briefText} numberOfLines={1}>
                {serviceNameHe} · עכשיו
              </Text>
            </View>
          </>
        )}
      </View>

      {/*
        * THE DECISION, gathered into one sheet at the bottom.
        *
        * Name, profession, reputation, ETA and the CTA used to be four
        * separate things stacked down the middle of the city. One surface,
        * below the world, is the composition Amit and ChatGPT both signed
        * off on — and it is the thing that empties the centre.
        */}
      {chosen && phase === "MATCH_REVEAL" ? (
        <MatchSheet
          candidate={chosen}
          etaMinutes={etaMinutes}
          arrivalClockHe={arrivalClockHe}
          onAccept={onAccept}
          onAnother={onAnother}
          progress={reveal}
        />
      ) : null}

      {/*
        * THE DRAWER — always there through the wait, so there is never a
        * screen to get stuck on. See PlayDrawer for why this is a defect
        * fix rather than a feature.
        */}
      {phase === "ASSIGNED_ROUTE" ? (
        <PlayDrawer
          firstNameHe={chosen ? firstName(chosen.displayNameHe) : null}
          etaMinutes={etaMinutes}
          discoveries={discoveries ?? { available: [], found: [] }}
          onAction={onPlayAction}
        />
      ) : null}

      {/*
        * SAFETY IS PINNED AND NEVER COVERED. The mini-game layer is told
        * where this is and refuses to take a touch inside it — see
        * MiniGameLayer. An interaction that can swallow the safety control
        * is not a game, it is a hazard.
        */}
      {phase === "ASSIGNED_ROUTE" && onSafety ? (
        <Pressable
          onPress={onSafety}
          accessibilityRole="button"
          accessibilityLabel="בטיחות"
          /*
           * ABOVE THE DRAWER, NOT UNDER IT. Safety is pinned low because
           * that is where a thumb already is, but the drawer now owns the
           * bottom, so this sits on top of it rather than behind it. A
           * safety control a drawer can cover is not a safety control.
           */
          style={[styles.safety, { bottom: Math.round(height * SHEET_SHARE) + spacing.xl }]}
        >
          <Text style={styles.safetyText}>בטיחות</Text>
        </Pressable>
      ) : null}

      {/*
        * THE ONE LINE THAT MAKES THE INVENTED CITY HONEST. It is small and
        * it is always there while the adapter is illustrative.
        */}
      {state.adapter.illustrativeOnly ? (
        <View
          style={[
            styles.demoNoteWrap,
            // Above whichever surface owns the bottom, never behind it. The
            // one line that keeps an invented city honest is not a line to
            // let a drawer cover.
            phase === "MATCH_REVEAL" || phase === "ASSIGNED_ROUTE"
              ? { bottom: Math.round(height * SHEET_SHARE) + spacing.xs }
              : null,
          ]}
          pointerEvents="none"
        >
          <Text style={styles.demoNote}>
            תצוגת העיר היא המחשה · המפה האמיתית תיכנס עם ספק המפות
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function firstName(nameHe: string): string {
  return nameHe.replace(/[()[\]]/g, "").trim().split(/\s+/)[0] ?? nameHe;
}

/**
 * THE APPROVED COMPOSITION, as three numbers.
 *
 * ChatGPT confirmed it without hedging: *"מאשר חד־משמעית את הקומפוזיציה:
 * המרכז מתפנה. בערך 65–70% מהחוויה החזותית היא העולם. למעלה HUD קצר בלבד;
 * למטה sheet."* They live here rather than inside a style so the safe zones
 * handed to the world stage and to the mini-game are computed from the same
 * source as the bands that are actually drawn.
 */
const HUD_SHARE = 0.17;
const SHEET_SHARE = 0.26;

const styles = StyleSheet.create({
  scene: { overflow: "hidden", backgroundColor: P.nightTop },
  themeWash: { ...StyleSheet.absoluteFillObject },
  pulse: { position: "absolute", width: 180, height: 180, borderRadius: 90, borderWidth: 2 },
  scrim: { backgroundColor: "#0B0918" },
  /*
   * Flat translucent bands rather than gradients: a gradient here would be
   * an SVG or an extra dependency, and two stacked bands at different
   * opacities read the same at this scale for none of the cost.
   */
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11,9,24,0.62)",
  },
  scrimBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(11,9,24,0.55)",
  },

  bubble: {
    position: "absolute",
    borderWidth: 3,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  hudTop: { position: "absolute", top: spacing.xl, left: spacing.lg, right: spacing.lg, alignItems: "center" },
  headline: { ...type.section, color: palette.nightText, textAlign: "center", writingDirection: "rtl" },
  detail: {
    ...type.meta,
    color: palette.nightTextSoft,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 4,
  },
  brief: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(11,9,24,0.6)",
  },
  briefText: { ...type.meta, color: palette.nightText, writingDirection: "rtl" },

  eta: { ...type.title, ...tabular, color: palette.nightText },
  etaLabel: { ...type.meta, color: palette.nightTextSoft, writingDirection: "rtl" },

  safety: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(11,9,24,0.72)",
  },
  safetyText: { ...type.metaStrong, color: palette.berry300, writingDirection: "rtl" },

  demoNoteWrap: { position: "absolute", bottom: spacing.sm, left: spacing.lg, right: spacing.lg },
  demoNote: {
    ...type.micro,
    color: "rgba(247,243,250,0.4)",
    textAlign: "center",
    writingDirection: "rtl",
  },
});
