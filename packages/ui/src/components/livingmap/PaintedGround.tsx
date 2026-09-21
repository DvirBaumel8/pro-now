import React, { useMemo } from "react";
import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";

import { type GeoBounds, metresToWorld } from "@pro-now/types";

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

export interface PaintedGroundProps {
  source: ImageSourcePropType;
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
  const tiles = useMemo(() => {
    const tileW = Math.max(1, metresToWorld(bounds, tileMetres) * width);
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
    const out: Array<{ key: string; left: number; top: number; size: number; flipX: boolean; flipY: boolean }> = [];
    // A hard cap, because a 4km extract at 108m a tile is 1,369 images.
    if (cols * rows > 400) return { tileW, out };
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
          left: c * tileW + shift,
          top: r * tileW,
          size: tileW,
          flipX: (c + r) % 2 === 1,
          flipY: r % 3 === 1,
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
          source={source}
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

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
