import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import {
  avatarById,
  discover,
  emptyDiscoveries,
  errandsBetween,
  geoAspect,
  groundDisclosureHe,
  geoZoomFor,
  metresToWorld,
  openGroundFromGeo,
  planWorld,
  plotSpotsFromGeo,
  pruneDeadEnds,
  REAL_METRES,
  SHOT_METRES,
  PLATE_SPOTS,
  reachedNow,
  gaitForAvatar,
  walkingAssetFor,
  walkingFallbackFor,
  WALK_START,
  WORLD_DISTRICTS,
  worldZoomFor,
  type AvatarChoice,
  type DepartmentCode,
  type Gait,
  type Heading,
  type NormalizedPoint,
  type WorldGeo,
  type SponsorShop,
  sponsorSignHe,
  sponsorSpotFor,
  PLATE_V_WEIGHT,
  ROAD_PLATE_ASSET_ID,
} from "@pro-now/types";

import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import { EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { DistrictLayer } from "../components/livingmap/DistrictLayer";
import { SponsorVenueLayer } from "../components/livingmap/SponsorVenueLayer";
import { TradeCard } from "../components/livingmap/TradeCard";
import { ErrandLayer } from "../components/livingmap/ErrandLayer";
import { ScrimBand } from "../components/livingmap/ScrimBand";
import { SteerPad } from "../components/livingmap/SteerPad";
import { Walker } from "../components/livingmap/Walker";
import { WorldGround } from "../components/livingmap/WorldGround";
import { WorldViewport } from "../components/livingmap/WorldViewport";
import { palette, radii, spacing, type } from "../theme";
import { depthChanged, nearestDistrict, NEAR } from "./stroll";

export { nearestDistrict, NEAR, DEPTH_STEP } from "./stroll";

/**
 * THE STREET, AS A PLACE YOU CAN GO.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS ITS OWN SCREEN
 * ---------------------------------------------------------------------
 * Amit asked for this repeatedly — *"רוצה חוויה של טיול ברחוב בין מגוון
 * העסקים שלנו, זו החוויה שאני חייב שירגישו, כמו VR"* — and I built the
 * walking and then put it inside the dispatch wait, where it is reachable
 * only by someone who has already asked for a professional and is standing
 * on a screen watching a server think.
 *
 * His answer was the correct one: *"עכשיו לראות איך הוא במפה זז — אני לא
 * רואה ולא מבין."* A feature you can only find by sending a real request
 * for help is not a feature, and the fault was mine: I treated walking as
 * something to do while waiting rather than as a way of arriving.
 *
 * ---------------------------------------------------------------------
 * WHAT IT IS ALLOWED TO SAY
 * ---------------------------------------------------------------------
 * This screen draws DISTRICTS and no venues, and the distinction is the
 * whole of its honesty. A district is a PLACE — a trade, with a landmark
 * on the street — and it carries no name, no rating, no distance and no
 * availability, because none of those exist until somebody asks and the
 * server answers. A venue is a PERSON: one candidate the server actually
 * returned. Drawing venues here would populate a street with
 * professionals nobody has checked are online, which is invented supply
 * with a roof on it (see DistrictLayer and /CLAUDE.md §3).
 *
 * So walking up to a shop and tapping it opens the TRADE, not a person.
 * The request is made from there, the dispatch happens after it, and this
 * screen never claims anyone is behind any door.
 */
export interface StrollBodyProps {
  /** The figure the customer walks as. Null renders nothing and says so. */
  avatar?: AvatarChoice;
  sources?: WorldAssetSources;
  /**
   * A REAL STREET PLAN TO WALK, INSTEAD OF THE PAINTED ONE.
   *
   * Amit: *"אני רוצה לחבר מפה אמיתית שונראה איך העולם שלנו והקוד שלנו
   * יושב עליה."* This screen is the answer to the second half of that
   * sentence — it is the one place a person walks the world themselves,
   * so it is where you find out whether our city sits on a real street
   * plan or merely hovers over one.
   *
   * Everything the walker does is unchanged. The figure still moves in
   * `{u,v}`, still gets its size from depth, still opens a trade by
   * standing near it. What changes underneath is what `{u,v}` MEANS, and
   * that is the whole point of having spent the last month putting every
   * position in this world into one coordinate system.
   */
  geo?: WorldGeo | null;
  /** Tapping a trade's building opens that trade. */
  /**
   * What "מה אפשר להזמין כאן" does, from inside a shop.
   *
   * Touching a building no longer leaves the street: it opens the shop,
   * with the room behind it where that art exists. This is the way OUT
   * of the shop into the catalogue, which is the only honest action a
   * building with nobody behind it can offer — see `TradeCard`.
   */
  onOpenDepartment?: (department: DepartmentCode) => void;
  /**
   * SHOPS IN THIS STREET THAT SOMEBODY PAID FOR.
   *
   * Amit: *"לקוח יכול להיכנס לחנויות ואז ייפתח האתר של המותג."* The
   * stroll is where that actually happens — it is the one screen whose
   * whole purpose is walking past businesses.
   */
  sponsors?: readonly SponsorShop[];
  onEnterSponsor?: (shop: SponsorShop) => void;
  onBack?: () => void;
  /** Lets somebody who skipped the avatar go and choose one. */
  onChooseAvatar?: () => void;
  animate?: boolean;
  width?: number;
  height?: number;
}

export function StrollBody({
  avatar = null,
  sources = EMPTY_ASSET_SOURCES,
  geo = null,
  onOpenDepartment,
  sponsors,
  onEnterSponsor,
  onBack,
  onChooseAvatar,
  animate = true,
  width = 390,
  height = 780,
}: StrollBodyProps) {
  const walkAssetId = walkingAssetFor(avatar);
  /* Their face on a pin until their figure is drawn — see Walker. */
  const walkFallbackId = walkingFallbackFor(avatar);
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
    (walkAssetId && sources[walkAssetId]) || (walkFallbackId && sources[walkFallbackId])
  );
  const heightRatio = avatarById(avatar)?.heightRatio ?? 1;

  /*
   * The neighbourhood, falling back to the older street plate so this
   * screen is never a black rectangle in a build where only that asset
   * is present. Nothing is drawn if neither exists — an empty street is
   * more honest than an invented one.
   */


  const u = useRef(new Animated.Value(WALK_START.u)).current;
  const v = useRef(new Animated.Value(WALK_START.v)).current;
  const walkedTo = useRef<NormalizedPoint>(WALK_START);
  const [heading, setHeading] = useState<Heading>(null);
  const [gait, setGait] = useState<Gait>("WALK");

  /*
   * ---------------------------------------------------------------------
   * SOMETHING TO WALK TOWARDS
   * ---------------------------------------------------------------------
   * A control that moves a figure is not a game; it is a control. What
   * makes the street worth crossing is that crossing it does something.
   *
   * These stand BETWEEN the shops rather than in their doorways, because
   * a thing you find on the way to a shop is a thing you found by
   * accident — see `errandsBetween`. Reaching one is the discovery; the
   * same `discover()` records it that records a tapped one, so nothing
   * about the counter or the drawer had to learn a new idea.
   *
   * None of them may say anything about the job. That is checked rather
   * than trusted, because a line of text is exactly where a claim sneaks
   * in — see `errandViolations`.
   */
  /*
   * ---------------------------------------------------------------------
   * WHERE THE SHOPS STAND, ON WHICHEVER GROUND IS UNDERFOOT
   * ---------------------------------------------------------------------
   * `PLATE_SPOTS` are eleven coordinates measured off the painting with a
   * bitmap script. They are correct for that painting and meaningless for
   * any other ground, so on a real extract the shops come from real
   * building plots instead — `plotSpotsFromGeo`, which finds plots that
   * front a road, stands each shopfront a pavement's width off the kerb
   * and faces it at the street.
   *
   * This is the part Amit predicted: *"אולי יהיה יותר קל לשים את החנויות
   * והדמויות על מפה אמיתית."* It is much easier. The plate needed three
   * rounds of measurement, two of which answered the wrong question; a
   * plot needs none, because somebody already surveyed it.
   *
   * And a shopfront becomes SIXTEEN METRES wide rather than a fraction
   * chosen by eye, which is the first true size in this world.
   */
  const plan = useMemo(() => (geo ? planWorld(pruneDeadEnds(geo).geo) : null), [geo]);
  const spots = useMemo(() => (plan ? plotSpotsFromGeo(plan) : null), [plan]);
  /*
   * And the parks and squares, for the trades that have no door — see
   * `tradeGround`. The stroll screen is where somebody walks up to a
   * business, so it is where a dog walker standing in a shop doorway
   * would read as wrong.
   */
  const openGround = useMemo(() => (plan ? openGroundFromGeo(plan) : null), [plan]);
  /* Which ground is underfoot is `WorldGround`'s decision now. */


  const shopWidth = useMemo(
    () => (geo ? metresToWorld(geo.bounds, REAL_METRES.shopFrontage) : undefined),
    [geo]
  );
  /*
   * A SHOT IS A NUMBER OF METRES, NOT A FRACTION OF THE WORLD.
   *
   * `worldZoomFor("EXPLORE")` is a fraction of whatever the ground happens
   * to be, which on a painting of one street is a sensible walking
   * distance and on a 620m extract is the view from a helicopter. See
   * `SHOT_METRES`: on a real map the camera is told how much STREET to
   * show, and it shows the same amount however large the extract is.
   */
  /*
   * ---------------------------------------------------------------------
   * HOW FAR BACK YOU ARE STANDING, IN METRES
   * ---------------------------------------------------------------------
   * Amit, weeks ago, and it has been open since:
   *
   *     "שיהיה אפשרות להגדיל את המפה ולראות מרחוק יותר ולא רק זום כזה,
   *      שאדע לאן יש לי ללכת, לראות את הפארקים, את החנויות מרחוק."
   *
   * On the painted plate that was a hard request — the plate is one
   * picture of about a hundred metres of street, so pulling back reveals
   * the edge of the artwork rather than more city. On a real extract it
   * is the natural thing the screen does, and it is one number: how many
   * metres are in the frame.
   *
   * And it is the same number the camera's HEIGHT comes from, which is
   * what makes the whole thing one gesture rather than two modes —
   * ChatGPT's *"אותו עולם, מצלמה אחת שמשנה pitch לפי zoom"*. Close in you
   * are standing in the street and the ground is tilted into the world's
   * own 3/4; pulled back it flattens to a plan and you are reading a map
   * of where to go. There is no cut, because there is nothing to cut
   * between.
   */
  /**
   * Which shop is open, if any.
   *
   * Amit: *"רוצה שיהיו מוצרים בחנות שיפתחו... לא רוצה לאתר ישר."*
   * Touching a building used to leave the street immediately for a list
   * of services — which is a menu, not a shop.
   */
  const [openTrade, setOpenTrade] = useState<DepartmentCode | null>(null);
  const [metresAcross, setMetresAcross] = useState<number>(SHOT_METRES.EXPLORE);
  /**
   * WALKING UP TO A DOOR, BEFORE GOING THROUGH IT.
   *
   * Amit, of the app beside the mock he liked: *"הכניסה לחנות, המעבר על
   * הפנים — אין שום אפקט."* He is right and the mock is why: there, the
   * camera pushed through the shopfront until the shop filled the frame
   * and the room was already behind it. Here the room simply appeared,
   * which is a page change however good the picture is.
   *
   * So pressing a shop moves the camera in FIRST — the world's own
   * VENUE lens, the same one the journey to a professional arrives on —
   * and the room opens on top of it half a second later. `WorldViewport`
   * eases a change of zoom, so this is one number and the push is free.
   */
  const [entering, setEntering] = useState<DepartmentCode | null>(null);
  const lens = useMemo(() => {
    const atDoor = entering !== null || openTrade !== null;
    if (geo) {
      const shot = atDoor ? "VENUE" : "EXPLORE";
      return geoZoomFor(shot, geo.bounds) * (SHOT_METRES.EXPLORE / metresAcross);
    }
    return worldZoomFor(atDoor ? "VENUE" : "EXPLORE");
  }, [geo, metresAcross, entering, openTrade]);

  /*
   * The push, and then the door. Cleared on the way out so leaving a
   * shop pulls the camera back the way it came in.
   */
  const stepInside = useCallback((department: DepartmentCode) => {
    setEntering(department);
    setTimeout(() => {
      setOpenTrade(department);
      setEntering(null);
    }, 520);
  }, []);
  /*
   * And "near enough to open the shop" is metres too, for the same reason.
   * `NEAR` is 0.16 of the world: fourteen metres on the painting, a
   * hundred on a real extract, which would have lit up three trades at
   * once from the middle of a junction.
   */
  const reach = useMemo(
    () => (geo ? metresToWorld(geo.bounds, REAL_METRES.reach) : undefined),
    [geo]
  );
  const errands = useMemo(
    () => errandsBetween(spots && spots.length > 0 ? spots : PLATE_SPOTS, ERRAND_LINES),
    [spots]
  );
  const [found, setFound] = useState(() => emptyDiscoveries(errands.map((e) => e.id)));
  const [lastFoundHe, setLastFoundHe] = useState<string | null>(null);

  /*
   * WHICH TRADE IS UNDERFOOT.
   *
   * Nothing on this screen is selected in the sense of chosen — this is
   * the one the walker is nearest, so the street can name it without a
   * tap. Walking past a building and being told what it is is the whole
   * difference between a map with icons on it and a street.
   */
  const [nearest, setNearest] = useState<DepartmentCode | null>(null);
  /**
   * Which shop is open, if any.
   *
   * Amit: *"רוצה שיהיו מוצרים בחנות שיפתחו... לא רוצה לאתר ישר."*
   * Touching a building used to leave the street immediately for a list
   * of services — which is a menu, not a shop. It opens the shop now,
   * and the list is one button inside it.
   */


  /*
   * HOW FAR DOWN THE STREET THE WALKER IS, AS STATE.
   *
   * The position itself is an Animated value precisely so that walking
   * re-renders nothing — but the DRAW ORDER cannot be interpolated: a
   * building is either in front of the figure or behind it. So the depth
   * is kept here as well, coarsely and rarely, and it is the one thing on
   * this screen that a step is allowed to re-render.
   *
   * Rounded to a fifth of the world, which is far coarser than the walk
   * and exactly as fine as the question needs: what changes at a given
   * depth is which side of the figure a shop is drawn on, and there are
   * eleven shops.
   */
  const [depth, setDepth] = useState<number>(WALK_START.v);

  /** Whether they have actually walked. Hides the instruction — see below. */
  const [moved, setMoved] = useState(false);

  /*
   * A MIRROR OF `found`, SO THE CHECK CAN HAPPEN OUTSIDE THE UPDATER.
   *
   * This used to read `was.found` inside `setFound` and call
   * `setLastFoundHe` from in there. A `useState` updater must be pure:
   * React is explicitly allowed to run it more than once, and does — on
   * every update under StrictMode, and again whenever it re-bases an
   * interrupted render. The visible failure is an announcement naming an
   * errand that was then discarded, or no announcement for one that was
   * collected.
   */
  const foundRef = useRef(found);
  foundRef.current = found;

  const remember = useCallback(
    (at: NormalizedPoint) => {
      walkedTo.current = at;
      setNearest(nearestDistrict(at, reach, spots, openGround));
      /*
       * THE INSTRUCTION GOES AWAY ONCE IT HAS BEEN FOLLOWED.
       *
       * "טיילו בין העסקים · געו בעסק" is a two-line card sitting over a
       * shopfront at the top of the street. It is worth reading once and
       * it is in the way for the rest of the walk — and ChatGPT and Amit
       * both signed off on the same composition rule: small HUD at the
       * top, sheet at the bottom, centre completely clear.
       */
      if (!moved && Math.hypot(at.u - WALK_START.u, (at.v - WALK_START.v) * PLATE_V_WEIGHT) > 0.05) {
        setMoved(true);
      }
      setDepth((was) => (depthChanged(was, at.v) ? at.v : was));

      /*
       * Reached anything? `reachedNow` is pure and `discover` is
       * idempotent, so standing still on top of something counts once.
       */
      const hit = reachedNow(at, errands, foundRef.current.found);
      if (hit.length === 0) return;
      const line = errands.find((e) => e.id === hit[0])?.foundHe ?? null;
      if (line) setLastFoundHe(line);
      setFound((was) => hit.reduce((acc, id) => discover(acc, id), was));
    },
    [errands, moved]
  );

  /*
   * THE LINE GOES AWAY.
   *
   * It never did. There was no timer and no other write to it anywhere in
   * the file, so "חתול יצא מתחת לספסל" appeared over the city and stayed
   * there for the rest of the session — until the customer happened to
   * reach another errand, at which point it swapped for a second sentence
   * that also never left. The equivalent state in `LivingMapScene` is
   * cleared when the phase changes; this screen has no phase.
   *
   * The timer restarts on a new line rather than the old one clearing the
   * new one, which is what the cleanup is for.
   */
  useEffect(() => {
    if (!lastFoundHe) return;
    const t = setTimeout(() => setLastFoundHe(null), 2500);
    return () => clearTimeout(t);
  }, [lastFoundHe]);

  /*
   * WHAT YOU ARE STANDING IN FRONT OF, NAMED.
   *
   * A trade, or — since the street has paid buildings in it — a brand.
   * Amit could not find the only sponsor in his own world, and a chip
   * that names it as you walk past is the cheapest possible fix: you
   * are told what is beside you without anything hunting for you.
   *
   * A sponsor is named WITH `בחסות` and never without it. The whole
   * reason this chip is allowed to name a business at all — where the
   * note below says it may only ever name a trade — is that a paid
   * building is not a claim about supply, and the word that makes that
   * true travels with the name.
   */
  const nearSponsor = useMemo(() => {
    if (!sponsors || sponsors.length === 0) return null;
    let best: SponsorShop | null = null;
    let bestD = Infinity;
    for (const [i, shop] of sponsors.entries()) {
      const at = sponsorSpotFor(i, spots);
      if (!at) continue;
      const d = Math.hypot(at.u - walkedTo.current.u, (at.v - walkedTo.current.v) * PLATE_V_WEIGHT);
      if (d < NEAR && d < bestD) {
        bestD = d;
        best = shop;
      }
    }
    return best;
    /* `depth` changes on every step, which is what re-runs this. */
  }, [sponsors, spots, depth]);

  const label = nearSponsor
    ? sponsorSignHe(nearSponsor)
    : nearest
      ? WORLD_DISTRICTS[nearest].labelHe
      : null;

  /** One pair, kept. See the note at the `follow` prop below. */
  const followPair = useMemo(() => (canWalk ? { u, v } : null), [canWalk, u, v]);

  return (
    <View style={[styles.screen, { width, height }]}>
      <WorldViewport
        width={width}
        height={height}
        zoom={lens}
        worldSized={Boolean(geo) || Boolean(sources[ROAD_PLATE_ASSET_ID])}
        groundAspect={geo ? geoAspect(geo.bounds) : undefined}
        /*
         * Dragging is allowed only when there is nobody to follow. They
         * are contradictory gestures — see `WorldViewport.follow` — and
         * somebody who skipped the avatar should still be able to look
         * around rather than be stuck at one view.
         */
        explorable={!canWalk}
        /*
         * MEMOISED, LIKE THE SCENE'S.
         *
         * A fresh `{ u, v }` literal here is in `followTransform`'s
         * dependency list, so every re-render of this screen threw away
         * and rebuilt the two interpolation nodes that position the entire
         * neighbourhood. `LivingMapScene` memoises exactly this and
         * explains why; this screen was missed.
         */
        follow={followPair}
        animate={animate}
      >
        {(world) => (
          <>
            {/*
              * THE GROUND, DRAWN INSIDE THE MOVING LAYER.
              *
              * I left this out on the first pass and the street was a set
              * of shopfronts floating on black — which is the same class
              * of mistake Amit named weeks ago about the scooter: things
              * in the world drawn without the world under them.
              *
              * It goes inside the viewport's children rather than behind
              * them, so it shares one coordinate system and one camera
              * with the districts and the walker by construction. A
              * second viewport for the ground is how the two ended up
              * disagreeing last time.
              */}
            {/*
              THE PAINTING IS THE MATERIAL; THE EXTRACT IS THE SHAPE.

              Amit, after three rounds of me redrawing the city out of
              polygons: *"איפה העולם הקסום שבנינו?"* The answer is that it
              is right here and I had stopped using it. The plate goes
              down first, at world size, and the real street network is
              carved through it — so the blocks between the roads are the
              artwork, and only the streets come from OpenStreetMap.
            */}
            <WorldGround
              width={world.width}
              height={world.height}
              sources={sources}
              geo={geo}
              metresAcross={metresAcross}
              animate={animate}
            />

            {/*
              * FURTHER DOWN THE STREET THAN THE WALKER — drawn first, so
              * the figure passes in FRONT of them. See
              * `DistrictLayer.vRange` for why the layer is split in two.
              */}
            <DistrictLayer
              width={world.width}
              height={world.height}
              sizeBasis={width}
              sources={sources}
              spots={spots}
              openGround={openGround}
              districtWidth={shopWidth}
              litGround={Boolean(geo)}
              vRange={canWalk ? { min: 0, max: depth } : undefined}
              /*
               * The trade underfoot is lit and the rest go quiet — which
               * is a fact about where the customer is standing and not a
               * claim about who is available inside.
               */
              activeDepartment={nearest}
              onSelect={stepInside}
            />

            {/*
              * AND THE SHOPS THAT ARE NOT OURS.
              *
              * Drawn with the districts because a sponsor is a PLACE in
              * this street. Everything that keeps the two apart — the
              * lit sign with `בחסות` under the brand's name, the missing
              * figure in the doorway, the ground it is allowed to stand
              * on — is in `SponsorVenueLayer`.
              */}
            {sponsors && sponsors.length > 0 ? (
              <SponsorVenueLayer
                shops={sponsors}
                width={world.width}
                height={world.height}
                sources={sources}
                spots={spots}
                litGround={Boolean(geo)}
                onEnter={onEnterSponsor}
              />
            ) : null}

            {/*
              * Drawn before the walker, so the figure passes over the
              * glow rather than the glow sitting on its shoulders.
              */}
            <ErrandLayer
              errands={errands}
              found={found.found}
              width={world.width}
              height={world.height}
              animate={animate}
            />

            {canWalk ? (
              <Walker
                assetId={walkAssetId}
                fallbackAssetId={walkFallbackId}
                heightRatio={heightRatio}
                districtWidth={shopWidth}
                sources={sources}
                width={world.width}
                height={world.height}
                u={u}
                v={v}
                startAt={walkedTo.current}
                heading={heading}
                /*
                 * A RIDE KEEPS ITS OWN GAIT.
                 *
                 * The pad reports WALK or RUN, which is the right
                 * vocabulary for a person and meaningless for a van. See
                 * `gaitForAvatar`.
                 */
                gait={gaitForAvatar(avatar, gait)}
                animate={animate}
                onSettled={remember}
              />
            ) : null}

            {/*
              * NEARER THAN THE WALKER — drawn after, so they cover the
              * figure as it walks behind them. This is the whole of the
              * depth illusion and it costs one filtered list.
              */}
            {canWalk ? (
              <DistrictLayer
                width={world.width}
                height={world.height}
                sizeBasis={width}
                sources={sources}
                spots={spots}
                openGround={openGround}
                districtWidth={shopWidth}
                litGround={Boolean(geo)}
                vRange={{ min: depth, max: 1.01 }}
                activeDepartment={nearest}
                onSelect={stepInside}
              />
            ) : null}
          </>
        )}
      </WorldViewport>

      {/* ----------------------------------------------------------------
          INSIDE THE SHOP YOU TOUCHED.

          Above the world and below nothing: while a shop is open the
          street is what you came back to, not what you are doing.
          ---------------------------------------------------------------- */}
      {openTrade ? (
        <TradeCard
          department={openTrade}
          sources={sources}
          onOpenTrade={
            onOpenDepartment
              ? (d) => {
                  setOpenTrade(null);
                  onOpenDepartment(d);
                }
              : undefined
          }
          onClose={() => setOpenTrade(null)}
          width={width}
          height={height}
          animate={animate}
        />
      ) : null}

      {/*
        * TALL ENOUGH TO COVER THE WORDS.
        *
        * The first version was 16% and the title sat below it, white type
        * over a sunlit pavement — unreadable, which the walk test showed
        * immediately. A scrim that does not reach the text it is for is
        * decoration.
        */}
      <ScrimBand width={width} height={height * 0.28} edge="top" strength={0.8} />
      {/* The honesty line at the very bottom has the same problem. */}
      <ScrimBand width={width} height={height * 0.16} edge="bottom" strength={0.66} />

      {onBack ? <BackButton onPress={onBack} tone="dark" accessibilityLabelHe="חזרה" /> : null}

      {/*
        * THE TITLE LEAVES ONCE YOU ARE WALKING.
        *
        * The instruction already did — it is an instruction, and you
        * have followed it. The title stayed forever, a dark slab across
        * the top of a street whose whole point is being looked at, on a
        * screen that now has three plates of it to look at. Amit, about
        * the wait: *"למה זה לא נגלל למטה שאוכל לראות רק את המפה?"* Same
        * complaint, same answer: the words get out of the way once they
        * have nothing left to say.
        *
        * The back control stays, because leaving must never be
        * something you have to remember how to do.
        */}
      {moved || openTrade || entering ? null : (
        <View style={[styles.hud, { top: spacing.md + BACK_BUTTON_CLEARANCE }]} pointerEvents="none">
          <Text style={styles.title}>הרחוב של PRO NOW</Text>
          <Text style={styles.sub}>
            {canWalk
              ? "טיילו בין העסקים · געו בעסק כדי לראות מה יש בו"
              : "געו בעסק כדי לראות מה יש בו"}
          </Text>
        </View>
      )}

      {/*
        * WHAT JUST HAPPENED, FOR A MOMENT.
        *
        * One line, above the trade label, and it replaces itself rather
        * than stacking: a street that keeps a log of what you have done
        * is a screen with a log on it. There is no counter and no goal —
        * `discoveryProgressHe` stays out of this screen entirely, because
        * nobody has to play.
        */}
      {lastFoundHe ? (
        <View style={styles.found} pointerEvents="none">
          <Text style={styles.foundText}>{lastFoundHe}</Text>
        </View>
      ) : null}

      {/*
        * WHERE YOU ARE, NAMED. A trade, never a business and never a
        * person: this is a street of professions, and who is behind any
        * door is a question only the server gets to answer.
        */}
      {label && !openTrade && !entering ? (
        <View style={styles.here} pointerEvents="none">
          <Text style={styles.hereText}>{label}</Text>
        </View>
      ) : null}

      {/*
        NEAR AND FAR, AS TWO TAPS.
        Only on a real extract: the painted plate is one picture of a
        street, so pulling back off it reveals the edge of the artwork
        rather than more city — which is the thing that made this request
        hard to answer for so long.
      */}
      {geo ? (
        <View style={styles.zoomWrap} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="להתקרב לרחוב"
            style={styles.zoomKey}
            disabled={metresAcross <= NEAREST_METRES}
            onPress={() => setMetresAcross((m) => Math.max(NEAREST_METRES, m / ZOOM_STEP))}
          >
            <Text style={[styles.zoomText, metresAcross <= NEAREST_METRES && styles.zoomOff]}>+</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="להתרחק ולראות את השכונה"
            style={styles.zoomKey}
            disabled={metresAcross >= FURTHEST_METRES}
            onPress={() => setMetresAcross((m) => Math.min(FURTHEST_METRES, m * ZOOM_STEP))}
          >
            <Text style={[styles.zoomText, metresAcross >= FURTHEST_METRES && styles.zoomOff]}>−</Text>
          </Pressable>
        </View>
      ) : null}

      {/*
        * THE CONTROL GOES AWAY WHILE YOU ARE INDOORS.
        *
        * It sat on top of the shop card — the pad over the text, "לרחוב"
        * hidden behind it — which is the whole problem with a control
        * pinned to a corner: it belongs to the street, and inside a shop
        * the street is what you came back to rather than what you are
        * doing. Found in a screenshot, like every other overlap in this
        * product.
        */}
      {openTrade ? null : canWalk ? (
        <View style={styles.steerWrap} pointerEvents="box-none">
          <SteerPad onHeading={setHeading} onGait={setGait} />
        </View>
      ) : avatar ? (
        /*
         * A FIGURE WAS CHOSEN AND THERE IS NO ART FOR IT YET.
         *
         * This is a state I created and then very nearly shipped with the
         * wrong words in it: the screen offered "בחרו דמות" to somebody
         * who had already chosen one, so the only control on it did
         * nothing and implied the fault was theirs.
         *
         * The honest version says what is actually true — the street can
         * be looked at, the walking figure has not been drawn yet — and
         * leaves the drag on, which `explorable` above already does when
         * there is nobody to follow.
         */
        <View style={styles.pending} pointerEvents="none">
          <Text style={styles.pendingText}>הדמות שלכם עדיין בציור · אפשר לגרור ולהסתכל</Text>
        </View>
      ) : (
        /*
         * NO AVATAR, SO NO WALK — and the screen says why rather than
         * quietly being a map. Skipping was a real answer and this is the
         * door back to the question, not a nag.
         */
        onChooseAvatar ? (
          <Pressable onPress={onChooseAvatar} style={styles.pick} accessibilityRole="button">
            <Text style={styles.pickText}>בחרו דמות כדי לטייל ברחוב</Text>
          </Pressable>
        ) : null
      )}

      <View style={styles.note} pointerEvents="none">
        <Text style={styles.noteText}>
          {groundDisclosureHe({ realStreets: Boolean(geo?.real), showsSupply: true })}
        </Text>
      </View>
    </View>
  );
}

