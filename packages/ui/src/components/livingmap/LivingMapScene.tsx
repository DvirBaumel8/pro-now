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
  type Heading,
  type NormalizedPoint,
  WALK_START,
  walkingAssetFor,
  walkingFallbackFor,
  avatarById,
  errandsBetween,
  PLATE_SPOTS,
  reachedNow,
  type Gait,
  type AvatarChoice,
  type LivingMapPhase,
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
import { ErrandLayer } from "./ErrandLayer";
import { PlayDrawer } from "./PlayDrawer";
import { ScrimBand } from "./ScrimBand";
import { livingPalette as P } from "./palette";
import { SteerPad } from "./SteerPad";
import { Walker } from "./Walker";

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
  /**
   * WHO THE CUSTOMER IS IN THIS WORLD.
   *
   * Amit: *"אני רוצה גם שהלקוח יגדיר לעצמו אווטאר בהתחלה… ואיתו הוא יטייל
   * בין העסקים."*
   *
   * Null is a real answer and the common one at first: the picker is
   * skippable on purpose (*"לא חובה"*). A customer with no avatar still
   * gets the whole street, just without a figure in it — the camera goes
   * back to looking at places rather than following a person, and no
   * stand-in body is invented for them.
   */
  avatar?: AvatarChoice;
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

/**
 * How much of the top of this screen belongs to the headline and the back
 * control. A venue card that would land inside it flips under its shop
 * instead of being read through a banner.
 */
const VENUE_CARD_TOP_CLEARANCE = 132;

/**
 * The phases that mean "we are taking you somewhere", in order.
 *
 * Used only to turn a phase into a number the viewport can compare, so a
 * hand-dragged world is released when the story moves on and not when the
 * search sweep nudges the focus. Order is arbitrary and must only be
 * stable — two phases sharing an index would mean a transition between
 * them did not release the drag.
 */
