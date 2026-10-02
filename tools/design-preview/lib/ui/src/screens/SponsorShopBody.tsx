import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  SPONSOR_BADGE_HE,
  type ShopThing,
  sponsorCtaHe,
  sponsorLeaveHe,
  type SponsorShop,
} from "@pro-now/demo-types";

import { BackButton } from "../components/BackButton";
import { customerDarkTheme, radii, spacing, type } from "../theme";

/**
 * INSIDE A SHOP THAT BELONGS TO SOMEBODY ELSE.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SCREEN IS
 * ---------------------------------------------------------------------
 * Amit: *"לקוח בזמן ההמתנה למקצוען יכול להיכנס לחנויות ואז ייפתח האתר של
 * המותג שיוכלו להזמין ממנו. ככה אגייס שיווק וכסף."*
 *
 * It is the same act as entering a professional's shop — you press a
 * building in the neighbourhood and you are inside it — and it must not
 * feel like the same THING. A professional's shop is a business we
 * verified and can send to your door. This one is a business that paid
 * to be in the street.
 *
 * ---------------------------------------------------------------------
 * HOW THE DIFFERENCE IS DRAWN, RATHER THAN WRITTEN
 * ---------------------------------------------------------------------
 * 1. The badge is the FIRST thing over the picture, not a footnote at
 *    the bottom. `בחסות` sits on the shop sign itself.
 * 2. There is no rating, no distance, no "available now" and no
 *    ordering. `SponsorShop` carries none of those fields, so this
 *    screen cannot show them even by accident (/CLAUDE.md §3).
 * 3. The only action leaves. It says so above itself, in full — whose
 *    site it is, and that the order, the payment and the delivery are
 *    theirs — because the first moment a customer could confuse an
 *    advert for PRO NOW is the moment they are about to spend money.
 * 4. The interior is the brand's own art. There is no drawn fallback
 *    here, unlike `ShopInterior` for the trades: inventing a room for
 *    somebody else's brand is putting words in their mouth. Without
 *    art, the shop is a sign and a line, honestly.
 */
