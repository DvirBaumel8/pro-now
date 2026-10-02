import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";

import {
  type WorldGeo,
  GROUND_GRASS_ID,
  groundMaterials,
  pruneDeadEnds,
  ROAD_PLATE_ASSET_ID,
} from "@pro-now/types";

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

/** Our isometric shop buildings, stood on the real map's blocks. */
const MAP_BUILDING_IDS = [
  "district_hair", "district_home", "district_nails", "district_pets", "district_auto",
  "district_tech", "district_appliance", "district_well", "district_care", "district_move",
] as const;

export function WorldGround({
  width,
  height,
  sources = EMPTY_ASSET_SOURCES,
  geo = null,
  metresAcross,
  plateAssetId = ROAD_PLATE_ASSET_ID,
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
     * WHICH GROUND — AND THE ANSWER CHANGED WHEN HE WAS ASKED
     * ---------------------------------------------------------------
     * The PAINTED PLATE is a city nothing drawn from polygons will ever
     * catch: warm, planted, lamp-lit, full of palms and benches and
     * awnings. Over the invented world it is exactly right and nothing
     * below touches that.
     *
     * It was also being TILED across a real street extract, on the
     * argument that "a block rhythm on a wide shot is what a city has"
     * and that a beautiful thing with a visible grid beats an ugly thing
     * without one "every time somebody is asked".
     *
     * Somebody was asked. Amit, on the real map:
     *
     *   "המפה האמיתית לא נראית אמיתית בשום צורה, הכבישים לא מחוברים,
     *    בתים על בתים, פארקים על כבישים, הכל לא נראה טוב."
     *
     * And he is describing the mechanism exactly, not just disliking it.
     * The plate is not a ground texture — it is a SCENE, with buildings
     * and planters and a road painted into it. Repeat a scene across a
     * real street grid and you get buildings in the middle of junctions,
     * a park lying across a carriageway, and the plate's own painted
     * road cutting the real one at every tile seam. "בתים על בתים" is
     * literally what tiling a picture of houses does.
     *
     * So a real extract takes the MATERIAL: ground and nothing else, at
     * 14 metres a tile, with no painted street to fight the real one and
     * no building that was never surveyed. The drawn city goes on top of
     * it, where the streets actually are. That is what the material was
     * built for, and the note below always said so — it was simply never
     * reached, because the plate was checked first.
     *
     * The painted plate keeps the invented world, which is the place it
     * is a picture of.
     */
    const onRealStreets = cleaned !== null;

    if (!onRealStreets && plate) {
      return { tiles: [plate], material: false, tileMetres: undefined, pave, grass };
    }
    if (mats.length > 0) {
      return { tiles: mats.map((id) => sources[id]!), material: true, tileMetres: 14, pave: null, grass };
    }
    /*
     * A real extract and no ground material delivered. The plate is
     * still better than a blank screen, and the repeat is the lesser
     * fault when the alternative is nothing at all.
     */
    if (plate) return { tiles: [plate], material: false, tileMetres: undefined, pave, grass };
    return null;
  }, [cleaned, plate, sources]);

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
          treeSource={(sources.prop_palm as { uri: string } | undefined) ?? null}
          lampSource={(sources.prop_lamp as { uri: string } | undefined) ?? null}
          buildingSources={MAP_BUILDING_IDS.map((id) => sources[id] as { uri: string } | undefined).filter(
            (x): x is { uri: string } => Boolean(x && x.uri)
          )}
          animate={animate}
        />
      </View>
    </>
  );
}
