import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { customerTheme, radii, spacing, tabular, type } from "../theme";
import { NavGlyph } from "./NavGlyph";
import { Pulse } from "./LiveServiceCard";

/**
 * THE CUSTOMER SIDE HAS NO TAB BAR.
 *
 * It had one — four doors along the bottom of every screen — and ChatGPT's
 * objection was not that it looked dated but that it was the wrong shape
 * for this product: "אני לא רוצה שמתחת לרגע הזה יהיו כל הזמן ארבע דלתות
 * שמבקשות מהמשתמש לחשוב על ארכיטקטורת האפליקציה."
 *
 * The customer's home is a COMMAND SURFACE. It asks one question — מה צריך
 * עכשיו? — and a permanent navigation rail underneath it quietly contradicts
 * that, by implying the answer might be somewhere else in the app. The
 * professional's side is different and keeps its bar: that one IS an
 * operational app, opened repeatedly through a shift, where knowing where
 * things live is the point.
 *
 * So two pieces replace it:
 *
 *   `UtilityRow`       — a thin top row. History and account, nothing else.
 *   `ActiveJobCapsule` — appears only while a job is live.
 *
 * AND THE CAPSULE IS NOT NAVIGATION. ChatGPT rejected the tempting version
 * — one floating bar that becomes navigation when idle and tracking when
 * busy — and the reason is worth keeping: a component that changes its job
 * depending on state gives people an unstable mental model. They stop
 * knowing what the thing at the bottom of the screen IS. The capsule has
 * exactly one job, appears only when it has something true to say, and
 * disappears when it does not.
 */

const colors = customerTheme.colors;

export function UtilityRow({
  addressLabelHe,
  onCalls,
  onAccount,
  onChangeAddress,
  trailing,
  width,
}: {
  addressLabelHe: string;
  onCalls?: () => void;
  onAccount?: () => void;
  onChangeAddress?: () => void;
  /**
   * Anything the host needs to hang here — in the prototype, the side
   * switch. It belongs at the top because the bottom of a phone screen is
   * contested space and a demo affordance has no business competing there
   * with the product's own controls.
   */
  trailing?: React.ReactNode;
  width: number;
}) {
  return (
    <View style={[styles.utility, { width }]}>
      <Pressable
        onPress={onChangeAddress}
        accessibilityRole="button"
        accessibilityLabel="שינוי כתובת"
        style={styles.address}
      >
        <NavGlyph name="home" size={15} color={colors.textSecondary} />
        <Text style={styles.addressText} numberOfLines={1}>
          {addressLabelHe}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <View style={styles.utilityRight}>
        <Pressable
          onPress={onCalls}
          accessibilityRole="button"
          accessibilityLabel="הקריאות שלי"
          style={styles.iconBtn}
        >
          <NavGlyph name="list" size={21} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={onAccount}
          accessibilityRole="button"
          accessibilityLabel="החשבון שלי"
          style={styles.iconBtn}
        >
          <NavGlyph name="person" size={21} color={colors.textPrimary} />
        </Pressable>
        {trailing}
      </View>
    </View>
  );
}

export interface ActiveJobCapsuleProps {
  /** "דוגמה א׳ בדרך אליך" — the sentence, already assembled. */
  textHe: string;
  /** Minutes away, when the server has computed a route. */
  etaMinutes?: number | null;
  live?: boolean;
  onPress?: () => void;
  width: number;
}

/** The vertical space the capsule needs, for callers sizing the body. */
export const CAPSULE_HEIGHT = 68;

export function ActiveJobCapsule({
  textHe,
  etaMinutes,
  live = true,
  onPress,
  width,
}: ActiveJobCapsuleProps) {
  return (
    <View style={[styles.capsuleWrap, { width }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${textHe}${etaMinutes ? `, ${etaMinutes} דקות` : ""}`}
        style={({ pressed }) => [styles.capsule, pressed && { opacity: 0.92 }]}
      >
        <Text style={styles.capsuleGo}>›</Text>
        <Text style={styles.capsuleText} numberOfLines={1}>
          {textHe}
        </Text>
        {typeof etaMinutes === "number" ? (
          <>
            <Text style={styles.capsuleDot}>·</Text>
            <Text style={styles.capsuleEta}>{etaMinutes} דק׳</Text>
          </>
        ) : null}
        {live ? <Pulse color={colors.action} size={7} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  utility: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  address: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    flexShrink: 1,
    paddingLeft: spacing.sm,
  },
  addressText: {
    ...type.caption,
    fontSize: 14,
    color: colors.textPrimary,
    writingDirection: "rtl",
    flexShrink: 1,
  },
  chevron: { ...type.caption, color: colors.textSecondary },
  utilityRight: { flexDirection: "row-reverse", alignItems: "center" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  /**
   * IN THE LAYOUT, NOT OVER IT.
   *
   * It floated at `bottom: spacing.lg` for about ten minutes, which was
   * long enough for the Playwright walk to catch it swallowing every tap
   * meant for the strip underneath — the third time in this project a
   * bottom-anchored absolute element has eaten another control's clicks.
   * The pattern is the lesson: on a phone, the bottom of the screen is
   * contested space, and anything that floats there must be told by the
   * layout how much room it has.
   */
  capsuleWrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm },
  capsule: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    minHeight: 52,
    maxWidth: "88%",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.textPrimary,
    // Elevation only, no border: a surface may be raised or outlined, never
    // both (Visual System v1 §5).
    shadowColor: "#17121F",
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  capsuleText: { ...type.captionStrong, fontSize: 14, color: "#FFFFFF", writingDirection: "rtl" },
  capsuleDot: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  capsuleEta: { ...type.captionStrong, ...tabular, fontSize: 14, color: colors.action },
  capsuleGo: { color: "rgba(255,255,255,0.7)", fontSize: 18, lineHeight: 20 },
});
