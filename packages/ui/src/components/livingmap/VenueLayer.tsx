import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import {
  matchFactsHe,
  noReputationYetHe,
  depthOrder,
  type AvailabilityScene,
  type CandidatePresence,
  WORLD_SIZE,
  type VirtualVenue,
} from "@pro-now/types";

import { palette, radii, scale, spacing, type } from "../../theme";
import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { HAIR_PACK_V0 } from "./hairPack";

/**
 * VENUE LAYER — the choices, as places in the world.
 *
 * ---------------------------------------------------------------------
 * A BUILDING STANDS FOR A PERSON
 * ---------------------------------------------------------------------
 * Amit wanted to move around a wide map and see the professionals who
 * match. A professional standing on a street corner is a claim about where
 * they are, and before assignment that is not ours to make. His own next
 * sentence gave the way through: the match is represented by *our* virtual
 * barbershop, and several barbershops are several options.
 *
 * So each venue here is the avatar of one real candidate the server
 * returned. Three shops means three choices. It never means three
 * addresses, and `VirtualVenue` makes that a compile error rather than a
 * promise — see `packages/types/src/virtual-venue.ts`.
 *
 * ---------------------------------------------------------------------
 * WHAT A TAP DOES
 * ---------------------------------------------------------------------
 * Lifts a small card above the shop with facts only: the name, the trade,
 * the rating if one exists, the jobs if there are any. No distance, no
 * direction, no street. The camera moves in; nothing else is asserted.
 */
export interface VenueLayerProps {
  venues: readonly VirtualVenue[];
  /** The real candidates the venues stand for, keyed by candidateId. */
  candidates: readonly CandidatePresence[];
  /** The world's size. Positions are fractions of this. */
  width: number;
  height: number;
  /**
   * What a venue's size is a fraction of.
   *
   * The viewport, not the world — and the distinction is not pedantic. The
   * world is 2.4 screens across, so sizing a shop at 30% of the WORLD makes
   * it most of a phone: the first build with the neighbourhood plate showed
   * three buildings the size of city blocks. Position scales with the
   * world; size scales with the screen you are looking through it with.
   */
  sizeBasis?: number;
  /**
   * Which part of the world is on screen, as a left offset in world pixels.
   *
   * Needed so a card can tell whether it is about to hang off the phone.
   * Without it the layer knows where a shop is in the world and nothing at
   * all about what the person can see.
   */
  visibleLeft?: number;
  /** World pixels at the screen's top edge, for the same reason. */
  visibleTop?: number;
  /**
   * How much of the top of the screen is already spoken for — a headline,
   * a back control — so a card knows when it has to move out from under it.
   */
  topClearance?: number;
  /** Per-kind venue art. Grey slots until the pack lands. */
  sources?: WorldAssetSources;
  assetIdForKind?: (kind: VirtualVenue["kind"]) => string;
  /**
   * Which shopfront this particular candidate's place uses.
   *
   * Per candidate rather than per trade, so a street of hairdressers is a
   * street of different salons. Falls back to `assetIdForKind` for callers
   * that have one building per trade.
   */
  assetIdForCandidate?: (candidateId: string) => string;
  selectedCandidateId?: string | null;
  onSelect?: (candidateId: string) => void;
  /**
   * Who is standing outside, waiting.
   *
   * Amit's idea: you should be able to drag across the world and see who
   * is free — the barber in the doorway, the dog walker holding an empty
   * lead, the van with an empty load. Availability is real server data, so
   * drawing it is a rendering of a true fact rather than a new claim.
   *
   * Only the available are ever here. Nobody unavailable is drawn, because
   * a barber shown mid-haircut would be telling you what that person is
   * doing for somebody else.
   */
  availability?: readonly AvailabilityScene[];
  characterAssetId?: string;
  /** 0 hidden, 1 fully awake. Venues wake one after another. */
  progress?: Animated.Value;
  /**
   * The shops are there to be LOOKED at, not chosen.
   *
   * Amit: *"בזמן חיפוש במפה חייבת להיות תזוזה בין מספרות עד שמוצא."* The
   * camera now travels the street while dispatch checks candidates, which
   * only works if there are shops on the street to travel between — so the
   * venues are drawn during the search too.
   *
   * Muted is what keeps that honest. Nothing has been decided yet, so the
   * shops are quieter, they take no taps, and no card can be opened on
   * one. They are the street being searched, not a list of options offered
   * early.
   */
  muted?: boolean;
}


