import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { AreaAvailabilityView } from "@pro-now/types";

import { prosFreeShort } from "../lexicon";
import { matchServicesByText, urgentCareFor, type ServiceMatchRule } from "../service-match";
import { resolveHomeSupply } from "../home-supply";
import { customerDarkTheme, customerTheme, depth, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { type MarkName } from "../components/marks";
import { NavGlyph } from "../components/NavGlyph";
import { CaptureCard } from "../components/CaptureCard";
import { Glow } from "../components/Glow";
import { CategoryCard } from "../components/CategoryCard";
import { CategoryFaces } from "../components/CategoryFaces";
import { Scrim } from "../components/Scrim";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { type WorldAssetSources } from "../components/livingmap/AssetSlot";
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
  /** The city behind the top of the page, when the host can play it. Left out, the painted plate. */
  backdrop?: React.ReactNode;
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
  /**
   * Words that arrived from outside the text box — what a recording said,
   * written out. Each new `n` replaces the text with `text`.
   */
  injectedText?: { text: string; n: number } | null;
  /** A service recognised from a photo, first in the suggestions. */
  photoMatch?: { serviceId: string | null; seenHe: string } | null;
  /** A photo is being recognised. */
  recognising?: boolean;
  /**
   * When the words match no keyword, ask something that reads Hebrew to
   * name the service ("understand" resolves the ids, best first, or null
   * where no such reader is available). The keyword match always answers
   * first and alone when it can — it is instant and free.
   */
  understand?: (text: string) => Promise<string[] | null>;
  /** Total professionals online, for callers with no snapshot yet. */
  totalAvailableNow?: number | null;
  onSelectService?: (id: string) => void;
  onChangeAddress?: () => void;
  /**
   * "יש לי עסק, אני רוצה חנות בשכונה."
   *
   * Amit: *"אפילו לבנות פיצ'ר נוסף בעמוד הפתיחה שמיועד למי שרוצה לפרסם
   * את העסק שלו."*
   *
   * At the very bottom, below everything a customer came here to do.
   * The person this is for is not the person the screen is for, and a
   * business owner looking for it will scroll — while a customer with a
   * burst pipe must never meet it on the way to a plumber.
   *
   * Absent renders nothing, so the row cannot appear in a build that has
   * nowhere to send it.
   */
  onAdvertise?: () => void;

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
  /** A description typed on another screen that had no row for it. */
  seedQueryHe?: string | null;
  capture?: {
    photos: number;
    voiceSeconds: number | null;
    recording: boolean;
    recordSeconds: number;
    canRecord: boolean;
    /** Why the microphone cannot be reached, in Hebrew. Null when it can. */
    recordBlockedHe?: string | null;
    /** Present only when the page is embedded and recording needs its own tab. */
    onOpenInOwnTab?: () => void;
    onStartRecord?: () => void;
    onStopRecord?: () => void;
    onDeleteVoice?: () => void;
    onAddPhoto?: () => void;
    onAddFromLibrary?: () => void;
    onClearPhotos?: () => void;
  };
  /**
   * Opens a category. The world travels there; it does not open a list.
   *
   * Amit: *"לחיצה לא פותחת דף קטגוריה משעמם — היא מכניסה את המשתמש לתוך
   * אותו עולם."* So the handler is named for the category rather than for
   * a screen, and what happens next is the host's decision.
   */
  onSelectCategory?: (categoryId: string) => void;
  /** World and character art, as far as it exists. */
  worldSources?: WorldAssetSources;
  /**
   * The one live sentence, assembled by the app from the availability
   * snapshot it already holds.
   *
   * A sentence rather than a count so this screen cannot do arithmetic on
   * supply and get it subtly wrong — and null rather than a zero, because
   * "0 פנויים" at the top of the home screen is a worse lie than silence
   * when the snapshot is simply stale.
   */
  liveLineHe?: string | null;
  /**
   * THE WAY INTO THE STREET.
   *
   * Amit, after I built the walking and hid it inside the dispatch wait:
   * *"עכשיו לראות איך הוא במפה זז — אני לא רואה ולא מבין."* He was right
   * and the fault was where it lived, not what it did. Walking is how you
   * arrive somewhere, not something to do while a server thinks, so it
   * gets a door on the screen everybody lands on.
   *
   * Present whether or not there is an avatar yet: when there is none,
   * the door picks one first and says so. See `strollNeedsAvatar`.
   */
  onStroll?: () => void;
  /** No figure chosen yet, so this door picks one on the way. */
  strollNeedsAvatar?: boolean;
  width?: number;
  /**
   * THE SCREEN'S HEIGHT, AND WHY IT IS NOT OPTIONAL IN PRACTICE.
   *
   * This screen had no height at all. Its root `View` carried only a
   * background colour, so it grew to fit its own content, the `ScrollView`
   * inside it grew to fit ITS content — and a scroll view as tall as the
   * thing it contains has nothing to scroll. The page then ran past the
   * bottom of the phone and was simply clipped by the frame above it.
   * Amit: *"עמוד הבית לא נגלל למטה, הכל תקוע."*
   *
   * Every other screen in the product takes a height for exactly this
   * reason. This one was the exception and it is the one screen everybody
   * lands on.
   */
  height?: number;
}

