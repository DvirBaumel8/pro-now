import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  depthOrder,
  depthScale,
  DISTRICT_SITES,
  districtCentre,
  WORLD_DISTRICTS,
  type DepartmentCode,
  WORLD_SIZE,
} from "@pro-now/types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./AssetSlot";
import { HAIR_PACK_V0 } from "./hairPack";

/**
 * THE NEIGHBOURHOOD'S OWN TRADES.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS MISSING
 * ---------------------------------------------------------------------
 * Amit: *"למה זה לא רואה את כל הבתים שבנינו, כל הדמויות, כל בית ספק אחר?
 * דמויות, בתים, רחובות, כל מה שעשינו מהבוקר."*
 *
 * The world had a ground plate and, during a search, the two or three shops
 * belonging to the candidates the server had returned. That is all. So a
 * neighbourhood with eleven trades in it was being drawn as an empty street
 * with a couple of boxes on it, and the tour went past nothing.
 *
 * This draws the district itself: PRO NOW שיער standing on its own street
 * with its barber outside, PRO NOW הובלות further along, PRO NOW חיות round
 * the corner. Eleven of them, across four streets, most of them off-screen
 * at any moment — which is what makes dragging worth doing.
 *
 * ---------------------------------------------------------------------
 * A DISTRICT IS A PLACE. A VENUE IS A PERSON.
 * ---------------------------------------------------------------------
 * This is the line the whole design rests on, and it is why these two
 * layers are separate files rather than one with a flag.
 *
 * A DISTRICT is where a trade lives in our world. It is a landmark. It
 * exists whether or not anybody is online, it carries no name, no rating,
 * no ETA and no availability, and tapping it means *show me this trade* —
 * navigation, exactly as the art direction requires category characters to
 * be distinguishable from live supply.
 *
 * A VENUE (`VenueLayer`) is the avatar of one real candidate the server
 * returned. It carries their name, it can be opened into their profile, and
 * it is drawn ONLY because that person exists and is eligible right now.
 *
 * Confusing the two would be the most expensive mistake available here: a
 * street of eleven permanent shopfronts read as eleven available
 * professionals would be manufactured supply on the most trusted screen in
 * the product. So a district never renders anything a candidate has — the
 * props here have nowhere to put a name.
 */
