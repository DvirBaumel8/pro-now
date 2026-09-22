import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  formatMoney,
  groundDisclosureHe,
  money,
  type ProPresenceState,
  type WorldGeo,
} from "@pro-now/types";

import { proTheme, radii, spacing, tabular, tint, type } from "../theme";
import { MapSurface } from "../components/MapSurface";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import type { WorldAssetSources } from "../components/livingmap/AssetSlot";

/** How tall the band at the top of this screen is. */
const MAP_BAND_HEIGHT = 172;
import { Chip } from "../components/surfaces";
import { Mark, type MarkName } from "../components/marks";
import {
  briefingLines,
  formatOnlineDuration,
  rateWithheldCopy,
  readShift,
  type ShiftBriefing,
  type ShiftSnapshot,
} from "../shift-metrics";

/**
 * P01 — "המשמרת שלי". The professional's first screen, and the one they look
 * at most.
 *
 * It answers exactly two questions, and which one it answers depends on
 * whether the shift is running:
 *
 *   OFFLINE →  "is it worth going online right now?"
 *   ONLINE  →  "is this shift working?"
 *
 * Those are different screens wearing the same frame, which is why this is
 * one component with one honest switch rather than two screens the
 * professional has to find.
 *
 * WHY THIS SITS BESIDE `ProOnlineBody` RATHER THAN REPLACING IT.
 * `ProOnlineBody` is the map-first presence surface: where am I, am I live,
 * which services are armed. This is the numbers surface. Merging them
 * produces a screen where the single most consequential control in the
 * product — GO ONLINE — competes for attention with six figures, and the
 * control loses.
 *
 * THE THING THIS SCREEN REFUSES TO DO. Every marketplace app eventually
 * grows a "surge nearby!" banner, because it works: it gets people online.
 * It also, when the server never said any such thing, invents demand — which
 * /CLAUDE.md §3 forbids and which costs far more than it earns the first
 * time someone drives in and finds an empty evening. So the briefing renders
 * only lines the server actually supplied (`briefingLines`), the screen is
 * built to look correct with ZERO of them, and the fallback is the one
 * number nobody can dispute: what this professional themselves earned last
 * week.
 */

const colors = proTheme.colors;

const ONLINE_STATES: ProPresenceState[] = [
  "AVAILABLE",
  "OFFER_RECEIVED",
  "RESERVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "SERVICING",
  "COMPLETING",
];

export interface ShiftServiceChip {
  id: string;
  nameHe: string;
  mark: MarkName;
  live: boolean;
}

export interface ProShiftBodyProps {
  /** A real street plan, when there is one. See `WorldGround`. */
  geo?: WorldGeo | null;

  displayNameHe: string;
  presenceState: ProPresenceState;
  /** The live shift, as the server reports it. */
  shift: ShiftSnapshot;
  /** What the server knows about the area right now. Fields may be absent. */
  briefing?: ShiftBriefing;
  /** Services armed for this shift. */
  services: ShiftServiceChip[];
  /** Injected so the screen is deterministic in tests and in the gallery. */
  nowMs?: number;
  onToggleOnline?: () => void;
  onOpenEarnings?: () => void;
  onManageServices?: () => void;
  /**
   * Where the professional sets what they charge.
   *
   * A separate door from "ניהול", which is about documents and
   * eligibility. The two get confused easily and they fail differently:
   * an unset price is fixed here in ten seconds, an expired insurance is
   * not fixed on a phone at all.
   */
  onOpenPricing?: () => void;
  /**
   * The map-forward presence screen — where am I, and am I on shift.
   *
   * A separate door from "שירותים", which is about which work you are
   * taking. "ניהול" used to mean this one while sitting beside the
   * service list, which is how a professional looking for the service
   * switches ended up somewhere about location.
   */
  onOpenPresence?: () => void;
  width?: number;
  height?: number;
  /**
   * The world's art. Absent, the band falls back to the abstract grid.
   * The professional's app carries the plate and nothing else — see its
   * `worldSources`.
   */
  worldSources?: WorldAssetSources;
  /** False holds the city still, for screenshots and tests. */
  animate?: boolean;
}

