import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AreaAvailabilityView } from "@pro-now/types";

import { lex, prosFreeNearYou } from "../lexicon";
import { resolveHomeSupply } from "../home-supply";
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
  /**
   * Fallback count for callers with no live snapshot yet. When
   * `availability` is supplied it wins, because a snapshot carries its own
   * expiry and a bare number does not.
   */
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
  /**
   * The live supply snapshot. Preferred over `totalAvailableNow` and over
   * each tile's `availableNowCount`, because it is the only form that can
   * expire: `readAvailability()` drops the whole thing once the server's own
   * freshness window has passed, and every count on this screen goes back to
   * absent in the same instant. A screen cannot hold a number the server has
   * stopped standing behind.
   */
  availability?: AreaAvailabilityView | null;
  /** Injected by tests and the gallery so the freshness rule is observable. */
  nowMs?: number;
  /** Total professionals online, for callers with no snapshot yet. */
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
  availability,
  nowMs,
  totalAvailableNow,
  onSelectService,
  onChangeAddress,
  width = 390,
}: CustomerHomeBodyProps) {
  const gutter = spacing.lg;
  const tileWidth = (width - gutter * 2 - spacing.md) / 2;

  // The source-of-truth rule lives in resolveHomeSupply, where it is tested.
  // See that file for why it must not be re-implemented inline.
  const supply = resolveHomeSupply({
    availability,
    nowMs,
    legacyTotal: totalAvailableNow,
    legacyCounts: Object.fromEntries(services.map((s) => [s.id, s.availableNowCount])),
  });
  const total = supply.total;
  const showSupply = typeof total === "number" && total > 0;

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
        <Text style={styles.headline}>{lex.homeQuestion}</Text>

        {showSupply ? (
          <View style={styles.supplyPill}>
            <View style={styles.supplyDot} />
            <Text style={styles.supplyText}>{prosFreeNearYou(total as number)}</Text>
          </View>
        ) : (
          // Honest absence. Not "0 available" — the server simply has not
          // told us, and guessing here would be inventing supply. The copy is
          // the same whether the snapshot is missing or expired, because to
          // the customer those are the same fact: we do not know right now.
          <Text style={styles.supplyUnknown}>בוחרים שירות ואנחנו {lex.unknownSupply} באזור שלך</Text>
        )}
      </View>

      {/* --- Services --- */}
      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title={lex.freeNearYou} colors={colors} />
        <View style={styles.grid}>
          {services.map((s) => (
            <ServiceTile
              key={s.id}
              nameHe={s.nameHe}
              mark={s.mark}
              photoSubject={s.photoSubject}
              photoUri={s.photoUri}
              supply={supply.supplyFor(s.id)}
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
        <Mark name="handyman" size={20} color={colors.trust} />
        <Text style={styles.trustText}>
          {lex.trustNote} תראה מי מגיע אליך לפני שתאשר.
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
    backgroundColor: tint.trust(0.09),
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
