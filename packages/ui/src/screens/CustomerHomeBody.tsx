import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import type { AreaAvailabilityView } from "@pro-now/types";

import { lex, prosFreeShort } from "../lexicon";
import { matchServicesByText, type ServiceMatchRule } from "../service-match";
import { resolveHomeSupply } from "../home-supply";
import { customerTheme, elevation, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "../components/marks";
import { HeroFlourish, SectionHeader } from "../components/surfaces";
import { ServiceRow } from "../components/ServiceTile";
import { LiveServiceCard, Pulse } from "../components/LiveServiceCard";
import { IntentCapture } from "../components/IntentCapture";
import { CategoryCard } from "../components/CategoryCard";
import { RtlRow } from "../components/RtlRow";
import { ServiceListRow } from "../components/ServiceListRow";

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
  /** One short line under the name. */
  descriptionHe?: string | null;
  /**
   * Which part of the catalogue this belongs to. Drives the filter row, and
   * exists so the customer can see at a glance that this is not an app for
   * home repairs — "אנשים שמגיעים אליך" is a heading they can tap.
   */
  departmentHe?: string | null;
  /**
   * The mark for this service's DEPARTMENT, not for the service.
   *
   * A category card was borrowing the first service's mark, which put a
   * wrench on "אנשים שמגיעים אליך" — a spanner standing for a personal
   * trainer, because that department happens to list the handyman first.
   * A category needs a mark chosen for the category.
   */
  departmentMark?: MarkName | null;
  /** Modelled and visible, not launched. */
  comingSoon?: boolean;
  /** Catalogued, never dispatched now. */
  scheduledOnly?: boolean;
  /** Dispatchable in principle, not open in this market yet. */
  notInMarket?: boolean;
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
  /**
   * @deprecated The address lives in the app's utility row now, so it is on
   * every screen rather than only this one. Kept so existing callers do not
   * break; ignored here.
   */
  addressLabelHe?: string;
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
  /** @deprecated Moved to the utility row. */
  onChangeAddress?: () => void;

  /**
   * ------------------------------------------------------------------
   * CAPTURE — say it, record it, or show it.
   * ------------------------------------------------------------------
   * Handed in rather than owned here, for the same reason as on the
   * describe screen: recording and the camera are platform capabilities
   * (expo-av / MediaRecorder), and a presentational screen that reached for
   * a browser API would stop being shippable on a phone.
   *
   * Omit all of it and the hero degrades to a plain text box, which is the
   * correct fallback — not a microphone button that does nothing.
   */
  capture?: {
    photos: number;
    voiceSeconds: number | null;
    recording: boolean;
    recordSeconds: number;
    canRecord: boolean;
    onStartRecord?: () => void;
    onStopRecord?: () => void;
    onDeleteVoice?: () => void;
    onAddPhoto?: () => void;
    onClearPhotos?: () => void;
  };
  width?: number;
}

const ALL = "הכול";