const RECENTRE_ON: readonly LivingMapPhase[] = [
  "SEARCHING",
  "CANDIDATES_FOUND",
  "MATCH_REVEAL",
  "ASSIGNED_ROUTE",
];

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
  avatar = null,
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
  /*
   * MEMOISED, BECAUSE EVERYTHING DOWNSTREAM IS MEMOISED ON IT.
   *
   * This was a fresh array literal every render, and `venues`,
   * `availability` and `sweep` all list it as a dependency — so all three
   * `useMemo`s recomputed on every render and handed new objects down.
   * `sweepFrame` returns a new `camera.focus` literal, which became the
   * walker's `autoTo`, which is in the walk loop's dependency array: the
   * requestAnimationFrame loop was cancelled and rebuilt five to twenty
   * times a second, and each teardown fired `onSettled` — so the "once
   * per 700ms" report ran at 20Hz.
   *
   * The comments in this file claim nothing above the walker re-renders
   * while somebody walks. One unmemoised filter quietly defeated all of
   * them.
   */
  const visible = useMemo(
    () => candidates.filter((c) => c.state !== "RULED_OUT"),
    [candidates]
  );

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
  /*
   * AND NOBODY IS "AVAILABLE" ONCE THEY ARE YOURS.
   *
   * `availableCandidateIds` was everyone not CHECKING, which included the
   * CHOSEN one. So while a card on the same screen said "14 דק׳ · הגעה
   * משוערת 04:46", the chosen professional's own shop still read "פנוי
   * עכשיו · מוכן לצאת" — free now, ready to leave, about the person who
   * had already left and was driving to you.
   *
   * Two rules, and they are different facts. A CHOSEN candidate is not
   * available, whatever the phase: they are assigned. And in
   * ASSIGNED_ROUTE nobody is, because the search is over and the world
   * has stopped advertising supply — a street still saying "free now" over
   * the other shops while somebody is on the way is the product selling
   * to a customer it has already served.
   */
  const availability = useMemo(
    () =>
      availabilityScenes({
        candidateIds: visible.map((c) => c.candidateId),
        availableCandidateIds:
          phase === "ASSIGNED_ROUTE"
            ? []
            : visible
                .filter((c) => c.state !== "CHECKING" && c.state !== "CHOSEN")
                .map((c) => c.candidateId),
        departmentCode: departmentCode ?? "",
      }),
    [departmentCode, visible, phase]
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

  /**
   * Whether the match sheet is on screen, which outlasts the phase.
   *
   * True the moment MATCH_REVEAL begins and false only after the fold-away
   * has had its `foundToReveal` to play. See the mount below.
   */
  const [sheetMounted, setSheetMounted] = useState(false);
  useEffect(() => {
    if (phase === "MATCH_REVEAL") {
      setSheetMounted(true);
      return;
    }
    if (!sheetMounted) return;
    const t = setTimeout(() => setSheetMounted(false), LIVING_MAP_TIMING.foundToReveal);
    return () => clearTimeout(t);
  }, [phase, sheetMounted]);
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
    /*
     * THE CLOCK TICKS AT 20Hz; THE SCREEN DOES NOT.
     *
     * `setJourneyMs` used to be called on every tick, re-rendering this
     * component — and with it WorldStage, WorldLife, eleven districts,
     * every venue and the walker — twenty times a second for the whole
     * journey. On the one screen that is live while dispatch is running.
     *
     * Nothing downstream reads the millisecond. `beatAt` turns it into
     * one of five beats and `cardMayShow` into a yes or no, so the screen
     * has about six distinct states across the whole move. Committing
     * only when one of those changes keeps the timing exact — the clock
     * is still read at 20Hz — and drops the re-renders from roughly
     * eighty to six.
     */
    const startedAt = Date.now();
    let committed = -1;
    const id = setInterval(() => {
      const t = Date.now() - startedAt;
      const done = t >= JOURNEY_TOTAL_MS;
      const changed =
        committed < 0 ||
        beatAt(t) !== beatAt(committed) ||
        cardMayShow(t) !== cardMayShow(committed);
      if (changed || done) {
        committed = t;
        setJourneyMs(t);
      }
      if (done) clearInterval(id);
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
  /**
   * The match sheet's own rise and fall.
   *
   * It used to ride on `reveal`, which is driven to 1 for MATCH_REVEAL and
   * ASSIGNED_ROUTE alike — and the sheet was mounted only while the phase
   * was MATCH_REVEAL. So on confirm the phase flipped, the sheet unmounted
   * in the same commit, and the `translateY: [180, 0]` fold-away never
   * played a single frame: it vanished instantly at exactly the moment the
   * file's own header promises *"the sheet folds away and the world takes
   * the stage"*.
   *
   * Its own value, driven down before the unmount, gives it the exit it
   * was written for.
   */
  const sheet = useRef(new Animated.Value(0)).current;
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
      to(sheet, phase === "MATCH_REVEAL" ? 1 : 0, LIVING_MAP_TIMING.foundToReveal),
      to(route, phase === "ASSIGNED_ROUTE" ? 1 : 0, LIVING_MAP_TIMING.revealToRoute),
    ]);
    seq.start();
    return () => seq.stop();
  }, [phase, animate, found, reveal, route, sheet]);

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

  /*
   * ---------------------------------------------------------------------
   * THE WALK
   * ---------------------------------------------------------------------
   * Amit: *"רוצה חוויה של טיול ברחוב בין מגוון העסקים שלנו — זו החוויה
   * שאני חייב שירגישו, כמו VR."*
   *
   * A drag and a walk move the same pixels across the same screen and mean
   * opposite things. Dragging moves the world under a fixed viewer: the
   * camera changes, the person is nowhere, and what is happening is that a
   * map is being read. Walking moves a person through a world that stays
   * where it is, and the camera follows because it is watching them.
   *
   * That is the whole of "like VR" on a phone, and it needs exactly two
   * things this scene did not have: somebody to be, and a control that
   * moves them. See `Walker` and `SteerPad`.
   *
   * The position lives in Animated values rather than in state on purpose.
   * The figure's transform and the camera's offset are both derived from
   * the SAME two numbers, so they cannot drift apart, and nothing in this
   * file re-renders while somebody is walking — which matters, because
   * this component draws the whole neighbourhood.
   */
  const walkAssetId = walkingAssetFor(avatar);
  /* Their face on a pin until their figure is drawn — see Walker. */
  const walkFallbackId = walkingFallbackFor(avatar);
  const walkHeight = avatarById(avatar)?.heightRatio ?? 1;
  /*
   * WALKING NEEDS SOMEBODY TO WALK, AND THE PIN COUNTS.
   *
   * This was `walkAssetId && sources[walkAssetId]` — the drawn figure,
   * which does not exist yet. So `canWalk` was false for every customer,
   * which switched off the steer pad, the following camera AND the walker
   * itself. A customer chose a character, opened the street, and found an
   * empty world they could not move through: exactly Amit's *"אני לא רואה
   * ולא מבין."*
   *
   * The marker is a real figure as far as walking is concerned — it has a
   * position, a stride, a shadow and a size — so it belongs in this test.
   */
  const canWalk = Boolean(
    (walkAssetId && worldSources?.[walkAssetId]) || (walkFallbackId && worldSources?.[walkFallbackId])
  );

  const walkU = useRef(new Animated.Value(WALK_START.u)).current;
  const walkV = useRef(new Animated.Value(WALK_START.v)).current;
  /*
   * One object, not a new literal each render: it is the first dependency
   * of the viewport's follow transform, so a fresh identity threw away
   * and rebuilt the two interpolation nodes that position the ENTIRE
   * world layer, five to twenty times a second, mid-camera-move.
   */
  const followPair = useMemo(() => ({ u: walkU, v: walkV }), [walkU, walkV]);
  const walkedTo = useRef<NormalizedPoint>(WALK_START);
  const [heading, setHeading] = useState<Heading>(null);
  const [gait, setGait] = useState<Gait>("WALK");
  /*
   * HOW FAR BACK THE CAMERA IS, WHILE WALKING.
   *
   * Amit: *"שיהיה אפשרות להגדיל את המפה ולראות מרחוק יותר ולא רק זום
   * כזה, שאדע לאן יש לי ללכת, לראות את הפארקים, את החנויות מרחוק."*
   *
   * The walking shot is deliberately close — several shopfronts in view,
   * signs readable, a step that moves a small fraction of the frame. That
   * is the right shot for WALKING and the wrong one for DECIDING WHERE TO
   * WALK, and both are things somebody does in the same twenty minutes.
   * So there are two, and the customer says which: `EXPLORE` to be in the
   * street, `WIDE` to stand back and see the whole quarter — the gardens,
   * the far shops, and how much of the world is still in front of them.
   *
   * It is two steps rather than a pinch because the wait screen already
   * owns every other gesture: a drag pans, a pad walks, a tap opens a
   * shop. A third gesture layered on those is a lottery, and a button
   * says what it does.
   */
  const [wide, setWide] = useState(false);

  /*
   * ---------------------------------------------------------------------
   * THE GAME LIVES INSIDE THE WAIT, NOT BESIDE IT
   * ---------------------------------------------------------------------
   * Amit: *"יש 20 דקות עד שהוא מגיע, ב-20 דקות האלה אני רוצה שיהיה משחק."*
   *
   * The pad arrived here first and had nothing to walk towards, so it was
   * a control rather than a game. These are the same errands the street
   * uses, laid out between the same shops — the street and the wait are
   * one world and should not have two sets of things in them.
   *
   * They are handed UP through `onFound`, so the discovery counter, the
   * drawer and the wait all stay in one place. Nothing here decides what
   * a discovery means; it only notices that somebody reached one.
   */
  const errands = useMemo(() => errandsBetween(PLATE_SPOTS, ERRAND_LINES), []);
  const [lastFoundHe, setLastFoundHe] = useState<string | null>(null);

  /*
   * ---------------------------------------------------------------------
   * TWO PHASES, TWO COMPLETELY DIFFERENT THINGS TO DO
   * ---------------------------------------------------------------------
   * Amit drew the line, and it is a product decision rather than a tuning
   * one: *"בשלב החיפוש… בלי כפתור לחיצות, עם הדמות בין הרחובות ומחפש
   * איש מקצוע, ביפה כזה. השלב של המשחק מגיע בשלב ההמתנה לאיש מקצוע.
   * לדוגמה יש 20 דקות עד שהוא מגיע, ב-20 דקות האלה אני רוצה שיהיה
   * משחק."*
   *
   * WHILE SEARCHING nobody is on their way yet and the question being
   * asked is on the customer's behalf. That screen is not a place to be
   * given something to do — it is a place to be shown that something is
   * happening. So: no pad, no taps, no game. The camera travels the
   * street and the customer watches.
   *
   * ONCE SOMEBODY IS ON THE WAY the wait has a known length — the ETA is
   * real and the server's — and there is genuinely nothing to do with it.
   * That is where the controls belong.
   *
   * I had this exactly inverted: walking during the search, nothing
   * during the wait. It is worth writing down WHY I got it backwards,
   * because the reasoning sounded good. I thought of walking as something
   * to fill a wait, so I put it in the first waiting screen I saw. Amit
   * thinks of it as what the customer DOES, which means it belongs in the
   * wait that is long, known and safe to spend — not in the one where the
   * answer could arrive in two seconds and the screen would yank the
   * street away mid-step.
   *
   * MATCH_REVEAL stays still in both readings. From there the screen has
   * a subject: one person, in a sheet, with a decision attached.
   */
  const mayWalk = canWalk && phase === "ASSIGNED_ROUTE" && !profileOpen && journeyMs === null;

  /*
   * THE SEARCH WALKS THE CUSTOMER, RATHER THAN HANDING THEM A CONTROL.
   *
   * *"הרדאר שלנו עובר בלי כפתור לחיצות, עם הדמות בין הרחובות ומחפש איש
   * מקצוע."* The camera already tours the shops while dispatch checks
   * candidates — that is `sweepFrame` — and until now the avatar stood
   * still at the start point while it did, usually off screen.
   *
   * Handing the walker the sweep's own focus makes the figure walk the
   * tour instead: the same gait, the same bob, the same contact shadow,
   * with the camera following it as always. Nobody is given anything to
   * press, and nothing is claimed — the tour is the search being shown,
   * and it was already on screen.
   */
  /*
   * STABLE BY VALUE, NOT BY IDENTITY.
   *
   * `sweepFrame` returns a fresh `{ u, v }` literal every call and the
   * sweep clock ticks five times a second, so this was a new object at
   * 5 Hz even while the figure was walking to the SAME shop. `autoTo` is
   * in the walk loop's dependency array, so the rAF loop was torn down and
   * rebuilt five times a second — and every teardown fires `onSettled`.
   *
   * Memoising on the numbers means the loop is built once per destination,
   * which is what "walk to that shop" was always supposed to mean.
   */
  const autoU = sweep.camera.focus?.u ?? null;
  const autoV = sweep.camera.focus?.v ?? null;
  const walking = canWalk && phase === "SEARCHING" && animate && venues.length > 0;
  const autoTo = useMemo(
    () => (walking && autoU !== null && autoV !== null ? { u: autoU, v: autoV } : null),
    [walking, autoU, autoV]
  );

  // Taking the thumb off, and being taken off the street, are the same
  // thing to the figure: it stops. Without this a phase change mid-step
  // would leave it walking into a screen it is no longer on.
  useEffect(() => {
    if (!mayWalk) setHeading(null);
  }, [mayWalk]);

  const rememberWalk = useCallback(
    (at: NormalizedPoint) => {
      walkedTo.current = at;

      /*
       * THE GAME BELONGS TO THE WAIT, AND THIS WAS SPENDING IT EARLY.
       *
       * Everywhere else the scene is careful about this — `WorldStage`
       * only gets `onFound` in ASSIGNED_ROUTE, `ErrandLayer` only mounts
       * when `mayWalk` — and this callback had no gate at all.
       *
       * So during the SEARCH, while the figure walks the camera's tour of
       * the shops, it crossed errand positions and collected them. Nothing
       * was on screen: the markers were not drawn and the found line was
       * hidden. But `onFound` fired, and when the customer finally reached
       * the wait — the part Amit designed as the game, *"יש 20 דקות עד
       * שהוא מגיע, ב-20 דקות האלה אני רוצה שיהיה משחק"* — the drawer
       * greeted them with "מצאת 4 מתוך 8" for four things they never saw,
       * and those four were gone from the street they were about to
       * explore. Half the game spent before it started.
       */
      if (phase !== "ASSIGNED_ROUTE") return;

      const hit = reachedNow(at, errands, discoveries?.found ?? []);
      if (hit.length === 0) return;
      const line = errands.find((e) => e.id === hit[0])?.foundHe ?? null;
      if (line) setLastFoundHe(line);
      for (const id of hit) onFound?.(id);
    },
    [phase, discoveries?.found, errands, onFound]
  );

  /*
   * THE GAME ENDS WHEN THE PROFESSIONAL DOES.
   *
   * Not on a timer of its own and not when everything has been found:
   * the wait is over when the wait is over. Leaving somebody playing
   * while a person knocks on their door is the one failure this whole
   * feature cannot afford, and `mayWalk` already falls to false the
   * moment the phase changes — this only clears the line so the last
   * thing on screen is not a cat.
   */
  useEffect(() => {
    if (phase !== "ASSIGNED_ROUTE") setLastFoundHe(null);
  }, [phase]);

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
        /*
         * AND WALKING IS ITS OWN SHOT.
         *
         * `ROUTE` is the shot for WATCHING a route: 1.25 screens across,
         * which is right when the camera is doing the moving and the
         * customer is a spectator. The wait is not that any more — it is
         * the walk — and at 1.25 the whole neighbourhood is on the phone
         * at once. Both edges of the plate are in frame, the steer pad
         * shuffles the figure around inside a picture, and there is
         * nothing past the edge to go and find. Amit asked for the
         * opposite in as many words: *"שיהיה אפשר באמת לטייל בין
         * המקצועות."*
         *
         * `EXPLORE` is the shot the stroll screen already uses, and it is
         * the shot for this for the same reasons — 1.85 screens across,
         * several shopfronts in view, somewhere to walk TO. The two
         * screens where a person moves themselves now agree, which is
         * what they should have done from the start.
         */
        zoom={worldZoomFor(mayWalk ? (wide ? "WIDE" : "EXPLORE") : camera.shot)}
        /*
         * Only the neighbourhood plate is a world. The fallback street
         * plate is one screen, and blowing it up to travel across would
         * crop into the tarmac rather than reveal anything.
         */
        worldSized={Boolean(worldSources?.["world_neighbourhood"])}
        explorable={Boolean(worldSources)}
        /*
         * Following replaces the drag while there is somebody to follow.
         * They are contradictory gestures — see `WorldViewport.follow`.
         */
        follow={mayWalk || autoTo ? followPair : null}
        /*
         * THE CAMERA TAKES THE WORLD BACK WHEN THE STORY MOVES ON.
         *
         * A drag used to be permanent: `dragged` was set and never
         * cleared, so one sideways look and the camera was dead for the
         * rest of the session — the journey's pull-back-and-push-in ran
         * with the world sitting exactly where a thumb had left it.
         *
         * The phase and the journey are the two moments that mean "we are
         * taking you somewhere". The sweep's focus is deliberately NOT one
         * of them: it moves five times a second, and honouring it would
         * snatch the world back from under somebody's hand.
         */
        recentreKey={RECENTRE_ON.indexOf(phase) + (journeyMs === null ? 0 : 100)}
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
              /*
               * Once this trade's own professionals are standing on the
               * street, they are the street — see `venuesDrawn`.
               */
              venuesDrawn={venues.length > 0}
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
                visibleTop={world.visibleTop}
                /*
                 * And whether those two mean anything right now. They do
                 * not while the camera is walking with the customer — see
                 * `WorldViewport.children`.
                 */
                cameraFollowing={world.following}
                /*
                 * The headline and the back control own the top of this
                 * screen. Without saying so, a card arriving on a shop near
                 * the top of the frame is read through "מצאנו לך התאמה".
                 */
                topClearance={VENUE_CARD_TOP_CLEARANCE}
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

            {/*
              * THE CUSTOMER. Drawn last, so it is in front of the shops it
              * is walking past — the one figure in this world that is
              * always nearest, because it is where the person holding the
              * phone is standing.
              *
              * It renders nothing at all when no avatar was chosen or the
              * art has not arrived. A stand-in body would be the app
              * telling somebody what they look like.
              */}
            {/*
              * Only while there is a wait to spend. During the search the
              * street has nothing to collect — that screen shows, it does
              * not play.
              */}
            {mayWalk ? (
              <ErrandLayer
                errands={errands}
                found={discoveries?.found ?? []}
                width={world.width}
                height={world.height}
                animate={animate}
              />
            ) : null}

            {canWalk ? (
              <Walker
                assetId={walkAssetId}
                fallbackAssetId={walkFallbackId}
                heightRatio={walkHeight}
                sources={worldSources}
                width={world.width}
                height={world.height}
                u={walkU}
                v={walkV}
                startAt={walkedTo.current}
                heading={mayWalk ? heading : null}
                gait={gait}
                autoTo={autoTo}
                animate={animate}
                onSettled={rememberWalk}
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
        *
        * They are gradients. They were flat panels, and a flat panel over
        * a photograph draws a hard line across it — see `ScrimBand`.
        */}
      <ScrimBand width={width} height={height * HUD_SHARE} edge="top" />
      {/*
        * No bottom band during the reveal — the match sheet is a real
        * surface and a scrim under it would just be a second, softer sheet.
        */}
      {phase === "MATCH_REVEAL" ? null : (
        <ScrimBand width={width} height={height * 0.18} edge="bottom" strength={0.6} />
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
      {/*
        * MOUNTED THROUGH THE EXIT, NOT ONLY THROUGH THE PHASE.
        *
        * `sheetMounted` lags the phase by the fold-away's own duration, so
        * the sheet is still on screen while it folds. Unmounting on the
        * phase change — which is what this did — meant the exit animation
        * was written, tested and never once seen.
        */}
      {chosen && sheetMounted ? (
        <MatchSheet
          candidate={chosen}
          etaMinutes={etaMinutes}
          arrivalClockHe={arrivalClockHe}
          onAccept={onAccept}
          onAnother={onAnother}
          progress={sheet}
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
        * WHAT JUST HAPPENED. One line, replacing itself rather than
        * stacking, and gone the moment the wait is.
        */}
      {mayWalk && lastFoundHe ? (
        <View
          style={[styles.foundLine, { bottom: Math.round(height * SHEET_SHARE) + spacing.xl * 3 }]}
          pointerEvents="none"
        >
          <Text style={styles.foundLineText}>{lastFoundHe}</Text>
        </View>
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
        * STAND BACK, OR COME BACK IN. See `wide`.
        *
        * It sits directly above the safety control, on the same side, so
        * the right edge of this screen reads top to bottom as one column
        * of things the customer can do — and it is a single button whose
        * label is the thing it will do next rather than a state it is
        * currently in.
        */}
      {mayWalk ? (
        <Pressable
          onPress={() => setWide((w) => !w)}
          accessibilityRole="button"
          accessibilityLabel={wide ? "חזרה אל הרחוב" : "מבט רחב על השכונה"}
          style={[
            styles.lens,
            { bottom: Math.round(height * SHEET_SHARE) + spacing.xl + 52 },
          ]}
        >
          <Text style={styles.lensText}>{wide ? "חזרה לרחוב" : "מבט רחב"}</Text>
        </Pressable>
      ) : null}

      {/*
        * THE CONTROL THAT WALKS — screen space, never in the world.
        *
        * It is pinned low and to the side because that is where a thumb
        * already rests on a phone held one-handed, and it is on the LEFT
        * in a right-to-left app for the same reason the back control is on
        * the right: the reading direction is mirrored, the hand is not.
        *
        * It appears only while there is a street to walk down and somebody
        * to walk it. See `mayWalk`.
        */}
      {mayWalk ? (
        <View
          /*
           * Above the drawer, which owns the bottom of this screen during
           * the wait. A control the drawer covers is not a control — the
           * same reason the safety button sits where it does.
           */
          style={[styles.steerWrap, { bottom: Math.round(height * SHEET_SHARE) + spacing.xl }]}
          pointerEvents="box-none"
        >
          <SteerPad onHeading={setHeading} onGait={setGait} />
        </View>
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
/**
 * What the street does when you reach something during the wait.
 *
 * The same list the stroll screen uses, because it is the same street.
 * Nothing here may mention the professional, an ETA or a price —
 * `errandViolations` refuses a line that does.
 */
const ERRAND_LINES = [
  "חתול יצא מתחת לספסל",
  "הפנס נדלק כשעברתם",
  "יונים עפו מהעץ",
  "מישהו פתח תריס למעלה",
  "הממטרות נדלקו בערוגה",
  "כלב נבח מהחצר",
  "אופניים חלפו על ידכם",
  "ריח של מאפייה מהפינה",
];

const HUD_SHARE = 0.17;
const SHEET_SHARE = 0.26;

const styles = StyleSheet.create({
  steerWrap: { position: "absolute", left: spacing.lg },
  foundLine: {
    position: "absolute",
    alignSelf: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(40,28,16,0.85)",
  },
  foundLineText: { ...type.caption, color: "#FFE9C7", writingDirection: "rtl" },
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
  /*
   * THE HALO, AND WHY THE SCRIM WAS NOT DOING THIS JOB.
   *
   * `ScrimBand` darkens the top `HUD_SHARE` of the screen — 17%, which is
   * about 134 points on a phone. The header owns the first sixty of
   * those, so the headline starts at roughly 160 and the line under it at
   * 195: BOTH BELOW THE BAND. The band is sized as a share of the screen
   * and the text is laid out from the top inset downwards, so they were
   * never going to meet, and the mismatch only showed once the world got
   * bright — "בודקים זמינות באזור שלך" was being read through a lit
   * shopfront.
   *
   * Making the band taller would be the wrong fix twice over: it would
   * have to grow to fit the tallest case the HUD ever holds (a
   * two-line headline, or the ETA at display size), and it would put a
   * quarter of the artwork behind a slab on every screen to solve a
   * problem that only some of them have.
   *
   * A halo travels with the text instead. It costs nothing when the sky
   * behind it is already dark, and it is the difference between readable
   * and not when the camera is down among the shopfronts.
   */
  headline: {
    ...type.section,
    color: palette.nightText,
    textAlign: "center",
    writingDirection: "rtl",
    textShadowColor: "rgba(8,6,14,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  detail: {
    ...type.meta,
    color: palette.nightText,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 4,
    textShadowColor: "rgba(8,6,14,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  brief: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(11,9,24,0.6)",
  },
  briefText: { ...type.meta, color: palette.nightText, writingDirection: "rtl" },

  // The same halo, for the same reason — and the ETA needs it most,
  // because the wait is the screen where the camera is closest to the
  // pavement and the pavement is the brightest thing on the plate.
  eta: {
    ...type.title,
    ...tabular,
    color: palette.nightText,
    textShadowColor: "rgba(8,6,14,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 14,
  },
  etaLabel: {
    ...type.meta,
    color: palette.nightText,
    writingDirection: "rtl",
    textShadowColor: "rgba(8,6,14,0.95)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },

  lens: {
    position: "absolute",
    right: spacing.lg,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(11,9,24,0.72)",
  },
  lensText: { ...type.caption, color: palette.nightText, writingDirection: "rtl" },
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

  /*
   * THE HONEST LINE HAS TO BE READABLE TO BE HONEST.
   *
   * It was 40% white type with nothing behind it, lying straight on the
   * plate. Over the night sky at the top of a wide shot that was fine;
   * over the sunlit paving of the EXPLORE shot it was a pale smear across
   * a shopfront that read as a rendering fault, and the sentence it was
   * carrying — that this city is an illustration and the real map arrives
   * with the maps provider — could not be read at all.
   *
   * A disclaimer nobody can read is worse than no disclaimer, because it
   * looks like the disclosure has been made. So it gets the same dark
   * plate the shop signs get, sized to the sentence rather than to the
   * screen, and enough contrast to be read on the brightest part of the
   * artwork. It is still small and still quiet; it is no longer optional.
   */
  demoNoteWrap: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  demoNote: {
    ...type.micro,
    color: "rgba(247,243,250,0.82)",
    textAlign: "center",
    writingDirection: "rtl",
    backgroundColor: "rgba(12,9,16,0.72)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    overflow: "hidden",
  },
});
