import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { EtaView, PriceQuoteView } from "@pro-now/types";

import { customerTheme, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { priceExplainer } from "../pricing-copy";
import { Persona } from "../components/Persona";
import { RtlRow } from "../components/RtlRow";
import { ImageSlot, SectionHeader } from "../components/surfaces";
import { ClockMark, ShieldCheckMark, StarMark } from "../components/marks";

/**
 * C-PF — "מצאנו לך התאמה". The screen a haircut needs and a blocked drain
 * must never see.
 *
 * WHY THIS EXISTS AT ALL. PRO NOW's whole premise is that the customer does
 * not choose a professional — dispatch does, from eligibility, presence and
 * proximity, and that is a feature: being handed a directory at the moment
 * your kitchen is filling with water is a burden, not a courtesy.
 *
 * But that premise quietly assumes the professional is interchangeable, and
 * for some services they are not. When someone is coming to cut your hair,
 * do your nails, or work on your body in your own home, the person IS the
 * service. "Anyone competent" is the right answer to a question nobody
 * asked. Running that through the same silent auto-assignment does not just
 * underperform — it tells the customer we did not understand what they were
 * buying.
 *
 * SO THE COMPROMISE IS DELIBERATE AND NARROW:
 *
 * - The SYSTEM still matches. This is not a search, not a directory, and not
 *   a feed. One proposal at a time, chosen by the same dispatch rules.
 * - The CUSTOMER confirms. They see who, what their work looks like, and
 *   what it costs, and they say yes.
 * - Declining is BOUNDED. `alternativesLeft` counts down and the screen
 *   says so. Infinite alternatives is a swipe app wearing a marketplace's
 *   clothes: it turns a two-tap booking into a browsing session, and it
 *   teaches customers to keep looking instead of to trust the match.
 *
 * WHAT IT REFUSES TO SHOW. No "97% match", no compatibility score, no
 * ranking language. We match on eligibility, presence and distance; dressing
 * that up as personal understanding would be a fabricated capability
 * (/CLAUDE.md §3), and it is the exact place a product like this is tempted
 * to invent one.
 */

const colors = customerTheme.colors;

export interface PortfolioItem {
  id: string;
  /** Real image when there is one; otherwise the honest placeholder. */
  uri: string | null;
  captionHe: string;
}

export interface MatchConfirmBodyProps {
  serviceNameHe: string;
  displayNameHe: string;
  /** Stable seed for the illustrated portrait. */
  seed: string;
  /** What this professional actually does within the service. Facts only. */
  specialtiesHe: string[];
  portfolio: PortfolioItem[];
  /** null until there are enough PRO NOW reviews to average honestly. */
  ratingAverage: number | null;
  ratingCount: number;
  completedJobs: number;
  /** Verified credentials, in words the customer can judge. */
  credentialsHe: string[];
  eta: EtaView | null;
  price: PriceQuoteView;
  /** How many more proposals the customer may ask for. Zero hides the action. */
  alternativesLeft: number;
  onAccept?: () => void;
  onAnother?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function MatchConfirmBody({
  serviceNameHe,
  displayNameHe,
  seed,
  specialtiesHe,
  portfolio,
  ratingAverage,
  ratingCount,
  completedJobs,
  credentialsHe,
  eta,
  price,
  alternativesLeft,
  onAccept,
  onAnother,
  onBack,
  width = 390,
  height = 780,
}: MatchConfirmBodyProps) {
  const explain = priceExplainer(price);
  const etaMinutes = eta ? Math.round(eta.etaSeconds / 60) : null;

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="חזרה"
          style={styles.back}
        >
          <Text style={styles.backGlyph}>›</Text>
        </Pressable>

        <Text style={styles.kicker}>מצאנו לך התאמה</Text>
        <Text style={styles.service}>{serviceNameHe}</Text>

        {/* ---------------- Who ---------------- */}
        <View style={styles.who}>
          <View style={styles.portrait}>
            <Persona seed={seed} size={92} />
          </View>
          <View style={styles.whoText}>
            <Text style={styles.name} numberOfLines={1}>
              {displayNameHe}
            </Text>
            <View style={styles.statRow}>
              {/*
                * A rating is shown only when there are enough PRO NOW
                * reviews behind it. "5.0 (1)" is not a reputation, it is one
                * person's morning — and presenting it as a score is how a
                * new professional gets destroyed by a single bad day.
                */}
              {ratingAverage !== null ? (
                <View style={styles.stat}>
                  <StarMark size={13} />
                  <Text style={styles.statText}>
                    {ratingAverage.toFixed(1)} ({ratingCount})
                  </Text>
                </View>
              ) : (
                <Text style={styles.statNew}>חדש ב-PRO NOW</Text>
              )}
              <Text style={styles.statText}>
                {completedJobs === 1 ? "עבודה אחת" : `${completedJobs} עבודות`} דרך PRO NOW
              </Text>
            </View>
          </View>
        </View>

        {specialtiesHe.length > 0 ? (
          <View style={styles.tags}>
            {specialtiesHe.map((sp) => (
              <View key={sp} style={styles.tag}>
                <Text style={styles.tagText}>{sp}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ---------------- Work ---------------- */}
        {portfolio.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="עבודות קודמות" colors={colors} />
            {/* RtlRow, not a bare ScrollView: the first piece of work must
                start at the right, where a Hebrew reader starts. */}
            <RtlRow contentContainerStyle={{ gap: spacing.sm }}>
              {portfolio.map((w) => (
                <View key={w.id} style={styles.work}>
                  <ImageSlot uri={w.uri} subject={w.captionHe} ratio={1} colors={colors} />
                </View>
              ))}
            </RtlRow>
            <Text style={styles.workNote}>
              העבודות פורסמו באישור הלקוחות שבהן.
            </Text>
          </View>
        ) : null}

        {/* ---------------- Facts ---------------- */}
        <View style={styles.facts}>
          <View style={styles.fact}>
            <ClockMark size={15} color={colors.textSecondary} />
            <Text style={styles.factValue}>
              {etaMinutes === null ? "—" : `${etaMinutes} דק׳`}
            </Text>
            <Text style={styles.factLabel}>
              {etaMinutes === null
                ? "זמן הגעה טרם חושב"
                : eta?.isRouteBased
                  ? "זמן הגעה"
                  : "זמן הגעה · משוער"}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factValue}>{explain.headline}</Text>
            <Text style={styles.factLabel} numberOfLines={2}>
              {explain.detail}
            </Text>
          </View>
        </View>

        {/* ---------------- Verified ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מה אומת" colors={colors} />
          {credentialsHe.map((c) => (
            <View key={c} style={styles.credRow}>
              <ShieldCheckMark size={15} color={colors.trust} />
              <Text style={styles.credText}>{c}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ---------------- Decide ---------------- */}
      <View style={styles.cta}>
        <Pressable
          onPress={onAccept}
          accessibilityRole="button"
          accessibilityLabel={`אישור ${displayNameHe}`}
          style={({ pressed }) => [styles.accept, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.acceptText}>מתאים לי</Text>
        </Pressable>

        {alternativesLeft > 0 ? (
          <Pressable
            onPress={onAnother}
            accessibilityRole="button"
            style={styles.another}
          >
            <Text style={styles.anotherText}>
              {/*
                * The count is stated, not hidden. A "next" button with no
                * end makes this a feed; saying how many remain keeps it a
                * decision — and a customer who knows they have two left
                * spends them rather than browsing.
                */}
              מצא התאמה אחרת · נותרו {alternativesLeft}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.exhausted}>
            זו ההתאמה האחרונה שיש כרגע באזור שלך.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden" },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },

  back: {
    alignSelf: "flex-end",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  backGlyph: { fontSize: 22, lineHeight: 24, color: colors.textPrimary },

  kicker: { ...type.overline, color: colors.actionText, textAlign: "right" },
  service: {
    ...type.h1,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },

  who: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.lg, marginTop: spacing.xl },
  portrait: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: "hidden",
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.action,
  },
  whoText: { flex: 1 },
  name: { ...type.h2, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  statRow: { marginTop: 4, gap: 3, alignItems: "flex-end" },
  stat: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  statText: { ...type.caption, ...tabular, color: colors.textSecondary, writingDirection: "rtl" },
  statNew: { ...type.captionStrong, color: colors.trust, writingDirection: "rtl" },

  tags: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  tag: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.trust(0.1),
  },
  tagText: { ...type.caption, fontSize: 13, color: colors.trust, writingDirection: "rtl" },

  block: { marginTop: spacing.xxl },
  work: { width: 132, borderRadius: radii.md, overflow: "hidden" },
  workNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },

  facts: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.xxl },
  fact: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: "flex-end",
    gap: 2,
    ...elevation(1),
  },
  factValue: { ...type.h3, ...tabular, color: colors.textPrimary, writingDirection: "rtl" },
  factLabel: {
    ...type.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  credRow: { flexDirection: "row-reverse", alignItems: "center", gap: 8, minHeight: 32 },
  credText: { ...type.caption, fontSize: 14, color: colors.textPrimary, writingDirection: "rtl" },

  cta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accept: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
  another: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: spacing.sm },
  anotherText: { ...type.captionStrong, color: colors.actionText, writingDirection: "rtl" },
  exhausted: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
});
