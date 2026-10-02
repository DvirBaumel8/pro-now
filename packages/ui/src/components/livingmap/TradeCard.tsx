import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { WORLD_DISTRICTS, type DepartmentCode } from "@pro-now/types";

import { type WorldAssetSources } from "./AssetSlot";
import { customerDarkTheme, radii, spacing, type } from "../../theme";

/**
 * WHAT HAPPENS WHEN YOU PRESS ONE OF THE NEIGHBOURHOOD'S OWN SHOPS.
 *
 * ---------------------------------------------------------------------
 * THE GAP
 * ---------------------------------------------------------------------
 * Amit: *"שגם זה יהיה לחיץ ויפתח את החנות והכרטיס שלו."*
 *
 * Eleven buildings stand in this street and, until now, exactly the ones
 * belonging to candidates the server had returned could be opened. The
 * other ten were scenery — which, in a world whose whole proposition is
 * that you can walk up to a business, means ten doors that do not open.
 *
 * ---------------------------------------------------------------------
 * AND WHY THIS IS NOT A PROFESSIONAL'S CARD
 * ---------------------------------------------------------------------
 * This is the part that needed care. A venue stands for a PERSON the
 * server said is available; a district stands for a TRADE. There is
 * nobody behind this door — so a card that looked like a profile, with a
 * portrait and a rating and a distance, would be inventing supply, which
 * is the one thing this codebase may never do (/CLAUDE.md §3).
 *
 * So it says what is true and nothing else: which trade this is, the
 * inside of a shop in it where that art exists, and the sentence that
 * keeps it honest — *this is the trade, not a particular professional*.
 * The only thing you can do from here is look at what the trade offers,
 * which is catalogue and not availability.
 */
export interface TradeCardProps {
  department: DepartmentCode;
  /** How tall the screen is, so the room can fill it. */
  height?: number;
  /** False renders the settled frame — the same switch the world takes. */
  animate?: boolean;
  sources?: WorldAssetSources;
  /** Look at what this trade offers. Absent renders no button. */
  onOpenTrade?: (department: DepartmentCode) => void;
  onClose?: () => void;
  width: number;
}

export function TradeCard({
  department,
  sources,
  onOpenTrade,
  onClose,
  width,
  height = 780,
  animate = true,
}: TradeCardProps) {
  const district = WORLD_DISTRICTS[department];
  const colors = customerDarkTheme.colors;
  const interiorId = district.venueInteriorAssetId;
  const interior = interiorId ? (sources?.[interiorId] as { uri?: string } | undefined) : undefined;

  /* ------------------------------------------------------------------
     THE STEP THROUGH THE DOOR.

     Amit, on the mock he liked: *"וכל האפקט של הכניסה לחנות אחרי
     שהגעתי."* Cutting from the street to a card sliding up the bottom
     of the screen is a page change. Coming in slightly too close and
     settling is an arrival — the same beat the journey to a
     professional already uses, at a tenth of the cost.

     Transform and opacity only, so it runs off the JS thread while the
     world behind it is still animating.
     ------------------------------------------------------------------ */
  const enter = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!animate) return;
    Animated.timing(enter, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animate, enter]);

  return (
    <View style={[styles.wrap, { width, height }]} pointerEvents="box-none">
      {/* The street dims but does not disappear: you are in a shop ON it. */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.dim, { opacity: enter }]}
      />
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            opacity: enter,
            transform: [
              { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [1.14, 1] }) },
            ],
          },
        ]}
      >
        {/*
         * THE INSIDE, WHERE IT EXISTS — at the artwork's own proportions.
         *
         * Amit: *"פחות זום אין בחנות שיראו יותר מה קורה שם."* The
         * interiors are roughly 4:3, so the window is 4:3. A 16:9 strip
         * cut the ceiling and the floor off the room, which is most of
         * what makes a room read as a room.
         *
         * No fallback and no stand-in from another trade: a plumber's
         * card showing a barber's chair is a claim about a business.
         */}
        {interior?.uri ? (
          <Image
            source={{ uri: interior.uri }}
            style={styles.interior}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`בתוך עסק בתחום ${district.labelHe}`}
          />
        ) : null}

        <View style={styles.body}>
          <Text style={[styles.trade, { color: colors.textPrimary }]}>{district.labelHe}</Text>
          {/*
           * The sentence that stops this being a profile. Said plainly,
           * above the button rather than under it.
           */}
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            זה התחום, לא מקצוען מסוים. מי פנוי עכשיו נקבע כששולחים קריאה.
          </Text>

          <View style={styles.row}>
            {onOpenTrade ? (
              <Pressable
                onPress={() => onOpenTrade(department)}
                accessibilityRole="button"
                accessibilityLabel={`מה אפשר להזמין בתחום ${district.labelHe}`}
                style={[styles.cta, { backgroundColor: colors.action }]}
              >
                <Text style={[styles.ctaText, { color: colors.onAction }]}>
                  מה אפשר להזמין כאן
                </Text>
              </Pressable>
            ) : null}
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="סגירה וחזרה לרחוב"
                style={styles.close}
              >
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>לרחוב</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * THE ROOM FILLS THE SCREEN, IT DOES NOT SIT ON IT.
   *
   * Amit: *"הכניסה לחנות, המעבר על הפנים — אין שום אפקט... ממש רחוק
   * מההדמיה שעשינו."* In the mock he liked, going in replaced the
   * frame; here it was a card laid over the street with a picture in
   * it, and a card is a page however good the picture is.
   *
   * No padding and no gap: the street is fully behind you while you are
   * in a shop, the way it is when you walk through a door.
   */
  /*
   * THE ROOM FILLS THE BOTTOM OF THE FRAME AND THE STREET GOES DARK.
   *
   * Amit: *"הכניסה לחנות, המעבר על הפנים — אין שום אפקט."* In the mock
   * he liked, going in REPLACED the frame; here it was a card laid over
   * the street with a picture in it, and a card is a page however good
   * the picture is.
   *
   * Two attempts. The first gave the card `flex: 1` so it would fill —
   * and a trade with no interior drawn became a screenful of nothing
   * with three words at the top of it. The room is as tall as the
   * artwork is, the panel under it is as tall as its words are, and the
   * pair sit against the bottom edge with the street nearly black
   * behind them. What fills the screen is what there is.
   */
  wrap: { position: "absolute", left: 0, top: 0, justifyContent: "flex-end" },
  dim: { backgroundColor: "rgba(11,8,16,0.94)" },
  card: { overflow: "hidden", width: "100%" },
  /*
   * 4:3, because that is the artwork's own shape. A 16:9 window cut the
   * ceiling and the floor off the room, which is most of what makes a
   * room read as a room — the same mistake, found the same way, as on
   * the professional's profile card.
   */
  interior: { width: "100%", aspectRatio: 4 / 3 },
  body: { padding: spacing.xl, paddingTop: spacing.lg },
  trade: { ...type.title, textAlign: "right", writingDirection: "rtl" },
  note: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  cta: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { ...type.bodyStrong },
  close: { minHeight: 48, minWidth: 64, alignItems: "center", justifyContent: "center" },
  closeText: { ...type.bodyStrong },
});