/**
 * The shape of a piece of art, from the manifest.
 *
 * Buildings were being drawn into SQUARE boxes and `contain` was
 * letterboxing them inside: a salon 1350x1007 placed in a 129pt square came
 * out 129 wide and 96 tall, floating with empty space above and below its
 * own footing. The box has to be the asset's own aspect ratio, so the
 * building fills it and its base sits where it was placed.
 */
function shapeOf(assetId: string): { ratio: number; anchorX: number } {
  const item = HAIR_PACK_V0[assetId];
  if (!item) return { ratio: 1, anchorX: 0.5 };
  return { ratio: item.intrinsicHeight / item.intrinsicWidth, anchorX: item.anchor.x };
}

/**
 * How wide a candidate's shop is, as a share of the VIEWPORT.
 *
 * ---------------------------------------------------------------------
 * WHY THIS WENT UP
 * ---------------------------------------------------------------------
 * Amit, on a venue in the world: *"העסק קטן ולא בולט, לא מספיק מובן."*
 *
 * 0.3 was chosen when a venue was a grey rectangle, where the number only
 * had to prove a placement. With real artwork it is far too small, for a
 * reason the number hides: these shopfronts are drawn with trees, planters
 * and signage around them, so the actual shop is maybe half of the file's
 * width. A 0.3 box therefore puts a shopfront on screen at about 15% of
 * the phone — a detail, when it is the single most important object in the
 * frame.
 *
 * ChatGPT's own camera spec says the venue should reach 55–65% of screen
 * width once the camera has arrived on it. This is the resting size; the
 * chosen one is lifted further below.
 */
/*
 * A VENUE'S SHARE OF THE WORLD — not of the phone. See DistrictLayer for
 * the whole diagnosis: sizing against the viewport meant the shops grew
 * relative to the street every time the camera pulled back, until they
 * collided with each other and with the plate.
 */

/**
 * The extra size the chosen venue gets.
 *
 * Being chosen is the most important state on this screen and it was
 * carried only by a card floating above the building. Now the building
 * itself grows — which is what "this is the one" looks like from across a
 * street.
 */
const CHOSEN_SCALE = WORLD_SIZE.chosenVenue / WORLD_SIZE.venue;