/**
 * What the street does when you reach something.
 *
 * Small, ordinary, and about the city rather than about the job: a cat, a
 * light, some pigeons. Nothing here may mention the professional, an ETA
 * or a price — `errandViolations` refuses a line that does, because a
 * game that starts making promises has stopped being a game.
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

/**
 * THE NEAR AND FAR ENDS OF THE ZOOM, IN METRES OF STREET.
 *
 * 55 is about a shopfront and the pavement in front of it — near enough
 * to read a sign and to feel like standing there. 700 is past the point
 * where the ground has flattened to a plan (`PLAN_METRES`), so the far
 * end of the gesture genuinely is a map rather than a nearly-flat 3/4,
 * which would be the worst of both.
 */
const NEAREST_METRES = 55;
const FURTHEST_METRES = 700;
/** A third of a stop per tap: four taps from the street to the plan. */
const ZOOM_STEP = 1.55;

const styles = StyleSheet.create({
  screen: { overflow: "hidden", backgroundColor: "#0B0918" },
  /*
   * THE TITLE CARRIES ITS OWN BACKGROUND.
   *
   * A gradient scrim is right for a band of sky and wrong for two lines
   * of type over a sunlit pavement: by the depth the words sit at, the
   * fall-off has already given the picture back. The trade label below
   * solved the same problem with a plate, and the answer is the same one.
   */
  hud: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "88%",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "rgba(11,9,24,0.66)",
    alignItems: "center",
  },
  title: { ...type.section, color: palette.nightText, textAlign: "center", writingDirection: "rtl" },
  sub: {
    ...type.caption,
    color: "rgba(247,243,250,0.74)",
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  /*
   * KEEP THE CENTRE EMPTY.
   *
   * These two sat at 28% and 36% of the height — the middle third of the
   * screen, over the street, which is the one thing the agreed
   * composition says must stay clear: small HUD at the top, sheet at the
   * bottom, centre completely open. They belong on the bottom row with
   * the steer pad, and on the far side of it so the thumb never covers
   * the name of the place it just reached.
   */
  here: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl * 2 + spacing.xs,
    maxWidth: "52%",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.74)",
  },
  /*
   * ABOVE THE STEER PAD AND CLEAR OF THE BACK BUTTON.
   *
   * The right edge is the only side with nothing on it: the steer pad
   * owns the bottom left, the back button the top right, and the demo
   * controls the top left. Stacked rather than side by side, because two
   * 44pt targets in a row at the right edge would sit under the thumb
   * that is already holding the phone.
   */
  zoomWrap: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  zoomKey: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(26,22,38,0.78)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.16)",
  },
  zoomText: { ...type.h2, color: "#F7F3FA" },
  zoomOff: { opacity: 0.3 },
  hereText: { ...type.bodyStrong, color: palette.nightText, writingDirection: "rtl" },
  found: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl * 2 + spacing.xl,
    maxWidth: "62%",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(40,28,16,0.82)",
  },
  foundText: { ...type.caption, color: "#FFE9C7", writingDirection: "rtl" },
  steerWrap: { position: "absolute", left: spacing.lg, bottom: spacing.xl * 2 },
  pick: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing.xl * 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: palette.signal500,
  },
  pickText: { ...type.bodyStrong, color: "#17121F", writingDirection: "rtl" },
  pending: {
    position: "absolute",
    alignSelf: "center",
    bottom: spacing.xl * 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.74)",
  },
  pendingText: { ...type.caption, color: "rgba(247,243,250,0.82)", writingDirection: "rtl" },
  note: { position: "absolute", left: 0, right: 0, bottom: spacing.sm, alignItems: "center" },
  noteText: { ...type.caption, color: "rgba(247,243,250,0.5)", writingDirection: "rtl" },
});
