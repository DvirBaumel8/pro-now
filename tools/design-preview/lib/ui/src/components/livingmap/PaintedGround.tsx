import React, { useMemo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

import { type GeoBounds, metresToWorld } from "@pro-now/demo-types";

/**
 * THE PAINTED CITY, LAID ACROSS A REAL NEIGHBOURHOOD.
 *
 * ---------------------------------------------------------------------
 * WHY THE PLATE HAS TO REPEAT
 * ---------------------------------------------------------------------
 * Amit: *"איפה העולם הקסום שבנינו?"* — put the painting back. The first
 * attempt did exactly that and it was worse: the plate was stretched to
 * the whole extract, and since it depicts about a hundred metres of
 * street while the extract is six hundred, the screen filled with one
 * enormous paving slab and half a palm tree. A beautiful painting shown
 * at six times its own scale is a texture, not a city.
 *
 * So the plate is laid at ITS OWN SCALE — `TILE_METRES` of world per copy
 * — and repeated. A repeat is a compromise and it is the right one here:
 * at night, with the real street network carved through it and its own
 * lamps and trees on top, a repeated city block reads as a city block.
 * A single stretched one reads as a wall.
 *
 * Alternate columns and rows are mirrored, which costs nothing and breaks
 * the grid the eye would otherwise find immediately — the seam between
 * two identical tiles is obvious, the seam between a tile and its
 * reflection is not.
 */

/**
 * How much real ground one copy of the painting covers.
 *
 * The plate is drawn as roughly a hundred metres of street. Laying it at
 * 108 keeps its own shopfronts, trees and lamps at about life size, which
 * is what lets our 16m shopfronts stand among them without looking like
 * models.
 */
export const TILE_METRES = 108;

/**
 * The most images this will lay down.
 *
 * Not a hard refusal — see `tileW` below, which grows the tile instead of
 * giving up. 260 is about what a phone lays out without dropping the
 * frame the camera is mid-move on.
 */
const MAX_TILES = 260;

export interface PaintedGroundProps {
  /**
   * One plate, or a set of seamless material tiles.
   *
   * -------------------------------------------------------------------
   * WHY A SET, AND WHY MATERIAL RATHER THAN SCENE
   * -------------------------------------------------------------------
   * One plate repeated is a wallpaper: the eye finds the same palm and
   * the same bench every 108 metres, however the copies are flipped.
   * ChatGPT's answer was not "send more cities" but a change of kind:
   *
   *     "הייתי בונה ערכת חומר מודולרית ללא שום כביש: 4 tiles seamless של
   *      ground בלבד... בלי דקל, ספסל, פנס, מעבר חציה או אובייקט גדול
   *      שחוזר במיקום קבוע. ה-base tile צריך להיות חומר, לא סצנה."
   *
   * Which is right for a reason beyond repetition: the current plate has
   * a ROAD painted into it, and that painted road fights the real one
   * carved over it from the extract. A material has nothing to fight
   * with. The palms, lamps and benches then come back as props scattered
   * in code from a seed per tile — so the same corner always looks the
   * same, without the same corner appearing eight times.
   *
   * Several sources are chosen between per tile, deterministically.
   */
  source: ImageSourcePropType | readonly ImageSourcePropType[];
  bounds: GeoBounds;
  /** The world box, in points. */
  width: number;
  height: number;
  /** Override for callers that want a different painted scale. */
  tileMetres?: number;
}

export function PaintedGround({
  source,
  bounds,
  width,
  height,
  tileMetres = TILE_METRES,
}: PaintedGroundProps) {
  const set = useMemo(
    () => (Array.isArray(source) ? (source as ImageSourcePropType[]) : [source as ImageSourcePropType]),
    [source]
  );

  const tiles = useMemo(() => {
    /*
     * THE TILE GROWS RATHER THAN THE CITY GOING BARE.
     *
     * A fourteen-metre paving tile across a 620m extract is two thousand
     * images, and the first version answered that by returning NOTHING —
     * so the ground went black at exactly the zoom where the material
     * was supposed to be visible. A cap that produces an empty screen is
     * not a cap, it is a bug with a comment on it.
     *
     * So the tile is enlarged until the count fits. The texture gets
     * coarser on a big extract, which is the correct trade: at that zoom
     * you are reading a street plan, and paving grain is not what you
     * are reading.
     */
    const asked = Math.max(1, metresToWorld(bounds, tileMetres) * width);
    const area = Math.max(1, width * height);
    const smallest = Math.sqrt(area / MAX_TILES);
    const tileW = Math.max(asked, smallest);
    /*
     * SQUARE TILES IN POINTS, NOT IN WORLD UNITS.
     *
     * A metre is a metre on both axes once the world box is built at the
     * extract's aspect — see `metresToWorld`. Using the world's own
     * fraction on the v axis would stretch every copy of the painting by
     * the aspect ratio, which is the identical bug `PLATE_ASPECT` was
     * written to prevent, one layer up.
     */
    const cols = Math.ceil(width / tileW);
    const rows = Math.ceil(height / tileW);
    const out: Array<{
      key: string;
      left: number;
      top: number;
      size: number;
      flipX: boolean;
      flipY: boolean;
      variant: number;
    }> = [];
    /*
     * MIRRORING ALONE LEAVES AN AXIS OF SYMMETRY, AND THE EYE FINDS IT
     * IMMEDIATELY.
     *
     * Two mirrored copies side by side make a butterfly, and a grid of
     * them makes a wallpaper — which is exactly what the first tiled
     * build looked like: a beautiful city, obviously stamped. Offsetting
     * every other row by half a tile breaks the vertical seams into a
     * brick bond, and the flips then break the horizontal ones. One extra
     * column per odd row is the whole cost.
     */
    for (let r = 0; r < rows; r++) {
      const shift = r % 2 === 1 ? -tileW / 2 : 0;
      const wide = r % 2 === 1 ? cols + 1 : cols;
      for (let c = 0; c < wide; c++) {
        out.push({
          key: `${r}_${c}`,
          /*
           * WHOLE POINTS.
           *
           * A tile laid at x = 103.7 is resampled, and the resampling
           * darkens its first column by a fraction — which is invisible
           * on one tile and a faint grid across the whole city on two
           * hundred. Rounding costs a sub-point overlap and removes the
           * lines entirely.
           */
          left: Math.round(c * tileW + shift),
          top: Math.round(r * tileW),
          size: Math.ceil(tileW) + 1,
          flipX: (c + r) % 2 === 1,
          flipY: r % 3 === 1,
          /*
           * SEEDED BY THE TILE'S OWN COORDINATE, never by draw order.
           * The same corner of the city has to look the same every time
           * it is walked back to, and an index into a render list does
           * not survive the camera moving.
           */
          variant: variantFor(r, c),
        });
      }
    }
    return { tileW, out };
  }, [bounds, width, height, tileMetres]);

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      {tiles.out.map((t) => (
        <Image
          key={t.key}
          source={set[t.variant % set.length]!}
          style={{
            position: "absolute",
            left: t.left,
            top: t.top,
            width: t.size,
            height: t.size,
            transform: [{ scaleX: t.flipX ? -1 : 1 }, { scaleY: t.flipY ? -1 : 1 }],
          }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

/** A stable small integer per tile coordinate. */
function variantFor(row: number, col: number): number {
  let h = 2166136261 ^ (row * 73856093) ^ (col * 19349663);
  h = Math.imul(h ^ (h >>> 13), 16777619);
  return (h >>> 0) % 64;
}

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
