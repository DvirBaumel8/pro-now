import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { WORLD_DISTRICTS, type DepartmentCode } from "@pro-now/types";

import { type WorldAssetSources } from "./AssetSlot";
import { customerDarkTheme, radii, spacing, type } from "../../theme";

/**
 * WHAT HAPPENS WHEN YOU PRESS ONE OF THE NEIGHBOURHOOD'S OWN SHOPS.
 *
 * ---------------------------------------------------------------------
 * THE GAP
 * ---------------------------------------------------------------------
 * Amit: *"שגם זה יהיה לחיץ ויפתח את החנות והכרטיס שלו."*
 *
 * Eleven buildings stand in this street and, until now, exactly the ones
 * belonging to candidates the server had returned could be opened. The
 * other ten were scenery — which, in a world whose whole proposition is
 * that you can walk up to a business, means ten doors that do not open.
 *
 * ---------------------------------------------------------------------
 * AND WHY THIS IS NOT A PROFESSIONAL'S CARD
 * ---------------------------------------------------------------------
 * This is the part that needed care. A venue stands for a PERSON the
 * server said is available; a district stands for a TRADE. There is
 * nobody behind this door — so a card that looked like a profile, with a
 * portrait and a rating and a distance, would be inventing supply, which
 * is the one thing this codebase may never do (/CLAUDE.md §3).
 *
 * So it says what is true and nothing else: which trade this is, the
 * inside of a shop in it where that art exists, and the sentence that
 * keeps it honest — *this is the trade, not a particular professional*.
 * The only thing you can do from here is look at what the trade offers,
 * which is catalogue and not availability.
 */
export interface TradeCardProps {
  department: DepartmentCode;
  sources?: WorldAssetSources;
  /** Look at what this trade offers. Absent renders no button. */
  onOpenTrade?: (department: DepartmentCode) => void;
  onClose?: () => void;
  width: number;
}

export function TradeCard({ department, sources, onOpenTrade, onClose, width }: TradeCardProps) {
  const district = WORLD_DISTRICTS[department];
  const colors = customerDarkTheme.colors;
  const interiorId = district.venueInteriorAssetId;
  const interior = interiorId ? (sources?.[interiorId] as { uri?: string } | undefined) : undefined;

  return (
    <View style={[styles.wrap, { width }]} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/*
         * THE INSIDE, WHERE IT EXISTS — at the artwork's own proportions.
         *
         * Amit: *"פחות זום אין בחנות שיראו יותר מה קורה שם."* The
         * interiors are roughly 4:3, so the window is 4:3. A 16:9 strip
         * cut the ceiling and the floor off the room, which is most of
         * what makes a room read as a room.
         *
         * No fallback and no stand-in from another trade: a plumber's
         * card showing a barber's chair is a claim about a business.
         */}
        {interior?.uri ? (
          <Image
            source={{ uri: interior.uri }}
            style={styles.interior}
            resizeMode="cover"
            accessible
            accessibilityRole="image"
            accessibilityLabel={`בתוך עסק בתחום ${district.labelHe}`}
          />
        ) : null}

        <View style={styles.body}>
          <Text style={[styles.trade, { color: colors.textPrimary }]}>{district.labelHe}</Text>
          {/*
           * The sentence that stops this being a profile. Said plainly,
           * above the button rather than under it.
           */}
          <Text style={[styles.note, { color: colors.textSecondary }]}>
            זה התחום, לא מקצוען מסוים. מי פנוי עכשיו נקבע כששולחים קריאה.
          </Text>

          <View style={styles.row}>
            {onOpenTrade ? (
              <Pressable
                onPress={() => onOpenTrade(department)}
                accessibilityRole="button"
                accessibilityLabel={`מה אפשר להזמין בתחום ${district.labelHe}`}
                style={[styles.cta, { backgroundColor: colors.action }]}
              >
                <Text style={[styles.ctaText, { color: colors.onAction }]}>
                  מה אפשר להזמין כאן
                </Text>
              </Pressable>
            ) : null}
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="סגירה וחזרה לרחוב"
                style={styles.close}
              >
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>לרחוב</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, bottom: 0, padding: spacing.lg },
  card: { borderRadius: radii.lg, overflow: "hidden" },
  interior: { width: "100%", aspectRatio: 4 / 3 },
  body: { padding: spacing.lg },
  trade: { ...type.section, textAlign: "right", writingDirection: "rtl" },
  note: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  cta: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { ...type.bodyStrong },
  close: { minHeight: 48, minWidth: 64, alignItems: "center", justifyContent: "center" },
  closeText: { ...type.bodyStrong },
});
