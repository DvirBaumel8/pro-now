import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { districtFor, type CustomerCategory } from "@pro-now/types";

import { customerDarkTheme, depth, palette, radii, spacing, tint, type } from "../theme";
import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import { Scrim } from "../components/Scrim";
import { Pulse } from "../components/LiveServiceCard";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { type WorldAssetSources } from "../components/livingmap/AssetSlot";

/**
 * A CATEGORY, AS A PLACE AND A SHORT QUESTION.
 *
 * ---------------------------------------------------------------------
 * THE BUG THIS FIXES
 * ---------------------------------------------------------------------
 * Amit: *"למה אני לוחץ על מסך הלקוח על בית ומכניס אותי ישר לאינסטלטור?"*
 *
 * Because the prototype took a shortcut I should never have shipped: a
 * category opened the FIRST service behind it. "לבית" covers burst pipes,
 * air conditioning, installations and odd jobs, and tapping it announced
 * that the customer wanted a blocked drain. That is the product deciding
 * what somebody needs before they have said a word — the exact failure
 * Amit has rejected at every stage.
 *
 * ---------------------------------------------------------------------
 * AND WHY THIS IS NOT THE CATALOGUE PAGE EITHER
 * ---------------------------------------------------------------------
 * The other way to be wrong is a list of thirty services, which he also
 * rejected. So this is what was actually agreed: tapping a category takes
 * the customer INTO that part of the world, and then asks the short
 * question needed to know what they need.
 *
 * The world is behind, focused on that trade's own street. In front is one
 * question and the handful of things this category actually covers —
 * short, because it is one category and not the whole catalogue, and with
 * live availability shown only where the server has actually said
 * something.
 */
const colors = customerDarkTheme.colors;

export interface CategoryServiceItem {
  id: string;
  nameHe: string;
  descriptionHe?: string | null;
  /**
   * How many professionals are free for this service right now.
   *
   * Null means the server has not said — which is rendered as silence, not
   * as zero. A grey "0 פנויים" on a service that simply was not in the
   * snapshot is a lie that looks like a fact.
   */
  availableNowCount?: number | null;
}

export interface CategoryBodyProps {
  category: CustomerCategory;
  services: CategoryServiceItem[];
  worldSources?: WorldAssetSources;
  animate?: boolean;
  onSelectService?: (serviceId: string) => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function CategoryBody({
  category,
  services,
  worldSources,
  animate = true,
  onSelectService,
  onBack,
  width = 390,
  height = 780,
}: CategoryBodyProps) {
  const district = districtFor(category.faceDepartment);

  return (
    <View style={[styles.screen, { width, height }]}>
      {/* The world, standing in this trade's own street. Not the Living
          Map: no candidates, no venues, nothing that implies supply. */}
      <WorldBackdrop
        width={width}
        height={height}
        sources={worldSources}
        departmentCode={category.faceDepartment}
        animate={animate}
      />
      <Scrim width={width} height={height} />

      {onBack ? <BackButton onPress={onBack} tone="dark" /> : null}

      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={[styles.content, { minHeight: height, paddingTop: BACK_BUTTON_CLEARANCE }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.trade}>{district.labelHe}</Text>
          {/*
            * ONE QUESTION, AND IT IS NOT "בחר שירות".
            *
            * The customer already said the area. What is missing is the
            * thing only they know, so the question asks for that in their
            * words rather than asking them to find themselves in our
            * taxonomy.
            */}
          <Text style={styles.question}>מה צריך?</Text>
        </View>

        <View style={styles.list}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => onSelectService?.(s.id)}
              accessibilityRole="button"
              accessibilityLabel={
                typeof s.availableNowCount === "number" && s.availableNowCount > 0
                  ? `${s.nameHe} · ${s.availableNowCount} פנויים עכשיו`
                  : s.nameHe
              }
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {s.nameHe}
                </Text>
                {s.descriptionHe ? (
                  <Text style={styles.note} numberOfLines={1}>
                    {s.descriptionHe}
                  </Text>
                ) : null}
              </View>

              {/*
                * Live supply, and ONLY where the server said something.
                * A service the snapshot did not mention shows nothing at
                * all — not a zero, which would read as "nobody is
                * available" when the truth is "we did not ask".
                */}
              {typeof s.availableNowCount === "number" && s.availableNowCount > 0 ? (
                <View style={styles.live}>
                  <Pulse color={colors.action} size={5} />
                  <Text style={styles.liveText}>{s.availableNowCount} פנויים</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {services.length === 0 ? (
          <Text style={styles.empty}>השירותים בקטגוריה הזו ייפתחו בקרוב.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.night900, overflow: "hidden", borderRadius: radii.xl },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, justifyContent: "flex-end", flexGrow: 1 },

  head: { alignItems: "flex-end", marginBottom: spacing.xl },
  trade: { ...type.meta, color: palette.signal300, writingDirection: "rtl" },
  question: {
    ...type.displayXL,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    /*
     * An explicit line height, because `displayXL` carries a font size
     * without one and the default is tighter than the glyphs: the trade
     * label above it ended up printed through the question's own
     * ascenders.
     */
    lineHeight: 52,
    marginTop: spacing.sm,
    textShadowColor: "rgba(16,12,22,0.9)",
    textShadowRadius: 10,
  },

  list: { gap: spacing.sm },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: depth.panel.mid,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.07)",
    ...depth.litEdge(0.06),
  },
  pressed: { opacity: 0.85 },
  rowText: { flex: 1, alignItems: "flex-end" },
  name: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  note: { ...type.micro, color: colors.textSecondary, writingDirection: "rtl", marginTop: 2 },

  live: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: tint.action(0.14),
  },
  liveText: { ...type.micro, color: colors.actionText, writingDirection: "rtl" },

  empty: { ...type.body, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl", marginTop: spacing.xl },
});
