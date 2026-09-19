import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { customerTheme, elevation, palette, radii, spacing, tint, type } from "../theme";
import { lex } from "../lexicon";
import { ShieldCheckMark } from "../components/marks";
import { Persona, PersonaStack } from "../components/Persona";

/**
 * C00 — the first screen anyone sees.
 *
 * A marketplace has two entirely different first-time users and one landing
 * page, and the usual failure is to write that page for the customer and
 * bury the professional behind a link in a footer. That is backwards for a
 * product whose entire constraint is supply: without professionals there is
 * nothing to sell, and the person who installs this to *work* should not
 * have to hunt.
 *
 * So there are two doors, and they are the same size.
 *
 * The copy makes exactly one promise, the only one the product can keep:
 * someone verified, who is available now, comes to you. It deliberately does
 * not say "the best", "the cheapest", or "in minutes" — the first two are
 * unprovable and the third depends on a professional who has not accepted
 * yet. A landing page that overpromises is a refund request scheduled for
 * later.
 */

const colors = customerTheme.colors;

export interface WelcomeBodyProps {
  /** Faces for the stack. Illustrations, never photos of invented people. */
  castSeeds: string[];
  onCustomer?: () => void;
  onProfessional?: () => void;
  width?: number;
  height?: number;
}

export function WelcomeBody({
  castSeeds,
  onCustomer,
  onProfessional,
  width = 390,
  height = 780,
}: WelcomeBodyProps) {
  return (
    <View style={[styles.screen, { width, height }]}>
      {/* Radial flourish rather than a hero photograph: there is no licensed
          photography yet, and a stock image on the first screen would be the
          product's first lie. */}
      <Svg width={width} height={width} style={styles.flourish} pointerEvents="none">
        <Circle cx={width / 2} cy={width / 2} r={width * 0.46} stroke={palette.signal300} strokeWidth={1.2} fill="none" opacity={0.5} />
        <Circle cx={width / 2} cy={width / 2} r={width * 0.34} stroke={palette.signal300} strokeWidth={1.2} fill="none" opacity={0.4} />
        <Circle cx={width / 2} cy={width / 2} r={width * 0.22} stroke={palette.trust300} strokeWidth={1.2} fill="none" opacity={0.45} />
        <Path d={`M${width / 2} 0v${width}M0 ${width / 2}h${width}`} stroke={palette.signal300} strokeWidth={0.8} opacity={0.22} />
      </Svg>

      <View style={styles.top}>
        <Text style={styles.brand}>PRO NOW</Text>
        <Text style={styles.headline}>מקצוען מאומת,{"\n"}שבא עכשיו.</Text>
        <Text style={styles.sub}>
          לא אינדקס ולא הצעות מחיר. אתה שולח קריאה, ומי שפנוי ומאושר לעבודה הזו יוצא אליך.
        </Text>

        <View style={styles.trustRow}>
          <ShieldCheckMark size={15} color={colors.trust} />
          <Text style={styles.trustText}>{lex.trustNote}</Text>
        </View>
      </View>

      <View style={styles.middle}>
        <PersonaStack seeds={castSeeds} size={46} max={5} />
        <Text style={styles.stackNote}>מי שמגיע אליך — מאומת לשירות שביקשת, לא רק לחשבון.</Text>
      </View>

      {/* Two doors, the same size. Supply is the constraint, so the person
          who came here to work is not a footnote. */}
      <View style={styles.doors}>
        <Pressable
          onPress={onCustomer}
          accessibilityRole="button"
          style={({ pressed }) => [styles.door, styles.doorPrimary, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.doorPrimaryTitle}>אני צריך מקצוען</Text>
          <Text style={styles.doorPrimarySub}>שליחת קריאה עכשיו</Text>
        </Pressable>

        <Pressable
          onPress={onProfessional}
          accessibilityRole="button"
          style={({ pressed }) => [styles.door, styles.doorSecondary, pressed && { opacity: 0.9 }]}
        >
          <View style={styles.doorProRow}>
            <Persona seed="welcome-pro" size={34} ring={colors.trust} />
            <View style={styles.doorProText}>
              <Text style={styles.doorSecondaryTitle}>אני בעל מקצוע</Text>
              <Text style={styles.doorSecondarySub}>הרשמה וקבלת עבודות באזור שלך</Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl, justifyContent: "space-between" },
  flourish: { position: "absolute", top: -80, left: 0, opacity: 0.55 },

  top: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl * 2, alignItems: "flex-end" },
  brand: { ...type.overline, color: colors.action, letterSpacing: 2 },
  headline: {
    ...type.displayXL,
    fontSize: 42,
    lineHeight: 48,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
  sub: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 23,
  },
  trustRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xl },
  trustText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  middle: { paddingHorizontal: spacing.xl, alignItems: "flex-end", gap: spacing.md },
  stackNote: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },

  doors: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  door: { borderRadius: radii.lg, padding: spacing.lg, minHeight: 74, justifyContent: "center" },
  doorPrimary: { backgroundColor: colors.action, alignItems: "center", ...elevation(2) },
  doorPrimaryTitle: { ...type.h3, color: "#FFFFFF", writingDirection: "rtl" },
  doorPrimarySub: { ...type.caption, color: "rgba(255,255,255,0.88)", writingDirection: "rtl" },
  doorSecondary: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: tint.trust(0.35) },
  doorProRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  doorProText: { flex: 1, alignItems: "flex-end" },
  doorSecondaryTitle: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  doorSecondarySub: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
});
