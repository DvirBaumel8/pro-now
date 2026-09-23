import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { WELCOME_VIEW } from "@pro-now/types";

import { customerDarkTheme, depth, palette, radii, scale, spacing, tint, type } from "../theme";
import { lex } from "../lexicon";
import { ShieldCheckMark } from "../components/marks";
import { Scrim } from "../components/Scrim";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { type WorldAssetSources } from "../components/livingmap/AssetSlot";

/**
 * C00 — the first screen anyone sees.
 *
 * ---------------------------------------------------------------------
 * WHY THIS WAS REBUILT
 * ---------------------------------------------------------------------
 * Amit, looking at the previous version on his phone:
 *
 *     "גם העמוד הזה לא ברמה בכלל של מה שעשינו עד עכשיו."
 *
 * He is right, and it is worth being precise about how, because "make it
 * nicer" would have produced a nicer version of the same wrong screen.
 * Three specific faults:
 *
 *   1. **It was made of different material.** Every screen after it is the
 *      night world with depth and something moving in it. This one was flat
 *      ivory with two faint decorative arcs. A first screen that does not
 *      look like the product is a first screen that promises a different
 *      product.
 *   2. **The vertical space was not composed, it was left over.** A
 *      `space-between` column with three blocks put a headline at the top, a
 *      row of faces floating in the middle of nothing, and the buttons at
 *      the bottom, with two large voids between them. On a tall phone those
 *      voids were a third of the screen.
 *   3. **The faces were invented.** A stack of five illustrated strangers
 *      above the line "מי שמגיע אליך — מאומת לשירות שביקשת" reads as five
 *      professionals. Nobody has signed up yet. That is precisely the kind
 *      of manufactured supply §3 forbids, and it is also the "generic
 *      avatars" both Amit and the art direction rejected for the
 *      categories.
 *
 * ---------------------------------------------------------------------
 * WHAT IT IS NOW
 * ---------------------------------------------------------------------
 * The neighbourhood, drifting, with the promise and the two doors resting
 * on it under a scrim. One composition rather than three stacked blocks:
 * the world occupies the screen, the text sits low where a gradient makes
 * it legible, and the doors are the last thing above the thumb.
 *
 * The copy makes exactly one promise, the only one the product can keep:
 * someone verified, who is available now, comes to you. Not "the best",
 * not "the cheapest", not "in minutes" — the first two are unprovable and
 * the third depends on a professional who has not accepted yet.
 *
 * Two doors, the same size, because supply is the constraint: the person
 * who installed this in order to *work* is not a footnote.
 */

const colors = customerDarkTheme.colors;

export interface WelcomeBodyProps {
  /**
   * Kept for call-site compatibility and deliberately unused.
   *
   * It used to feed a stack of illustrated faces. Nothing on this screen
   * depicts a professional any more, invented or otherwise — the world
   * behind is the atmosphere, and the only claim made in words is the one
   * about verification, which is true of the process rather than about any
   * particular person.
   */
  castSeeds?: string[];
  /** The world art, as far as it exists. Absent draws the night sky. */
  worldSources?: WorldAssetSources;
  animate?: boolean;
  onCustomer?: () => void;
  onProfessional?: () => void;
  width?: number;
  height?: number;
}

