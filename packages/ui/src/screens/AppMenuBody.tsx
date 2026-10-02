import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { customerDarkTheme, radii, spacing, type } from "../theme";

/**
 * THE MENU BEHIND THE THREE LINES.
 *
 * ---------------------------------------------------------------------
 * WHAT IT REPLACES
 * ---------------------------------------------------------------------
 * Amit: *"התפריט פה נראה כמו תפריט ראשי, לא יכול להיות שזה מביא אותי
 * ישר לקריאות שלי. צריך להיפתח פה תפריט שאחת מהקטגוריות תהיה הקריאות
 * שלי, צריך גם הגדרות, פרופיל וכל מה שיש בעמוד הגדרות רגיל."*
 *
 * The header's hamburger went straight to the call history. A control
 * drawn as a menu that turns out to be a single shortcut is a small
 * broken promise on the busiest chrome in the app — and it meant the
 * product had no place at all for the ordinary things every app has.
 *
 * ---------------------------------------------------------------------
 * ONLY DOORS THAT OPEN
 * ---------------------------------------------------------------------
 * Every row here is wired by the caller or it is not drawn. A menu is
 * the one screen where a dead row is most damaging: it is a list of
 * promises about what the app can do, read in one glance, and a row
 * that goes nowhere makes the other five suspect.
 *
 * So there is no "הגדרות" row full of switches that control nothing and
 * no "צור קשר" pointing at a support channel nobody has chosen yet
 * (/CLAUDE.md §4 — support hours and SLA are an open decision). Those
 * arrive the day they lead somewhere, through the same prop.
 */
export interface AppMenuItem {
  id: string;
  labelHe: string;
  /** One line under the label. Optional — most rows do not need one. */
  detailHe?: string | null;
  onPress?: () => void;
  /**
   * Show the row disabled until it is wired (docs/21 W2, option a). A row
   * with neither a handler nor this flag is dropped.
   */
  upcoming?: boolean;
}

export interface AppMenuBodyProps {
  /** Grouped, in the order they are shown. Empty groups are dropped. */
  groups: readonly { titleHe?: string | null; items: readonly AppMenuItem[] }[];
  /** The version, the prototype note, whatever the shell wants at the foot. */
  footnoteHe?: string | null;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function AppMenuBody({
  groups,
  footnoteHe = null,
  onBack,
  width = 390,
  height = 780,
}: AppMenuBodyProps) {
  const colors = customerDarkTheme.colors;
  const live = groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.onPress || i.upcoming) }))
    .filter((g) => g.items.length > 0);

  return (
    <View style={[styles.screen, { width, height, backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <BackButton onPress={onBack} tone="light" placement="absolute" />
        <Text style={[styles.title, { color: colors.textPrimary }]}>התפריט</Text>

        {live.map((group, gi) => (
          <View key={group.titleHe ?? `g${gi}`} style={styles.group}>
            {group.titleHe ? (
              <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>
                {group.titleHe}
              </Text>
            ) : null}
            <View style={[styles.rows, { backgroundColor: colors.surface }]}>
              {group.items.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !item.onPress }}
                  accessibilityLabel={
                    item.detailHe ? `${item.labelHe} · ${item.detailHe}` : item.labelHe
                  }
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && styles.rowDivided,
                    pressed && { opacity: 0.72 },
                    !item.onPress && { opacity: 0.45 },
                  ]}
                >
                  <View style={styles.rowText}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      {item.labelHe}
                    </Text>
                    {item.detailHe ? (
                      <Text style={[styles.detail, { color: colors.textSecondary }]}>
                        {item.detailHe}
                      </Text>
                    ) : null}
                  </View>
                  {/* Points the way the reader is going: leftwards, in Hebrew. */}
                  <Text style={[styles.chev, { color: colors.textSecondary }]}>‹</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {footnoteHe ? (
          <Text style={[styles.footnote, { color: colors.textSecondary }]}>{footnoteHe}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl * 2, paddingBottom: spacing.xxl },
  title: { ...type.title, textAlign: "right", writingDirection: "rtl" },
  group: { marginTop: spacing.xl },
  groupTitle: {
    ...type.microStrong,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.sm,
  },
  rows: { borderRadius: radii.md, overflow: "hidden" },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowDivided: { borderTopWidth: 1, borderTopColor: "rgba(23,18,31,0.08)" },
  rowText: { flex: 1 },
  label: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  detail: { ...type.meta, textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  chev: { ...type.section, fontWeight: "400", marginRight: spacing.md },
  footnote: {
    ...type.micro,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xxl,
  },
});
