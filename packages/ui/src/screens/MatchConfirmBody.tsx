import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import type { EtaView, PriceQuoteView } from "@pro-now/types";

import { customerTheme, palette, radii, spacing, tabular, type } from "../theme";
import { priceExplainer } from "../pricing-copy";
import { LiveField } from "../components/LiveField";
import { ProviderPortrait } from "../components/ProviderPortrait";
import { RtlRow } from "../components/RtlRow";
import { ImageSlot } from "../components/surfaces";
import { ShieldCheckMark, StarMark } from "../components/marks";

/**
 * C-PF — the personal match. PRO NOW's one WOW moment.
 *
 * WHY THIS SCREEN EXISTS. Dispatch normally chooses for the customer, and
 * that is a feature: being handed a directory while your kitchen fills with
 * water is a burden. But when someone is coming to cut your hair or work on
 * your body in your own home, the person IS the service, and "anyone
 * competent" answers a question nobody asked.
 *
 * THE REDESIGN, AND WHY. The first version was a profile page — heading,
 * small round avatar, three green chips, a row of little cards. ChatGPT's
 * verdict was exact: "זה נקי, אבל זה מרגיש כמו אפליקציית שירותים מ-2022.
 * אין פה עדיין את התחושה שהמערכת החכמה מצאה לי עכשיו את האדם הנכון." The
 * problem was never the colours; it was the composition. A profile page
 * says "here is a person, you decide". This screen has to say "we looked,
 * and here is who".
 *
 * So: one full-bleed surface instead of a card stack. The name at display
 * size. The facts on ONE line rather than three chips. The ETA promoted to
 * the second-largest thing on the screen, because "how soon" is half the
 * decision. And the portfolio edge-to-edge with the next image peeking,
 * because for a barber the work IS the argument.
 *
 * "WHY THIS MATCH" — THE PART THAT MATTERS MOST. ChatGPT: "ה-AI צריך
 * להופיע דרך ההסבר, לא דרך המילה AI." The screen never says "AI". It
 * states the actual reasons this person was proposed — a declared
 * specialty that matches what the customer asked for, being online now,
 * the distance. Every reason is a fact the server can stand behind; the
 * caller assembles them, so an invented one would have to be written down
 * somewhere a person can see it. A "97% match" score would be exactly the
 * fabricated capability (/CLAUDE.md §3) this product cannot afford.
 *
 * AND WHAT IT STILL WILL NOT DO. No photorealistic portrait. ChatGPT asked
 * for real photography and it is right about the feel — but a photographic
 * face on a proposed professional asserts that this specific person exists
 * and is free right now, which is fabricated supply. The composition is the
 * one it asked for; the portrait stays illustrated until there are licensed
 * photographs of real, signed-up professionals to put in it.
 */

const colors = customerTheme.colors;

export interface PortfolioItem {
  id: string;
  uri: string | null;
  captionHe: string;
}

/** One stated reason this person was proposed. Facts only. */
export interface MatchReason {
  id: string;
  textHe: string;
  kind: "SKILL" | "LIVE" | "DISTANCE" | "HISTORY";
}

