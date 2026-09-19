import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { AreaAvailabilityView } from "@pro-now/types";

import { lex } from "../lexicon";
import { matchServicesByText, type ServiceMatchRule } from "../service-match";
import { resolveHomeSupply } from "../home-supply";
import { customerTheme, elevation, radii, spacing, tint, type } from "../theme";
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
 * The honesty rule that shapes this screen: supply is passed through from
 * the server PER SERVICE and is frequently unknown. A tile with an unknown
 * count shows no count — never "0", never a plausible number
 * (/CLAUDE.md §3). A quiet marketplace is allowed to look quiet; that is
 * the price of the promise that "online" means online.
 *
 * WHY THERE IS NO TOTAL. An earlier version led with "7 מקצוענים פנויים
 * עכשיו לידך", and the first person to use it asked the right question:
 * seven of what? The app does not yet know whether they need a plumber or a
 * locksmith, and seven professionals across eight trades says nothing about
 * whether the one they need is reachable. Worse, it reads as readiness — so
 * a customer with a burst pipe sees "7 available" and taps into a dispatch
 * that finds nobody, because all seven paint walls.
 *
 * An aggregate is not a small inaccuracy here; it is the promise this
 * product is built on, stated about a group that cannot keep it. So supply
 * appears only where it is actionable: attached to a specific service. The
 * catalogue is split instead — what is genuinely reachable right now first,
 * everything else below — which answers "what can I actually get now?"
 * without ever claiming a number the customer cannot use.
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
  /**
   * Keyword rules for the "describe what happened" box. Omit to hide the box
   * entirely — a search that matches nothing is worse than no search.
   */
  matchRules?: ServiceMatchRule[];
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
  matchRules,
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
  /*
   * Ordering IS the message. Services the server can actually deliver right
   * now come first under "פנויים עכשיו לידך"; everything else follows. When
   * nothing is known, there is no split at all and the catalogue is just a
   * catalogue — which is the honest picture of not knowing.
   */
  const free = services.filter((s) => {
    const st = supply.supplyFor(s.id).state;
    return st === "AVAILABLE" || st === "LIMITED";
  });
  const rest = services.filter((s) => !free.includes(s));
  const anyFresh = free.length > 0;

  /*
   * Describing the problem is how people actually think — "there's water
   * under the sink", not "plumbing". The box routes that to a SERVICE; which
   * professional comes is still dispatch's decision, which is why the
   * matcher cannot reach a person (see service-match.ts).
   */
  const [query, setQuery] = useState("");
  const matched = useMemo(() => {
    if (!matchRules || query.trim().length < 2) return null;
    const ids = matchServicesByText(query, matchRules).map((m) => m.serviceId);
    return ids.map((id) => services.find((s) => s.id === id)).filter(Boolean) as HomeServiceItem[];
  }, [query, matchRules, services]);

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

        {/*
          * No aggregate count. See the note at the top of this file: the
          * number the customer can act on lives on the service tile, where
          * it means something.
          */}
        {matchRules ? (
          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="תאר במילים שלך מה קרה"
              placeholderTextColor={colors.textSecondary}
              style={styles.search}
              textAlign="right"
              accessibilityLabel="תיאור התקלה"
            />
          </View>
        ) : null}

        {matched === null ? (
          <Text style={styles.supplyUnknown}>
            {anyFresh
              ? "מה שאפשר לקבל עכשיו מופיע ראשון"
              : `בוחרים שירות ואנחנו ${lex.unknownSupply} באזור שלך`}
          </Text>
        ) : matched.length > 0 ? (
          <View style={styles.matchWrap}>
            {/* "נראה שזה", not "הבנתי" — it is a keyword matcher and the
                copy does not promise more than it is. */}
            <Text style={styles.matchLead}>נראה שזה:</Text>
            <View style={styles.matchRow}>
              {matched.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => onSelectService?.(m.id)}
                  accessibilityRole="button"
                  style={styles.matchChip}
                >
                  <Mark name={m.mark} size={15} color={colors.actionText} />
                  <Text style={styles.matchChipText} numberOfLines={1}>
                    {m.nameHe}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.supplyUnknown}>
            לא זיהינו לפי התיאור. בחר מהרשימה למטה — או נסה לכתוב אחרת.
          </Text>
        )}
      </View>

      {/* --- Services, split by what is actually reachable right now --- */}
      <View style={{ paddingHorizontal: gutter }}>
        {free.length > 0 ? (
          <>
            <SectionHeader title={lex.freeNearYou} colors={colors} />
            <View style={styles.grid}>
              {free.map((s) => (
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
          </>
        ) : null}

        {rest.length > 0 ? (
          <View style={free.length > 0 ? { marginTop: spacing.xxl } : undefined}>
            <SectionHeader title={free.length > 0 ? "שירותים נוספים" : "שירותים"} colors={colors} />
            <View style={styles.grid}>
              {rest.map((s) => (
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
        ) : null}
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
    // The address is the first thing Amit reported he could not tap. 30px
    // tall is a label that happens to be pressable; 44 is a control.
    minHeight: 44,
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

  searchWrap: { alignSelf: "stretch", marginTop: spacing.lg },
  search: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    ...type.body,
    fontSize: 15,
    color: colors.textPrimary,
    writingDirection: "rtl",
    ...elevation(1),
  },

  matchWrap: { alignSelf: "stretch", marginTop: spacing.md, alignItems: "flex-end" },
  matchLead: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  matchRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: 6 },
  matchChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    backgroundColor: tint.action(0.14),
  },
  matchChipText: { ...type.captionStrong, color: colors.actionText, writingDirection: "rtl" },

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
