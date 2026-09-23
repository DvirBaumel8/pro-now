import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

import { customerDarkTheme, customerTheme, radii, spacing, tint, type } from "../theme";

/**
 * THE WAY BACK.
 *
 * ---------------------------------------------------------------------
 * WHY THIS COMPONENT EXISTS
 * ---------------------------------------------------------------------
 * Amit, reviewing on his phone:
 *
 *     "איך חוזרים אחורה במסכים של הלקוח?? כל עמוד שאני נכנס אין לי חץ חזרה."
 *
 * He is right twice over, and the second way is the one that matters.
 *
 * The obvious reading is that the control was missing. On five customer
 * routes it genuinely was. But on the screens that DID have one, he still
 * could not find it — and that is the more serious failure, because a
 * control nobody can see is worse than an absent one: the absent control at
 * least tells you the truth about where you are.
 *
 * What was there was a bare `›` character, weight 300, painted in
 * `textSecondary`, on no background, in a 44pt box with nothing to mark its
 * edges. On a desk monitor at 200% that is a back arrow. On a phone, held
 * at arm's length, in a bright room, it is a speck of punctuation. It also
 * moved around: absolute top-right on four screens, `alignSelf: flex-start`
 * with a negative margin — the LEFT edge — on two others. A right-pointing
 * chevron sitting on the left of an RTL screen is not a small
 * inconsistency; it is pointing at the wrong door.
 *
 * So: one component, one position, one appearance, everywhere.
 *
 * ---------------------------------------------------------------------
 * THE THREE DECISIONS
 * ---------------------------------------------------------------------
 * 1. **It is drawn, not typed.** `›` is a font glyph, and its weight,
 *    width and vertical centring change with every fallback font the device
 *    picks — which on Hebrew Android is not the font anyone tested. An SVG
 *    path is the same stroke on every handset.
 *
 * 2. **It has a surface.** A filled chip with a hairline edge. The chip is
 *    what makes it findable in peripheral vision — the eye looks for an
 *    object, not for a line. This is also why it is not a "minimal" bare
 *    arrow: minimal is a style for interfaces people already know how to
 *    use, and nobody has used this one before.
 *
 * 3. **It points the way the reader came from.** Hebrew runs right to
 *    left, so forward is leftward and back is rightward: the chevron points
 *    RIGHT and sits at the RIGHT edge, where the thumb of a right-handed
 *    reader already rests and where the eye starts the line. The direction
 *    and the position agree, which is the part that was broken.
 */

export interface BackButtonProps {
  onPress?: () => void;
  tone?: "light" | "dark";
  /**
   * The word beside the chevron.
   *
   * Absent by default — the chip alone carries it on dense screens. Given a
   * label ("ביטול הבקשה"), this becomes a pill, for the cases where going
   * back is not a neutral navigation but a decision with a consequence.
   */
  labelHe?: string | null;
  /** Announced to a screen reader. Defaults to the label, then "חזרה". */
  accessibilityLabelHe?: string;
  /**
   * `absolute` pins it to the top-right of the nearest positioned parent,
   * which is what most screens want. `inline` lets it sit inside a row the
   * screen is already laying out.
   */
  placement?: "absolute" | "inline";
  /**
   * TRUE WHEN THERE IS A PICTURE BEHIND IT.
   *
   * Amit, standing inside the Lust shop: *"אין פה כפתור חזור."* There
   * was one. It is a translucent dark disc, and it was sitting on a
   * photograph of a brightly lit shop — so it vanished. I had to hunt
   * for it in a screenshot myself.
   *
   * The chip was designed for the app's own surfaces, and every surface
   * in this product was a flat colour until we started putting
   * full-bleed artwork behind it. A wash that reads as "a control" on a
   * near-black panel reads as "a smudge on the glass" on a lit
   * interior, and a control nobody can see is the same as no control.
   *
   * So a screen that puts art behind this says so, and the chip becomes
   * opaque with a brighter edge — a real button rather than a tint of
   * whatever happens to be underneath. Not the default, because on the
   * app's own surfaces the solid version is heavier than it needs to be.
   */
  onArtwork?: boolean;
}

export function BackButton({
  onPress,
  tone = "dark",
  labelHe = null,
  accessibilityLabelHe,
  placement = "absolute",
  onArtwork = false,
}: BackButtonProps) {
  const colors = tone === "dark" ? customerDarkTheme.colors : customerTheme.colors;
  /*
   * Over artwork the chip stops being a tint and becomes an object: a
   * near-opaque ink disc with a light rim, legible on a night street and
   * on a shop lit like a jeweller's window alike. The chevron is forced
   * light there for the same reason — `colors.textPrimary` follows the
   * TONE, and the tone describes the app's surface, not the photograph
   * somebody put behind it.
   */
  const wash = onArtwork
    ? "rgba(16,11,22,0.86)"
    : tone === "dark"
      ? tint.neutralDark(0.1)
      : tint.neutralLight(0.06);
  const edge = onArtwork
    ? "rgba(247,243,250,0.55)"
    : tone === "dark"
      ? "rgba(247,243,250,0.16)"
      : "rgba(23,18,31,0.1)";
  const ink = onArtwork ? "#F7F3FA" : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabelHe ?? labelHe ?? "חזרה"}
      /*
       * The hit area is the whole chip plus its padding, and never smaller
       * than 44 — the one number in this file that is not a matter of
       * taste.
       */
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        placement === "absolute" ? styles.absolute : null,
        labelHe ? styles.pill : styles.round,
        { backgroundColor: wash, borderColor: edge },
        pressed ? styles.pressed : null,
      ]}
    >
      <Chevron color={ink} />
      {labelHe ? (
        <Text style={[styles.label, { color: ink }]} numberOfLines={1}>
          {labelHe}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * A right-pointing chevron, drawn.
 *
 * Optically centred rather than geometrically: a chevron balanced on the
 * box's centre line reads as sitting slightly too far back, because the
 * mass of the shape is at its elbow. The path is nudged forward by half a
 * point, which nobody will ever consciously notice and everybody would
 * notice the absence of.
 */
function Chevron({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        d="M9.75 5.5 16 12l-6.25 6.5"
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row-reverse",
    borderWidth: StyleSheet.hairlineWidth,
  },
  round: { width: 44, height: 44, borderRadius: 22 },
  pill: { borderRadius: radii.pill, paddingHorizontal: spacing.md, gap: spacing.xs },
  absolute: { position: "absolute", top: spacing.lg, right: spacing.lg, zIndex: 5 },
  // A press has to be felt on a device with no hover. Opacity, not colour:
  // it survives both tones without a second token.
  pressed: { opacity: 0.6 },
  label: { ...type.meta, writingDirection: "rtl" },
});

/**
 * The height a screen must leave clear at the top so an absolutely
 * positioned BackButton never lands on its own content. Exported because
 * four screens were each guessing it, and three guessed differently.
 */
export const BACK_BUTTON_CLEARANCE = spacing.lg + 44 + spacing.sm;
