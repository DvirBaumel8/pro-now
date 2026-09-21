import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AVATARS, type AvatarChoice, type AvatarOption } from "@pro-now/types";

import { AssetSlot, EMPTY_ASSET_SOURCES, type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { BackButton } from "../components/BackButton";
import { customerDarkTheme, depth, radii, spacing, type } from "../theme";
import { CELL_RISE_MS, cellDelayMs, poseFor } from "./avatarPicker";

export { poseFor, cellDelayMs, gridSettledMs } from "./avatarPicker";

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
  /** False holds the grid still, for a capture or reduced motion. */
  animate?: boolean;
  width?: number;
  height?: number;
}

/**
 * ONE TILE, ARRIVING AND THEN ANSWERING.
 *
 * Two movements, and they are different in kind. The arrival is a one-off
 * with a delay taken from the tile's place in the grid, so twelve of them
 * read as one sweep. The pose is a response — it changes whenever the
 * choice does, and it moves the OTHERS as much as the chosen one, because
 * a lift means nothing without something to be lifted above.
 *
 * Both are transform and opacity only, so both stay off the JS thread.
 */
function AvatarCell({
  index,
  picked,
  anyPicked,
  animate,
  onPress,
  labelHe,
  width,
  height,
  children,
}: {
  index: number;
  picked: boolean;
  anyPicked: boolean;
  animate: boolean;
  onPress: () => void;
  labelHe: string;
  width: number;
  height: number;
  children: React.ReactNode;
}) {
  const rise = useRef(new Animated.Value(animate ? 0 : 1)).current;
  /*
   * THE POSE IS THE QUANTITY, NOT A 0→1 REMAP OF IT.
   *
   * These were one value springing 0→1 with the target baked into the
   * interpolation's output range — and the value was reset to 0 on every
   * change of the choice, while 0 always meant the NEUTRAL pose.
   *
   * So tapping a second avatar made the first one do this, in order:
   * React renders with the new output range while the value is still 1, so
   * it snaps from 1.06 to 0.94; the effect then sets the value to 0, which
   * snaps it back to 1.0 at full brightness; only then does the spring
   * carry it down to 0.94 and 0.55. The newly-picked tile does the mirror.
   * A visible double-hop, with both tiles flashing bright and full-size on
   * the way, on the second screen a customer ever sees and the one whose
   * entire content is this single choice.
   *
   * Springing the real numbers instead means a re-target mid-flight is a
   * redirect rather than a reset: a spring resumes from wherever the value
   * actually is.
   */
  const cellScale = useRef(new Animated.Value(1)).current;
  const cellOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) {
      rise.setValue(1);
      return;
    }
    const anim = Animated.timing(rise, {
      toValue: 1,
      duration: CELL_RISE_MS,
      delay: cellDelayMs(index),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, index, rise]);

  const target = poseFor(picked, anyPicked);
  useEffect(() => {
    if (!animate) {
      cellScale.setValue(target.scale);
      cellOpacity.setValue(target.opacity);
      return;
    }
    // Enough give to feel like a thing moving, not enough to wobble:
    // twelve wobbling tiles is a screen nobody can read.
    const spring = { damping: 18, stiffness: 220, mass: 0.9, useNativeDriver: true } as const;
    const anim = Animated.parallel([
      Animated.spring(cellScale, { ...spring, toValue: target.scale }),
      Animated.spring(cellOpacity, { ...spring, toValue: target.opacity }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [animate, cellScale, cellOpacity, target.scale, target.opacity]);

  return (
    <Animated.View
      style={{
        opacity: Animated.multiply(rise, cellOpacity),
        transform: [
          // Arriving from slightly below, which reads as being set down
          // rather than as fading in.
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
          { scale: cellScale },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        // The drawing, never the person. See the header.
        accessibilityLabel={labelHe}
        accessibilityState={{ selected: picked }}
        style={({ pressed }) => [
          styles.cell,
          { width, height },
          picked ? styles.cellOn : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function AvatarPickerBody({
  value = null,
  options = AVATARS,
  sources = EMPTY_ASSET_SOURCES,
  onChoose,
  onSkip,
  onBack,
  animate = true,
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
          {options.map((o, i) => {
            const on = picked === o.id;
            return (
              <AvatarCell
                key={o.id}
                index={i}
                picked={on}
                anyPicked={picked !== null}
                animate={animate}
                onPress={() => setPicked(on ? null : o.id)}
                labelHe={o.labelHe}
                width={cell}
                height={cell * 1.18}
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
              </AvatarCell>
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
