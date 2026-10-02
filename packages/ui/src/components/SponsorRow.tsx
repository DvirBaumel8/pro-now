import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  SPONSOR_BADGE_HE,
  sponsorsMayShow,
  type JobState,
  type SponsorShop,
} from "@pro-now/types";

import { customerDarkTheme, radii, spacing, type } from "../theme";

/**
 * THE SHOPS IN THE STREET THAT PAID TO BE THERE.
 *
 * ---------------------------------------------------------------------
 * WHY A ROW AND NOT A BANNER
 * ---------------------------------------------------------------------
 * Amit: *"כל בעל עסק שנרשם פותח חנות וירטואלית — אני חייב לשים דגש על
 * החנות והחיפוש והחוויה"*, and then the sponsor idea on top of it.
 *
 * A banner would be the obvious thing and the wrong one. This product's
 * whole visual language is *places you can walk into*; an advertisement
 * shaped like an advertisement would be the one rectangle in the app
 * that is not part of the world. So a sponsor gets what a professional
 * gets — a shopfront in a street — and what it does NOT get is
 * everything that makes a professional's shopfront mean something.
 *
 * ---------------------------------------------------------------------
 * WHEN IT IS HERE AT ALL
 * ---------------------------------------------------------------------
 * `sponsorsMayShow` decides, and it decides from the job's state rather
 * than from anything this component knows. The row is here while you
 * wait and gone the moment the professional is at the door. That is not
 * a styling choice and it is not negotiable from inside a component —
 * see `sponsor-shops.ts`, where it has a test that fails if somebody
 * quietly widens it.
 */
export interface SponsorRowProps {
  status: JobState;
  shops: readonly SponsorShop[];
  /** Resolve a shop's shopfront art. Absent art draws the sign alone. */
  venueUriFor?: (shop: SponsorShop) => string | null | undefined;
  onEnter?: (shop: SponsorShop) => void;
  width?: number;
}

export function SponsorRow({ status, shops, venueUriFor, onEnter, width = 390 }: SponsorRowProps) {
  if (!sponsorsMayShow(status)) return null;
  if (shops.length === 0) return null;

  const colors = customerDarkTheme.colors;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.heading, { color: colors.textSecondary }]}>
        חנויות בשכונה · {SPONSOR_BADGE_HE}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        /*
         * `row-reverse` on the content, so the first shop is on the
         * RIGHT where a Hebrew reader starts. The ScrollView itself
         * cannot be reversed on every platform; its content can.
         */
        contentContainerStyle={styles.strip}
        style={{ width }}
      >
        {shops.map((shop) => {
          const uri = venueUriFor?.(shop) ?? null;
          return (
            <Pressable
              key={shop.id}
              onPress={() => onEnter?.(shop)}
              accessibilityRole="button"
              /*
               * The badge is in the ACCESSIBLE NAME, not only in the
               * picture. Somebody using a screen reader has to be told
               * this is an advert in the same breath as its name —
               * which is the one place a purely visual badge fails.
               */
              accessibilityLabel={`${shop.brandName} · ${shop.categoryHe} · ${SPONSOR_BADGE_HE}`}
              style={styles.shop}
            >
              <View style={styles.frame}>
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={styles.art}
                    resizeMode="contain"
                    accessible={false}
                  />
                ) : (
                  <View style={[styles.art, styles.noArt]} />
                )}
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{SPONSOR_BADGE_HE}</Text>
                </View>
              </View>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {shop.brandName}
              </Text>
              <Text style={[styles.category, { color: colors.textSecondary }]} numberOfLines={1}>
                {shop.categoryHe}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.xl },
  heading: {
    ...type.microStrong,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.md,
  },
  strip: { flexDirection: "row-reverse", gap: spacing.md, paddingLeft: spacing.xl },
  shop: { width: 148 },
  frame: {
    width: 148,
    height: 104,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: "rgba(247,243,250,0.06)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.14)",
  },
  art: { width: "100%", height: "100%" },
  noArt: { backgroundColor: "transparent" },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: "rgba(23,18,31,0.72)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.34)",
  },
  badgeText: { ...type.micro, fontWeight: "700", color: "#F7F3FA" },
  name: { ...type.metaStrong, textAlign: "right", writingDirection: "rtl", marginTop: spacing.sm },
  category: { ...type.micro, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
});
