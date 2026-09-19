import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, customerTheme, palette, scale, type } from "../theme";

/**
 * PRO NOW, as a wordmark.
 *
 * Two words, two jobs, two colours — which is the whole brand argument in
 * four letters plus three. **PRO** is the promise that the person arriving
 * is a professional; **NOW** is the promise about when. Setting them in one
 * colour would make the name a label; setting them in two makes it a
 * sentence, and the coral half is the half that is hard to copy.
 *
 * The design review's first note on the home screen was that the mark was
 * "קטן מדי — לא עומד בהיררכיה". It was 15px of caption weight in a utility
 * row, which is where a wordmark goes when nobody has decided it matters.
 * `size="lead"` is the version that opens a screen.
 *
 * NOT AN IMAGE. A wordmark drawn in type stays crisp at every density,
 * recolours for the surface it lands on, and — the practical one — can be
 * changed on the day Amit settles the name, which is still open (`PRO NOW`
 * is marked WORKING, with `אצלך` and `קרוב` as live territories). Shipping
 * it as a PNG is how a working title becomes permanent by accident.
 */

export type BrandMarkSize = "lead" | "inline" | "small";

const SIZES: Record<BrandMarkSize, { fontSize: number; letterSpacing: number; gap: number }> = {
  lead: { fontSize: scale.section, letterSpacing: -0.4, gap: 6 },
  inline: { fontSize: scale.body, letterSpacing: -0.2, gap: 4 },
  small: { fontSize: scale.meta, letterSpacing: 0, gap: 3 },
};

export function BrandMark({
  size = "inline",
  tone = "dark",
}: {
  size?: BrandMarkSize;
  tone?: "light" | "dark";
}) {
  const s = SIZES[size];
  const word = tone === "dark" ? customerDarkTheme.colors.textPrimary : customerTheme.colors.textPrimary;

  return (
    <View
      style={[styles.row, { gap: s.gap }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel="PRO NOW"
    >
      {/*
        * LTR, deliberately. The mark is a Latin wordmark and must read
        * "PRO NOW" on a Hebrew screen — the same class of bug as the
        * verification code that rendered 4821 as "1 2 8 4" when it
        * inherited row-reverse from the screen around it.
        */}
      <Text
        style={[styles.word, { fontSize: s.fontSize, letterSpacing: s.letterSpacing, color: palette.signal500 }]}
      >
        PRO
      </Text>
      <Text style={[styles.word, { fontSize: s.fontSize, letterSpacing: s.letterSpacing, color: word }]}>
        NOW
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  word: { ...type.section, fontWeight: "800", writingDirection: "ltr" },
});