export interface MatchConfirmBodyProps {
  serviceNameHe: string;
  displayNameHe: string;
  /** "ספרית עד הבית · תספורות ועיצוב" — the line under the name. */
  headlineHe: string;
  /**
   * The professional's approved photo. Null until a real, signed-up
   * professional has uploaded one — and then it fills this same space, so
   * the composition does not change on the day it arrives.
   */
  photoUri?: string | null;
  portfolio: PortfolioItem[];
  /** Why this person, in the server's own facts. Empty renders nothing. */
  reasons: MatchReason[];
  ratingAverage: number | null;
  ratingCount: number;
  completedJobs: number;
  credentialsHe: string[];
  eta: EtaView | null;
  /** "22:48" — arrival clock time, computed by the caller from the ETA. */
  arrivalClockHe: string | null;
  price: PriceQuoteView;
  /** Whether another proposal exists at all. The count is deliberately hidden. */
  hasAlternative: boolean;
  onAccept?: () => void;
  onAnother?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function MatchConfirmBody({
  serviceNameHe,
  displayNameHe,
  headlineHe,
  photoUri,
  portfolio,
  reasons,
  ratingAverage,
  ratingCount,
  completedJobs,
  credentialsHe,
  eta,
  arrivalClockHe,
  price,
  hasAlternative,
  onAccept,
  onAnother,
  onBack,
  width = 390,
  height = 780,
}: MatchConfirmBodyProps) {
  const explain = priceExplainer(price);
  const etaMinutes = eta ? Math.round(eta.etaSeconds / 60) : null;
  const heroH = Math.round(height * 0.46);

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {/* ---------------- Hero: one surface, edge to edge ---------------- */}
        {/*
          * THE HERO IS THE LIVE FIELD, NOT A PORTRAIT BLOWN UP.
          *
          * The first attempt at this composition filled it with the
          * illustrated portrait at 380px, and at that size an illustration
          * stops reading as a considered placeholder and starts reading as
          * a cartoon — the exact "avatar מצויר" ChatGPT said undermines the
          * premium feel. But the alternative it asked for, a photographic
          * face, asserts that this specific person exists and is free right
          * now: fabricated supply (/CLAUDE.md §3).
          *
          * So the surface is the brand's own live field — dark, quiet,
          * with one presence resolving out of it — and the portrait sits ON
          * it at a size an illustration can carry. The composition is the
          * one that was asked for. The photograph waits for a real,
          * signed-up professional who has agreed to be photographed.
          */}
        <View style={[styles.hero, { height: heroH }]}>
          <LiveField state="MATCHED" width={width} height={heroH} tone="dark" />
          <View style={styles.heroFill} pointerEvents="none">
            <ProviderPortrait photoUri={photoUri} displayNameHe={displayNameHe} size={132} tone="dark" />
          </View>

          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="חזרה"
            style={styles.back}
          >
            <Text style={styles.backGlyph}>›</Text>
          </Pressable>

          <View style={styles.heroTop}>
            <Text style={styles.brandMark}>PRO NOW MATCH</Text>
            <Text style={styles.brandSub}>נמצאה התאמה לבקשה שלך · {serviceNameHe}</Text>
          </View>

          <View style={styles.heroBottom}>
            <Text style={styles.name} numberOfLines={1}>
              {displayNameHe}
            </Text>
            <Text style={styles.headline} numberOfLines={1}>
              {headlineHe}
            </Text>

            {/*
              * ONE line of facts, not three chips.
              *
              * Three green pills read as decoration and gave equal weight to
              * a rating, a job count and a verification — which are not
              * equally interesting. A single line is read in one pass.
              */}
            <View style={styles.factLine}>
              {ratingAverage !== null ? (
                <>
                  <StarMark size={13} />
                  <Text style={styles.factText}>
                    {ratingAverage.toFixed(1)} ({ratingCount})
                  </Text>
                  <Text style={styles.factDot}>•</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.factText, { color: colors.surface }]}>חדש ב-PRO NOW</Text>
                  <Text style={styles.factDot}>•</Text>
                </>
              )}
              <Text style={styles.factText}>
                {completedJobs === 1 ? "עבודה אחת" : `${completedJobs} עבודות`}
              </Text>
              {credentialsHe.length > 0 ? (
                <>
                  <Text style={styles.factDot}>•</Text>
                  <ShieldCheckMark size={13} color="#55D3B4" />
                  <Text style={styles.factText}>{credentialsHe.length} אימותים</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* ---------------- When ---------------- */}
        <View style={styles.when}>
          <View style={styles.whenText}>
            <Text style={styles.whenValue}>
              {etaMinutes === null ? "—" : `${etaMinutes} דק׳`}
            </Text>
            <Text style={styles.whenSub}>
              {etaMinutes === null
                ? "זמן ההגעה טרם חושב"
                : arrivalClockHe
                  ? `אצלך בערך ב-${arrivalClockHe}`
                  : eta?.isRouteBased
                    ? "זמן נסיעה בפועל"
                    : "זמן נסיעה משוער"}
            </Text>
          </View>
          <RouteLine />
        </View>

        {/* ---------------- Why this match ---------------- */}
        {reasons.length > 0 ? (
          <View style={styles.why}>
            <Text style={styles.whyTitle}>למה ההתאמה הזאת?</Text>
            <View style={styles.whyRow}>
              {reasons.map((r, i) => (
                <React.Fragment key={r.id}>
                  {i > 0 ? <Text style={styles.whyDot}>·</Text> : null}
                  <Text
                    style={[
                      styles.whyText,
                      r.kind === "LIVE" && { color: colors.actionText, fontWeight: "700" },
                    ]}
                  >
                    {r.textHe}
                  </Text>
                </React.Fragment>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------------- The work ---------------- */}
        {portfolio.length > 0 ? (
          <View style={styles.workBlock}>
            <Text style={styles.workTitle}>העבודות שלה</Text>
            {/*
              * Edge to edge, with the next image peeking. Cards around
              * photographs put a frame between the customer and the only
              * thing on this screen that actually answers "will I like
              * what I get".
              */}
            <RtlRow gutter={spacing.lg} contentContainerStyle={{ gap: spacing.sm }}>
              {portfolio.map((w, i) => (
                <View key={w.id} style={[styles.work, i === 0 && styles.workFirst]}>
                  <ImageSlot uri={w.uri} subject={w.captionHe} ratio={i === 0 ? 3 / 4 : 1} colors={colors} radius={radii.lg} />
                </View>
              ))}
            </RtlRow>
            <Text style={styles.workNote}>העבודות פורסמו באישור הלקוחות שבהן.</Text>
          </View>
        ) : null}

        {/* ---------------- What it costs ---------------- */}
        <View style={styles.price}>
          <Text style={styles.priceValue}>{explain.headline}</Text>
          <Text style={styles.priceDetail}>{explain.detail}</Text>
        </View>

        {credentialsHe.length > 0 ? (
          <View style={styles.creds}>
            {credentialsHe.map((c) => (
              <View key={c} style={styles.credRow}>
                <ShieldCheckMark size={14} color={colors.trust} />
                <Text style={styles.credText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* ---------------- Decide ---------------- */}
      <View style={styles.cta}>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={`שליחת ${displayNameHe} אליי`}
          style={({ pressed }) => [styles.accept, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.acceptText}>כן, שלחו אותה אליי</Text>
          {etaMinutes !== null ? (
            <Text style={styles.acceptSub}>הגעה משוערת: {etaMinutes} דקות</Text>
          ) : null}
        </Pressable>

        {hasAlternative ? (
          /*
            * No count. "נותרו 2" turns a match into a countdown and reads
            * as e-commerce scarcity — the opposite of the calm this screen
            * needs. Whether another exists is enough.
            */
          <Pressable onPress={onAnother} accessibilityRole="button" style={styles.another}>
            <Text style={styles.anotherText}>רוצה לראות התאמה אחרת?</Text>
          </Pressable>
        ) : (
          <Text style={styles.exhausted}>זו ההתאמה שיש כרגע באזור שלך.</Text>
        )}
      </View>
    </View>
  );
}

/** A short route glyph beside the ETA — movement, not a map. */
function RouteLine() {
  return (
    <Svg width={104} height={40} viewBox="0 0 104 40">
      <Path
        d="M4 32C22 32 26 8 50 8s30 24 50 24"
        stroke={colors.action}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeDasharray="1 7"
        fill="none"
      />
      <Rect x={0} y={28} width={8} height={8} rx={4} fill={colors.textPrimary} />
      <Rect x={96} y={28} width={8} height={8} rx={4} fill={colors.action} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden" },

  hero: { backgroundColor: palette.night800, overflow: "hidden", justifyContent: "flex-end" },
  heroFill: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  back: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(251,246,238,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { fontSize: 22, lineHeight: 24, color: colors.textPrimary },

  // Clear of the back control, which sits at top-right in RTL.
  heroTop: { position: "absolute", top: spacing.xl + 52, right: spacing.lg, left: spacing.lg, alignItems: "flex-end" },
  brandMark: { ...type.overline, color: "#FFFFFF", letterSpacing: 1.6 },
  brandSub: {
    ...type.caption,
    fontSize: 12,
    color: "rgba(255,255,255,0.86)",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  heroBottom: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, alignItems: "flex-end" },
  name: {
    ...type.display,
    fontSize: 38,
    lineHeight: 42,
    color: "#FFFFFF",
    textAlign: "right",
    writingDirection: "rtl",
  },
  headline: {
    ...type.body,
    color: "rgba(255,255,255,0.9)",
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  factLine: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: spacing.sm },
  factText: { ...type.caption, ...tabular, fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  factDot: { color: "rgba(255,255,255,0.55)", fontSize: 13 },

  when: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  whenText: { alignItems: "flex-end" },
  whenValue: { ...type.display, ...tabular, fontSize: 44, lineHeight: 46, color: colors.textPrimary },
  whenSub: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl", marginTop: 2 },

  why: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  whyTitle: { ...type.overline, color: colors.textSecondary, textAlign: "right" },
  whyRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  whyText: { ...type.body, fontSize: 15, color: colors.textPrimary, writingDirection: "rtl" },
  whyDot: { color: colors.textSecondary, fontSize: 15 },

  workBlock: { marginTop: spacing.xxl },
  workTitle: {
    ...type.overline,
    color: colors.textSecondary,
    textAlign: "right",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  work: { width: 132 },
  workFirst: { width: 208 },
  workNote: {
    ...type.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },

  price: { paddingHorizontal: spacing.lg, marginTop: spacing.xxl, alignItems: "flex-end" },
  priceValue: { ...type.h1, ...tabular, color: colors.textPrimary, writingDirection: "rtl" },
  priceDetail: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
    lineHeight: 19,
  },

  creds: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: 2 },
  credRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, minHeight: 30 },
  credText: { ...type.caption, fontSize: 13, color: colors.textSecondary, writingDirection: "rtl" },

  cta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accept: {
    minHeight: 62,
    borderRadius: radii.lg,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  acceptText: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
  acceptSub: { ...type.caption, fontSize: 12, color: colors.onAction, opacity: 0.78 },
  another: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  anotherText: { ...type.caption, fontSize: 14, color: colors.textSecondary, writingDirection: "rtl" },
  exhausted: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
});
