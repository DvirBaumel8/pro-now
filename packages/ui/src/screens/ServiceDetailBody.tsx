import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { PriceQuoteView } from "@pro-now/types";

import { customerTheme, elevation, imageRatio, radii, spacing, tabular, tint, type } from "../theme";
import { priceExplainer } from "../pricing-copy";
import { ClockMark, Mark, type MarkName, ShieldCheckMark } from "../components/marks";
import { ImageSlot, SectionHeader, Surface } from "../components/surfaces";

/**
 * C04 — the service page, reached from the home catalogue and shown before
 * the customer asks for anyone to come.
 *
 * Its whole job is to make the commitment legible BEFORE dispatch starts,
 * because once a professional accepts, someone has left to drive to this
 * address. So it answers three questions in order: what am I paying, what
 * is included, and what happens the moment I press the button.
 *
 * SYMPTOMS ARE SELECTABLE, NOT PROSE. The description used to end with a
 * comma-separated list — "הפסקת חשמל מקומית, ממסר פחת שקופץ, שקע שאינו
 * עובד" — and the first person to read it asked what those options meant.
 * They were right to: a list of concrete cases reads as a set of choices,
 * and if tapping one does nothing the screen has lied about its own
 * affordance.
 *
 * Making them real chips is also the better product. The job row already has
 * a `structuredAnswers` column (/docs/05-DATABASE.md); filling it at the
 * only moment the customer actually knows the answer means the professional
 * arrives knowing whether it is one dead socket or the whole flat, and can
 * bring the right part instead of a second visit.
 *
 * Honesty rules:
 * - Pricing copy is derived from the server's `PriceQuoteView` by
 *   `priceExplainer()` below. Each model explains its own shape; no model
 *   is described as "fixed" unless it is.
 * - `availableNowCount` is real supply or it is absent. A missing count
 *   renders as a missing count, never as "זמין עכשיו" — the ONLINE-FIRST
 *   promise is the one thing this product cannot fake (/CLAUDE.md §3).
 * - No ETA is promised here. Travel time depends on who accepts, and
 *   nobody has accepted yet.
 */

const colors = customerTheme.colors;

export { priceExplainer };