const ALL = "הכול";

export function CustomerHomeBody({
  backdrop,
  greetingHe,
  addressLabelHe,
  services,
  recent = [],
  availability,
  nowMs,
  matchRules,
  injectedText = null,
  photoMatch = null,
  recognising = false,
  understand,
  totalAvailableNow,
  onSelectService,
  onChangeAddress,
  onAdvertise,
  seedQueryHe,
  capture,
  onSelectCategory,
  worldSources,
  onStroll,
  strollNeedsAvatar = false,
  liveLineHe = null,
  width = 390,
  height = 780,
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

  const [query, setQuery] = useState(seedQueryHe ?? "");

  /*
   * A SENTENCE HANDED BACK FROM SOMEWHERE ELSE.
   *
   * The category screen lets somebody type when none of its rows is what
   * they need. If the text matches nothing inside that category, it comes
   * here — where the whole catalogue can answer it — and it must arrive in
   * the field rather than being dropped on the way. A customer who typed a
   * sentence and landed on an empty home screen would reasonably conclude
   * the app ignored them.
   *
   * Keyed on the seed itself, so it fills the field when a new sentence
   * arrives and never fights the person's own typing afterwards.
   */
  useEffect(() => {
    if (seedQueryHe) setQuery(seedQueryHe);
  }, [seedQueryHe]);

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
  /*
   * "עוד קטגוריות" used to jump straight into the sixth department, which
   * is a tile pretending to be a category when it is really a door. With
   * eleven departments and five tiles the overflow is now most of the
   * catalogue, so it opens the full list.
   */
  const [showAllDepts, setShowAllDepts] = useState(false);
  /*
   * EVERY SERVICE, ONE TAP AWAY.
   *
   * Amit: *"רואים רק 8 מקצוענים בעמוד הראשי — מה עם כל השאר? שאנשים לא
   * ייכנסו וייצאו כי יחשבו שאין את השירות."* Eight faces are the eight
   * fields; the services are many more. So under the faces there is a door
   * that says how many, and it opens all of them, searchable.
   */
  const [showAllServices, setShowAllServices] = useState(false);
  const [filter, setFilter] = useState("");
  const listed = useMemo(
    () => (dept === ALL ? services : services.filter((s) => s.departmentHe === dept)),
    [services, dept]
  );

  useEffect(() => {
    if (injectedText && injectedText.text) setQuery(injectedText.text);
    // Only a new injection moves the box, never a re-render.
  }, [injectedText?.n]);

  const fromText = useMemo(
    () => (matchRules && query.trim().length >= 2 ? matchServicesByText(query, matchRules).map((m) => m.serviceId) : []),
    [query, matchRules]
  );

  /**
   * THE WORDS NO KEYWORD KNEW. Once the customer stops typing for a moment
   * and the keyword match found nothing, the sentence is read for meaning.
   * The answer belongs to the sentence it was asked about, so typing on
   * makes a stale answer disappear rather than linger under new words.
   */
  const [understood, setUnderstood] = useState<{ text: string; ids: string[] } | null>(null);
  const [understanding, setUnderstanding] = useState(false);
  const q = query.trim();
  useEffect(() => {
    if (!understand || q.length < 4 || fromText.length > 0 || understood?.text === q) return;
    let live = true;
    const t = setTimeout(() => {
      setUnderstanding(true);
      understand(q)
        .then((ids) => {
          if (live) setUnderstood({ text: q, ids: ids ?? [] });
        })
        .catch(() => {
          if (live) setUnderstood({ text: q, ids: [] });
        })
        .finally(() => {
          if (live) setUnderstanding(false);
        });
    }, 800);
    return () => {
      live = false;
      clearTimeout(t);
      setUnderstanding(false);
    };
  }, [understand, q, fromText.length, understood?.text]);

  const matched = useMemo(() => {
    const fromPhoto = photoMatch?.serviceId ? [photoMatch.serviceId] : [];
    const fromMeaning = fromText.length === 0 && understood?.text === q ? understood.ids : [];
    if (fromPhoto.length === 0 && (!matchRules || q.length < 2)) return null;
    const ids = [...fromPhoto, ...fromText, ...fromMeaning].filter((id, i, all) => all.indexOf(id) === i);
    return ids.map((id) => services.find((s) => s.id === id)).filter(Boolean) as HomeServiceItem[];
  }, [q, fromText, understood, matchRules, services, photoMatch]);

  const urgent = useMemo(() => (q.length >= 3 ? urgentCareFor(q) : null), [q]);

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
  if (showAllServices) {
    const f = filter.trim();
    // The list's own search understands the same sentences the home box
    // does — "הכלב צולע" finds the vet here too, not only "וטרינר".
    const meant = f && matchRules ? new Set(matchServicesByText(f, matchRules).map((m) => m.serviceId)) : null;
    const shown = f
      ? services.filter((s2) => s2.nameHe.includes(f) || (s2.descriptionHe ?? "").includes(f) || meant?.has(s2.id))
      : services;
    const groups = Array.from(new Set(shown.map((s2) => s2.departmentHe ?? "עוד"))).map((d) => ({
      d,
      items: shown.filter((s2) => (s2.departmentHe ?? "עוד") === d),
    }));
    return (
      <ScrollView style={[styles.screen, { width }]} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ paddingHorizontal: gutter, paddingTop: spacing.md }}>
          <Pressable onPress={() => { setShowAllServices(false); setFilter(""); }} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backText}>חזרה ›</Text>
          </Pressable>
          <Text style={styles.deptTitle}>כל {services.length} השירותים</Text>
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="חיפוש — למשל מזגן, תספורת, מנעול"
            placeholderTextColor="rgba(247,243,250,0.45)"
            accessibilityLabel="חיפוש שירות"
            style={styles.allSearch}
            textAlign="right"
          />
          {groups.length === 0 ? (
            <Text style={styles.allEmpty}>לא מצאנו שירות בשם הזה. אפשר לחזור ולתאר במילים שלכם — נתאים את המקצוען.</Text>
          ) : null}
          {groups.map((g) => (
            <View key={g.d} style={{ marginTop: spacing.lg }}>
              <Text style={styles.groupTitleQuiet}>{g.d}</Text>
              <View style={styles.rows}>
                {g.items.map((s2) => (
                  <Pressable
                    key={s2.id}
                    onPress={() => onSelectService?.(s2.id)}
                    accessibilityRole="button"
                    accessibilityLabel={s2.nameHe}
                    style={({ pressed }) => [styles.liveRow, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.liveName} numberOfLines={1}>{s2.nameHe}</Text>
                    <Text style={styles.liveSoft} numberOfLines={1}>{s2.priceHint ?? ""}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  if (showAllDepts && dept === ALL) {
    return (
      <ScrollView
        style={[styles.screen, { width }]}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
      >
        <View style={{ paddingHorizontal: gutter, paddingTop: spacing.md }}>
          <Pressable
            onPress={() => setShowAllDepts(false)}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            style={styles.back}
          >
            <Text style={styles.backText}>חזרה ›</Text>
          </Pressable>

          <Text style={styles.deptTitle}>כל הקטגוריות</Text>

          <View style={styles.rows}>
            {departments.map((d) => {
              const inDept = services.filter((s2) => s2.departmentHe === d);
              return (
                <CategoryCard
                  key={d}
                  nameHe={d}
                  mark={(inDept[0]?.departmentMark ?? inDept[0]?.mark ?? "handyman") as MarkName}
                  serviceCount={inDept.length}
                  liveCount={inDept.filter(isFree).length}
                  onPress={() => {
                    setShowAllDepts(false);
                    setDept(d);
                  }}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

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

    const quietGroups: {
      titleHe: string;
      noteHe: string;
      glyphHe: string;
      items: HomeServiceItem[];
    }[] = [
      {
        titleHe: "נבדוק ביחד",
        noteHe: "השירות פעיל. כמה אנשים פנויים תלוי ברגע — נבדוק ברגע שתבחרו.",
        glyphHe: "?",
        items: unknown,
      },
      {
        titleHe: "בתיאום מראש",
        noteHe: "עבודות שלפי טבען לא מתחילות ברגע — קובעים מועד.",
        glyphHe: "◷",
        items: scheduled,
      },
      {
        titleHe: "עוד לא באזור שלכם",
        noteHe: "פעיל אצלנו, פשוט עוד לא כאן.",
        glyphHe: "◎",
        items: elsewhere,
      },
      { titleHe: "בקרוב", noteHe: "בדרך למוצר, עוד לא נפתח.", glyphHe: "✧", items: soon },
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

          {/*
            * EACH GROUP IS A CARD, because each group is a different KIND
            * of answer — and the review's objection to the flat list was
            * precisely that the three kinds were rendered as one grey
            * column. A heading and a line of explanation at the top of a
            * raised surface says "this is a category of silence, and here
            * is what it means", which is the sentence the customer
            * otherwise has to assemble from four identical rows.
            */}
          {quietGroups.map((g) => (
            <View key={g.titleHe} style={styles.groupCard}>
              <View style={styles.groupCardHead}>
                <View style={styles.groupMark}>
                  <Text style={styles.groupMarkText}>{g.glyphHe}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitleQuiet}>{g.titleHe}</Text>
                  <Text style={styles.groupNote}>{g.noteHe}</Text>
                </View>
              </View>
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
    <View style={[styles.screen, { width, height }]}>
      {/* ---------------------------------------------------------------
          THE WORLD, BEHIND THE QUESTION.
          ---------------------------------------------------------------
          Amit asked for this directly a while back — *"חייב להשתמש גם במפה
          הזאת שאנחנו כל כך משקיעים בה במסך הראשי"* — and then, seeing the
          screen without it, said it was not at the level of the rest.

          It is the neighbourhood drifting behind the top third, with the
          page fading over it. Not the Living Map: no candidates, no
          venues, nothing interactive, nothing that could be mistaken for
          supply. Just the fact that this product happens somewhere.
          --------------------------------------------------------------- */}
      <View style={[styles.backdrop, { width }]} pointerEvents="none">
        {backdrop ?? <WorldBackdrop width={width} height={HOME_WORLD_HEIGHT} sources={worldSources} />}
        {/* The page coming up over the world, as one gradient. Bands with
            hard edges were what made the welcome screen look like artwork
            printed on strips of tape. */}
        <Scrim
          width={width}
          height={HOME_WORLD_HEIGHT}
          stops={[
            { at: 0, opacity: 0.5 },
            { at: 0.3, opacity: 0.3 },
            { at: 0.72, opacity: 0.86 },
            { at: 1, opacity: 1 },
          ]}
        />
      </View>

    {/*
      * `flex: 1` is what makes this scroll. Without a bounded height the
      * scroll view expands to its content and there is nothing to scroll —
      * see the `height` prop.
      */}
    <ScrollView
      style={[{ width, flex: 1 }]}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
          <View style={styles.captureWrap}>
            {/*
              * The lit panel needs a light source, or it is just a white
              * rectangle pasted onto black. A wide, very dim coral glow
              * behind it makes the card read as the thing the room is lit
              * by — which is exactly its job on this screen.
              */}
            <Glow
              color="signal"
              width={inner + spacing.xl * 2}
              height={260}
              intensity={0.13}
              originY={0.44}
              spread={0.6}
            />
            <CaptureCard
              tone="dark"
              width={inner}
              text={query}
              onChangeText={setQuery}
              photos={capture?.photos ?? 0}
              voiceSeconds={capture?.voiceSeconds ?? null}
              recording={capture?.recording ?? false}
              recordSeconds={capture?.recordSeconds ?? 0}
              canRecord={capture?.canRecord ?? false}
              recordBlockedHe={capture?.recordBlockedHe ?? null}
              onOpenInOwnTab={capture?.onOpenInOwnTab}
              onStartRecord={capture?.onStartRecord}
              onStopRecord={capture?.onStopRecord}
              onDeleteVoice={capture?.onDeleteVoice}
              onAddPhoto={capture?.onAddPhoto}
              onAddFromLibrary={capture?.onAddFromLibrary}
              onClearPhotos={capture?.onClearPhotos}
            />
          </View>
        ) : null}

        {urgent === "person" ? (
          <Pressable
            onPress={() => void Linking.openURL("tel:101")}
            accessibilityRole="button"
            accessibilityLabel="חיוג למד״א 101"
            style={({ pressed }) => [styles.urgent, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.urgentTitle}>מצב מסכן חיים? חייגו עכשיו למד״א — 101</Text>
            <Text style={styles.urgentSub}>לחיצה כאן מחייגת. אל תחכו לאף שירות.</Text>
          </Pressable>
        ) : urgent === "animal" ? (
          <View style={styles.urgentSoft}>
            <Text style={styles.urgentSoftText}>
              אם החיה לא נושמת או איבדה הכרה — כל דקה חשובה: סעו גם למוקד וטרינרי לחירום הקרוב.
            </Text>
          </View>
        ) : null}

        {suggestions !== null || hasMedia ? (
          <View style={{ marginTop: spacing.lg }}>
            <IntentSuggestions
              width={inner}
              matches={suggestions}
              hasText={hasText}
              hasMedia={hasMedia}
              recognising={recognising}
              understanding={understanding}
              seenHe={photoMatch?.seenHe ?? null}
              onPick={(id) => onSelectService?.(id)}
              onBrowse={() => setShowAllServices(true)}
              browseLabelHe={`כל ${services.length} השירותים ›`}
            />
          </View>
        ) : null}

        {/* ---------------------------------------------------------------
            THE WAYS IN.
            ---------------------------------------------------------------
            This was a six-tile grid of outline icons with a "···" tile
            reading "עוד קטגוריות". Amit: *"גם העמוד הזה וההצעות האלה מזה
            קשור."* A broom glyph belongs to every cleaning app ever built
            and says nothing about a product whose whole language is a world
            with people in it — and a tile whose content is "there is more of
            this" is the catalogue admitting what it is.

            Eight ways in now, grouped the way somebody thinks rather than
            the way dispatch is organised, each wearing the face of the
            person who does that work. None of them carries a name, a rating
            or an availability dot: they navigate, they do not report.
            --------------------------------------------------------------- */}
        {/* ---------------------------------------------------------------
            THE STREET, AS A DOOR AND NOT AS A DECORATION.

            It sits above the categories rather than below them because it
            is the same act — choosing what you need — done by walking
            instead of by reading a grid. Below the grid it would be a
            curiosity somebody finds once.

            It promises nothing about supply: a street of trades, with the
            question of who is actually free left where it belongs, in the
            request. See `StrollBody`.
            --------------------------------------------------------------- */}
        {onStroll ? (
          <Pressable
            onPress={onStroll}
            accessibilityRole="button"
            accessibilityLabel={
              strollNeedsAvatar ? "בחירת דמות וטיול ברחוב של פרו נאו" : "טיול ברחוב של פרו נאו"
            }
            style={({ pressed }) => [styles.stroll, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.strollText}>טיילו ברחוב של PRO NOW</Text>
            <Text style={styles.strollSub}>
              {strollNeedsAvatar ? "בחרו דמות ותצאו לרחוב" : "לכו בין העסקים עם הדמות שלכם"}
            </Text>
          </Pressable>
        ) : null}

        <View style={{ marginTop: spacing.xl }}>
          <Text style={styles.orPick}>או בחרו לפי תחום</Text>
          <CategoryFaces
            width={inner}
            sources={worldSources}
            onSelect={(id) => onSelectCategory?.(id)}
          />
          <Pressable
            onPress={() => setShowAllServices(true)}
            accessibilityRole="button"
            accessibilityLabel={`כל ${services.length} השירותים`}
            style={({ pressed }) => [styles.allBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.allBtnText}>כל {services.length} השירותים ›</Text>
            <Text style={styles.allBtnSub}>מזגן, מנעולן, צבע, טכנאי מחשבים, מאמן כושר, וטרינר ועוד — עם חיפוש</Text>
          </Pressable>
        </View>

        {/* ---------------------------------------------------------------
            WHAT CAN ACTUALLY HAPPEN RIGHT NOW.
            Rows, not a panel in a box: this is a short live readout, and
            boxing it turned it into a table of figures in review.
            --------------------------------------------------------------- */}
        {/* ---------------------------------------------------------------
            WHAT IS TRUE RIGHT NOW, IN ONE LINE.
            ---------------------------------------------------------------
            This was a boxed list headed "אפשר להזמין עכשיו" carrying four
            services with minute counts beside them — "פתיחת סתימה 11 דק׳",
            "ננעלתי בחוץ 22 דק׳". Amit asked what those had to do with
            anything, and the honest answer is: nothing. They were the first
            four rows of the catalogue that happened to have supply. Nobody
            on this screen has said they are locked out, so an ETA for being
            locked out is a number applied to a stranger.

            What the availability snapshot actually knows is one fact, and
            it is a good one: how many professionals are online around here
            at this moment. That is worth saying plainly and is true for
            whoever is reading. Services with ETAs belong further in, once
            somebody has said what they need — which is exactly where they
            already appear.
            --------------------------------------------------------------- */}
        {liveLineHe ? (
          <View style={styles.liveNow}>
            <Pulse color={colors.action} size={6} />
            <Text style={styles.liveNowText}>{liveLineHe}</Text>
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

        {/* --- The last row on the page, for somebody else entirely --- */}
        {onAdvertise ? (
          <Pressable
            onPress={onAdvertise}
            accessibilityRole="button"
            accessibilityLabel="יש לך עסק? פתיחת חנות בשכונה של PRO NOW"
            style={({ pressed }) => [styles.advertise, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.advertiseText}>יש לך עסק? פתחו חנות בשכונה ›</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

/**
 * How tall the world is behind the top of the home screen.
 *
 * A third of a tall phone: enough to be a place, not so much that the
 * question and the ways in get pushed below the fold. Fixed rather than a
 * percentage because it is composed against the header and the capture
 * card, which do not scale with the screen either.
 */
const HOME_WORLD_HEIGHT = 300;

const styles = StyleSheet.create({
  urgent: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#B3261E",
    gap: 2,
  },
  urgentTitle: { ...type.bodyStrong, color: "#FFFFFF", textAlign: "right", writingDirection: "rtl" },
  urgentSub: { ...type.meta, color: "rgba(255,255,255,0.86)", textAlign: "right", writingDirection: "rtl" },
  urgentSoft: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: tint.neutralDark(0.07),
    borderRightWidth: 3,
    borderRightColor: "#E5484D",
  },
  urgentSoftText: { ...type.meta, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  stroll: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: "rgba(46,38,64,0.92)",
    alignItems: "center",
    gap: 2,
  },
  strollText: { ...type.bodyStrong, color: "#F7F3FA", writingDirection: "rtl" },
  strollSub: { ...type.caption, color: "rgba(247,243,250,0.7)", writingDirection: "rtl" },
  backdrop: { position: "absolute", top: 0, left: 0, height: HOME_WORLD_HEIGHT },

  liveNow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  liveNowText: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl" },

  screen: { backgroundColor: colors.bg },

  /*
   * A CHIP, BECAUSE IT IS STANDING ON ARTWORK NOW.
   *
   * Secondary-grey text worked on an ivory page and disappeared over the
   * neighbourhood — trees and pavement behind small type is the most
   * reliable way to make a label unreadable. Text on a picture needs a
   * surface of its own; a colour change alone only moves the problem to a
   * different part of the image.
   */
  address: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 6,
    /*
     * 44, NOT 40. It is the address the professional is sent to, and
     * changing it is the one control on this screen a person taps in a
     * hurry, standing somewhere that is not home. `verify:a11y` measured
     * it at 40 — under Apple's 44pt minimum, which is the size below
     * which a thumb starts missing. Four points is the whole fix.
     */
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.55)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(247,243,250,0.14)",
  },
  addressText: { ...type.meta, color: colors.textPrimary, writingDirection: "rtl", maxWidth: 220 },
  addressChevron: { ...type.meta, color: colors.textSecondary, marginTop: -3 },

  greeting: {
    ...type.body,
    // Over the world, so it takes the bright text colour and a shadow
    // rather than the quiet grey it had on ivory.
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    textShadowColor: "rgba(16,12,22,0.9)",
    textShadowRadius: 8,
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
    textShadowColor: "rgba(16,12,22,0.9)",
    textShadowRadius: 10,
  },

  captureWrap: { marginTop: spacing.lg, alignItems: "center" },
  allBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,107,74,0.55)",
    backgroundColor: "rgba(255,107,74,0.10)",
    alignItems: "flex-end",
  },
  allBtnText: { ...type.bodyStrong, color: "#FF8A6E", writingDirection: "rtl", textAlign: "right" },
  allBtnSub: { ...type.caption, color: "rgba(247,243,250,0.7)", writingDirection: "rtl", textAlign: "right", marginTop: 2 },
  allSearch: {
    ...type.body,
    marginTop: spacing.md,
    color: "#F7F3FA",
    backgroundColor: depth.panel.mid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.12)",
    paddingHorizontal: spacing.md,
    minHeight: 48,
    writingDirection: "rtl",
  },
  allEmpty: { ...type.body, color: "rgba(247,243,250,0.7)", textAlign: "right", writingDirection: "rtl", marginTop: spacing.lg },
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
  groupCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: depth.panel.low,
    ...depth.litEdge(0.05),
  },
  groupCardHead: { flexDirection: "row-reverse", gap: spacing.md, alignItems: "flex-start" },
  groupMark: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: tint.neutralDark(0.07),
    alignItems: "center",
    justifyContent: "center",
  },
  groupMarkText: { ...type.body, color: colors.textSecondary },
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

  /*
   * Quiet on purpose. It is a doorway for a different visitor, not an
   * offer being made to the customer — so it reads like a footer link
   * and not like anything on this page that leads to a professional.
   */
  advertise: {
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: tint.neutralDark(0.1),
    minHeight: 44,
    justifyContent: "center",
  },
  advertiseText: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  livePanel: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: depth.panel.low,
    ...depth.litEdge(0.06),
  },
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
