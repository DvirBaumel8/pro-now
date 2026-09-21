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

/*
 * THERE IS NO LONGER A DISTANCE AT WHICH WE STOP BEING OUR CITY.
 *
 * A `PLATE_MAX_METRES = 190` used to live here: under it the painting,
 * over it the material with the city drawn on top. The argument was that
 * the plate repeats, and that the repeat is the first thing the eye finds
 * on a wide shot — cited against Amit's *"כרגע הכל נראה לא טוב."*
 *
 * That complaint had a different cause. The living map was ASSERTING
 * `SHOT_METRES.EXPLORE` to the ground while its viewport was at another
 * zoom entirely, so the ground was tilting for a distance nobody was
 * standing at (fixed with `metresAcrossAt`). The cutoff was built on a
 * misread, and it is what put the tracking screen — the one somebody
 * watches for twenty minutes, at ROUTE's 280 metres — permanently on the
 * far side of it.
 *
 * Side by side the answer is not close. The painting tiled across a wide
 * shot is a lamp-lit city with a visible block rhythm, which is what a
 * city looks like from above. The material with the drawn city on it is a
 * dark violet diagram, and Amit has now said three times that the dark is
 * the one thing he cannot have: *"אני לא יכול עם המסך הכהה הזה. איפה
 * העולם הקסום שבנינו?"*
 *
 * So the rule is no longer a distance. The painting is the ground
 * whenever there is a painting; the material is what a build without one
 * stands on. That is a deletion rather than a retuned number, which is
 * the only kind of fix this particular question has ever accepted.
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
     * WHICH GROUND: THE PAINTING, IF THIS BUILD HAS ONE
     * ---------------------------------------------------------------
     * Five rounds to arrive at one line.
     *
     * The PAINTED PLATE is a city nothing drawn from polygons will ever
     * catch: warm, planted, lamp-lit, and already full of the palms and
     * benches and awnings the drawn version keeps failing to invent. It
     * repeats — tiled across a real extract the same bench lands every
     * hundred metres — and for a while that repeat was treated as
     * disqualifying past a certain distance.
     *
     * It is not. A block rhythm on a wide shot is what a city has. The
     * ground it was being swapped for is a violet diagram, and a
     * beautiful thing with a visible grid beats an ugly thing without
     * one every time somebody is asked.
     *
     * The MATERIAL keeps its job, which is the build with no artwork:
     * no repeat, no painted street to fight the real one, and the drawn
     * city — blocks, lit windows, planting — on top of it so the screen
     * is still a place. It is honest and it is a drawing, and it is what
     * you get when nobody has painted anything yet.
     */
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
