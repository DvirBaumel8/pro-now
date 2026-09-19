import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { customerTheme, radii, spacing, tint, type } from "../theme";
import { Mark, PinMark, type MarkName } from "../components/marks";
import { HeroFlourish, SectionHeader } from "../components/surfaces";
import { ServiceTile, ServiceRow } from "../components/ServiceTile";

/**
 * C01 — Home. "מה צריך עכשיו?"
 *
 * Presentational only: it takes data and callbacks, holds no fetching and no
 * navigation, so the same body is used by `apps/customer-mobile` and by the
 * design gallery. That is what keeps the reviewed design and the shipped
 * design the same thing.
 *
 * The honesty rule that shapes this screen: `availableNowCount` is passed
 * through from the server per service and is frequently `null`. A tile with
 * an unknown count shows no count — never "0", never a plausible number
 * (/CLAUDE.md §3). A quiet marketplace is allowed to look quiet; that is
 * the price of the promise that "online" means online.
 */

const colors = customerTheme.colors;

export interface HomeServiceItem {
  id: string;
  nameHe: string;
  mark: MarkName;
  photoSubject: string;
  photoUri?: string | null;
  availableNowCount?: number | null;
  priceHint?: string | null;
}

export interface HomeRecentItem {
  id: string;
  nameHe: string;
  mark: MarkName;
  metaHe: string;
}

export interface CustomerHomeBodyProps {
  /** Short greeting, e.g. "ערב טוב". Locale/time logic lives in the app. */
  greetingHe: string;
  /** The saved address this request will default to. */
  addressLabelHe: string;
  services: HomeServiceItem[];
  recent?: HomeRecentItem[];
  /** Total professionals online across all services, if the server reports it. */
  totalAvailableNow?: number | null;
  onSelectService?: (id: string) => void;
  onChangeAddress?: () => void;
  width?: number;
}

export function CustomerHomeBody({
  greetingHe,
  addressLabelHe,
  services,
  recent = [],
  totalAvailableNow,
  onSelectService,
  onChangeAddress,
  width = 390,
}: CustomerHomeBodyProps) {
  const gutter = spacing.lg;
  const tileWidth = (width - gutter * 2 - spacing.md) / 2;
  const showSupply = typeof totalAvailableNow === "number" && totalAvailableNow > 0;

  return (
    <ScrollView style={[styles.screen, { width }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* --- Hero --- */}
      <View style={styles.hero}>
        <HeroFlourish color={colors.action} opacity={0.1} />

        <Pressable onPress={onChangeAddress} accessibilityRole="button" style={styles.addressRow}>
          <PinMark size={15} color={colors.textSecondary} />
          <Text style={styles.addressText} numberOfLines={1}>
            {addressLabelHe}
          </Text>
          <Text style={styles.addressChevron}>⌄</Text>
        </Pressable>

        <Text style={styles.greeting}>{greetingHe}</Text>
        <Text style={styles.headline}>מה צריך עכשיו?</Text>

        {showSupply ? (
          <View style={styles.supplyPill}>
            <View style={styles.supplyDot} />
            <Text style={styles.supplyText}>{totalAvailableNow} בעלי מקצוע זמינים באזור שלך</Text>
          </View>
        ) : (
          // Honest absence. Not "0 available" — the server simply has not
          // told us, and guessing here would be inventing supply.
          <Text style={styles.supplyUnknown}>בוחרים שירות ואנחנו בודקים מי זמין עכשיו</Text>
        )}
      </View>

      {/* --- Services --- */}
      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title="שירותים" colors={colors} />
        <View style={styles.grid}>
          {services.map((s) => (
            <ServiceTile
              key={s.id}
              nameHe={s.nameHe}
              mark={s.mark}
              photoSubject={s.photoSubject}
              photoUri={s.photoUri}
              availableNowCount={s.availableNowCount}
              priceHint={s.priceHint}
              colors={colors}
              width={tileWidth}
              onPress={() => onSelectService?.(s.id)}
            />
          ))}
        </View>
      </View>

      {/* --- Recent --- */}
      {recent.length > 0 ? (
        <View style={{ paddingHorizontal: gutter, marginTop: spacing.xxl }}>
          <SectionHeader title="הזמנת לאחרונה" colors={colors} />
          <View style={{ gap: spacing.sm }}>
            {recent.map((r) => (
              <ServiceRow
                key={r.id}
                nameHe={r.nameHe}
                mark={r.mark}
                metaHe={r.metaHe}
                colors={colors}
                onPress={() => onSelectService?.(r.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* --- Trust footer: why this is not a directory --- */}
      <View style={[styles.trust, { marginHorizontal: gutter }]}>
        <Mark name="handyman" size={20} color={colors.action} />
        <Text style={styles.trustText}>
          כל בעל מקצוע עובר אימות זהות ובדיקת תעודות לפי סוג העבודה. תראה מי מגיע אליך לפני שתאשר.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },

  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    overflow: "hidden",
  },
  addressRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  addressText: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl", maxWidth: 200 },
  addressChevron: { color: colors.textSecondary, fontSize: 13, marginTop: -4 },

  greeting: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xl,
  },
  headline: {
    ...type.h1,
    fontSize: 34,
    lineHeight: 40,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  supplyPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 7,
    marginTop: spacing.lg,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.action(),
  },
  supplyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.action },
  supplyText: { ...type.captionStrong, color: colors.action, writingDirection: "rtl" },
  supplyUnknown: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
  },

  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md },

  trust: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.md,
    marginTop: spacing.xxl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: tint.action(0.07),
  },
  trustText: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 19,
  },
});
