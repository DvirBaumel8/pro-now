import React from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import {
  discoveryProgressHe,
  playDrawerActions,
  playDrawerStatusHe,
  type DiscoveryState,
  type PlayDrawerActionId,
} from "@pro-now/types";

import { palette, radii, scale, spacing, type } from "../../theme";
import { useSheetDrag } from "../useSheetDrag";

/**
 * PLAY DRAWER — the answer to "it gets stuck and there is nothing to do".
 *
 * ---------------------------------------------------------------------
 * A DEFECT, NOT A MISSING FEATURE
 * ---------------------------------------------------------------------
 * Amit played the first waiting game and found its real problem before its
 * aesthetic one: *"שאתה מסיים זה נתקע על המסך ואין מה לעשות, אין אפשרות
 * לחזור לתפריט."* Collecting the last orb left the screen with nowhere to
 * go — during the one part of the job where someone is waiting for a
 * stranger to arrive at their home.
 *
 * The fix is structural rather than a button. There is no end state,
 * because there is no state this drawer is absent from. It is always
 * mounted through the wait, it always names the one fact that matters, and
 * it always offers a way onward. A "Game Over" screen cannot appear because
 * nothing here ever finishes.
 *
 * ChatGPT: *"לא modal. לא Game Over. לא מסך סיום."*
 *
 * ---------------------------------------------------------------------
 * AND IT IS NOT A GAME MENU
 * ---------------------------------------------------------------------
 * The status line is real dispatch data or an honest absence, never a
 * countdown invented to fill the strip. Following the arrival and the job
 * details sit beside playing, at the same size, because for most people
 * those are the reason the screen is open.
 */
export interface PlayDrawerProps {
  firstNameHe: string | null;
  etaMinutes: number | null;
  discoveries: DiscoveryState;
  hasJobDetails?: boolean;
  onAction?: (id: PlayDrawerActionId) => void;
  /** The call is for someone else: who is at the door, and what they were sent. */
  onSiteNameHe?: string | null;
  onOpenOnSite?: () => void;
  /** Replaces the status line — the live card above already says who and when. */
  statusHe?: string | null;
  /** Actions already offered elsewhere on the screen (the stroll invitation). */
  omit?: readonly PlayDrawerActionId[];
  /**
   * Pulled up, the drawer shows the job itself (artifact comment, 2026-09-29:
   * "רוצים למשוך למעלה ולא נגלל שום פרטים") — what, when, how much, where.
   */
  detailsHe?: ReadonlyArray<{ labelHe: string; valueHe: string }>;
  /**
   * THE WAIT, ONE PANEL (Amit + design review, 2026-09-29): with this set, the
   * drawer is the stroll invitation — one gold button with the customer's own
   * character — and two quiet links, instead of a card and two tiles.
   */
  stroll?: { onPress: () => void; labelHe: string; noteHe: string; avatarUri?: string | null } | null;
}

const TILE_LOOK: Record<PlayDrawerActionId, { glyph: string; tint: string; subHe: string }> = {
  PLAY_MORE: { glyph: "✦", tint: "#8B5CF6", subHe: "עוד עסקים ברחוב" },
  FOLLOW_PRO: { glyph: "➜", tint: "#FF6B4A", subHe: "על המפה, בזמן אמת" },
  JOB_DETAILS: { glyph: "☰", tint: "#2FBF8A", subHe: "מה הזמנת ומה סוכם" },
  WHILE_YOU_WAIT: { glyph: "☕", tint: "#F59E0B", subHe: "חנויות מומלצות ברחוב" },
};

