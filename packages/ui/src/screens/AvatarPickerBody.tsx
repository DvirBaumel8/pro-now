import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AVATARS, type AvatarChoice, type AvatarOption } from "@pro-now/types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { BackButton } from "../components/BackButton";
import { customerDarkTheme, depth, radii, spacing, type } from "../theme";

/**
 * C02b — WHO WALKS DOWN THE STREET.
 *
 * ---------------------------------------------------------------------
 * WHY THIS SCREEN EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"אני רוצה שהלקוח יגדיר לעצמו אווטאר בהתחלה... ואיתו הוא יטייל בין
 * העסקים, וכל החוויה תהיה דרך האווטאר של הלקוח... פשוט ממש, שלוקח 20
 * שניות עד דקה, שלא ידלגו — לא חובה."*
 *
 * Until now the customer was a camera hovering over a neighbourhood. They
 * could look at the world; they were not in it. This is what puts them in
 * it, and it is the difference between a map with objects on it and the
 * thing Amit keeps asking for.
 *
 * ---------------------------------------------------------------------
 * ONE SCREEN, ONE TAP
 * ---------------------------------------------------------------------
 * Twenty seconds is the whole specification and it rules out almost
 * everything a character creator normally has. No sliders. No separate
 * skin tone. No hair step. Not even a question about gender — showing all
 * twelve and letting somebody point at themselves is both faster and less
 * presumptuous than asking first and filtering.
 *
 * So: a grid of finished people, one tap marks, one button continues.
 *
 * ---------------------------------------------------------------------
 * AND IT IS SKIPPABLE, VISIBLY
 * ---------------------------------------------------------------------
 * Amit was explicit that it is not mandatory, and a skip that hides in a
 * corner is mandatory with extra steps. It is a plain control, and taking
 * it is a real end state rather than a deferral: `null` is how most
 * customers will arrive at the world for a long time, and every screen
 * downstream is built to draw nothing rather than to invent somebody.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS IS NOT
 * ---------------------------------------------------------------------
 * Not identity. The professional who knocks on the door is never shown
 * this — being handed a picture of who to expect is a safety problem, not
 * a feature — and the types have nowhere to put a name. The labels here
 * describe the DRAWING, for the accessibility layer, and never the person.
 */

const colors = customerDarkTheme.colors;

export interface AvatarPickerBodyProps {
  /** What they picked last time, so returning shows their own choice. */
  value?: AvatarChoice;
  options?: readonly AvatarOption[];
  /** Art, as far as it has arrived. Missing draws nothing — never a box. */
  sources?: WorldAssetSources;
  onChoose?: (id: AvatarChoice) => void;
  /** Taking this is a real answer, not a postponement. */
  onSkip?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function AvatarPickerBody({
  value = null,
  options = AVATARS,
  sources = EMPTY_ASSET_SOURCES,
  onChoose,
  onSkip,
  onBack,
  width = 390,
  height = 780,
}: AvatarPickerBodyProps) {
  const [picked, setPicked] = useState<AvatarChoice>(value);

  /*
   * THREE ACROSS.
   *
   * Four makes each face too small to tell apart at arm's length, which
   * turns choosing into squinting. Two makes twelve options into four rows
   * and a scroll, and a picker you have to scroll is not a twenty-second
   * picker. Three is the only count that fits twelve on one screen with
   * faces still readable.
   */
  const gutter = spacing.lg;
  const gap = spacing.md;
  const cell = (width - gutter * 2 - gap * 2) / 3;

  /*
   * Whether any art has arrived at all.
   *
   * Until it has, this screen shows named tiles rather than twelve empty
   * squares — the grey-box placeholder is right in a developer gallery and
   * wrong on the second screen a customer ever sees.
   */
  const hasArt = options.some((o) => sources[o.portraitAssetId]);

  return (
    <View style={[styles.screen, { width, height }]}>
      {onBack ? <BackButton onPress={onBack} tone="dark" /> : null}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>מי מטייל ברחוב?</Text>
        <Text style={styles.lede}>
          בחרו דמות שתלווה אתכם בין העסקים. אפשר לשנות בכל רגע, ואפשר גם בלי.
        </Text>

        <View style={[styles.grid, { gap }]}>
          {options.map((o) => {
            const on = picked === o.id;
            return (
              <Pressable
                key={o.id}
                onPress={() => setPicked(on ? null : o.id)}
                accessibilityRole="button"
                // The drawing, never the person. See the header.
                accessibilityLabel={o.labelHe}
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [
                  styles.cell,
                  { width: cell, height: cell * 1.18 },
                  on ? styles.cellOn : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                {hasArt ? (
                  <AssetSlot
                    placement={{
                      key: `avatar-${o.id}`,
                      assetId: o.portraitAssetId,
                      item: {
                        id: o.portraitAssetId,
                        file: "",
                        intrinsicWidth: 1,
                        intrinsicHeight: 1,
                        anchor: { x: 0.5, y: 1 },
                        role: "PRESENCE",
                        theme: "SHARED",
                        defaultWidthRatio: 1,
                        critical: false,
                      },
                      layer: "PRESENCE",
                      left: 0,
                      top: 0,
                      width: cell,
                      height: cell * 1.18,
                      depthOrder: 0,
                    }}
                    sources={sources}
                    quiet
                    pending="none"
                  />
                ) : (
                  /*
                   * WAITING, AND SAYING SO ONCE.
                   *
                   * Twelve grey rectangles on the second screen a customer
                   * sees would read as an app that failed to load. A number
                   * in a frame reads as a set of people that has not been
                   * drawn yet, which is the truth.
                   */
                  <Text style={styles.waiting}>{o.labelHe}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.foot}>
        <Pressable
          onPress={() => onChoose?.(picked)}
          disabled={picked === null}
          accessibilityRole="button"
          accessibilityLabel="אישור הדמות"
          style={({ pressed }) => [
            styles.cta,
            picked === null ? styles.ctaOff : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.ctaText}>{picked === null ? "בחרו דמות" : "זו אני/אני זה"}</Text>
        </Pressable>

        {/*
          * A PLAIN CONTROL, NOT A WHISPER.
          *
          * Amit said it is not mandatory. A skip hidden in a corner is
          * mandatory with extra steps, and the people most likely to want
          * it are the ones least likely to hunt for it.
          */}
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="המשך בלי דמות"
            style={styles.skip}
          >
            <Text style={styles.skipText}>דלג כרגע</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden" },
  scroll: { paddingTop: spacing.xxl, paddingBottom: spacing.xl, gap: spacing.md },
  title: { ...type.h1, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  lede: { ...type.body, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },

  grid: { flexDirection: "row-reverse", flexWrap: "wrap", marginTop: spacing.md },
  cell: {
    borderRadius: radii.lg,
    backgroundColor: depth.panel.mid,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellOn: { borderColor: colors.action, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  waiting: { ...type.caption, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl" },

  foot: { padding: spacing.lg, gap: spacing.sm },
  cta: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...type.bodyStrong, color: "#17121F" },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  skipText: { ...type.captionStrong, color: colors.textSecondary, writingDirection: "rtl" },
});
