import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";

import { type WorldGeo, GROUND_GRASS_ID, groundMaterials, pruneDeadEnds } from "@pro-now/types";

import { type WorldAssetSources, EMPTY_ASSET_SOURCES } from "./AssetSlot";
import { GeoPlate } from "./GeoPlate";
import { PaintedGround } from "./PaintedGround";

/**
 * THE GROUND, WHICHEVER GROUND THIS BUILD HAS.
 *
 * ---------------------------------------------------------------------
 * WHY ONE COMPONENT AND NOT TWO COPIES OF THE SAME FOUR LINES
 * ---------------------------------------------------------------------
 * The composite took several attempts to get right — the painted city in
 * the blocks, the real road corridor laid over it in stone, the material
 * as a whole ground when there is no painting, and the drawn city when
 * there is neither. It is four states and the ORDER between them matters.
 *
 * It was written inside the stroll screen, and the tracking screen — the
 * one somebody watches for twenty minutes — still had the old plate. Two
 * screens showing two different cities with the same street names is the
 * class of drift that `ingest-pack` and `art-delivery.test` both exist to
 * stop, arrived at from the other direction.
 *
 * So the decision lives here once, and both screens ask for "the ground".
 */

export interface WorldGroundProps {
  /** The world box, in points. */
  width: number;
  height: number;
  sources?: WorldAssetSources;
  /** A real street plan, when there is one. */
  geo?: WorldGeo | null;
  /** How much of the place is in frame; decides the tilt. */
  metresAcross?: number;
  /** The painted plate, if the caller has already chosen one. */
  plateAssetId?: string;
  fallbackPlateAssetId?: string;
  animate?: boolean;
}

export function WorldGround({
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  geo = null,
  metresAcross,
  plateAssetId = "world_neighbourhood",
  fallbackPlateAssetId = "shared_ground_street",
  animate = true,
}: WorldGroundProps) {
  const plate = sources[plateAssetId] ?? sources[fallbackPlateAssetId] ?? null;

  /*
   * NO ROADS THAT STOP IN THE MIDDLE OF THE CITY.
   *
   * Amit, looking at the first real extract: *"יש כבישים חתוכים באמצע
   * המפה, אפשר לוותר עליהם ולשים שם מדשאות ועסקים שלנו עתידיים."* Done
   * here rather than in the fetch script, so it applies to every extract
   * however it arrived — and memoised on the document, because it walks
   * every way against every other and is not a per-frame job.
   */
  const cleaned = useMemo(() => (geo ? pruneDeadEnds(geo).geo : null), [geo]);

  const layer = useMemo(() => {
    const mats = groundMaterials((id) => Boolean(sources[id]));
    const pave = mats.length > 0 ? ((sources[mats[0]!] as { uri: string } | undefined) ?? null) : null;
    const grass = (sources[GROUND_GRASS_ID] as { uri: string } | undefined) ?? null;
    /*
     * ---------------------------------------------------------------
     * THE MATERIAL WINS ON A REAL MAP, AND IT TOOK THREE ROUNDS TO SEE
     * ---------------------------------------------------------------
     * The painted plate is a better picture than anything drawn here and
     * it has one property that beats that: it repeats. Tiled across a
     * real extract, the same palm, the same bench and the same flowering
     * tree appear every hundred metres in a grid — and at the wide shot,
     * which is the one the dispatch screen holds while somebody waits,
     * the grid is the first thing the eye finds. Amit, on that shot:
     * *"כרגע הכל נראה לא טוב."*
     *
     * The material has no repeat the eye can find, no painted road to
     * fight the real one, and — the part that was not obvious — it makes
     * OUR SHOPFRONTS the brightest thing on the screen instead of one
     * more lit object among a hundred painted ones. The city stops being
     * a picture with our shops in it and becomes our shops standing in a
     * city.
     *
     * The plate is still the ground everywhere there is no extract, which
     * is every screen that has not been switched over.
     */
    if (mats.length > 0) {
      return { tiles: mats.map((id) => sources[id]!), material: true, tileMetres: 14, pave: null, grass };
    }
    if (plate) return { tiles: [plate], material: false, tileMetres: undefined, pave, grass };
    if (mats.length > 0) {
      return { tiles: mats.map((id) => sources[id]!), material: true, tileMetres: 14, pave: null, grass };
    }
    return null;
  }, [plate, sources]);

  if (!cleaned) {
    /*
     * NO EXTRACT: the plate as it has always been, one picture fitted to
     * the world. Nothing here is allowed to change that case — it is what
     * every screen without a real map still shows.
     */
    return plate ? (
      <Image source={plate} style={{ width, height }} resizeMode="cover" />
    ) : null;
  }

  if (!layer) {
    // A real street plan and no artwork at all: the drawn city, which is
    // honest and is a diagram. See GeoPlate.
    return <GeoPlate geo={cleaned} width={width} height={height} metresAcross={metresAcross} />;
  }

  return (
    <>
      <PaintedGround
        source={layer.tiles}
        bounds={cleaned.bounds}
        width={width}
        height={height}
        tileMetres={layer.tileMetres}
      />
      <View style={StyleSheet.absoluteFill}>
        <GeoPlate
          geo={cleaned}
          width={width}
          height={height}
          metresAcross={metresAcross}
          paintedGround
          drawProps={layer.material}
          paveSource={layer.pave}
          grassSource={layer.grass}
          animate={animate}
        />
      </View>
    </>
  );
}
