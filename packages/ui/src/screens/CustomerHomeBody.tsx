import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AreaAvailabilityView } from "@pro-now/types";

import { prosFreeShort } from "../lexicon";
import { matchServicesByText, type ServiceMatchRule } from "../service-match";
import { resolveHomeSupply } from "../home-supply";
import { customerDarkTheme, customerTheme, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { type MarkName } from "../components/marks";
import { NavGlyph } from "../components/NavGlyph";
import { CaptureCard } from "../components/CaptureCard";
import { CategoryGrid, type CategoryTile } from "../components/CategoryGrid";
import { IntentSuggestions } from "../components/IntentSuggestions";
import { ServiceListRow } from "../components/ServiceListRow";
import { Pulse } from "../components/LiveServiceCard";

/**
 * C01 — Home. "מה אתם צריכים עכשיו?"
 *
 * Presentational only: it takes data and callbacks, holds no fetching and no
 * navigation, so the same body is used by `apps/customer-mobile` and by the
 * design gallery. That is what keeps the reviewed design and the shipped
 * design the same thing.
 *
 * ---------------------------------------------------------------------
 * DARK, AND THAT IS A REVERSAL
 * ---------------------------------------------------------------------
 * Visual System v1 §12 said the customer's app is light and that a dark
 * customer surface must be justified by a live state. This screen was
 * rebuilt on warm ivory to obey it. Amit looked at the result — "זה ממש לא
 * הכיוון" — and pointed at the visual board, which renders this exact
 * screen dark and uses white only for the capture card. ChatGPT had left
 * its own rule behind the moment it drew the thing.
 *
 * When the person who owns the product and the person who wrote the rule
 * both pick the same picture, the rule is what is wrong. The argument
 * behind §12 was that wall-to-wall dark "reads as a trading app" — and that
 * is an argument about FLAT dark. Dark with depth, one lit panel, real
 * photography and a single live colour does not read as a terminal. It
 * reads as evening, which is when boilers actually break.
 *
 * So: the customer is dark, and light is now the accent — reserved for the
 * surfaces meant to be touched or read closely. The quote screen stays
 * light for the reason that was always the strongest part of the old rule:
 * money and consent should feel like a document, not like a live event.
 *
 * ---------------------------------------------------------------------
 * THE ORDER OF THE SCREEN
 * ---------------------------------------------------------------------
 * Capture first, categories second. Amit's objection to the original —
 * "למה זה ישר מכוון אותי לדברים האלה?" — went to the premise, not the
 * layout: a grid of named services decides, before the customer has said a
 * word, that the answer is one of twelve things we thought of. That is a
 * directory with better typography. A person knows their PROBLEM; turning
 * it into the right professional is our job.
 *
 * ---------------------------------------------------------------------
 * AND WHY THERE IS NO TOTAL
 * ---------------------------------------------------------------------
 * An earlier version led with "7 מקצוענים פנויים עכשיו לידך", and the first
 * person to read it asked the right question: seven of what? Seven
 * professionals across eight trades says nothing about whether the one you
 * need is reachable — worse, it reads as readiness, so a customer with a
 * burst pipe taps into a dispatch that finds nobody because all seven paint
 * walls. Supply therefore appears only where it is actionable: attached to
 * a specific service, and never invented (/CLAUDE.md §3).
 */

const colors = customerDarkTheme.colors;

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
   * Where the professional is being sent. It lives on THIS screen and not
   * in a global chrome row: it is a property of the request being made, and
   * a customer who is ordering to their mother's flat needs to see that at
   * the moment they order, not on the settings screen.
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
    onAddFromLibrary?: () => void;
    onClearPhotos?: () => void;
  };
  width?: number;
}