export interface DistrictLayerProps {
  /** The world's size. Districts are positioned as fractions of it. */
  width: number;
  height: number;
  /** What a building's size is a fraction of: the viewport. */
  sizeBasis?: number;
  sources?: WorldAssetSources;
  /** Which trade the customer is looking at, if any. The others go quiet. */
  activeDepartment?: DepartmentCode | null;
  onSelect?: (department: DepartmentCode) => void;
  /**
   * Draw only the districts standing within this band of depth.
   *
   * ---------------------------------------------------------------------
   * WHY A LAYER NEEDS TO BE SPLIT IN TWO
   * ---------------------------------------------------------------------
   * The customer's own figure walks this street, and until now it was
   * drawn last — over everything, including the shops it was standing
   * BEHIND. A figure that passes in front of a building further down the
   * road than itself is the clearest possible statement that the street
   * is a picture and the person is a sticker on it.
   *
   * Depth here is `v` and nothing else, exactly as it is for scale, so
   * the fix is to draw the districts further away than the walker, then
   * the walker, then the ones nearer than the walker. The caller mounts
   * this component twice with the two halves. Nothing about the
   * positions, the sizes or the sort order changes: the same list is
   * simply cut in one place.
   */
  vRange?: { min: number; max: number };
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

/*
 * A SHOPFRONT'S SHARE OF THE WORLD — not of the phone.
 *
 * This was 0.42 of the VIEWPORT, which meant a shop kept its size on screen
 * however far the camera pulled back. On the tracking shot, where the world
 * is about 1.25 screens across, that made one shop a third of the entire
 * neighbourhood: five of them filled the frame and collided with each other
 * and with the buildings painted on the plate. Amit: *"כל המכוניות
 * והבניינים והנסיעה מבולגנת ממש."*
 *
 * A building has a size in the world and the camera scales it with the
 * ground it stands on, which is what happens when you walk towards a real
 * shop. See `WORLD_SIZE`.
 */

export function DistrictLayer({
  width,
  height,
  sizeBasis,
  sources = EMPTY_ASSET_SOURCES,
  activeDepartment = null,
  onSelect,
  vRange,
}: DistrictLayerProps) {
  // `width` is the WORLD's width in points; a district's size is a share of
  // it. `sizeBasis` survives only for the callers that have not moved yet.
  const basis = sizeBasis ?? width;
  void basis;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Furthest first, so a near shop covers a far one rather than
          growing a hole in its roof. */}
      {[...DISTRICT_SITES]
        .map((site) => ({ site, at: districtCentre(site.department) }))
        .filter(({ at }) => !vRange || (at.v >= vRange.min && at.v < vRange.max))
        .sort((a, b) => depthOrder(a.at.v) - depthOrder(b.at.v))
        .map(({ site, at }) => {
          const district = WORLD_DISTRICTS[site.department];
          const scale = depthScale(at.v);
          const shape = shapeOf(district.venueAssetId);
          const w = width * WORLD_SIZE.district * scale;
          const faceShape = shapeOf(district.characterWorldAssetId);
          const h = w * shape.ratio;
          const dimmed = activeDepartment !== null && activeDepartment !== site.department;

          /*
           * NOTHING AT ALL UNTIL THE ART EXISTS.
           *
           * Amit: *"לא רוצה לראות את הריבועים הריקים."* I offered three
           * ways to fill the gap — nothing, a floating sign, or a soft
           * glow — and ChatGPT chose the first, for a reason worth keeping
           * written down: *"שלט בלי עסק נראה כמו תקלה, והילה כבר מתחילה
           * להמציא שפה ויזואלית שלא קיימת."*
           *
           * So a district with no file is not drawn, not marked, and not
           * hinted at. The world fills in as assets land. This is a
           * temporary state of the art pack and never a statement about
           * supply — LIVE SUPPLY does not depend on it in either direction.
           */
          if (!sources[district.venueAssetId]) return null;

          return (
            <View
              key={site.department}
              style={[
                styles.district,
                // Anchored at its own footing, not at the middle of its
                // bounding box: a 3/4 building is wider at the roof than at
                // the pavement, so centring stands it beside its own feet.
                { left: at.u * width - w * shape.anchorX, top: at.v * height - h, width: w },
                dimmed ? styles.dimmed : null,
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={onSelect ? () => onSelect(site.department) : undefined}
                disabled={!onSelect}
                accessibilityRole={onSelect ? "button" : "image"}
                /*
                 * The trade, and nothing else. No name, no count, no "זמין"
                 * — a landmark says what happens here, never who is free.
                 */
                accessibilityLabel={district.labelHe}
                style={{ width: w, height: h }}
              >
                <AssetSlot
                  placement={{
                    key: `district-${site.department}`,
                    assetId: district.venueAssetId,
                    item: {
                      id: district.venueAssetId,
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

              {/* The character of the trade, standing beside their place.
                  Navigation, not presence: this person is the sign for
                  "hair", not a hairdresser who is free right now. */}
              <View
                style={{
                  position: "absolute",
                  left: w * 0.74,
                  bottom: 0,
                  // The figure's own proportions, not a square: see
                  // VenueLayer for the letterboxing this fixes.
                  height: w * WORLD_SIZE.personOfVenue,
                  width: (w * WORLD_SIZE.personOfVenue) / faceShape.ratio,
                }}
                pointerEvents="none"
              >
                <AssetSlot
                  placement={{
                    key: `district-face-${site.department}`,
                    assetId: district.characterWorldAssetId,
                    item: {
                      id: district.characterWorldAssetId,
                      file: "",
                      intrinsicWidth: 1,
                      intrinsicHeight: 1,
                      anchor: { x: 0.5, y: 1 },
                      role: "PRESENCE",
                      theme: "SHARED",
                      defaultWidthRatio: 0.1,
                      critical: false,
                    },
                    layer: "PRESENCE",
                    left: 0,
                    top: 0,
                    width: (w * WORLD_SIZE.personOfVenue) / faceShape.ratio,
                    height: w * WORLD_SIZE.personOfVenue,
                    depthOrder: 0,
                  }}
                  sources={sources}
                  quiet
                  pending="none"
                />
              </View>

              {/*
                * NO LABEL UNDER THE BUILDING.
                *
                * A Hebrew chip used to float beneath each district. It
                * existed to name a trade whose art had not arrived — and a
                * district with no art is no longer drawn at all, so every
                * building on screen already carries its own sign, painted
                * into the artwork where a real shop's sign goes.
                *
                * The chip was therefore naming a shop that was already
                * named, in a second typeface, hanging below the pavement.
                * On Amit's screen it read as "PRO NOW שיער" hovering over a
                * pedestrian crossing. Nothing replaces it: the sign on the
                * shopfront IS the label, which is why the art carries it.
                */}
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  district: { position: "absolute", alignItems: "center" },
  /*
   * Quiet, not hidden: the rest of the neighbourhood stays visible while
   * one trade is being looked at, because knowing there is more is the
   * point.
   *
   * 0.45 was chosen against grey boxes and was far too low for artwork —
   * the other shops read as ghosts hovering over the street rather than as
   * buildings standing slightly back. 0.72 still recedes and still leaves
   * no doubt that they are solid.
   */
  dimmed: { opacity: 0.72 },
});
