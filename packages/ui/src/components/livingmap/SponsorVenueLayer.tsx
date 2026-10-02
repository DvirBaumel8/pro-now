import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  depthOrder,
  depthScale,
  SPONSOR_BADGE_HE,
  sponsorSpotFor,
  WORLD_SIZE,
  type NormalizedPoint,
  type SponsorShop,
} from "@pro-now/types";

import { AssetSlot, type WorldAssetSources } from "./AssetSlot";
import { HAIR_PACK_V0 } from "./hairPack";
import { radii, spacing, type as typeScale } from "../../theme";

/**
 * THE SHOPS IN THE NEIGHBOURHOOD THAT SOMEBODY PAID FOR.
 *
 * ---------------------------------------------------------------------
 * WHY THIS IS A BUILDING AND NOT A BANNER
 * ---------------------------------------------------------------------
 * Amit: *"אני רוצה שלכל ספונסר שלי יהיה חנות פה במפה של העולם שלנו...
 * לא הגיוני שאני צריך לגלול עד לפה בשביל למצוא את זה. למה אין מבנה של
 * לאסט במפה??"*
 *
 * The first version of the sponsor feature put the brand in a row at the
 * bottom of the tracking sheet, and he found it by scrolling, which is
 * the correct reaction: this product's argument is that a business is a
 * PLACE, and an advert in a list is the one shape that argument does not
 * take. So a sponsor stands on a frontage with its sign on, like every
 * other shop in the street, and you walk past it.
 *
 * ---------------------------------------------------------------------
 * AND WHY IT STILL CANNOT BE MISTAKEN FOR ONE OF OURS
 * ---------------------------------------------------------------------
 * The whole neighbourhood is buildings that mean "a verified trade works
 * here". Putting a paid building in the same street is the single most
 * dangerous thing in this feature, so it is also the most marked:
 *
 * - A plate over the door reading `בחסות`, drawn by us rather than by
 *   the brand's artwork, so it cannot be styled away.
 * - The same word inside the accessible name, because a badge that only
 *   exists in pixels tells a screen reader nothing.
 * - Deliberately no character standing outside. Every district has the
 *   trade's own figure beside its door, and a figure outside a shop in
 *   THIS world reads as "somebody who does this work" — which is the
 *   exact claim a sponsor is not making.
 * - It is never dimmed or brightened by which trade is being dispatched.
 *   A district dims when another trade is active, because it is part of
 *   the same supply. A sponsor is not part of any of it.
 *
 * Placement is measured, not chosen: `sponsorSpotFor` hands back the
 * leftovers after the eleven trades have taken the cleanest ground on
 * the plate, and returns null rather than wrapping — a sponsor with
 * nowhere to stand is not drawn.
 */

/**
 * Below this the shopfront is a smudge, and a smudge of a building is
 * worse than nothing. The same threshold `DistrictLayer` uses, and the
 * same reasoning — except that a district falls back to a name marker
 * at distance and a sponsor does NOT.
 *
 * A floating pill with a brand name on it, hanging over a street the
 * customer has zoomed out of, is an advertisement in the sky. The
 * building is the advert; when you are too far away to see the
 * building, there is nothing to see.
 */
const LEGIBLE_WIDTH = 34;

function shapeOf(assetId: string): { ratio: number; anchorX: number } {
  const item = HAIR_PACK_V0[assetId];
  if (!item) return { ratio: 1, anchorX: 0.5 };
  return { ratio: item.intrinsicHeight / item.intrinsicWidth, anchorX: item.anchor.x };
}

export interface SponsorVenueLayerProps {
  shops: readonly SponsorShop[];
  width: number;
  height: number;
  /**
   * Kept for callers that still pass it, and deliberately unused: see
   * the note where `w` is computed. A building is a share of the WORLD.
   */
  sizeBasis?: number;
  sources: WorldAssetSources;
  /** Real building plots, when the world stands on a real street plan. */
  spots?: readonly NormalizedPoint[] | null;
  onEnter?: (shop: SponsorShop) => void;
  /** Same warm disc the districts get, so it stands on the pavement. */
  litGround?: boolean;
}

