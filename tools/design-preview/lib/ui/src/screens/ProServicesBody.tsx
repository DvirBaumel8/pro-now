import React from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { Mark, type MarkName } from "../components/marks";
import { Surface } from "../components/surfaces";
import { proTheme, radii, spacing, tint, type } from "../theme";

/**
 * P-SERVICES — WHICH WORK YOU ARE TAKING, AND THE SWITCH TO CHANGE IT.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------
 * Amit, on the shift screen: *"איך מנהלים את העמוד הזה? איך אני מוריד
 * ומעלה אפשרויות?"*
 *
 * He was reading a sheet that said, in as many words, *"אפשר לכבות
 * ולהדליק שירותים בכל רגע"* — and it was a paragraph of prose with no
 * control on it. The app told a professional they could do something and
 * gave them nowhere to do it, which is worse than not offering it: they
 * go looking, and conclude the app is broken rather than that the feature
 * is missing.
 *
 * ---------------------------------------------------------------------
 * TWO DIFFERENT "OFF", AND THEY MUST NOT LOOK ALIKE
 * ---------------------------------------------------------------------
 * A service can be off because the professional turned it off — their
 * decision, reversible with one tap. Or it can be off because they are
 * not eligible for it: a document expired, a licence was never uploaded,
 * the service has not been approved for them.
 *
 * The second is not a switch and must not be drawn as one. /CLAUDE.md §3
 * makes eligibility service-by-service and the server's alone, so a
 * switch that looked flippable here would be a promise this screen
 * cannot keep — the professional would arm it, the dispatcher would keep
 * refusing, and nothing on screen would say why. Blocked rows say the
 * reason instead, in the words the credential engine produced.
 */

const colors = proTheme.colors;

export interface ProServiceRow {
  id: string;
  nameHe: string;
  mark: MarkName;
  /** Whether the server would dispatch this service to them at all. */
  eligible: boolean;
  /** Whether they have it armed for this shift. */
  live: boolean;
  /**
   * Why not, when `eligible` is false. From the credential engine.
   *
   * Null as well as undefined, because the adapters that produce this
   * use both for "nothing is wrong" and a row is not the place to
   * normalise somebody else's absence.
   */
  blockedReasonHe?: string | null;
}

export interface ProServicesBodyProps {
  rows: ProServiceRow[];
  onToggle?: (id: string, next: boolean) => void;
  width?: number;
  height?: number;
}

export function ProServicesBody({ rows, onToggle, width = 390, height = 560 }: ProServicesBodyProps) {
  const armed = rows.filter((r) => r.live && r.eligible).length;
  const open = rows.filter((r) => r.eligible).length;

  return (
    <View style={{ width, maxHeight: height }}>
      <Text style={styles.count}>
        {armed} מתוך {open} שירותים פתוחים לקריאות עכשיו
      </Text>
      {/*
        * Said once, at the top, rather than under every blocked row. The
        * rule is about the ACCOUNT's relationship to each service and
        * repeating it turns a list into a lecture.
        */}
      <Text style={styles.note}>
        כיבוי והדלקה הם שלך בכל רגע. שירות חסום לא נפתח מכאן — הוא נפתח כשהמסמך מתחדש, כי ההסמכה
        נבדקת מול כל שירות בנפרד ולא מול החשבון.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {rows.map((r) => (
          <Surface key={r.id} colors={colors} level={1} style={styles.row}>
            {/*
              * ---------------------------------------------------------
              * THE WHOLE ROW IS THE SWITCH
              * ---------------------------------------------------------
              * React Native's `Switch` renders 40x20, and `verify:a11y`
              * caught that on the first run of this screen: four targets
              * under the 44pt minimum, in brand-new code, on a screen
              * built to fix a control that did not exist.
              *
              * Scaling the switch would not fix it — 20pt of height
              * cannot reach 44 without distorting the control — so the
              * accessible element is the ROW, which is over sixty points
              * tall and is what a thumb aims at anyway. The switch inside
              * is then a picture of the state rather than a second target
              * competing with the row for the same tap.
              */}
            <Pressable
              onPress={r.eligible ? () => onToggle?.(r.id, !r.live) : undefined}
              disabled={!r.eligible}
              accessibilityRole={r.eligible ? "switch" : "text"}
              accessibilityState={r.eligible ? { checked: r.live } : undefined}
              accessibilityLabel={
                r.eligible ? `${r.nameHe} — ${r.live ? "פתוח לקריאות" : "סגור"}` : undefined
              }
              style={({ pressed }) => [styles.rowTop, pressed && { opacity: 0.9 }]}
            >
              <View style={[styles.bubble, r.eligible && r.live && { backgroundColor: tint.trust(0.16) }]}>
                <Mark
                  name={r.mark}
                  size={18}
                  color={r.eligible && r.live ? colors.trust : colors.textSecondary}
                />
              </View>
              <Text
                style={[styles.name, !r.eligible && { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {r.nameHe}
              </Text>
              {/*
                * A blocked service gets no switch at all rather than a
                * disabled one. A greyed switch still says "this is yours
                * to flip, just not now"; a missing licence is not that.
                */}
              {r.eligible ? (
                // A picture of the state, not a second target: the row
                // above it already carries the role and the tap.
                <View pointerEvents="none">
                  <Switch
                    value={r.live}
                    trackColor={{ false: colors.border, true: tint.trust(0.55) }}
                    thumbColor={r.live ? colors.trust : colors.surface}
                  />
                </View>
              ) : (
                <Text style={styles.blockedTag}>חסום</Text>
              )}
            </Pressable>

            {!r.eligible && r.blockedReasonHe ? (
              <Text style={styles.reason} numberOfLines={3}>
                {r.blockedReasonHe}
              </Text>
            ) : null}
          </Surface>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  count: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  note: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.md },
  row: { borderRadius: radii.lg },
  // 48 rather than 44: the row is the touch target now, and a service
  // name can wrap to two lines without the target shrinking below it.
  rowTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, minHeight: 48 },
  bubble: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint.neutralLight(0.1),
  },
  name: { ...type.bodyStrong, flex: 1, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  blockedTag: { ...type.caption, color: colors.statusWarningText, writingDirection: "rtl" },
  reason: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
    marginTop: spacing.sm,
  },
});