export function ProShiftBody({
  geo = null,
  displayNameHe,
  presenceState,
  shift,
  briefing,
  services,
  nowMs,
  onToggleOnline,
  onOpenEarnings,
  onManageServices,
  onOpenPricing,
  onOpenPresence,
  width = 390,
  height = 780,
  worldSources,
  animate = true,
}: ProShiftBodyProps) {
  const now = nowMs ?? Date.now();
  const reading = readShift(shift, now);
  const isOnline = ONLINE_STATES.includes(presenceState);
  const isTransitioning = presenceState === "STARTING_SHIFT" || presenceState === "ENDING_SHIFT";
  const liveServices = services.filter((s) => s.live);

  const lines = briefingLines(briefing ?? {});
  /*
   * A pack of one file is a complete world — see the professional app's
   * `worldSources`. What is NOT a world is an empty object, which is what
   * a build without the art has, so the plate itself is the test.
   */
  const hasWorld = Boolean(worldSources?.["world_neighbourhood"]);
  const money0 = (v: number | null) => (v === null ? "—" : formatMoney(money(v, "ILS")));

  return (
    <View style={[styles.screen, { width, height }]}>
      {/*
        * A quiet band with somewhere in it. Context, not the subject —
        * the numbers are.
        *
        * ---------------------------------------------------------------
        * THE ONE SCREEN IN THE PRODUCT THAT HAPPENED NOWHERE
        * ---------------------------------------------------------------
        * This was an abstract grey street grid. That was an honest
        * placeholder — the maps vendor is an open business decision
        * (/CLAUDE.md §4) and `MapSurface` carries no geography and says
        * so — and it is still the screen a professional opens every
        * morning. Their customer, standing on the same street, gets a
        * city with light in it; they got a wireframe.
        *
        * So when the art is there, the band is the same neighbourhood the
        * customer is looking at, from above, resting. It is not a map and
        * does not pretend to be: no position, no pin, no other
        * professionals — `WorldBackdrop` has nowhere to put any of those,
        * which is the same structural safeguard the customer's side
        * relies on. The state is still carried by the status line, which
        * is the only thing on here that is allowed to say anything.
        *
        * Without the art it is the grid, unchanged. A screen that renders
        * a blank rectangle when a file is missing is worse than the
        * placeholder it replaced.
        */}
      <View style={styles.mapBand}>
        {hasWorld ? (
          <>
            <WorldBackdrop
              width={width}
              height={MAP_BAND_HEIGHT}
              sources={worldSources}
              animate={animate}
              /*
               * The professional's city is the customer's city. It was
               * the last screen still on the painted plate, which is a
               * quieter version of the same drift: a plumber and the
               * person who called them looking at two different streets
               * with the same names.
               */
              geo={geo}
            />
            {/*
              * The state, in words, over the city — with its own plate,
              * because the plate is lit paving and white type on lit
              * paving is not type. See `verify:a11y`'s artwork check.
              */}
            <View style={styles.worldStatus} pointerEvents="none">
              <Text style={styles.worldStatusText} numberOfLines={1}>
                {isOnline ? "מחובר — קריאות באזור שלך יגיעו לכאן" : "לא מחובר"}
              </Text>
            </View>
            {/* The one line that keeps an invented city honest. */}
            <View style={styles.worldNote} pointerEvents="none">
              <Text style={styles.worldNoteText} numberOfLines={1}>
                {groundDisclosureHe({ realStreets: Boolean(geo?.real) })}
              </Text>
            </View>
          </>
        ) : (
          <MapSurface
            colors={{ ...colors, action: colors.trust }}
            dark
            height={MAP_BAND_HEIGHT}
            pulsing={isOnline}
            statusText={isOnline ? "מחובר — קריאות באזור שלך יגיעו לכאן" : "לא מחובר"}
            statusTopOffset={16}
          />
        )}
        <View style={styles.mapFade} pointerEvents="none" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headRow}>
          <Text style={styles.name} numberOfLines={1}>
            {displayNameHe}
          </Text>
          <View style={styles.headLeft}>
            {isOnline ? <Beacon color={colors.trust} /> : null}
            <Text
              style={[
                styles.headState,
                {
                  color: isTransitioning
                    ? colors.statusWarning
                    : isOnline
                      ? colors.trust
                      : colors.textSecondary,
                },
              ]}
            >
              {isTransitioning ? "רגע…" : isOnline ? "במשמרת" : "מחוץ למשמרת"}
            </Text>
          </View>
        </View>

        {isOnline ? (
          // -------------------------------------------------------------
          // בזמן המשמרת — is this shift working?
          // -------------------------------------------------------------
          <>
            <View style={styles.bigCard}>
              <Text style={styles.bigLabel}>מחובר כבר</Text>
              <Text style={styles.bigValue}>{formatOnlineDuration(reading.onlineMinutes)}</Text>
              <Text style={styles.bigSub}>
                {reading.inProgressJobs > 0
                  ? "עבודה פעילה עכשיו — תיסגר בסיום"
                  : "כל עוד אתה מחובר, קריאות מתאימות יישלחו אליך אחת בכל פעם"}
              </Text>
            </View>

            <View style={styles.metrics}>
              <Metric
                label="הרווח במשמרת"
                value={money0(reading.settledNetMinorUnits)}
                sub={
                  reading.completedJobs === 0
                    ? "טרם נסגרה עבודה"
                    : reading.completedJobs === 1
                      ? "עבודה אחת נסגרה"
                      : `${reading.completedJobs} עבודות נסגרו`
                }
                tone="trust"
              />
              <Metric
                label="לשעת חיבור"
                value={money0(reading.perOnlineHourMinorUnits)}
                /**
                 * The most important string on the screen. When the rate is
                 * missing, the professional is told WHY — not left to
                 * conclude the app is broken, and not handed a wild number
                 * computed from nine minutes of data.
                 */
                sub={rateWithheldCopy(reading) ?? "מבוסס על עבודות שנסגרו במשמרת"}
                tone={reading.perOnlineHourMinorUnits === null ? "muted" : "trust"}
              />
            </View>

            {reading.utilisation !== null ? (
              <View style={styles.util}>
                <View style={styles.utilTrack}>
                  <View style={[styles.utilFill, { width: `${Math.round(reading.utilisation * 100)}%` }]} />
                </View>
                <Text style={styles.utilText}>
                  {Math.round(reading.utilisation * 100)}% מזמן החיבור עבר על עבודות
                </Text>
              </View>
            ) : null}
          </>
        ) : (
          // -------------------------------------------------------------
          // היום שלי — is it worth going online right now?
          // -------------------------------------------------------------
          <>
            <View style={styles.bigCard}>
              <Text style={styles.bigLabel}>היום שלך</Text>
              <Text style={styles.bigValue}>
                {liveServices.length === 0
                  ? "אין שירות פעיל"
                  : liveServices.length === 1
                    ? "שירות אחד מוכן"
                    : `${liveServices.length} שירותים מוכנים`}
              </Text>
              <Text style={styles.bigSub}>
                {liveServices.length === 0
                  ? "השלם אימות לשירות אחד לפחות כדי להתחיל לקבל קריאות"
                  : "ברגע שתתחבר, קריאות מתאימות באזור שלך יגיעו אליך"}
              </Text>
            </View>

            {lines.length > 0 ? (
              <View style={styles.briefing}>
                {lines.map((l) => (
                  <View key={l.kind} style={styles.briefRow}>
                    <View
                      style={[
                        styles.briefDot,
                        { backgroundColor: l.kind === "DEMAND" ? colors.action : colors.trust },
                      ]}
                    />
                    <Text style={styles.briefText}>{l.textHe}</Text>
                  </View>
                ))}
                <Text style={styles.briefNote}>
                  המספרים מגיעים מהשרת ומתארים מה קרה בפועל. אין כאן תחזית.
                </Text>
              </View>
            ) : (
              /**
               * The zero-line case, designed rather than tolerated. An empty
               * briefing is the normal state early in a pilot and after any
               * server hiccup, and a screen that collapses without it would
               * push the next engineer to invent a number to fill the hole.
               */
              <View style={styles.briefing}>
                <Text style={styles.briefText}>
                  אין כרגע נתוני אזור לשעה האחרונה.
                </Text>
                <Text style={styles.briefNote}>
                  לא נציג מספר שלא קיבלנו מהשרת. אפשר להתחבר ולראות מה מגיע.
                </Text>
              </View>
            )}
          </>
        )}

        {/* --- Services armed for this shift --- */}
        {/* ----------------------------------------------------------------
            THREE DOORS, EACH SAYING WHERE IT GOES.

            Amit: *"איך מנהלים את העמוד הזה? איך אני מוריד ומעלה
            אפשרויות?"*

            There was one link here, "ניהול", sitting beside "שירותים
            במשמרת" — and it opened the PRESENCE screen, which is about
            location and shift state. From there a second "ניהול" reached
            the services. So the link that looked like the answer was two
            hops from it and the first hop went somewhere else entirely.

            A label next to a list of services promises that list. These
            say which one they mean.
            ---------------------------------------------------------------- */}
        <View style={styles.servicesHead}>
          <Pressable onPress={onManageServices} accessibilityRole="button" style={styles.manageHit}>
            <Text style={styles.manage}>שירותים</Text>
          </Pressable>
          {onOpenPresence ? (
            <Pressable
              onPress={onOpenPresence}
              accessibilityRole="button"
              accessibilityLabel="מיקום ומצב המשמרת"
              style={styles.manageHit}
            >
              <Text style={styles.manage}>מיקום</Text>
            </Pressable>
          ) : null}
          {onOpenPricing ? (
            <Pressable
              onPress={onOpenPricing}
              accessibilityRole="button"
              accessibilityLabel="קביעת המחירים שלי"
              style={styles.manageHit}
            >
              <Text style={styles.manage}>מחירים</Text>
            </Pressable>
          ) : null}
          <Text style={styles.servicesTitle}>
            שירותים במשמרת · {liveServices.length}/{services.length}
          </Text>
        </View>

        <View style={styles.chips}>
          {services.map((s) => (
            <View
              key={s.id}
              style={[
                styles.chip,
                { borderColor: s.live ? tint.trust(0.4) : colors.border, opacity: s.live ? 1 : 0.55 },
              ]}
            >
              <Mark name={s.mark} size={16} color={s.live ? colors.trust : colors.textSecondary} />
              <Text style={[styles.chipText, { color: s.live ? colors.textPrimary : colors.textSecondary }]}>
                {s.nameHe}
              </Text>
            </View>
          ))}
        </View>

        <Pressable onPress={onOpenEarnings} accessibilityRole="button" style={styles.earningsLink}>
          <Text style={styles.earningsLinkText}>הרווחים שלי — פירוט מלא</Text>
          <Chip label="שבוע" colors={colors} tone="neutral" />
        </Pressable>
      </ScrollView>

      {/* The one decision on this screen keeps its own space at the bottom. */}
      <View style={styles.ctaBar}>
        <Pressable
          onPress={onToggleOnline}
          disabled={isTransitioning || (!isOnline && liveServices.length === 0)}
          accessibilityRole="button"
          accessibilityLabel={isOnline ? "סיום משמרת" : "התחלת משמרת"}
          style={({ pressed }) => [
            styles.cta,
            isOnline ? styles.ctaEnd : styles.ctaStart,
            pressed && { opacity: 0.85 },
            (isTransitioning || (!isOnline && liveServices.length === 0)) && { opacity: 0.45 },
          ]}
        >
          <Text style={[styles.ctaText, { color: isOnline ? colors.textPrimary : colors.onAction }]}>
            {isTransitioning ? "רגע…" : isOnline ? "סיום משמרת" : "התחלת משמרת"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "trust" | "muted";
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, { color: tone === "trust" ? colors.trust : colors.textSecondary }]}
      >
        {value}
      </Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function Beacon({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      style={[
        styles.beacon,
        { backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }) },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden" },
  mapBand: { height: MAP_BAND_HEIGHT, overflow: "hidden" },
  worldStatus: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(11,9,24,0.78)",
  },
  worldStatusText: { ...type.caption, color: "#F7F3FA", writingDirection: "rtl" },
  worldNote: {
    position: "absolute",
    bottom: 6,
    alignSelf: "center",
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(12,9,16,0.72)",
  },
  worldNoteText: { ...type.micro, color: "rgba(247,243,250,0.82)", writingDirection: "rtl" },
  mapFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    backgroundColor: colors.bg,
    opacity: 0.55,
  },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  headRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headLeft: { flexDirection: "row-reverse", alignItems: "center", gap: 6 },
  headState: { ...type.overline },
  name: { ...type.h3, color: colors.textPrimary, textAlign: "right", flexShrink: 1 },
  beacon: { width: 8, height: 8, borderRadius: 4 },

  bigCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  bigLabel: { ...type.overline, color: colors.textSecondary, textAlign: "right" },
  bigValue: { ...type.h1, ...tabular, color: colors.textPrimary, textAlign: "right", marginTop: 2 },
  bigSub: { ...type.caption, color: colors.textSecondary, textAlign: "right", marginTop: 6 },

  metrics: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.md },
  metric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metricLabel: { ...type.overline, color: colors.textSecondary, textAlign: "right" },
  metricValue: { ...type.h2, ...tabular, textAlign: "right", marginTop: 2 },
  metricSub: { ...type.caption, color: colors.textSecondary, textAlign: "right", marginTop: 4 },

  util: { marginTop: spacing.md },
  utilTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceElevated, overflow: "hidden" },
  utilFill: { height: 6, borderRadius: 3, backgroundColor: colors.trust },
  utilText: { ...type.caption, color: colors.textSecondary, textAlign: "right", marginTop: 6 },

  briefing: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  briefRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  briefDot: { width: 7, height: 7, borderRadius: 4 },
  briefText: { ...type.body, color: colors.textPrimary, textAlign: "right", flexShrink: 1 },
  briefNote: { ...type.caption, color: colors.textSecondary, textAlign: "right" },

  servicesHead: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  servicesTitle: { ...type.overline, color: colors.textSecondary },
  manageHit: { minHeight: 44, minWidth: 64, justifyContent: "center", alignItems: "flex-start" },
  manage: { ...type.overline, color: colors.actionText },

  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.surface,
    minHeight: 36,
  },
  chipText: { ...type.caption },

  earningsLink: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  earningsLinkText: { ...type.body, color: colors.textPrimary },

  ctaBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: { minHeight: 56, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
  ctaStart: { backgroundColor: colors.action },
  ctaEnd: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  ctaText: { ...type.bodyStrong },
});
