import React, { useCallback, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  avatarById,
  districtCentre,
  walkingAssetFor,
  WALK_START,
  WORLD_DISTRICTS,
  worldZoomFor,
  type AvatarChoice,
  type DepartmentCode,
  type Heading,
  type NormalizedPoint,
} from "@pro-now/types";

import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import { EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { DistrictLayer } from "../components/livingmap/DistrictLayer";
import { ScrimBand } from "../components/livingmap/ScrimBand";
import { SteerPad } from "../components/livingmap/SteerPad";
import { Walker } from "../components/livingmap/Walker";
import { WorldViewport } from "../components/livingmap/WorldViewport";
import { palette, radii, spacing, type } from "../theme";

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

  /*
   * WHICH TRADE IS UNDERFOOT.
   *
   * Nothing on this screen is selected in the sense of chosen — this is
   * the one the walker is nearest, so the street can name it without a
   * tap. Walking past a building and being told what it is is the whole
   * difference between a map with icons on it and a street.
   */
  const [nearest, setNearest] = useState<DepartmentCode | null>(null);

  const remember = useCallback((at: NormalizedPoint) => {
    walkedTo.current = at;
    setNearest(nearestDistrict(at));
  }, []);

  const label = nearest ? WORLD_DISTRICTS[nearest].labelHe : null;

  return (
    <View style={[styles.screen, { width, height }]}>
      <WorldViewport
        width={width}
        height={height}
        zoom={worldZoomFor("DISTRICT")}
        worldSized={Boolean(sources["world_neighbourhood"])}
        /*
         * Dragging is allowed only when there is nobody to follow. They
         * are contradictory gestures — see `WorldViewport.follow` — and
         * somebody who skipped the avatar should still be able to look
         * around rather than be stuck at one view.
         */
        explorable={!canWalk}
        follow={canWalk ? { u, v } : null}
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

            <DistrictLayer
              width={world.width}
              height={world.height}
              sizeBasis={width}
              sources={sources}
              /*
               * The trade underfoot is lit and the rest go quiet — which
               * is a fact about where the customer is standing and not a
               * claim about who is available inside.
               */
              activeDepartment={nearest}
              onSelect={onOpenDepartment}
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
                animate={animate}
                onSettled={remember}
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
          <SteerPad onHeading={setHeading} />
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
 * The trade the walker is closest to, or null out in the open.
 *
 * Deliberately generous about "nowhere": a label that changes every step
 * turns a street into a tooltip, and standing in the road between two
 * shops belongs to neither of them.
 */
const NEAR = 0.16;

function nearestDistrict(at: NormalizedPoint): DepartmentCode | null {
  let best: DepartmentCode | null = null;
  let bestD = NEAR;
  for (const code of Object.keys(WORLD_DISTRICTS) as DepartmentCode[]) {
    const spot = districtCentre(code);
    if (!spot) continue;
    // `dv` weighted as everywhere else: the world is drawn in 3/4, so a
    // step north covers less visible ground than a step east.
    const d = Math.hypot(spot.u - at.u, (spot.v - at.v) * 0.6);
    if (d < bestD) {
      bestD = d;
      best = code;
    }
  }
  return best;
}

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
  note: { position: "absolute", left: 0, right: 0, bottom: spacing.sm, alignItems: "center" },
  noteText: { ...type.caption, color: "rgba(247,243,250,0.5)", writingDirection: "rtl" },
});