export function SponsorVenueLayer({
  shops,
  width,
  height,
  sources,
  spots,
  onEnter,
  litGround = false,
}: SponsorVenueLayerProps) {
  const placed = shops
    .map((shop, i) => ({ shop, at: sponsorSpotFor(i, spots) }))
    /*
     * A sponsor with no measured frontage is not drawn anywhere. See
     * `sponsorSpotFor`: wrapping would stand two businesses in one
     * doorway, which is worse than a brand that paid and is not shown —
     * that is a conversation, and two shops in one door is a bug
     * nobody can explain.
     */
    .filter((p): p is { shop: SponsorShop; at: NormalizedPoint } => p.at !== null)
    // Furthest first, so a near building covers a far one.
    .sort((a, b) => depthOrder(a.at.v) - depthOrder(b.at.v));

  if (placed.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {placed.map(({ shop, at }) => {
        if (!sources[shop.venueAssetId]) return null;

        const scale = depthScale(at.v);
        const shape = shapeOf(shop.venueAssetId);
        /*
         * A SHARE OF THE WORLD, NOT OF THE PHONE.
         *
         * This read `sizeBasis` — the viewport — and `DistrictLayer`,
         * one file away, reads the world's width for the same number.
         * The consequence only appears when the camera moves: a
         * viewport-relative building keeps its size on screen at every
         * zoom, so it stays put while the painted street behind it
         * grows and shrinks around it.
         *
         * It cost an hour. Amit asked for a bigger world, I raised the
         * camera twice, rebuilt, and measured the sponsored shopfront at
         * 57 points wide both times — exactly the same number, which is
         * the tell. The zoom was working; this building was the one
         * object in the street immune to it.
         *
         * See the long note on `WORLD_SIZE`: a building has a size in
         * the WORLD, and the camera scales it along with the ground it
         * stands on. That is what walking towards a shop does.
         */
        const w = width * WORLD_SIZE.district * scale;
        const h = w * shape.ratio;

        if (w < LEGIBLE_WIDTH) return null;

        return (
          <View
            key={shop.id}
            style={[
              styles.venue,
              { left: at.u * width - w * shape.anchorX, top: at.v * height - h, width: w },
            ]}
            pointerEvents="box-none"
          >
            {litGround ? (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: w * shape.anchorX - w * 0.85,
                  top: h - w * 0.42,
                  width: w * 1.7,
                  height: w * 0.84,
                  borderRadius: w * 0.85,
                  backgroundColor: "rgba(255,196,107,0.10)",
                }}
              />
            ) : null}

            <Pressable
              onPress={onEnter ? () => onEnter(shop) : undefined}
              disabled={!onEnter}
              accessibilityRole={onEnter ? "button" : "image"}
              /*
               * The brand, what it sells, and the fact that it is paid
               * for — in that order, in one breath. Somebody who cannot
               * see the plate over the door gets the word anyway.
               */
              accessibilityLabel={`${shop.brandName} · ${shop.categoryHe} · ${SPONSOR_BADGE_HE}`}
              /*
               * A BUILDING CANNOT BE GROWN TO FIT A FINGER.
               *
               * `verify:a11y` measured this shopfront at 57x39 and
               * flagged it: under the 44 points a finger needs. The
               * honest fix is not to draw the shop bigger than the
               * street says it is — the world's depth decides that —
               * but to extend the TOUCH area past the picture, which is
               * what hitSlop is for. The drawing stays true to the
               * perspective and the tap target stops being a test of
               * aim.
               */
              hitSlop={{
                top: Math.max(0, (44 - h) / 2),
                bottom: Math.max(0, (44 - h) / 2),
                left: Math.max(0, (44 - w) / 2),
                right: Math.max(0, (44 - w) / 2),
              }}
              style={{ width: w, height: h }}
            >
              <AssetSlot
                placement={{
                  key: `sponsor-${shop.id}`,
                  assetId: shop.venueAssetId,
                  item: {
                    id: shop.venueAssetId,
                    file: "",
                    intrinsicWidth: 1,
                    intrinsicHeight: 1,
                    anchor: { x: 0.5, y: 1 },
                    role: "BUILDING",
                    theme: "SHARED",
                    defaultWidthRatio: WORLD_SIZE.district,
                    critical: false,
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

            {/* ------------------------------------------------------------
                THE LIT SIGN OVER THE DOOR.

                Amit: *"זה גרוע שרואים רק חסות. צריך שלט זוהר או משהו עם
                השם של החברה. רק חסות זה גרוע וקטן, לא רואים כלום."*

                He is right, and the first version had the priority
                backwards. It drew only the word `בחסות` — the
                DISCLOSURE — and nothing that says whose shop it is. A
                brand paying to be in the street got a grey pill reading
                "sponsored", which is the label an advert gets when
                somebody is embarrassed by it.

                So it is a shop sign now: the brand's name, lit, the way
                every other business in this street has its name lit
                over its door. `בחסות` sits under it in small type — it
                is still there, still unremovable, still in the
                accessible name, and it is a footnote rather than the
                headline, which is what a disclosure is supposed to be.

                The glow is two stacked boxes rather than a shadow,
                because react-native-web will not animate a shadow and
                the world holds this sign while the camera moves.

                Everything scales with the building. A fixed-size sign
                on a shop half a screen away ends up bigger than the
                shop, which is how the first badge looked at distance.
                ------------------------------------------------------------ */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -h * 0.16,
                left: w * 0.5 - Math.max(52, w * 0.42),
                width: Math.max(104, w * 0.84),
                alignItems: "center",
              }}
            >
              {/* The halo the sign throws. Behind it, wider, softer. */}
              <View
                style={{
                  position: "absolute",
                  top: -h * 0.03,
                  left: -w * 0.08,
                  right: -w * 0.08,
                  bottom: -h * 0.03,
                  borderRadius: radii.md,
                  backgroundColor: "rgba(255,196,107,0.18)",
                }}
              />
              <View style={styles.sign}>
                <Text
                  style={[styles.signName, { fontSize: Math.max(13, w * 0.115) }]}
                  numberOfLines={1}
                >
                  {shop.brandName}
                </Text>
                <Text
                  style={[styles.signBadge, { fontSize: Math.max(8, w * 0.062) }]}
                  numberOfLines={1}
                >
                  {SPONSOR_BADGE_HE}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  venue: { position: "absolute" },
  sign: {
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(16,11,22,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,214,150,0.55)",
  },
  /*
   * The brand's own name, in the brand's own script. Latin stays Latin
   * — the same rule the PRO NOW wordmark follows on the district signs.
   */
  signName: {
    ...typeScale.bodyStrong,
    color: "#FFE9C7",
    letterSpacing: 0.4,
  },
  /*
   * The disclosure, under the name. Small, and never optional: it is in
   * the accessible name too, so a screen reader hears it in the same
   * breath whatever this looks like.
   */
  signBadge: {
    ...typeScale.micro,
    fontWeight: "700",
    color: "rgba(255,233,199,0.82)",
    letterSpacing: 1.2,
    marginTop: 1,
  },
});