export function CustomerHomeBody({
  greetingHe,
  services,
  recent = [],
  availability,
  nowMs,
  matchRules,
  totalAvailableNow,
  onSelectService,
  capture,
  width = 390,
}: CustomerHomeBodyProps) {
  const gutter = spacing.lg;

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

  /*
   * Describing the problem is how people actually think — "there's water
   * under the sink", not "plumbing". The box routes that to a SERVICE; which
   * professional comes is still dispatch's decision, which is why the
   * matcher cannot reach a person (see service-match.ts).
   */
  const [query, setQuery] = useState("");

  /**
   * The department filter. `ALL` is a value, not a null — a nullable filter
   * ends up with two code paths that drift, and the chip row needs a real
   * selected item anyway.
   */
  const departments = useMemo(() => {
    const seen: string[] = [];
    for (const s of services) {
      const d = s.departmentHe;
      if (d && !seen.includes(d)) seen.push(d);
    }
    return seen;
  }, [services]);
  const [dept, setDept] = useState<string>(ALL);
  const listed = useMemo(
    () => (dept === ALL ? services : services.filter((s) => s.departmentHe === dept)),
    [services, dept]
  );
  const matched = useMemo(() => {
    if (!matchRules || query.trim().length < 2) return null;
    const ids = matchServicesByText(query, matchRules).map((m) => m.serviceId);
    return ids.map((id) => services.find((s) => s.id === id)).filter(Boolean) as HomeServiceItem[];
  }, [query, matchRules, services]);

  /**
   * The match, dressed with live supply.
   *
   * The recommendation is only worth acting on if it also says whether
   * anyone is there — "נראה שזה פתיחת סתימה" is a guess; "פתיחת סתימה · 3
   * פנויים · 11 דק׳" is a decision the customer can make.
   */
  const intentMatches = useMemo(() => {
    if (matched === null) return null;
    return matched.map((m) => {
      const sup = supply.supplyFor(m.id);
      const live = sup.state === "AVAILABLE" || sup.state === "LIMITED";
      return {
        id: m.id,
        nameHe: m.nameHe,
        mark: m.mark,
        supplyHe: m.comingSoon
          ? "בקרוב"
          : m.scheduledOnly
          ? "בתיאום מראש"
          : m.notInMarket
            ? "עוד לא באזור שלך"
            : live
              ? prosFreeShort(sup.count ?? 0, sup.nearestRouteEtaMinutes)
              : sup.state === "UNAVAILABLE"
                ? "אין פנויים כרגע"
                : "נבדוק כשתבחר",
        supplyTone: live
          ? sup.state === "LIMITED"
            ? ("warning" as const)
            : ("live" as const)
          : ("muted" as const),
      };
    });
  }, [matched, supply]);

  const catWidth = (width - gutter * 2 - spacing.md) / 2;
  const isFree = (s: HomeServiceItem) => {
    const st = supply.supplyFor(s.id).state;
    return st === "AVAILABLE" || st === "LIMITED";
  };

  return (
    <ScrollView style={[styles.screen, { width }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      {/* ---------------------------------------------------------------
          HERO — capture first. Not a menu.

          The screen used to open with named services, and Amit's objection
          went straight to the premise: "למה זה ישר מכוון אותי לדברים האלה?"
          A grid of service names decides, before the customer has said
          anything, that the answer is one of twelve things we thought of
          first. That is a directory. The whole reason to build this instead
          of a directory is that a person knows their PROBLEM — water under
          the sink, a back that has hurt since Tuesday — and turning that
          into the right professional is our job, not theirs.

          So the first thing on the screen is a place to say it, record it
          or show it. Categories come second, and specific services third,
          after the customer has narrowed things the way people actually
          narrow things: broad, then less broad.
          --------------------------------------------------------------- */}
      <View style={styles.hero}>
        <HeroFlourish color={colors.action} opacity={0.1} />

        {/*
          * The address moved to the utility row at the top of the app, so
          * it is on every screen rather than only this one — and showing it
          * twice on the home screen was the kind of duplication that makes
          * a reader wonder which of the two is the real control.
          */}
        <Text style={styles.greeting}>{greetingHe}</Text>
        <Text style={styles.headline}>{lex.homeQuestion}</Text>

        {matchRules ? (
          <View style={{ marginTop: spacing.lg }}>
            <IntentCapture
              width={width - gutter * 2}
              text={query}
              onChangeText={setQuery}
              matches={intentMatches}
              media={{
                photos: capture?.photos ?? 0,
                voiceSeconds: capture?.voiceSeconds ?? null,
              }}
              recording={capture?.recording ?? false}
              recordSeconds={capture?.recordSeconds ?? 0}
              canRecord={capture?.canRecord ?? false}
              onStartRecord={capture?.onStartRecord}
              onStopRecord={capture?.onStopRecord}
              onDeleteVoice={capture?.onDeleteVoice}
              onAddPhoto={capture?.onAddPhoto}
              onClearPhotos={capture?.onClearPhotos}
              onPick={(id) => onSelectService?.(id)}
              onBrowse={() => setDept(ALL)}
            />
          </View>
        ) : null}
      </View>

      {/* ---------------------------------------------------------------
          CATEGORIES — broad, and only as specific as a live count.
          --------------------------------------------------------------- */}
      {departments.length > 1 ? (
        <View style={{ paddingHorizontal: gutter, marginTop: spacing.xl }}>
          <SectionHeader
            title={dept === ALL ? "במה נעזור?" : dept}
            colors={colors}
            action={dept === ALL ? undefined : "כל הקטגוריות"}
            onAction={dept === ALL ? undefined : () => setDept(ALL)}
          />
          {dept === ALL ? (
            <View style={styles.catGrid}>
              {departments.map((d) => {
                const inDept = services.filter((s) => s.departmentHe === d);
                return (
                  <CategoryCard
                    key={d}
                    nameHe={d}
                    mark={inDept[0]?.departmentMark ?? inDept[0]?.mark ?? "handyman"}
                    serviceCount={inDept.length}
                    liveCount={inDept.filter((s) => isFree(s)).length}
                    width={catWidth}
                    onPress={() => setDept(d)}
                  />
                );
              })}
            </View>
          ) : (
            <View style={{ marginHorizontal: -spacing.sm, marginTop: spacing.sm }}>
              {listed.map((s) => (
                <ServiceListRow
                  key={s.id}
                  nameHe={s.nameHe}
                  mark={s.mark}
                  descriptionHe={s.descriptionHe}
                  supply={supply.supplyFor(s.id)}
                  scheduledOnly={s.scheduledOnly}
                  notInMarket={s.notInMarket}
                  comingSoon={s.comingSoon}
                  onPress={() => onSelectService?.(s.id)}
                />
              ))}
            </View>
          )}
        </View>
      ) : null}

      {/* ---------------------------------------------------------------
          זמין עכשיו — a short, horizontal, live row.

          Horizontal because "what can I have in the next hour" is a small
          set that should never make the customer scroll: if six things are
          reachable, six is the whole answer and it fits in a swipe. The
          vertical space below belongs to the catalogue, which is long.
          --------------------------------------------------------------- */}
      {free.length > 0 ? (
        <View style={styles.liveSection}>
          <View style={[styles.liveHead, { paddingHorizontal: gutter }]}>
            {/*
              * No number beside the title. It said "12 פנויים עכשיו לידך",
              * where 12 was the count of SERVICES and every reader took it
              * for a count of people. A number that means one thing and
              * reads as another is worse than no number, and the cards
              * below carry the real counts anyway.
              */}
            <Text style={styles.liveTitle}>{lex.freeNearYou}</Text>
            <Pulse color={colors.action} />
          </View>
          <RtlRow
            gutter={gutter}
            contentContainerStyle={{ gap: spacing.md }}
            style={{ marginTop: spacing.md }}
          >
            {free.map((s) => (
              <LiveServiceCard
                key={s.id}
                nameHe={s.nameHe}
                mark={s.mark}
                descriptionHe={s.descriptionHe}
                supply={supply.supplyFor(s.id)}
                priceHint={s.priceHint}
                onPress={() => onSelectService?.(s.id)}
              />
            ))}
          </RtlRow>
        </View>
      ) : null}

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

  catGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  liveSection: { marginTop: spacing.xl },
  liveHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  liveTitle: { ...type.h3, color: colors.textPrimary, writingDirection: "rtl" },
  liveCount: {
    ...type.captionStrong,
    color: colors.actionText,
    writingDirection: "rtl",
  },
  deptChip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  deptChipOn: { borderColor: colors.action, backgroundColor: tint.action(0.1) },
  deptChipText: { ...type.caption, fontSize: 14, color: colors.textSecondary, writingDirection: "rtl" },
  deptChipTextOn: { color: colors.actionText, fontWeight: "700" },
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
