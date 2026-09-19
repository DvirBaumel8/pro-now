import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatMoney, money, type QuoteView } from "@pro-now/types";

import { customerTheme, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { ShieldCheckMark } from "../components/marks";
import { RingedAvatar, SectionHeader, Surface } from "../components/surfaces";

/**
 * C11 — the quote the professional sent, for the customer to approve.
 *
 * This is the only screen where the customer agrees to a number that did
 * not exist when the job started, so it is the screen where a UI mistake
 * becomes a money mistake. Four rules:
 *
 * 1. **Every line is shown.** Quantity, unit price and line total, each
 *    computed by the server and echoed here. The client never re-derives a
 *    total from the lines — if the two ever disagreed, the client's version
 *    would be the wrong one to trust (/CLAUDE.md §3).
 * 2. **Approval is version-pinned.** `versionHash` is what
 *    `POST /v1/quotes/:id/approve` requires back. A newer version the
 *    customer has not seen therefore cannot be approved by a stale screen.
 *    The short hash is visible so support can match a screenshot to a row.
 * 3. **Superseded and already-decided quotes cannot be approved.** The
 *    actions disappear rather than failing on submit.
 * 4. **Nothing is pre-approved.** No default-selected confirm, no
 *    auto-advance.
 */

const colors = customerTheme.colors;

export interface QuoteApprovalBodyProps {
  quote: QuoteView;
  serviceNameHe: string;
  professionalDisplayName: string;
  professionalPhotoUrl?: string | null;
  /** Set when a newer version exists — the customer must be moved to it. */
  supersededByVersion?: number | null;
  onApprove?: (versionHash: string) => void;
  onDecline?: () => void;
  onAskQuestion?: () => void;
  width?: number;
  height?: number;
}

const KIND_LABEL_HE: Record<string, string> = {
  LABOR: "עבודה",
  MATERIALS: "חומרים",
  OTHER: "אחר",
};

export function QuoteApprovalBody({
  quote,
  serviceNameHe,
  professionalDisplayName,
  professionalPhotoUrl = null,
  supersededByVersion = null,
  onApprove,
  onDecline,
  onAskQuestion,
  width = 390,
  height = 780,
}: QuoteApprovalBodyProps) {
  const decided = quote.status === "APPROVED" || quote.status === "DECLINED";
  const stale = quote.status === "SUPERSEDED" || supersededByVersion !== null;
  const actionable = !decided && !stale;

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text style={styles.overline}>הצעת מחיר · גרסה {quote.version}</Text>
          <Text style={styles.title}>{serviceNameHe}</Text>
          <View style={styles.proRow}>
            <RingedAvatar
              size={44}
              uri={professionalPhotoUrl}
              name={professionalDisplayName}
              colors={colors}
              ringColor={colors.action}
            />
            <View style={styles.proText}>
              <Text style={styles.proName} numberOfLines={1}>
                {professionalDisplayName}
              </Text>
              <Text style={styles.proMeta} numberOfLines={1}>
                נשלחה לאחר אבחון באתר
              </Text>
            </View>
          </View>
        </View>

        {stale ? (
          <Surface colors={colors} level={0} style={[styles.notice, { backgroundColor: tint.warning(0.14) }]}>
            <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
              {supersededByVersion !== null
                ? `נשלחה גרסה חדשה יותר (${supersededByVersion}). אשר אותה במקום גרסה זו.`
                : "הצעה זו הוחלפה בגרסה חדשה יותר."}
            </Text>
          </Surface>
        ) : null}

        {decided ? (
          <Surface
            colors={colors}
            level={0}
            style={[
              styles.notice,
              { backgroundColor: quote.status === "APPROVED" ? tint.action(0.12) : tint.neutralLight(0.05) },
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                { color: quote.status === "APPROVED" ? colors.action : colors.textSecondary },
              ]}
            >
              {quote.status === "APPROVED" ? "אישרת את ההצעה הזו." : "דחית את ההצעה הזו."}
            </Text>
          </Surface>
        ) : null}

        {/* ---------------- Line items ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="פירוט" colors={colors} />
          <Surface colors={colors} level={1} padded={false} style={styles.linesCard}>
            {quote.lineItems.map((li, i) => {
              const lineTotal = li.quantity * li.unitPriceMinorUnits;
              return (
                <View key={li.id} style={[styles.line, i > 0 && styles.lineDivided]}>
                  <Text style={styles.lineTotal}>{formatMoney(money(lineTotal, "ILS"))}</Text>
                  <View style={styles.lineText}>
                    <Text style={styles.lineDesc} numberOfLines={2}>
                      {li.description}
                    </Text>
                    <Text style={styles.lineMeta} numberOfLines={1}>
                      {KIND_LABEL_HE[li.kind] ?? li.kind}
                      {li.quantity !== 1
                        ? ` · ${li.quantity} × ${formatMoney(money(li.unitPriceMinorUnits, "ILS"))}`
                        : ""}
                    </Text>
                  </View>
                </View>
              );
            })}

            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatMoney(money(quote.totalMinorUnits, "ILS"))}</Text>
              <Text style={styles.totalLabel}>סה״כ לתשלום</Text>
            </View>
          </Surface>

          <Text style={styles.vatNote}>הסכום כולל מע״מ. לא ייגבה תשלום נוסף ללא אישור שלך לגרסה חדשה.</Text>
        </View>

        {quote.notes ? (
          <View style={styles.block}>
            <SectionHeader title="הערות בעל המקצוע" colors={colors} />
            <Surface colors={colors} level={0} style={{ backgroundColor: tint.neutralLight(0.035) }}>
              <Text style={styles.notes}>{quote.notes}</Text>
            </Surface>
          </View>
        ) : null}

        {/* ---------------- Integrity ---------------- */}
        <View style={styles.block}>
          <View style={styles.hashRow}>
            <ShieldCheckMark size={15} color={colors.action} />
            <Text style={styles.hashText} numberOfLines={2}>
              מזהה גרסה {quote.versionHash.slice(0, 10)} — האישור שלך נצמד בדיוק לגרסה הזו. אם הפירוט ישתנה, תתבקש
              לאשר מחדש.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ---------------- Actions ---------------- */}
      {actionable ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onApprove?.(quote.versionHash)}
            accessibilityRole="button"
            accessibilityLabel={`אישור הצעת מחיר על סך ${formatMoney(money(quote.totalMinorUnits, "ILS"))}`}
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.primaryLabel}>
              אישור ותשלום {formatMoney(money(quote.totalMinorUnits, "ILS"))}
            </Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable onPress={onAskQuestion} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryLabel}>שאלה לבעל המקצוע</Text>
            </Pressable>
            <Pressable onPress={onDecline} accessibilityRole="button" style={styles.secondary}>
              <Text style={[styles.secondaryLabel, { color: colors.statusDanger }]}>דחייה</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  // Clears the pinned action bar, so the version-hash line can be scrolled
  // into view rather than sitting permanently behind the approve button.
  scroll: { paddingBottom: 150 },

  head: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    alignItems: "flex-end",
    ...elevation(1),
  },
  overline: { ...type.overline, color: colors.textSecondary },
  title: { ...type.h1, color: colors.textPrimary, marginTop: 2, writingDirection: "rtl" },
  proRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginTop: spacing.lg, alignSelf: "stretch" },
  proText: { flex: 1, alignItems: "flex-end" },
  proName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  proMeta: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  notice: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  noticeText: { ...type.captionStrong, textAlign: "right", writingDirection: "rtl", lineHeight: 19 },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  linesCard: { paddingVertical: spacing.xs },
  line: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lineDivided: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.border },
  lineText: { flex: 1, alignItems: "flex-end" },
  lineDesc: { ...type.body, fontSize: 15, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  lineMeta: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 1 },
  lineTotal: { ...type.bodyStrong, ...tabular, color: colors.textPrimary, minWidth: 74, textAlign: "left" },

  totalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: tint.action(0.05),
  },
  totalLabel: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  totalValue: { ...type.h2, ...tabular, color: colors.textPrimary },

  vatNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  notes: { ...type.body, fontSize: 15, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl", lineHeight: 22 },

  hashRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm },
  hashText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...elevation(3),
  },
  primary: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { ...type.bodyStrong, fontSize: 17, color: "#06210F" },
  secondaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: spacing.sm },
  secondary: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: "center" },
  secondaryLabel: { ...type.captionStrong, color: colors.textSecondary },
});