export function VenueLayer({
  venues,
  candidates,
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  assetIdForKind = (kind) => (kind === "HAIR" ? "hair_barbershop_hero" : "shared_residential_01"),
  assetIdForCandidate,
  selectedCandidateId,
  onSelect,
  progress,
  availability = [],
  characterAssetId,
  muted = false,
  sizeBasis,
  visibleLeft = 0,
  visibleTop = 0,
  topClearance = 0,
}: VenueLayerProps) {
  // `width` is the WORLD's width in points.
  const basis = sizeBasis ?? width;
  void basis;
  const waitingById = new Map(availability.map((a) => [a.candidateId, a]));
  const byId = new Map(candidates.map((c) => [c.candidateId, c]));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/*
        * FURTHEST FIRST.
        *
        * On a street every shop was at the same depth and the order did not
        * matter. On the square it decides whether a near venue covers a far
        * one or grows a hole in its roof — so the list is sorted by depth
        * before anything is drawn, and `depthOrder` is the same
        * function the vehicles and the people use, which is what keeps them
        * all consistent with each other.
        */}
      {[...venues]
        .sort((a, b) => depthOrder(a.worldAnchor.v) - depthOrder(b.worldAnchor.v))
        .map((venue, i) => {
        const candidate = byId.get(venue.candidateId);
        if (!candidate) return null;

        /*
         * Size is distance. A far shop drawn at the near shop's size is the
         * single fastest way to flatten a 3/4 world back into a sprite
         * sheet — and it was exactly what the street layout did, because on
         * a line everything is equally far away.
         */
        const assetId = assetIdForCandidate?.(venue.candidateId) ?? assetIdForKind(venue.kind);
        const shape = shapeOf(assetId);
        const isChosen = !muted && selectedCandidateId === venue.candidateId;
        const w = width * WORLD_SIZE.venue * (venue.scale ?? 1) * (isChosen ? CHOSEN_SCALE : 1);
        const h = w * shape.ratio;
        const left = venue.worldAnchor.u * width - w * shape.anchorX;
        const top = venue.worldAnchor.v * height - h;
        const selected = !muted && selectedCandidateId === venue.candidateId;

        /*
         * How far the card must slide to stay on screen. `basis` is the
         * viewport; `left` is in world coordinates, so the comparison is
         * against the part of the world currently in frame.
         */
        const CARD_W = 170;
        const cardCentre = left + w / 2;
        const overflowRight = cardCentre + CARD_W / 2 - (visibleLeft + basis - 12);
        const overflowLeft = visibleLeft + 12 - (cardCentre - CARD_W / 2);
        const cardShift = overflowRight > 0 ? -overflowRight : overflowLeft > 0 ? overflowLeft : 0;

        /*
         * AND KEPT BELOW THE HEADLINE.
         *
         * The card hangs above its own shop, which is right until the
         * camera arrives on a shop near the top of the frame — then the
         * card rises behind the "מצאנו לך התאמה" banner and the
         * professional's name is read through it.
         *
         * Sliding it down like the horizontal case would detach it from its
         * building, so it FLIPS to the other side instead: still touching
         * the shop, still obviously about that shop, just underneath it.
         * `topClearance` is the space the screen's own furniture occupies.
         */
        const CARD_H = 92;
        const cardTopOnScreen = top - visibleTop - CARD_H;
        const cardBelow = cardTopOnScreen < topClearance;
        const dimmed = !muted && selectedCandidateId != null && !selected;

        /*
         * STAGGERED WAKING. Three shops lighting up at once is a switch
         * being flipped; one after another is a street noticing you.
         */
        const stagger = 0.18 * i;
        const wake = progress
          ? progress.interpolate({
              inputRange: [0, stagger, Math.min(1, stagger + 0.4), 1],
              outputRange: [0, 0, 1, 1],
              extrapolate: "clamp",
            })
          : 1;

        return (
          <Animated.View
            key={venue.candidateId}
            style={[
              styles.venue,
              { left, top, width: w },
              {
                opacity: typeof wake === "number" ? (dimmed ? 0.35 : 1) : wake,
                transform: [
                  {
                    scale:
                      typeof wake === "number"
                        ? 1
                        : wake.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }),
                  },
                ],
              },
              dimmed && typeof wake !== "number" ? { opacity: 0.35 } : null,
            ]}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={muted ? undefined : () => onSelect?.(venue.candidateId)}
              disabled={muted}
              accessibilityRole={muted ? "image" : "button"}
              accessibilityLabel={
                muted ? "בודקים בעל מקצוע" : `${candidate.displayNameHe} · ${candidate.professionHe}`
              }
              accessibilityState={muted ? undefined : { selected }}
              style={{ width: w, height: w, opacity: muted ? 0.72 : 1 }}
            >
              <AssetSlot
                placement={{
                  key: venue.candidateId,
                  assetId,
                  item: {
                    id: assetId,
                    file: "",
                    intrinsicWidth: 1,
                    intrinsicHeight: 1,
                    anchor: { x: 0.5, y: 1 },
                    role: "HERO_BUILDING",
                    theme: "HAIR",
                    defaultWidthRatio: WORLD_SIZE.venue,
                    critical: true,
                  },
                  layer: "WORLD_OBJECT",
                  left: 0,
                  top: 0,
                  width: w,
                  height: h,
                  depthOrder: 0,
                }}
                sources={sources}
                quiet
                pending="none"
              />
            </Pressable>

            {/*
              * THE PERSON, WAITING OUTSIDE. Drawn beside the venue rather
              * than on it, and only when the server says they are free.
              */}
            {characterAssetId && waitingById.has(venue.candidateId) ? (
              /*
                * A PERSON IS NOT A SQUARE.
                *
                * The box used to be `w*0.34` on both sides, and a figure
                * 132x378 dropped into it with `contain` came out a third of
                * its own width, floating in the middle of an empty square
                * with its feet well above the pavement. The art has real
                * proportions now, so the box takes them: height decides the
                * size — that is what "how tall is this person next to that
                * shop" means — and width follows from the file.
                */
              <View
                style={{
                  position: "absolute",
                  left: w * 0.78,
                  bottom: 0,
                  height: w * 0.46,
                  width: (w * 0.46) / shapeOf(characterAssetId).ratio,
                }}
                accessible
                accessibilityLabel={`${candidate.displayNameHe} · ${waitingById.get(venue.candidateId)!.labelHe}`}
              >
                <AssetSlot
                  placement={{
                    key: `${venue.candidateId}-waiting`,
                    assetId: characterAssetId,
                    item: {
                      id: characterAssetId,
                      file: "",
                      intrinsicWidth: 1,
                      intrinsicHeight: 1,
                      anchor: { x: 0.5, y: 1 },
                      role: "PRESENCE",
                      theme: "SHARED",
                      defaultWidthRatio: 0.12,
                      critical: false,
                    },
                    layer: "PRESENCE",
                    left: 0,
                    top: 0,
                    width: (w * 0.46) / shapeOf(characterAssetId).ratio,
                    height: w * 0.46,
                    depthOrder: 0,
                  }}
                  sources={sources}
                  quiet
                  pending="none"
                />
              </View>
            ) : null}

            {/*
              * THE CARD, ABOVE THE SHOP. Facts only — and `matchFactsHe`
              * returns nothing rather than a manufactured number, so a
              * professional nobody has hired yet gets one honest line.
              */}
            {selected ? (
              /*
               * KEPT INSIDE THE SCREEN.
               *
               * The card hangs above its own shop, and a shop near the edge
               * of the world put half of it past the edge of the phone —
               * Amit's screenshot showed the name clipped to "…מה ט׳". The
               * world is 2.4 screens across, so "above the shop" and "on
               * screen" are not the same place, and only the card knows
               * which one it needs to be.
               *
               * So it shifts along by however much it would have
               * overflowed, and no further: it stays attached to its own
               * building rather than jumping to the middle.
               */
              <View
                style={[
                  styles.card,
                  cardBelow ? styles.cardBelow : styles.cardAbove,
                  { transform: [{ translateX: cardShift }] },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.name} numberOfLines={1}>
                  {candidate.displayNameHe}
                </Text>
                <Text style={styles.profession} numberOfLines={1}>
                  {candidate.professionHe}
                </Text>
                <Text style={styles.facts} numberOfLines={1}>
                  {matchFactsHe(candidate) ?? noReputationYetHe}
                </Text>
                {waitingById.has(venue.candidateId) ? (
                  <Text style={styles.free} numberOfLines={1}>
                    {waitingById.get(venue.candidateId)!.labelHe}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  venue: { position: "absolute", alignItems: "center" },
  card: {
    position: "absolute",
    minWidth: 150,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: "rgba(16,12,22,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(247,243,250,0.12)",
    alignItems: "flex-end",
  },
  /** Above the shop, which is where it belongs when there is room. */
  cardAbove: { bottom: "100%", marginBottom: spacing.xs },
  /** Flipped under it when the headline would otherwise cover it. */
  cardBelow: { top: "100%", marginTop: spacing.xs },
  name: { ...type.bodyStrong, fontSize: scale.meta, color: palette.nightText, writingDirection: "rtl" },
  profession: { ...type.micro, color: palette.nightTextSoft, writingDirection: "rtl" },
  facts: { ...type.micro, color: palette.nightTextSoft, writingDirection: "rtl", marginTop: 2 },
  // Mint, the live colour. Coral is reserved for actions.
  free: { ...type.micro, color: palette.trust300, writingDirection: "rtl", marginTop: 2 },
});
