import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatMoney, money, type QuoteView } from "@pro-now/types";

import { customerTheme, elevation, radii, scale, spacing, tabular, tint, type } from "../theme";
import { RingedAvatar, Surface } from "../components/surfaces";
import { VoiceNote } from "../components/VoiceNote";

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
 *
 * ---------------------------------------------------------------------
 * WHY THIS SCREEN STAYS LIGHT WHILE THE REST OF THE APP WENT DARK
 * ---------------------------------------------------------------------
 * It is now one of two light screens in the customer app, and it is the
 * exception that survived the reversal of §12 intact, on ChatGPT's original
 * reasoning: "הכסף וההסכמה צריכים להרגיש כמו מסמך ברור, לא כמו עוד live
 * event." Now that light is scarce, the exception lands harder than it did
 * when everything around it was ivory too — arriving here feels like being
 * handed a piece of paper, which is exactly the register consent should have.
 *
 * ---------------------------------------------------------------------
 * AND WHY IT SAYS LESS
 * ---------------------------------------------------------------------
 * Amit: "לא צריך מלא מלא מלל, צריך ממוקד ונגיש." Before the total, this
 * screen used to show an overline, a title, a professional row, a section
 * header, and then a card per line item. The number a person is being asked
 * to agree to was the sixth thing they met.
 *
 * It is now the first. Who inspected the fault, then the total at hero size,
 * then the breakdown directly on the surface — no card per line, because a
 * line item is not a unit that can be selected, moved or opened (§4). The
 * version hash stays, because support needs to match a screenshot to a row,
 * but it is micro type at the foot rather than a paragraph with a shield.
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
  /** A message this professional recorded about THIS quote. */
  voiceNote?: {
    seconds: number;
    transcriptHe?: string | null;
    playing?: boolean;
    onTogglePlay?: () => void;
  } | null;
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
  voiceNote = null,
  width = 390,
  height = 780,
}: QuoteApprovalBodyProps) {
  const decided = quote.status === "APPROVED" || quote.status === "DECLINED";
  const stale = quote.status === "SUPERSEDED" || supersededByVersion !== null;
  const actionable = !decided && !stale;

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ------------------------------------------------------------
            WHO, THEN HOW MUCH. In that order, and nothing between them.
            ------------------------------------------------------------ */}
        <View style={styles.head}>
          <View style={styles.proRow}>
            <RingedAvatar
              size={40}
              uri={professionalPhotoUrl}
              name={professionalDisplayName}
              colors={colors}
              ringColor={colors.trust}
            />
            <Text style={styles.who} numberOfLines={2}>
              {professionalDisplayName} בדק את {serviceNameHe}
            </Text>
          </View>

          <Text style={styles.total} numberOfLines={1}>
            {formatMoney(money(quote.totalMinorUnits, "ILS"))}
          </Text>
          <Text style={styles.totalNote}>כולל מע״מ · הסכום הסופי לעבודה הזו</Text>
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

        {/* ---------------- What it is made of ---------------- */}
        {/*
          * ON THE SURFACE, NOT IN CARDS. A line item has no independent
          * state and cannot be selected, opened or moved, so by §4 it is
          * not a card — it is a row with a hairline above it. Four cards
          * stacked here also made the total look like a fifth card rather
          * than like the answer.
          */}
        <View style={styles.block}>
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
        </View>

        {quote.notes ? (
          <View style={styles.block}>
            <Text style={styles.notesLabel}>מה שהוא כתב</Text>
            <Text style={styles.notes}>{quote.notes}</Text>
          </View>
        ) : null}

        {/*
          * A MESSAGE IN HIS OWN VOICE, when there is one. A quote is a
          * number a stranger arrived at in your kitchen; thirty seconds of
          * him explaining it does more for trust than any line item can.
          * Only a real recording for THIS job — VoiceNote has no stock
          * variant, on purpose.
          */}
        {voiceNote ? (
          <View style={styles.block}>
            <VoiceNote
              kind="JOB_MESSAGE"
              speakerNameHe={professionalDisplayName}
              speakerPhotoUri={professionalPhotoUrl}
              transcriptHe={voiceNote.transcriptHe}
              seconds={voiceNote.seconds}
              playing={voiceNote.playing}
              onTogglePlay={voiceNote.onTogglePlay}
              tone="light"
              width={width - spacing.lg * 2}
            />
          </View>
        ) : null}

        {/* Provenance, in the smallest type the system has. */}
        <Text style={styles.hashText} numberOfLines={2}>
          גרסה {quote.version} · {quote.versionHash.slice(0, 10)} — האישור נצמד לגרסה הזו בלבד.
        </Text>

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
  proRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    alignSelf: "stretch",
  },
  who: { ...type.body, color: colors.textSecondary, flex: 1, textAlign: "right", writingDirection: "rtl" },
  /*
   * THE HERO IS THE NUMBER. §1 allows one hero per viewport and this is the
   * screen with the least doubt about which value deserves it: it is the
   * only figure on it the customer is being asked to agree to.
   */
  total: { ...type.hero, ...tabular, color: colors.textPrimary, marginTop: spacing.lg },
  totalNote: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl", marginTop: 2 },

  notice: { marginHorizontal: spacing.lg, marginTop: spacing.lg },
  noticeText: { ...type.captionStrong, textAlign: "right", writingDirection: "rtl", lineHeight: 19 },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  line: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  lineDivided: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.border },
  lineText: { flex: 1, alignItems: "flex-end" },
  lineDesc: { ...type.body, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  lineMeta: { ...type.meta, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 1 },
  lineTotal: { ...type.bodyStrong, ...tabular, color: colors.textPrimary, minWidth: 74, textAlign: "left" },

  notesLabel: {
    ...type.metaStrong,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.xs,
  },

  vatNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  notes: { ...type.body, fontSize: scale.meta, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl", lineHeight: 22 },

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
  primaryLabel: { ...type.bodyStrong, fontSize: scale.body, color: colors.onAction },
  secondaryRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: spacing.sm },
  secondary: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: "center" },
  secondaryLabel: { ...type.captionStrong, color: colors.textSecondary },
});