export interface SponsorShopBodyProps {
  shop: SponsorShop;
  /** The brand's own interior, resolved by the caller from the art pack. */
  interiorUri?: string | null;
  /**
   * Opening the brand's site. Absent renders no button rather than a
   * dead one — the same rule the rest of this product follows.
   */
  onOpenSite?: (shop: SponsorShop) => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function SponsorShopBody({
  shop,
  interiorUri = null,
  onOpenSite,
  onBack,
  width = 390,
  height = 780,
}: SponsorShopBodyProps) {
  const colors = customerDarkTheme.colors;
  const [openThing, setOpenThing] = useState<ShopThing | null>(null);

  return (
    <View style={[styles.screen, { width, height, backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View>
          {interiorUri ? (
            <Image
              source={{ uri: interiorUri }}
              style={[styles.interior, { height: Math.round(height * 0.42) }]}
              resizeMode="cover"
              accessible
              accessibilityRole="image"
              accessibilityLabel={`בתוך החנות של ${shop.brandName}`}
            />
          ) : (
            <View style={[styles.interior, styles.noArt, { height: Math.round(height * 0.22) }]} />
          )}

          {/* ------------------------------------------------------------
              THE THINGS ON THE SHELVES.

              Amit: *"רוצה שיהיו מוצרים בחנות שיפתחו... לא רוצה לאתר
              ישר."* This is what makes it a shop rather than a door with
              a picture on it: you look at what is there, and leaving for
              the brand's site is something you choose afterwards.

              Drawn only over real art — a mark floating on the empty
              fallback would point at nothing.
              ------------------------------------------------------------ */}
          {interiorUri
            ? (shop.things ?? []).map((thing) => (
                <Pressable
                  key={thing.titleHe}
                  onPress={() => setOpenThing(thing)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    thing.priceHe ? `${thing.titleHe} · ${thing.priceHe}` : thing.titleHe
                  }
                  style={[
                    styles.thing,
                    {
                      left: `${Math.round(thing.x * 100)}%`,
                      top: `${Math.round(thing.y * 100)}%`,
                    },
                  ]}
                >
                  <Text style={styles.thingMark}>+</Text>
                </Pressable>
              ))
            : null}

          {/* ------------------------------------------------------------
              THE BADGE, OVER THE PICTURE.

              Not under the name and not in the footer. Somebody who
              looks at this screen for one second and leaves has to have
              seen the word — that second is the whole protection.
              ------------------------------------------------------------ */}
          <View style={styles.badge}>
            <Text style={styles.badgeText} accessibilityLabel={`${SPONSOR_BADGE_HE} — תוכן פרסומי`}>
              {SPONSOR_BADGE_HE}
            </Text>
          </View>
        </View>

        <View style={styles.pad}>
          <Text style={[styles.brand, { color: colors.textPrimary }]}>{shop.brandName}</Text>
          <Text style={[styles.category, { color: colors.textSecondary }]}>{shop.categoryHe}</Text>
          <Text style={[styles.tagline, { color: colors.textPrimary }]}>{shop.taglineHe}</Text>

          {/* The handoff, said before it happens. */}
          <Text style={[styles.leave, { color: colors.textSecondary }]}>{sponsorLeaveHe(shop)}</Text>

          {onOpenSite ? (
            <Pressable
              onPress={() => onOpenSite(shop)}
              accessibilityRole="button"
              accessibilityLabel={`${sponsorCtaHe(shop)} — נפתח מחוץ לאפליקציה`}
              style={[styles.cta, { backgroundColor: colors.action }]}
            >
              <Text style={[styles.ctaText, { color: colors.onAction }]}>{sponsorCtaHe(shop)}</Text>
            </Pressable>
          ) : null}

          {/*
           * THE SENTENCE THAT KEEPS THE PRODUCT HONEST.
           *
           * A customer standing in a paid shop, inside an app whose
           * entire promise is verified professionals, is owed the plain
           * version: this is an advert, and we did not check them the
           * way we check the people we send you.
           */}
          <Text style={[styles.disclosure, { color: colors.textSecondary }]}>
            חנות בחסות. {shop.brandName} אינם בעלי מקצוע של PRO NOW ולא עברו את האימות שלנו — אי אפשר
            להזמין מכאן מקצוען.
          </Text>
        </View>
      </ScrollView>

      {/*
        `onArtwork`: the brand's own interior fills the top of this
        screen, and a translucent chip on a lit shop is invisible — see
        `BackButton`. Amit found this one by not finding the button.
      */}
      {/* ----------------------------------------------------------------
          WHAT YOU PICKED UP.

          Over everything, because while you are looking at a thing that
          is what you are doing. The way to the brand's site is here, on
          the thing itself — not a button that was the only thing the
          shop could do.
          ---------------------------------------------------------------- */}
      {openThing ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Pressable
            onPress={() => setOpenThing(null)}
            accessibilityRole="button"
            accessibilityLabel="סגירה"
            style={styles.cardClose}
          >
            <Text style={[styles.cardCloseText, { color: colors.textSecondary }]}>×</Text>
          </Pressable>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{openThing.titleHe}</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{openThing.bodyHe}</Text>
          {openThing.priceHe ? (
            <View style={styles.cardPrice}>
              <Text style={[styles.cardNow, { color: colors.textPrimary }]}>{openThing.priceHe}</Text>
              {openThing.wasPriceHe ? (
                <Text style={[styles.cardWas, { color: colors.textSecondary }]}>
                  {openThing.wasPriceHe}
                </Text>
              ) : null}
            </View>
          ) : null}
          {onOpenSite && openThing.priceHe ? (
            <Pressable
              onPress={() => onOpenSite(shop)}
              accessibilityRole="button"
              accessibilityLabel={`${sponsorCtaHe(shop)} — נפתח מחוץ לאפליקציה`}
              style={[styles.cta, { backgroundColor: colors.action, marginTop: spacing.md }]}
            >
              <Text style={[styles.ctaText, { color: colors.onAction }]}>{sponsorCtaHe(shop)}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {onBack ? (
        <BackButton onPress={onBack} tone="dark" onArtwork accessibilityLabelHe="חזרה לרחוב" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
  scroll: { paddingBottom: spacing.xxl },
  interior: { width: "100%" },
  noArt: { backgroundColor: "rgba(247,243,250,0.06)" },
  badge: {
    position: "absolute",
    top: spacing.lg,
    /*
     * LEFT, because the back control owns the top right.
     *
     * The first version put the badge where every badge in this app
     * goes — the start of the line, which in Hebrew is the right — and
     * the floating back chip landed straight on top of it. A disclosure
     * covered by a button is not a disclosure, and this is the one word
     * on the screen that has to survive a one-second look.
     */
    left: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(23,18,31,0.72)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.34)",
  },
  badgeText: { ...type.microStrong, color: "#F7F3FA" },
  /*
   * A mark you press. 44 points because a finger is 44 — the same
   * number `verify:a11y` has already caught this product missing twice.
   */
  thing: {
    position: "absolute",
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16,11,22,0.5)",
    borderWidth: 2,
    borderColor: "rgba(255,233,199,0.92)",
  },
  thingMark: { ...type.bodyStrong, color: "#FFE9C7" },
  card: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(255,214,150,0.4)",
  },
  cardClose: { position: "absolute", top: spacing.sm, left: spacing.md, padding: spacing.xs },
  cardCloseText: { ...type.section, fontWeight: "400" },
  cardTitle: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  cardBody: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  cardPrice: {
    flexDirection: "row-reverse",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cardNow: { ...type.section },
  cardWas: { ...type.meta, textDecorationLine: "line-through" },
  pad: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  brand: { ...type.title, textAlign: "right", writingDirection: "rtl" },
  category: { ...type.meta, textAlign: "right", writingDirection: "rtl", marginTop: spacing.xs },
  tagline: {
    ...type.body,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
  },
  leave: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xl,
  },
  cta: {
    marginTop: spacing.lg,
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { ...type.bodyStrong },
  disclosure: {
    ...type.micro,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xl,
    opacity: 0.8,
  },
});