const ALL = "הכול";

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
  capture,
  width = 390,
}: CustomerHomeBodyProps) {
  const gutter = spacing.lg;
  const inner = width - gutter * 2;

  // The source-of-truth rule lives in resolveHomeSupply, where it is tested.
  // See that file for why it must not be re-implemented inline.
  const supply = resolveHomeSupply({
    availability,
    nowMs,
    legacyTotal: totalAvailableNow,
    legacyCounts: Object.fromEntries(services.map((s) => [s.id, s.availableNowCount])),
  });

  const isFree = (s: HomeServiceItem) => {
    const st = supply.supplyFor(s.id).state;
    return st === "AVAILABLE" || st === "LIMITED";
  };
  const free = services.filter(isFree);

  const [query, setQuery] = useState("");

  /**
   * The department filter. `ALL` is a value, not a null — a nullable filter
   * ends up with two code paths that drift, and the drill-down needs a real
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
   * A recommendation is only worth acting on if it also says whether anyone
   * is there — "נראה שזה פתיחת סתימה" is a guess; "פתיחת סתימה · 3 פנויים ·
   * 11 דק׳" is a decision the customer can make.
   */
  const suggestions = useMemo(() => {
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
                  : "נבדוק כשתבחרו",
        supplyTone: live
          ? sup.state === "LIMITED"
            ? ("warning" as const)
            : ("live" as const)
          : ("muted" as const),
      };
    });
  }, [matched, supply]);

  /**
   * Six departments as tiles.
   *
   * A grid, not the list an earlier pass built: six is not a list, it is a
   * shape taken in at a glance. See CategoryGrid for the full argument and
   * for why these tiles carry no shadow and no border.
   */
  const MAX_TILES = 5;
  const tiles: CategoryTile[] = departments.slice(0, MAX_TILES).map((d) => {
    const inDept = services.filter((s) => s.departmentHe === d);
    return {
      id: d,
      nameHe: d,
      mark: (inDept[0]?.departmentMark ?? inDept[0]?.mark ?? "handyman") as MarkName,
      liveCount: inDept.filter(isFree).length,
    };
  });
  const overflow = departments.length - tiles.length;

  const hasText = query.trim().length >= 2;
  const hasMedia = (capture?.photos ?? 0) > 0 || (capture?.voiceSeconds ?? 0) > 0;

  /* ------------------------------------------------------------------
   * DRILL-DOWN — one department, and its three states told apart.
   * ------------------------------------------------------------------
   * The review's note was that "נבחר עבורך", "בקרוב אליך" and "נבדוק ביחד"
   * are three different KINDS of thing rendered as three near-identical
   * rectangles: "ההבדל הסמנטי ביניהן צריך להיות מורגש דרך layout,
   * typography ופעולה — לא רק copy."
   *
   * "Someone can be at your door in eleven minutes" and "we have not
   * launched this yet" are not two values of one field. So they are split
   * into groups with their own headings, and the reachable ones are
   * physically bigger. See ServiceListRow's `emphasis`.
   */
  if (dept !== ALL) {
    const reachable = listed.filter(isFree);
    /*
     * THREE SILENCES, NOT ONE. "בקרוב" (not launched), "בתיאום מראש"
     * (never dispatched now, by the nature of the work) and "נבדוק
     * כשתבחרו" (dispatchable, supply unknown until asked) are three
     * different facts about the world, and the review caught them rendered
     * as one grey column: "ההבדל הסמנטי ביניהן צריך להיות מורגש דרך
     * layout, typography ופעולה — לא רק copy."
     *
     * Collapsing them is also the exact small lie that makes a whole
     * screen untrustworthy. Telling someone a locksmith is "not urgent"
     * because we have not signed one up in their city is not a rounding
     * error; it is a different statement.
     */
    const soon = listed.filter((s2) => !isFree(s2) && s2.comingSoon);
    const scheduled = listed.filter((s2) => !isFree(s2) && !s2.comingSoon && s2.scheduledOnly);
    const elsewhere = listed.filter((s2) => !isFree(s2) && !s2.comingSoon && !s2.scheduledOnly && s2.notInMarket);
    const unknown = listed.filter(
      (s2) => !isFree(s2) && !s2.comingSoon && !s2.scheduledOnly && !s2.notInMarket
    );

    const quietGroups: { titleHe: string; noteHe: string; items: HomeServiceItem[] }[] = [
      {
        titleHe: "נבדוק ביחד",
        noteHe: "השירות פעיל. כמה אנשים פנויים תלוי ברגע — נבדוק ברגע שתבחרו.",
        items: unknown,
      },
      {
        titleHe: "בתיאום מראש",
        noteHe: "עבודות שלפי טבען לא מתחילות ברגע — קובעים מועד.",
        items: scheduled,
      },
      { titleHe: "עוד לא באזור שלכם", noteHe: "פעיל אצלנו, פשוט עוד לא כאן.", items: elsewhere },
      { titleHe: "בקרוב", noteHe: "בדרך למוצר, עוד לא נפתח.", items: soon },
    ].filter((g) => g.items.length > 0);

    return (
      <ScrollView
        style={[styles.screen, { width }]}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={{ paddingHorizontal: gutter, paddingTop: spacing.md }}>
          <Pressable
            onPress={() => setDept(ALL)}
            accessibilityRole="button"
            accessibilityLabel="כל הקטגוריות"
            style={styles.back}
          >
            <Text style={styles.backText}>כל הקטגוריות ›</Text>
          </Pressable>

          <Text style={styles.deptTitle}>{dept}</Text>

          {/* ------------------------------------------------------------
              WHAT CAN HAPPEN NOW GETS THE LIGHT.
              On a dark app, a white surface is the strongest signal
              available, and this is the one place on the screen where
              tapping leads to a person arriving. Nothing else here earns
              it — which is the point: the difference between "now" and
              "not now" should be visible from across the room, not read.
              ------------------------------------------------------------ */}
          {reachable.length > 0 ? (
            <View style={[styles.liveCard, { width: inner }]}>
              <View style={styles.groupHead}>
                <Pulse color={customerTheme.colors.action} size={6} />
                <Text style={styles.liveCardTitle}>אפשר עכשיו</Text>
              </View>
              <View style={styles.rows}>
                {reachable.map((s2) => (
                  <ServiceListRow
                    key={s2.id}
                    nameHe={s2.nameHe}
                    mark={s2.mark}
                    descriptionHe={s2.descriptionHe}
                    supply={supply.supplyFor(s2.id)}
                    emphasis="live"
                    tone="light"
                    onPress={() => onSelectService?.(s2.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {quietGroups.map((g) => (
            <View key={g.titleHe} style={styles.group}>
              <Text style={styles.groupTitleQuiet}>{g.titleHe}</Text>
              <Text style={styles.groupNote}>{g.noteHe}</Text>
              <View style={styles.rows}>
                {g.items.map((s2) => (
                  <ServiceListRow
                    key={s2.id}
                    nameHe={s2.nameHe}
                    mark={s2.mark}
                    supply={supply.supplyFor(s2.id)}
                    scheduledOnly={s2.scheduledOnly}
                    notInMarket={s2.notInMarket}
                    comingSoon={s2.comingSoon}
                    emphasis="quiet"
                    tone="dark"
                    onPress={() => onSelectService?.(s2.id)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { width }]}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: gutter }}>
        {/* Where we are sending someone. A property of the request, not a
            setting — so it sits with the request. */}
        {addressLabelHe ? (
          <Pressable
            onPress={onChangeAddress}
            accessibilityRole="button"
            accessibilityLabel="שינוי כתובת"
            style={styles.address}
          >
            <NavGlyph name="home" size={14} color={colors.textSecondary} />
            <Text style={styles.addressText} numberOfLines={1}>
              {addressLabelHe}
            </Text>
            <Text style={styles.addressChevron}>⌄</Text>
          </Pressable>
        ) : null}

        {greetingHe ? <Text style={styles.greeting}>{greetingHe}</Text> : null}
        <Text style={styles.headline}>מה אתם צריכים עכשיו?</Text>

        {matchRules ? (
          <View style={{ marginTop: spacing.lg }}>
            <CaptureCard
              width={inner}
              text={query}
              onChangeText={setQuery}
              photos={capture?.photos ?? 0}
              voiceSeconds={capture?.voiceSeconds ?? null}
              recording={capture?.recording ?? false}
              recordSeconds={capture?.recordSeconds ?? 0}
              canRecord={capture?.canRecord ?? false}
              onStartRecord={capture?.onStartRecord}
              onStopRecord={capture?.onStopRecord}
              onDeleteVoice={capture?.onDeleteVoice}
              onAddPhoto={capture?.onAddPhoto}
              onAddFromLibrary={capture?.onAddFromLibrary}
              onClearPhotos={capture?.onClearPhotos}
            />
          </View>
        ) : null}

        {suggestions !== null || hasMedia ? (
          <View style={{ marginTop: spacing.lg }}>
            <IntentSuggestions
              width={inner}
              matches={suggestions}
              hasText={hasText}
              hasMedia={hasMedia}
              onPick={(id) => onSelectService?.(id)}
              onBrowse={() => setQuery("")}
            />
          </View>
        ) : null}

        {/* --- or pick a category --- */}
        {tiles.length > 1 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.orPick}>או בחרו קטגוריה</Text>
            <CategoryGrid
              width={inner}
              tiles={tiles}
              moreLabelHe={overflow > 0 ? "עוד קטגוריות" : null}
              onSelect={(id) => setDept(id)}
              onMore={() => setDept(departments[MAX_TILES] ?? ALL)}
            />
          </View>
        ) : null}

        {/* ---------------------------------------------------------------
            WHAT CAN ACTUALLY HAPPEN RIGHT NOW.
            Rows, not a panel in a box: this is a short live readout, and
            boxing it turned it into a table of figures in review.
            --------------------------------------------------------------- */}
        {free.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <View style={styles.groupHead}>
              <Pulse color={colors.action} size={6} />
              <Text style={styles.groupTitle}>אפשר להזמין עכשיו</Text>
            </View>
            <View style={styles.rows}>
              {free.slice(0, 4).map((s2) => {
                const sup = supply.supplyFor(s2.id);
                return (
                  <Pressable
                    key={s2.id}
                    onPress={() => onSelectService?.(s2.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s2.nameHe} · ${prosFreeShort(sup.count ?? 0, sup.nearestRouteEtaMinutes)}`}
                    style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.liveName} numberOfLines={1}>
                      {s2.nameHe}
                    </Text>
                    {typeof sup.nearestRouteEtaMinutes === "number" ? (
                      <Text style={styles.liveEta}>{sup.nearestRouteEtaMinutes} דק׳</Text>
                    ) : (
                      <Text style={styles.liveSoft}>פנוי</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* --- Recent --- */}
        {recent.length > 0 ? (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={styles.groupTitleQuiet}>הזמנתם לאחרונה</Text>
            <View style={styles.rows}>
              {recent.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => onSelectService?.(r.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${r.nameHe} · ${r.metaHe}`}
                  style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.liveName} numberOfLines={1}>
                    {r.nameHe}
                  </Text>
                  <Text style={styles.liveSoft} numberOfLines={1}>
                    {r.metaHe}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },

  address: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    marginRight: -spacing.md,
    borderRadius: radii.pill,
  },
  addressText: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl", maxWidth: 220 },
  addressChevron: { ...type.meta, color: colors.textSecondary, marginTop: -3 },

  greeting: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  /*
   * TITLE, NOT HERO. §1 allows one display-or-hero per viewport, and on
   * this screen that allowance is spent on nothing — the biggest number a
   * customer sees here is an ETA in a row. A 32px headline over a lit card
   * is the hierarchy; a 44px one starts competing with the card for the
   * eye, which is the opposite of what the composition is for.
   */
  headline: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  orPick: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.md,
  },

  liveCard: {
    marginTop: spacing.lg,
    backgroundColor: customerTheme.colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    // Raised, not outlined (§5).
    ...elevation(3),
  },
  liveCardTitle: { ...type.bodyStrong, color: customerTheme.colors.textPrimary, writingDirection: "rtl" },

  group: { marginTop: spacing.xl },
  groupNote: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  groupHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  groupTitle: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  groupTitleQuiet: {
    ...type.metaStrong,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  rows: { marginHorizontal: -spacing.sm, marginTop: spacing.sm },

  liveRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: tint.neutralDark(0.1),
  },
  liveName: { ...type.body, color: colors.textPrimary, flex: 1, textAlign: "right", writingDirection: "rtl" },
  liveEta: { ...type.bodyStrong, ...tabular, color: colors.actionText },
  liveSoft: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl" },

  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-end" },
  backText: { ...type.metaStrong, color: colors.textSecondary, writingDirection: "rtl" },
  deptTitle: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
});
