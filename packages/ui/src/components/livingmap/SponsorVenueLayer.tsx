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
  /** What a building's size is a fraction of: the viewport, not the world. */
  sizeBasis: number;
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
  sizeBasis,
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
        const w = sizeBasis * WORLD_SIZE.district * scale;
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
                THE PLATE OVER THE DOOR.

                Drawn by us, over the brand's own artwork, at the top of
                the building where a shop's own sign is — so it reads as
                part of the street rather than as a label stuck on a
                picture. It scales with the building, because a fixed-size
                chip on a shop that is half a screen away becomes bigger
                than the shop.

                This is the one piece of a sponsor's building that the
                brand does not supply and cannot change.
                ------------------------------------------------------------ */}
            <View
              pointerEvents="none"
              style={[
                styles.badge,
                {
                  top: h * 0.04,
                  left: w * 0.5 - Math.max(30, w * 0.17),
                  width: Math.max(60, w * 0.34),
                  paddingVertical: Math.max(2, w * 0.012),
                  borderRadius: radii.pill,
                },
              ]}
            >
              <Text style={[styles.badgeText, { fontSize: Math.max(9, w * 0.055) }]} numberOfLines={1}>
                {SPONSOR_BADGE_HE}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  venue: { position: "absolute" },
  badge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23,18,31,0.82)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.4)",
  },
  badgeText: {
    ...typeScale.micro,
    fontWeight: "700",
    color: "#F7F3FA",
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
});
