import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  avatarById,
  discover,
  emptyDiscoveries,
  errandsBetween,
  PLATE_SPOTS,
  reachedNow,
  walkingAssetFor,
  WALK_START,
  WORLD_DISTRICTS,
  worldZoomFor,
  type AvatarChoice,
  type DepartmentCode,
  type Gait,
  type Heading,
  type NormalizedPoint,
} from "@pro-now/types";

import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import { EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { DistrictLayer } from "../components/livingmap/DistrictLayer";
import { ErrandLayer } from "../components/livingmap/ErrandLayer";
import { ScrimBand } from "../components/livingmap/ScrimBand";
import { SteerPad } from "../components/livingmap/SteerPad";
import { Walker } from "../components/livingmap/Walker";
import { WorldViewport } from "../components/livingmap/WorldViewport";
import { palette, radii, spacing, type } from "../theme";
import { depthChanged, nearestDistrict } from "./stroll";

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
  /** Tapping a trade's building opens that trade. */
  onOpenDepartment?: (department: DepartmentCode) => void;
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
  onOpenDepartment,
  onBack,
  onChooseAvatar,
  animate = true,
  width = 390,
  height = 780,
}: StrollBodyProps) {
  const walkAssetId = walkingAssetFor(avatar);
  const canWalk = Boolean(walkAssetId && sources[walkAssetId]);
  const heightRatio = avatarById(avatar)?.heightRatio ?? 1;

  /*
   * The neighbourhood, falling back to the older street plate so this
   * screen is never a black rectangle in a build where only that asset
   * is present. Nothing is drawn if neither exists — an empty street is
   * more honest than an invented one.
   */
  const ground = sources["world_neighbourhood"] ?? sources["shared_ground_street"];

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
  const errands = useMemo(() => errandsBetween(PLATE_SPOTS, ERRAND_LINES), []);
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
      setNearest(nearestDistrict(at));
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
    [errands]
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

  const label = nearest ? WORLD_DISTRICTS[nearest].labelHe : null;

  /** One pair, kept. See the note at the `follow` prop below. */
  const followPair = useMemo(() => (canWalk ? { u, v } : null), [canWalk, u, v]);

  return (
    <View style={[styles.screen, { width, height }]}>
      <WorldViewport
        width={width}
        height={height}
        zoom={worldZoomFor("EXPLORE")}
        worldSized={Boolean(sources["world_neighbourhood"])}
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
            {ground ? (
              <Image
                source={ground}
                style={{ width: world.width, height: world.height }}
                resizeMode="cover"
              />
            ) : null}

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
              vRange={canWalk ? { min: 0, max: depth } : undefined}
              /*
               * The trade underfoot is lit and the rest go quiet — which
               * is a fact about where the customer is standing and not a
               * claim about who is available inside.
               */
              activeDepartment={nearest}
              onSelect={onOpenDepartment}
            />
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
                heightRatio={heightRatio}
                sources={sources}
                width={world.width}
                height={world.height}
                u={u}
                v={v}
                startAt={walkedTo.current}
                heading={heading}
                gait={gait}
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
                vRange={{ min: depth, max: 1.01 }}
                activeDepartment={nearest}
                onSelect={onOpenDepartment}
              />
            ) : null}
          </>
        )}
      </WorldViewport>

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

      <View style={[styles.hud, { top: spacing.md + BACK_BUTTON_CLEARANCE }]} pointerEvents="none">
        <Text style={styles.title}>הרחוב של PRO NOW</Text>
        <Text style={styles.sub}>
          {canWalk
            ? "טיילו בין העסקים · געו בעסק כדי לראות מה יש בו"
            : "געו בעסק כדי לראות מה יש בו"}
        </Text>
      </View>

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
        <View style={[styles.found, { bottom: height * 0.36 }]} pointerEvents="none">
          <Text style={styles.foundText}>{lastFoundHe}</Text>
        </View>
      ) : null}

      {/*
        * WHERE YOU ARE, NAMED. A trade, never a business and never a
        * person: this is a street of professions, and who is behind any
        * door is a question only the server gets to answer.
        */}
      {label ? (
        <View style={[styles.here, { bottom: height * 0.28 }]} pointerEvents="none">
          <Text style={styles.hereText}>{label}</Text>
        </View>
      ) : null}

      {canWalk ? (
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
          תצוגת העיר היא המחשה · מי זמין עכשיו נבדק רק כששולחים בקשה
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
  here: {
    position: "absolute",
    alignSelf: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.74)",
  },
  hereText: { ...type.bodyStrong, color: palette.nightText, writingDirection: "rtl" },
  found: {
    position: "absolute",
    alignSelf: "center",
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
