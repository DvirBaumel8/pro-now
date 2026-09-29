import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, depth, palette, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { Pulse } from "./LiveServiceCard";

/**
 * "או בחרו קטגוריה" — the six doors under the capture field.
 *
 * WHY A GRID AND NOT THE LIST I BUILT FIRST. An earlier pass turned these
 * into a full-width list, on the reasoning that six equal rectangles read
 * as a menu. Amit rejected that screen outright, and looking at the two
 * side by side he is right and the reasoning was wrong.
 *
 * The list is correct for a CATALOGUE — thirty services you scan to find
 * one. It is wrong for six DEPARTMENTS, because six is not a list at all:
 * it is a shape you take in at a glance and never read. A 3-up grid shows
 * all six in the height of two list rows, which leaves the capture field
 * the top of the screen instead of pushing it up to make room for scrolling
 * that nobody needed.
 *
 * WHAT THE TILES ARE NOT. They are not cards in the §4 sense — they carry no
 * independent state and nothing inside them is separately actionable — so
 * they take no shadow and no border. They are a wash on the dark surface,
 * which is also what stops six of them reading as six raised objects (§3).
 *
 * The live dot is the only thing here that changes minute to minute, and it
 * appears only when the server says somebody in that department is
 * genuinely reachable. Zero is absent rather than "0 פנויים" — a number
 * that makes a whole department look dead when it is merely quiet.
 */

const colors = customerDarkTheme.colors;

export interface CategoryTile {
  id: string;
  nameHe: string;
  mark: MarkName;
  /** Services in this department with someone reachable now. */
  liveCount?: number;
}

export interface CategoryGridProps {
  tiles: CategoryTile[];
  width: number;
  /** Appended as a final tile when there are more departments than shown. */
  moreLabelHe?: string | null;
  onSelect?: (id: string) => void;
  onMore?: () => void;
}

export function CategoryGrid({ tiles, width, moreLabelHe, onSelect, onMore }: CategoryGridProps) {
  const cols = 3;
  const gap = spacing.md;
  const tileW = (width - gap * (cols - 1)) / cols;

  return (
    <View style={[styles.grid, { width, gap }]}>
      {tiles.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onSelect?.(t.id)}
          accessibilityRole="button"
          accessibilityLabel={
            t.liveCount ? `${t.nameHe}, ${t.liveCount === 1 ? "פנוי אחד" : `${t.liveCount} פנויים`} עכשיו` : t.nameHe
          }
          style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
        >
          <View style={styles.markWrap}>
            <Mark name={t.mark} size={23} color={colors.textPrimary} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {t.nameHe}
          </Text>
          {t.liveCount ? (
            <View style={styles.live}>
              <Pulse color={palette.signal500} size={5} />
            </View>
          ) : null}
        </Pressable>
      ))}

      {moreLabelHe ? (
        <Pressable
          onPress={onMore}
          accessibilityRole="button"
          accessibilityLabel={moreLabelHe}
          style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
        >
          <View style={styles.markWrap}>
            <Text style={styles.dots}>•••</Text>
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {moreLabelHe}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  /*
   * RAISED, the only way a dark surface can be. A flat 6%-white wash is a
   * different colour, not a different height, and six of them read as a
   * single grey field with icons in it. The fill steps up and the top edge
   * catches a hairline of light, which is what makes a dark tile look like
   * an object rather than a region.
   */
  tile: {
    minHeight: 106,
    borderRadius: radii.lg,
    backgroundColor: depth.panel.mid,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    ...depth.litEdge(0.07),
  },
  pressed: { backgroundColor: depth.panel.high },
  markWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: tint.neutralDark(0.07),
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...type.meta,
    color: colors.textPrimary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 17,
  },
  dots: { ...type.section, color: colors.textPrimary, lineHeight: 26 },
  live: { position: "absolute", top: spacing.md, left: spacing.md },
});
