import React from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { scale, type } from "../../theme";
import type { ResolvedPlacement } from "@pro-now/types";

/**
 * ASSET SLOT — one piece of world art, or an honest hole where it will go.
 *
 * ---------------------------------------------------------------------
 * WHY THE PLACEHOLDER IS UGLY ON PURPOSE
 * ---------------------------------------------------------------------
 * The art pack is authored outside this repository, so for a while the
 * composition exists and the art does not. The tempting move is to draw a
 * nice-looking stand-in building, and it is the exact mistake that produced
 * the rejected version: a decent-looking intermediate gets treated as the
 * thing, reviewed as the thing, and argued about as the thing.
 *
 * ChatGPT's instruction was explicit — *"אל תצייר אפילו עוד בניין
 * placeholder יפה. המלבן האפור והמכוער הוא דווקא טוב — הוא מונע מאיתנו
 * להתאהב שוב בגרסת ביניים."*
 *
 * So a missing asset renders as a labelled grey rectangle carrying its id
 * and its resolved size. It is useful — it proves the placement, the
 * scale, the depth order and the animation are right — and it is
 * impossible to mistake for a design.
 *
 * ---------------------------------------------------------------------
 * THE SLOT NEVER RESOLVES A FILENAME
 * ---------------------------------------------------------------------
 * It takes an `assetId` and asks the registry. The manifest is the only
 * thing that maps an id to a file, dimensions and an anchor, which is what
 * stops a rename from silently moving a building.
 */

/**
 * Whatever the host platform can hand to `<Image>` for a given asset id.
 * Bundled requires on native, URLs on web — the slot does not care, which
 * is why this is a lookup and not a path.
 */
export type WorldAssetSources = Readonly<Record<string, ImageSourcePropType>>;

export const EMPTY_ASSET_SOURCES: WorldAssetSources = Object.freeze({});

export interface AssetSlotProps {
  placement: ResolvedPlacement;
  sources: WorldAssetSources;
  /**
   * Hides the placeholder's label. For a capture or a demo where the grid
   * of ids would be noise — never a way to make the placeholder prettier.
   */
  quiet?: boolean;
  /**
   * What to draw when the file has not arrived.
   *
   * ---------------------------------------------------------------------
   * WHY THIS IS NOT ALWAYS THE GREY BOX
   * ---------------------------------------------------------------------
   * The grey box is deliberately ugly, and that was the right call while it
   * appeared twice on a developer's screen: it proves a placement without
   * letting anyone mistake it for a design.
   *
   * Then the world filled with eleven districts and the same rule put
   * eleven grey rectangles across the middle of the screen Amit shows
   * people. *"לא רוצה לראות את הריבועים הריקים."* At that point the box
   * stops protecting the review and starts wrecking the thing it was
   * protecting.
   *
   * So the caller says which it wants. `"box"` inside the gallery, where a
   * missing asset should shout. `"none"` in the world, where an absent
   * building is better represented by the empty pavement it will stand on
   * than by a rectangle pretending to be it — nothing is claimed either
   * way, and the street stays a street.
   */
  pending?: "box" | "none";
}

export function AssetSlot({ placement, sources, quiet, pending = "box" }: AssetSlotProps) {
  const { left, top, width, height, assetId } = placement;
  const source = sources[assetId];

  const frame = { position: "absolute" as const, left, top, width, height };

  if (source) {
    return (
      <Image
        source={source}
        style={frame}
        /*
         * `contain` for everything with a shape, so a manifest whose
         * intrinsic size has drifted from the file letterboxes rather than
         * stretching a building. The ground is the exception: it is sized
         * to cover the viewport on both axes regardless of its own aspect,
         * so it crops instead — which is what a floor does.
         */
        resizeMode={placement.item.role === "GROUND" ? "cover" : "contain"}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  // Nothing at all, rather than a rectangle standing in for a building.
  if (pending === "none") return null;

  return (
    <View style={[frame, styles.pending]} pointerEvents="none" accessible={false}>
      {quiet ? null : (
        <Text style={styles.label} numberOfLines={2}>
          {assetId}
          {"\n"}
          {Math.round(width)}×{Math.round(height)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pending: {
    // Flat, mid grey, a hard outline and no rounding. Nothing here is a
    // design decision; every property is chosen to look unfinished.
    backgroundColor: "rgba(150,150,155,0.32)",
    borderWidth: 1,
    borderColor: "rgba(200,200,205,0.55)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  label: {
    ...type.caption,
    fontSize: scale.micro,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
});
