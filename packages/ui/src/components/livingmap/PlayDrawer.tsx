import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

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
}

const TILE_LOOK: Record<PlayDrawerActionId, { glyph: string; tint: string; subHe: string }> = {
  PLAY_MORE: { glyph: "✦", tint: "#8B5CF6", subHe: "עוד עסקים ברחוב" },
  FOLLOW_PRO: { glyph: "➜", tint: "#FF6B4A", subHe: "ברכב שלו, על המפה" },
  JOB_DETAILS: { glyph: "☰", tint: "#2FBF8A", subHe: "מה הזמנת ומה סוכם" },
  WHILE_YOU_WAIT: { glyph: "☕", tint: "#F59E0B", subHe: "חנויות מומלצות ברחוב" },
};

export function PlayDrawer({ firstNameHe, etaMinutes, discoveries, hasJobDetails = true, onAction, onSiteNameHe = null, onOpenOnSite }: PlayDrawerProps) {
  const onSiteFirst = onSiteNameHe ? onSiteNameHe.replace(/ \(תצוגה\)$/, "") : null;
  const status = onSiteFirst && firstNameHe
    ? `${firstNameHe} בדרך אל ${onSiteFirst}${etaMinutes !== null ? ` · ${etaMinutes} דק׳` : ""}`
    : playDrawerStatusHe({ firstNameHe, etaMinutes });
  const progress = discoveryProgressHe(discoveries);
  const base = playDrawerActions({ firstNameHe, discoveries, hasJobDetails });

  /* Pull down to fold it to its headline and see the city; up to open. */
  const drag = useSheetDrag({ peek: 58 });
  /* Pulled up, it opens a second row: the sponsors' shops to visit while waiting. */
  const actions = drag.expanded && !base.some((a) => a.id === "WHILE_YOU_WAIT")
    ? [...base, { id: "WHILE_YOU_WAIT" as const, labelHe: "בזמן שמחכים" }]
    : base;
  return (
    <Animated.View style={[styles.drawer, { transform: [{ translateY: drag.y }] }]} pointerEvents="box-none" onLayout={drag.measure} {...drag.bindBody}>
      <View {...drag.bind} style={styles.dragZone}>
        <View style={styles.handle} />
      </View>

      <Text style={styles.status} numberOfLines={1}>
        {status}
      </Text>

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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawer: {
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
