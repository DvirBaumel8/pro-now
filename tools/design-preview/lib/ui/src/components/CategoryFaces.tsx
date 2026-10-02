import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CUSTOMER_CATEGORIES, categoryFaces, type CustomerCategory } from "@pro-now/demo-types";

import { customerDarkTheme, depth, radii, spacing, tint, type } from "../theme";
import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "./livingmap/AssetSlot";

/**
 * THE WAYS IN, AS PEOPLE.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS WRONG WITH THE GRID THIS REPLACES
 * ---------------------------------------------------------------------
 * Amit, looking at the home screen: *"גם העמוד הזה וההצעות האלה מזה
 * קשור."* Two complaints in one line, and this component answers the first.
 *
 * The old grid had six tiles carrying outline icons — a broom, an air
 * conditioner, a length of pipe, a cardboard box, and one reading "···"
 * for *more categories*. Three faults, and none of them is decoration:
 *
 *   1. **The icons say nothing about this product.** A broom means
 *      cleaning in any app ever made. Our whole language is a world with
 *      people in it, and the front door was drawn in a different one.
 *   2. **"עוד קטגוריות" is a catalogue admitting it is a catalogue.** A
 *      tile whose content is "there is more of this" is the index Amit
 *      rejected, wearing a rounded rectangle.
 *   3. **The groups were ours, not the customer's.** "תיקונים בבית",
 *      "מכשירי חשמל" and "עזרה ועבודות קטנות" are three dispatch worlds
 *      and one human thought: *something in my flat needs a person.*
 *
 * So: eight ways in, grouped the way somebody thinks at eleven at night
 * (see `customer-categories.ts`), each wearing the face of the professional
 * who does that work. Amit: *"והכי חשוב: הקטגוריות עצמן יהיו הדמויות שלנו,
 * לא אייקונים גנריים."*
 *
 * ---------------------------------------------------------------------
 * THESE ARE NOT PROFESSIONALS
 * ---------------------------------------------------------------------
 * The hard part, and it is enforced rather than remembered. A drawn person
 * on a tile is one step away from reading as somebody who is available —
 * so a category face carries no name, no rating, no ETA and no availability
 * dot, ever. Those belong only to a candidate the server returned.
 *
 * The prop types make it impossible rather than discouraged: there is no
 * field here to put a name in. If that ever needs to change, it should be
 * hard.
 */
const colors = customerDarkTheme.colors;

export interface CategoryFacesProps {
  width: number;
  categories?: readonly CustomerCategory[];
  /** Character art, as far as it exists. Missing draws an honest slot. */
  sources?: WorldAssetSources;
  onSelect?: (categoryId: string) => void;
  /**
   * Which category the world is currently showing, if any. Purely a
   * highlight — it says where the camera is, never anything about supply.
   */
  activeCategoryId?: string | null;
}

export function CategoryFaces({
  width,
  categories = CUSTOMER_CATEGORIES,
  sources = EMPTY_ASSET_SOURCES,
  onSelect,
  activeCategoryId,
}: CategoryFacesProps) {
  /*
   * TWO COLUMNS, NOT THREE.
   *
   * Three columns is what turned the last version into an icon grid: at
   * 390pt each tile was 110 wide, which is too small for a person to read
   * as a person, so the art had to become a glyph. Two columns give a face
   * enough room to have a face — and eight tiles in two columns is four
   * rows, which is a short screen rather than a catalogue.
   */
  const gap = spacing.md;
  const tile = (width - gap) / 2;

  return (
    <View style={[styles.grid, { width, gap }]}>
      {categories.map((c) => {
        const active = activeCategoryId === c.id;
        const faces = categoryFaces(c);

        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect?.(c.id)}
            accessibilityRole="button"
            // The label is the trade and nothing else. No "available", no
            // count: this control navigates, it does not report.
            accessibilityLabel={c.labelHe}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.tile,
              { width: tile },
              active ? styles.tileActive : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {/*
              * A SIZED BOX FOR AN ABSOLUTELY POSITIONED SLOT.
              *
              * `AssetSlot` positions itself absolutely from its placement —
              * correct inside the world, where everything is composed
              * against one box, and wrong inside a flow layout, where it
              * takes no space and spills out of its tile. The first build
              * of this grid showed exactly that: grey placeholder
              * rectangles hanging outside the rounded corners and
              * overlapping the tile below.
              *
              * So the slot gets a box of its own, the same size as the
              * placement it was given.
              */}
            {/*
              * The face gets room ONLY when there is a face. An empty
              * 0.56-square box left a hole above every label — a tile that
              * looks like it failed to load rather than one that is simply
              * typographic for now.
              */}
            <View
              style={[
                styles.face,
                sources[faces.portraitAssetId]
                  ? { width: tile * 0.56, height: tile * 0.56 }
                  : styles.faceAbsent,
              ]}
            >
              <AssetSlot
                placement={{
                  key: `face-${c.id}`,
                  assetId: faces.portraitAssetId,
                  item: {
                    id: faces.portraitAssetId,
                    file: "",
                    intrinsicWidth: 1,
                    intrinsicHeight: 1,
                    anchor: { x: 0.5, y: 1 },
                    role: "PRESENCE",
                    theme: "SHARED",
                    defaultWidthRatio: 0.4,
                    critical: false,
                  },
                  layer: "PRESENCE",
                  left: 0,
                  top: 0,
                  width: tile * 0.56,
                  height: tile * 0.56,
                  depthOrder: 0,
                }}
                sources={sources}
                quiet
                /*
                 * NO GREY BOX ON THE HOME SCREEN.
                 *
                 * Amit: *"גם הריבועים האלה מתים."* The placeholder is
                 * deliberately ugly so nobody mistakes it for a design, and
                 * that is right inside a developer gallery. Eight of them
                 * in the middle of the screen customers land on is the
                 * opposite: it makes the product look unfinished at the one
                 * moment it has to look like a product.
                 *
                 * So the face is simply absent until its file arrives, and
                 * the tile below is built to read well without it.
                 */
                pending="none"
              />
            </View>

            <Text style={styles.label} numberOfLines={1}>
              {c.labelHe}
            </Text>
            <Text style={styles.note} numberOfLines={1}>
              {c.noteHe}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row-reverse", flexWrap: "wrap" },
  tile: {
    borderRadius: radii.lg,
    minHeight: 96,
    justifyContent: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    backgroundColor: depth.panel.mid,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.07)",
    // Depth from light rather than shadow: a dark shadow on near-black is
    // nothing at all, which is why the first dark build sat perfectly flat.
    ...depth.litEdge(0.06),
  },
  tileActive: { borderColor: tint.trust(0.55), backgroundColor: depth.panel.high },
  pressed: { opacity: 0.85 },
  face: { position: "relative", overflow: "hidden", marginBottom: spacing.sm, borderRadius: radii.md },
  faceAbsent: { width: 0, height: 0, marginBottom: 0 },
  label: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl", textAlign: "center" },
  note: {
    ...type.micro,
    color: colors.textSecondary,
    writingDirection: "rtl",
    textAlign: "center",
    marginTop: 2,
  },
});