export function PlayDrawer({ firstNameHe, etaMinutes, discoveries, hasJobDetails = true, onAction, onSiteNameHe = null, onOpenOnSite, statusHe, omit = [], detailsHe = [], stroll = null }: PlayDrawerProps) {
  const onSiteFirst = onSiteNameHe ? onSiteNameHe.replace(/ \(תצוגה\)$/, "") : null;
  const status = statusHe !== undefined && statusHe !== null ? statusHe : onSiteFirst && firstNameHe
    ? `${firstNameHe} בדרך אל ${onSiteFirst}${etaMinutes !== null ? ` · ${etaMinutes} דק׳` : ""}`
    : playDrawerStatusHe({ firstNameHe, etaMinutes });
  const progress = discoveryProgressHe(discoveries);
  const base = playDrawerActions({ firstNameHe, discoveries, hasJobDetails }).filter((a) => !omit.includes(a.id));

  /* The only idle motion in the wait panel: your character breathing. */
  const breathe = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!stroll) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [stroll, breathe]);
  /* Pull down to fold it to its headline and see the city; up to open. */
  const drag = useSheetDrag({ peek: 58 });
  /* Pulled up, it opens a second row: the sponsors' shops to visit while waiting. */
  const actions = drag.expanded && !base.some((a) => a.id === "WHILE_YOU_WAIT")
    ? [...base, { id: "WHILE_YOU_WAIT" as const, labelHe: "בזמן שמחכים" }]
    : base;
  return (
    <Animated.View style={[styles.drawer, { transform: [{ translateY: drag.y }] }]} pointerEvents="box-none" onLayout={drag.measure} {...drag.bindBody}>
      {/* The handle AND the title pull — a thumb aims at the words, not a 4pt bar. */}
      <View {...drag.bind} style={styles.dragZone} accessibilityRole="button" accessibilityLabel={drag.expanded ? "סגירת הפרטים" : "פתיחת פרטי העבודה"}>
        <View style={styles.handle} />
        {stroll ? null : (
          <Text style={styles.status} numberOfLines={1}>
            {status}
          </Text>
        )}
      </View>

      {onSiteNameHe ? (
        <Pressable onPress={onOpenOnSite} accessibilityRole="button" accessibilityLabel={`מה ${onSiteNameHe.split(" ")[0]} רואה`} style={styles.onSite}>
          <Text style={styles.onSiteText} numberOfLines={1}>
            {onSiteNameHe.split(" ")[0]} קיבל הודעה עם הפרטים וקוד לדלת · <Text style={styles.onSiteGo}>מה {onSiteNameHe.split(" ")[0]} רואה ›</Text>
          </Text>
        </Pressable>
      ) : null}

      {/*
        * The counter appears only once someone has found something. Before
        * that "מצאת 0 מתוך 6" would be an instruction, and nobody has to
        * play — *"לא הייתי הופך את זה ל'משחק שחייבים לשחק'"*.
        */}
      {progress ? (
        <Text style={styles.progress} numberOfLines={1}>
          {progress}
        </Text>
      ) : null}

      {/*
        * THREE DOORS, NOT THREE CHIPS.
        *
        * Amit: *"הכפתורים למטה לא טובים וממורכזים, ובכלל לא מבינים מה
        * הם רוצים — נראה זול."* Each is a tile with a sign and one line
        * saying where it takes you, the same width, across the drawer.
        */}
      {drag.expanded && detailsHe.length > 0 ? (
        <View style={styles.details}>
          {detailsHe.map((d) => (
            <View key={d.labelHe} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{d.labelHe}</Text>
              <Text style={styles.detailValue} numberOfLines={2}>{d.valueHe}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {stroll ? (
        /*
         * SAY WHAT EACH ONE DOES (Amit, 2026-09-29): "מפת הרחובות וטיול בעיר
         * שלנו והכל לא מובן". Three rows a person reads like a menu — an
         * icon, what it is in plain words, and what you get.
         */
        <View style={styles.rows}>
          {actions.some((a) => a.id === "FOLLOW_PRO") ? (
            <Pressable onPress={() => onAction?.("FOLLOW_PRO")} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={[styles.rowIcon, { backgroundColor: "#FF6B4A" }]}>
                <Text style={styles.rowGlyph}>➜</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{firstNameHe ? `איפה ${firstNameHe} עכשיו?` : "איפה המקצוען עכשיו?"}</Text>
                <Text style={styles.rowSub}>רואים על המפה, בזמן אמת</Text>
              </View>
              <Text style={styles.rowChevron}>‹</Text>
            </Pressable>
          ) : null}
          {actions.some((a) => a.id === "JOB_DETAILS") ? (
            <Pressable onPress={() => onAction?.("JOB_DETAILS")} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={[styles.rowIcon, { backgroundColor: "#2FBF8A" }]}>
                <Text style={styles.rowGlyph}>☰</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>מה הזמנתי</Text>
                <Text style={styles.rowSub}>המחיר, הכתובת וכל הפרטים</Text>
              </View>
              <Text style={styles.rowChevron}>‹</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={stroll.onPress} accessibilityRole="button" accessibilityLabel={stroll.labelHe} style={({ pressed }) => [styles.row, styles.rowPlay, pressed && styles.rowPressed]}>
            <Animated.View style={[styles.rowIcon, styles.rowMe, { transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}>
              {stroll.avatarUri ? <Image source={{ uri: stroll.avatarUri }} style={{ width: "100%", height: "100%" }} /> : <Text style={styles.rowGlyph}>✦</Text>}
            </Animated.View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{stroll.labelHe}</Text>
              <Text style={styles.rowSub}>{stroll.noteHe}</Text>
            </View>
            <Text style={[styles.rowChevron, { color: "#FF9A6B" }]}>‹</Text>
          </Pressable>
        </View>
      ) : (
      <View style={styles.actions}>
          {actions.map((a) => {
            const look = TILE_LOOK[a.id];
            return (
              <Pressable
                key={a.id}
                onPress={() => onAction?.(a.id)}
                accessibilityRole="button"
                accessibilityLabel={a.labelHe}
                style={({ pressed }) => [styles.tile, { borderColor: look.tint + "66" }, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              >
                <View style={[styles.tileGlyph, { backgroundColor: look.tint }]}>
                  <Text style={styles.tileGlyphText}>{look.glyph}</Text>
                </View>
                <Text style={styles.tileTitle} numberOfLines={2}>
                  {a.labelHe}
                </Text>
                <Text style={styles.tileSub} numberOfLines={2}>
                  {look.subHe}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8, paddingTop: 2, paddingBottom: spacing.xs },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)" },
  rowPlay: { backgroundColor: "rgba(255,92,56,0.12)", borderWidth: 1, borderColor: "rgba(255,120,90,0.45)" },
  rowPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  rowMe: { backgroundColor: "#2B1850", borderWidth: 2, borderColor: "#FF6B4A" },
  rowGlyph: { color: "#0d0a16", fontSize: scale.body, fontWeight: "900" },
  rowTitle: { ...type.bodyStrong, color: palette.nightText, textAlign: "right", writingDirection: "rtl" },
  rowSub: { ...type.micro, color: palette.nightTextSoft, textAlign: "right", writingDirection: "rtl", marginTop: 1 },
  rowChevron: { color: palette.nightTextSoft, fontSize: scale.section, fontWeight: "700" },
  stroll: {
    marginTop: spacing.xs,
    height: 52,
    borderRadius: 26,
    /* The brand's own "now" colour — coral with ink text, like every primary action (Amit, 2026-09-29). */
    backgroundColor: palette.signal500,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 54,
    shadowColor: palette.signal500,
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  strollText: { color: palette.ink900, fontSize: scale.body, fontWeight: "900", writingDirection: "rtl" },
  strollMe: { position: "absolute", left: 9, width: 34, height: 34, borderRadius: 17, overflow: "hidden", borderWidth: 2, borderColor: palette.ink900, backgroundColor: "#2B1850" },
  strollNote: { ...type.micro, color: palette.nightTextSoft, textAlign: "center", marginTop: 6, writingDirection: "rtl" },
  links: { flexDirection: "row-reverse", justifyContent: "center", alignItems: "center" },
  link: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  linkText: { ...type.metaStrong, color: palette.nightTextSoft, writingDirection: "rtl" },
  linkDot: { ...type.meta, color: palette.nightTextSoft, opacity: 0.5 },
  drawer: {
    ...({ userSelect: "none" } as object),
    position: "absolute",
    /* In front of the map's own notes — see `useSheetDrag`, it can grow over them. */
    zIndex: 20,
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: "rgba(16,12,22,0.88)",
    borderTopWidth: 1,
    borderTopColor: "rgba(247,243,250,0.1)",
  },
  details: { gap: 8, paddingVertical: spacing.sm, marginBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: "rgba(247,243,250,0.1)" },
  detailRow: { flexDirection: "row-reverse", justifyContent: "space-between", gap: spacing.md },
  detailLabel: { ...type.meta, color: palette.nightTextSoft, writingDirection: "rtl" },
  detailValue: { ...type.metaStrong, color: palette.nightText, flex: 1, textAlign: "left", writingDirection: "rtl" },
  dragZone: { alignSelf: "stretch", alignItems: "center", paddingVertical: 6, marginTop: -6, minHeight: 26 },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,243,250,0.22)",
    marginBottom: spacing.sm,
  },
  status: { ...type.bodyStrong, color: palette.nightText, textAlign: "center", writingDirection: "rtl" },
  onSite: { minHeight: 36, justifyContent: "center", alignSelf: "center" },
  onSiteText: { ...type.meta, color: palette.nightText, opacity: 0.85, textAlign: "center", writingDirection: "rtl" },
  onSiteGo: { ...type.metaStrong, color: "#FF9A6B" },
  progress: {
    ...type.micro,
    color: palette.nightTextSoft,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: 2,
  },
  actions: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.sm },
  tile: {
    flexGrow: 1, flexBasis: "30%", minHeight: 96, paddingVertical: spacing.sm, paddingHorizontal: 6, alignItems: "center",
    borderRadius: radii.lg, borderWidth: 1, backgroundColor: "rgba(247,243,250,0.06)",
  },
  tileGlyph: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  tileGlyphText: { color: "#0d0a16", fontSize: scale.body, fontWeight: "900" },
  tileTitle: { ...type.meta, fontWeight: "800", color: palette.nightText, textAlign: "center", writingDirection: "rtl" },
  tileSub: { ...type.micro, color: palette.nightTextSoft, textAlign: "center", writingDirection: "rtl", marginTop: 2 },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(247,243,250,0.08)",
  },
  chipText: { ...type.meta, color: palette.nightText, writingDirection: "rtl" },
});