export function WelcomeBody({
  worldSources,
  animate = true,
  onCustomer,
  onProfessional,
  width = 390,
  height = 780,
}: WelcomeBodyProps) {
  return (
    <View style={[styles.screen, { width, height }]}>
      {/*
        * Looking at the shops, not at the road.
        *
        * Amit: *"סתם נראה רחוב רגיל."* The backdrop was centred on the
        * world and the middle of this neighbourhood is a junction, so the
        * first screen in the product opened on tarmac. `WELCOME_VIEW` is
        * the stretch of the main street with three trades on it, and a
        * test fails if a layout change ever empties it.
        */}
      {/*
        * THE HERO PLATE, WHICH IS NOT THE LIVE WORLD.
        *
        * Amit: *"איפה התמונה שמלמדת על מה האפליקציה?"* A fair question with
        * an answer I caused. The live map's ground deliberately carries NO
        * PRO NOW shopfronts: there, every shop is a real candidate the
        * server returned, so a painted-in salon would be a business that
        * exists whether or not anybody is online.
        *
        * That reasoning does not apply here. This screen runs no search,
        * has no candidates and makes no claim about supply — it is a
        * picture of the world PRO NOW happens in. So it takes its own
        * plate, the one with our shopfronts in it, and says in one image
        * what the product is.
        *
        * `welcome_hero` falls back to the clean neighbourhood until that
        * file lands, which is why this screen currently shows a street with
        * no signs on it.
        */}
      <WorldBackdrop
        width={width}
        height={height}
        sources={worldSources}
        animate={animate}
        groundAssetId="welcome_hero"
        /*
         * NO CLOCK ON THIS ONE. The hero is composed art behind a headline
         * and two doors — a poster, not a place — and washing a poster
         * blue at midnight reads as the image failing to load rather than
         * as night. The world's own hour starts once you are inside it.
         */
        daylight={false}
        fallbackGroundAssetId="world_neighbourhood"
        focus={WELCOME_VIEW.focus}
      />

      {/*
        * THE SCRIM.
        *
        * One gradient, not three stacked panels. The stacked version left
        * two hard horizontal lines across the artwork where the bands met
        * — visible immediately in a screenshot and invisible in the code,
        * which is the worst combination. See `Scrim`.
        */}
      <Scrim width={width} height={height} />

      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[styles.content, { minHeight: height }]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.brand}>PRO NOW</Text>

        {/* The promise sits low, on the solid part of the scrim, so the
            world above it is never something to read through. */}
        <View style={styles.promise}>
          <Text style={styles.headline}>
            מקצוען מאומת,{"\n"}שבא עכשיו.
          </Text>
          <Text style={styles.sub}>
            לא אינדקס ולא הצעות מחיר. שולחים קריאה, ומי שפנוי ומאושר לעבודה הזו יוצא אליכם.
          </Text>

          <View style={styles.trustRow}>
            <ShieldCheckMark size={15} color={colors.trust} />
            <Text style={styles.trustText}>{lex.trustNote}</Text>
          </View>
        </View>

        <View style={styles.doors}>
          <Pressable
            onPress={onCustomer}
            accessibilityRole="button"
            accessibilityLabel="אני צריך מקצוען — שליחת קריאה עכשיו"
            style={({ pressed }) => [styles.door, styles.doorPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.doorPrimaryTitle}>אני צריך מקצוען</Text>
            <Text style={styles.doorPrimarySub}>שליחת קריאה עכשיו</Text>
          </Pressable>

          <Pressable
            onPress={onProfessional}
            accessibilityRole="button"
            accessibilityLabel="אני בעל מקצוע — הרשמה וקבלת עבודות באזור שלך"
            style={({ pressed }) => [styles.door, styles.doorSecondary, pressed && styles.pressed]}
          >
            <Text style={styles.doorSecondaryTitle}>אני בעל מקצוע</Text>
            <Text style={styles.doorSecondarySub}>הרשמה וקבלת עבודות באזור שלך</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.night900, overflow: "hidden", borderRadius: radii.xl },


  /*
   * ONE COLUMN, PUSHED DOWN.
   *
   * `justifyContent: flex-end` with the brand pinned above it, instead of
   * `space-between` across three blocks. The difference is that empty space
   * now collects in ONE place — above the headline, where it is sky — never
   * in the middle of the content, where it read as a missing section.
   */
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: "flex-end",
    flexGrow: 1,
  },

  brand: {
    ...type.overline,
    color: palette.signal300,
    letterSpacing: 2,
    textAlign: "right",
    position: "absolute",
    top: spacing.xxl,
    right: spacing.xl,
  },

  promise: { alignItems: "flex-end" },
  headline: {
    ...type.displayXL,
    fontSize: scale.hero,
    lineHeight: 48,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  sub: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 23,
  },
  trustRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  trustText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  doors: { marginTop: spacing.xxl, gap: spacing.md },
  door: { borderRadius: radii.lg, paddingVertical: spacing.lg, minHeight: 72, justifyContent: "center", alignItems: "center" },
  doorPrimary: { backgroundColor: colors.action },
  doorPrimaryTitle: { ...type.h3, color: colors.onAction, writingDirection: "rtl" },
  doorPrimarySub: { ...type.caption, color: "rgba(23,18,31,0.72)", writingDirection: "rtl" },
  // A lit edge rather than a shadow: on near-black a dark shadow is nothing
  // at all, which is why the old light build's panels sat perfectly flat.
  doorSecondary: { backgroundColor: depth.panel.mid, borderWidth: 1, borderColor: tint.trust(0.4), ...depth.litEdge(0.08) },
  doorSecondaryTitle: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  doorSecondarySub: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  pressed: { opacity: 0.85 },
});