export interface ServiceDetailBodyProps {
  nameHe: string;
  mark: MarkName;
  /** What the licensed hero photograph shows. */
  photoSubject: string;
  photoUri?: string | null;
  descriptionHe: string;
  /**
   * Concrete cases the customer can tap. Optional: a service with no useful
   * distinctions should not invent them just to fill the screen.
   */
  symptomsHe?: string[];
  /** What the visit covers. Facts from the catalogue, not marketing. */
  includedHe: string[];
  /** What it explicitly does not cover — prevents the dispute, later. */
  notIncludedHe: string[];
  price: PriceQuoteView;
  /** Real count of professionals ONLINE and eligible right now, or null. */
  availableNowCount: number | null;
  /** Credentials required for this service, per /CLAUDE.md §3. */
  requiredCredentialsHe: string[];
  /** Receives the tapped symptoms, for the job's structuredAnswers. */
  onRequestNow?: (symptomsHe: string[]) => void;
  /** Re-runs the supply query. The honest action when nobody is online. */
  onRecheck?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function ServiceDetailBody({
  nameHe,
  mark,
  photoSubject,
  photoUri = null,
  descriptionHe,
  symptomsHe = [],
  includedHe,
  notIncludedHe,
  price,
  availableNowCount,
  requiredCredentialsHe,
  onRequestNow,
  onRecheck,
  onBack,
  width = 390,
  height = 780,
}: ServiceDetailBodyProps) {
  const explainer = priceExplainer(price);
  const canDispatch = availableNowCount !== null && availableNowCount > 0;
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (sx: string) =>
    setPicked((cur) => (cur.includes(sx) ? cur.filter((x) => x !== sx) : [...cur, sx]));

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---------------- Hero photo ---------------- */}
        <View style={styles.heroWrap}>
          <ImageSlot
            subject={photoSubject}
            uri={photoUri}
            ratio={imageRatio.hero}
            radius={0}
            colors={colors}
            overlay
            style={{ width }}
          />
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backGlyph}>›</Text>
          </Pressable>
          <View style={styles.heroBubble}>
            <Mark name={mark} size={24} color={colors.action} />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{nameHe}</Text>
          <Text style={styles.description}>{descriptionHe}</Text>

          {/* Supply — real or absent, never implied */}
          <View style={styles.supplyRow}>
            {availableNowCount === null ? (
              <View style={[styles.supplyPill, { backgroundColor: tint.neutralLight(0.05) }]}>
                <Text style={[styles.supplyText, { color: colors.textSecondary }]}>
                  נתוני זמינות אינם זמינים כרגע
                </Text>
              </View>
            ) : availableNowCount === 0 ? (
              <View style={[styles.supplyPill, { backgroundColor: tint.warning(0.14) }]}>
                <Text style={[styles.supplyText, { color: colors.textPrimary }]}>
                  כרגע אין בעלי מקצוע זמינים באזור שלך
                </Text>
              </View>
            ) : (
              <View style={[styles.supplyPill, { backgroundColor: tint.action(0.12) }]}>
                <View style={styles.dot} />
                <Text style={[styles.supplyText, { color: colors.action }]}>
                  {availableNowCount === 1
                    ? "בעל מקצוע אחד זמין עכשיו באזור שלך"
                    : `${availableNowCount} בעלי מקצוע זמינים עכשיו באזור שלך`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ---------------- What's actually happening ---------------- */}
        {symptomsHe.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="מה קורה אצלך?" colors={colors} />
            <View style={styles.symptoms}>
              {symptomsHe.map((sx) => {
                const on = picked.includes(sx);
                return (
                  <Pressable
                    key={sx}
                    onPress={() => toggle(sx)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    style={[
                      styles.symptom,
                      on && { backgroundColor: tint.action(0.14), borderColor: colors.action },
                    ]}
                  >
                    <Text
                      style={[styles.symptomText, on && { color: colors.actionText, fontWeight: "700" }]}
                      numberOfLines={2}
                    >
                      {sx}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.symptomNote}>
              לא חובה — אבל זה מה שקובע אם המקצוען מגיע עם החלק הנכון או חוזר פעם שנייה.
            </Text>
          </View>
        ) : null}

        {/* ---------------- Price ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מחיר" colors={colors} />
          <Surface colors={colors} level={1}>
            <Text style={styles.priceHeadline}>{explainer.headline}</Text>
            <Text style={styles.priceDetail}>{explainer.detail}</Text>
          </Surface>
        </View>

        {/* ---------------- Included / not included ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מה כולל" colors={colors} />
          <View style={styles.bullets}>
            {includedHe.map((b, i) => (
              <Bullet key={`in-${i}`} text={b} tone="yes" />
            ))}
            {notIncludedHe.map((b, i) => (
              <Bullet key={`out-${i}`} text={b} tone="no" />
            ))}
          </View>
        </View>

        {/* ---------------- Verification ---------------- */}
        {requiredCredentialsHe.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="מי יגיע" colors={colors} />
            <Surface colors={colors} level={0} style={{ backgroundColor: tint.action(0.07) }}>
              <View style={styles.credHead}>
                <ShieldCheckMark size={16} color={colors.action} />
                <Text style={styles.credTitle}>לשירות הזה נשלחים רק בעלי מקצוע שעברו:</Text>
              </View>
              {requiredCredentialsHe.map((c, i) => (
                <Text key={i} style={styles.credItem}>
                  · {c}
                </Text>
              ))}
            </Surface>
          </View>
        ) : null}

        {/* ---------------- What happens next ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מה קורה אחרי שתלחץ" colors={colors} />
          <View style={styles.steps}>
            {[
              "מחפשים בעל מקצוע מאומת שזמין עכשיו באזור שלך.",
              "תראה מי נמצא, כמה זמן עד שיגיע, ומה המחיר — לפני שתאשר.",
              "רק אחרי שתאשר, הכתובת המלאה ומספר הטלפון נחשפים לשני הצדדים.",
            ].map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
          <View style={styles.etaNote}>
            <ClockMark size={14} color={colors.textSecondary} />
            <Text style={styles.etaNoteText}>
              זמן ההגעה מוצג רק אחרי שבעל מקצוע מסוים מקבל את העבודה — הוא תלוי במי שקיבל אותה.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ---------------- CTA ---------------- */}
      {/*
       * When nobody is online the screen offers the action that actually
       * exists — check again — and states the true reason. It deliberately
       * does NOT offer to notify the customer: PRO NOW has no availability
       * watch, and a button that promises a push nobody will send is a
       * fabricated capability, which /CLAUDE.md §3 rules out just as firmly
       * as fabricated supply. When the watch is built, this is where it goes.
       */}
      <View style={styles.cta}>
        <Pressable
          onPress={canDispatch ? () => onRequestNow?.(picked) : onRecheck}
          accessibilityRole="button"
          accessibilityLabel={canDispatch ? `בקשת ${nameHe} עכשיו` : "בדיקה מחדש של הזמינות"}
          style={({ pressed }) => [
            styles.ctaBtn,
            !canDispatch && styles.ctaBtnQuiet,
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={[styles.ctaLabel, !canDispatch && { color: colors.textPrimary }]}>
            {canDispatch ? "בקשת בעל מקצוע עכשיו" : "בדיקה מחדש"}
          </Text>
        </Pressable>
        <Text style={styles.ctaNote}>
          {canDispatch ? "לא מחויב עד שתאשר את ההתאמה" : "הזמינות משתנה לאורך היום"}
        </Text>
      </View>
    </View>
  );
}

function Bullet({ text, tone }: { text: string; tone: "yes" | "no" }) {
  return (
    <View style={styles.bullet}>
      <View
        style={[
          styles.bulletGlyph,
          { backgroundColor: tone === "yes" ? tint.action(0.12) : tint.neutralLight(0.06) },
        ]}
      >
        <Text style={[styles.bulletGlyphText, { color: tone === "yes" ? colors.action : colors.textSecondary }]}>
          {tone === "yes" ? "✓" : "−"}
        </Text>
      </View>
      <Text style={[styles.bulletText, tone === "no" && { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  // The CTA is pinned over the scroll, so the last content needs room to
  // clear it — otherwise the closing note is unreachable, not just hidden.
  scroll: { paddingBottom: 116 },

  heroWrap: { position: "relative" },
  back: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { fontSize: 26, lineHeight: 28, color: colors.textPrimary, fontWeight: "300" },
  heroBubble: {
    position: "absolute",
    bottom: -22,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...elevation(2),
  },

  titleBlock: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, alignItems: "flex-end" },
  title: { ...type.h1, color: colors.textPrimary, writingDirection: "rtl" },
  description: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },

  supplyRow: { alignSelf: "stretch", marginTop: spacing.lg },
  supplyPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.pill,
    maxWidth: "100%",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.action },
  supplyText: { ...type.captionStrong, writingDirection: "rtl" },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  priceHeadline: { ...type.h1, ...tabular, color: colors.textPrimary, textAlign: "right" },
  priceDetail: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    lineHeight: 19,
  },

  symptoms: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  symptom: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: "100%",
  },
  symptomText: { ...type.caption, fontSize: 14, color: colors.textPrimary, writingDirection: "rtl" },
  symptomNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 18,
  },

  bullets: { gap: spacing.sm },
  bullet: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.md },
  bulletGlyph: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  bulletGlyphText: { fontSize: 13, fontWeight: "700" },
  bulletText: {
    ...type.body,
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },

  credHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  credTitle: { ...type.captionStrong, color: colors.textPrimary, writingDirection: "rtl" },
  credItem: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },

  steps: { gap: spacing.md },
  step: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.md },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tint.neutralLight(0.06),
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { ...type.captionStrong, color: colors.textPrimary },
  stepText: {
    ...type.body,
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 21,
  },

  etaNote: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
  etaNoteText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  cta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...elevation(3),
  },
  ctaBtn: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  // Outlined rather than greyed-out: "check again" is a real, enabled action,
  // and a disabled-looking button would say the screen is a dead end.
  ctaBtnQuiet: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: colors.border },
  ctaLabel: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
  ctaNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
});
