import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette, radii, spacing, type } from "../../theme";
import { SIGN_MIN_WIDTH, signFontSize } from "./signStyle";

export { SIGN_MIN_WIDTH, signAccent } from "./signStyle";

/**
 * THE NAME OVER THE DOOR.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit, more than once and most recently in one sentence: *"חשוב חשוב
 * שלכל בעל מקצוע יהיה את בית העסק שלו, כמה שיותר ברור."*
 *
 * The world already drew a shop per candidate, and it still did not say
 * that. Three plumbers online produced three copies of `district_home.webp`
 * standing in three places — the same painted sign, "PRO NOW תיקונים", on
 * all of them. The art says which TRADE the shop belongs to. Nothing on the
 * street said whose business it was, and the only way to find out was to
 * tap one and read a card that covered the shop you had just tapped.
 *
 * So every venue now carries its professional's own name, painted on it,
 * all the time. That is what turns a row of identical shopfronts into a
 * street of different businesses, and it is the whole of what Amit is
 * asking for.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A SIGN AND NOT A LABEL
 * ---------------------------------------------------------------------
 * A floating text label over a building reads as a map pin — annotation
 * ABOUT the world rather than something IN it. The point here is the
 * opposite: this is the shop's own signage, so it sits on the building, it
 * takes the building's perspective scale, and it goes dark and quiet when
 * the camera pulls away, the way a real sign does.
 *
 * ---------------------------------------------------------------------
 * WHAT IT MAY AND MAY NOT SAY
 * ---------------------------------------------------------------------
 * The name, and nothing else. No rating, no distance, no "available now",
 * no price. Those belong to the card that opens when somebody chooses to
 * look — a sign that advertises availability would be making a claim about
 * supply on a building, which is the one thing the world is not allowed to
 * do (/CLAUDE.md §3). The sign says whose place this is. That is all a real
 * sign says.
 *
 * It also disappears rather than shrinking into a smear: below the size
 * where the name can actually be read, an unreadable sign is noise on every
 * shop at once.
 */

export interface ShopSignProps {
  /** The professional's own name, from the server. Never a placeholder. */
  nameHe: string;
  /** The shop's drawn width in points; the sign takes its scale from it. */
  shopWidth: number;
  /**
   * The colour of this business's awning.
   *
   * Derived from the candidate's id rather than chosen, so the same
   * professional keeps the same colour between renders and two of them
   * standing side by side are told apart before anybody reads a word. It
   * means nothing else: not a rank, not a price band, not a speciality.
   */
  accent: string;
  /** Dimmed while another shop is the one being looked at. */
  quiet?: boolean;
}

export function ShopSign({ nameHe, shopWidth, accent, quiet = false }: ShopSignProps) {
  if (shopWidth < SIGN_MIN_WIDTH) return null;

  // Scaled to the building, within bounds. See `signFontSize`.
  const fontSize = signFontSize(shopWidth);

  return (
    <View
      /*
       * A NAME IS USUALLY WIDER THAN ITS SHOP.
       *
       * Clamped to the building's own width, "דוגמה ט׳ (תצוגה)" came back
       * as "דוגמה ט׳ (ת…" — a sign that truncates the one thing it exists
       * to say. A real nameplate overhangs its doorway, so this one may be
       * a little wider than the shopfront and never narrower than a name.
       */
      style={[styles.sign, { maxWidth: Math.max(shopWidth * 1.15, 104) }, quiet ? styles.quiet : null]}
      pointerEvents="none"
    >
      {/* The awning stripe: the one thing that differs between two shops of
          the same trade before you read either name. */}
      <View style={[styles.stripe, { backgroundColor: accent }]} />
      <Text style={[styles.name, { fontSize }]} numberOfLines={1}>
        {nameHe}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sign: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    // Dark enough to carry white type over a lit shopfront at dusk, and
    // translucent enough to read as painted on rather than pasted over.
    backgroundColor: "rgba(12,9,16,0.86)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(247,243,250,0.16)",
  },
  quiet: { opacity: 0.55 },
  stripe: { width: 4, alignSelf: "stretch", borderRadius: 2 },
  name: {
    ...type.captionStrong,
    color: palette.nightText,
    writingDirection: "rtl",
    flexShrink: 1,
  },
});
