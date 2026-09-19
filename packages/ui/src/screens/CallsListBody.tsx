import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { formatMoney, money } from "@pro-now/types";

import { customerTheme, elevation, palette, radii, spacing, tabular, tint, type } from "../theme";
import { lex } from "../lexicon";
import { ClockMark, Mark, type MarkName, StarMark } from "../components/marks";
import { Persona } from "../components/Persona";
import { SectionHeader, Surface } from "../components/surfaces";

/**
 * C16 — the customer's calls.
 *
 * This tab used to render the profile screen, which is the laziest kind of
 * dead end: it looks implemented and answers nothing. A calls list has a
 * different job from a profile — it is where someone goes mid-job to check
 * "where is he", and afterwards to find a receipt or re-book the person who
 * was good.
 *
 * So it is ordered by urgency rather than by date: what is happening right
 * now, then what needs the customer (an unapproved quote, an unrated job),
 * then history. A reverse-chronological list buries the live job under last
 * March's paint job by the third month of use.
 */

const colors = customerTheme.colors;

export interface CallListItem {
  id: string;
  serviceNameHe: string;
  mark: MarkName;
  /** Plain-language state, e.g. lex.onTheWay or lex.done. */
  stateHe: string;
  whenHe: string;
  live: boolean;
  /** Set while a professional is assigned. */
  proNameHe: string | null;
  proSeed: string | null;
  etaMinutes: number | null;
  totalMinorUnits: number | null;
  myRating: number | null;
  /** True when a quote is waiting for this customer to approve or decline. */
  needsQuoteApproval?: boolean;
}

export interface CallsListBodyProps {
  calls: CallListItem[];
  onOpen?: (id: string) => void;
  onRate?: (id: string) => void;
  onApproveQuote?: (id: string) => void;
  onNewCall?: () => void;
  width?: number;
  height?: number;
}

export function CallsListBody({
  calls,
  onOpen,
  onRate,
  onApproveQuote,
  onNewCall,
  width = 390,
  height = 780,
}: CallsListBodyProps) {
  const live = calls.filter((c) => c.live);
  const needsYou = calls.filter((c) => !c.live && (c.needsQuoteApproval || c.myRating === null));
  const done = calls.filter((c) => !live.includes(c) && !needsYou.includes(c));

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Text style={styles.title}>{lex.myCalls}</Text>
        </View>

        {calls.length === 0 ? (
          <View style={styles.block}>
            <Surface colors={colors} level={1} style={styles.empty}>
              <View style={styles.emptyMark}>
                <Mark name="handyman" size={24} color={colors.action} />
              </View>
              <Text style={styles.emptyTitle}>עוד לא שלחת קריאה</Text>
              <Text style={styles.emptyBody}>
                כל קריאה שתשלח תופיע כאן — עם מי הגיע, מתי, וכמה זה עלה.
              </Text>
              <Pressable onPress={onNewCall} accessibilityRole="button" style={styles.emptyCta}>
                <Text style={styles.emptyCtaText}>{lex.sendCall}</Text>
              </Pressable>
            </Surface>
          </View>
        ) : null}

        {/* ---------------- Happening now ---------------- */}
        {live.map((c) => (
          <Pressable key={c.id} onPress={() => onOpen?.(c.id)} style={styles.liveWrap}>
            <View style={styles.liveCard}>
              <View style={styles.liveTop}>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveState}>{c.stateHe}</Text>
                </View>
                {c.etaMinutes !== null ? (
                  <View style={styles.liveEta}>
                    <ClockMark size={14} color={palette.white} />
                    <Text style={styles.liveEtaText}>{c.etaMinutes} דק׳</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.liveService} numberOfLines={1}>
                {c.serviceNameHe}
              </Text>
              {c.proSeed && c.proNameHe ? (
                <View style={styles.livePro}>
                  <Persona seed={c.proSeed} size={32} ring="rgba(255,255,255,0.5)" />
                  <Text style={styles.liveProName} numberOfLines={1}>
                    {c.proNameHe}
                  </Text>
                </View>
              ) : (
                <Text style={styles.liveProName}>{lex.scanning}…</Text>
              )}
            </View>
          </Pressable>
        ))}

        {/* ---------------- Waiting on you ---------------- */}
        {needsYou.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="ממתין לך" colors={colors} />
            <View style={{ gap: spacing.sm }}>
              {needsYou.map((c) => (
                <Surface key={c.id} colors={colors} level={1}>
                  <Row call={c} onOpen={onOpen} />
                  <Pressable
                    onPress={() => (c.needsQuoteApproval ? onApproveQuote?.(c.id) : onRate?.(c.id))}
                    accessibilityRole="button"
                    style={styles.rowCta}
                  >
                    <Text style={styles.rowCtaText}>
                      {c.needsQuoteApproval ? "צפייה בהצעת המחיר" : "דירוג המקצוען"}
                    </Text>
                  </Pressable>
                </Surface>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------------- History ---------------- */}
        {done.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="הושלמו" colors={colors} />
            <View style={{ gap: spacing.sm }}>
              {done.map((c) => (
                <Pressable key={c.id} onPress={() => onOpen?.(c.id)}>
                  <Surface colors={colors} level={1}>
                    <Row call={c} onOpen={onOpen} />
                  </Surface>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Row({ call: c }: { call: CallListItem; onOpen?: (id: string) => void }) {
  return (
    <>
      <View style={styles.row}>
        <View style={styles.rowMark}>
          <Mark name={c.mark} size={18} color={colors.action} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowName} numberOfLines={1}>
            {c.serviceNameHe}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {c.whenHe} · {c.stateHe}
          </Text>
        </View>
        {c.totalMinorUnits !== null ? (
          <Text style={styles.rowTotal}>{formatMoney(money(c.totalMinorUnits, "ILS"))}</Text>
        ) : null}
      </View>

      {c.proSeed && c.proNameHe ? (
        <View style={styles.rowPro}>
          <Persona seed={c.proSeed} size={24} />
          <Text style={styles.rowProName} numberOfLines={1}>
            {c.proNameHe}
          </Text>
          {c.myRating !== null ? (
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((i) => (
                <StarMark
                  key={i}
                  size={11}
                  filled={i <= (c.myRating as number)}
                  color={i <= (c.myRating as number) ? colors.statusWarning : colors.border}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  scroll: { paddingBottom: spacing.xxl },

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, alignItems: "flex-end" },
  title: { ...type.h1, color: colors.textPrimary, writingDirection: "rtl" },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  empty: { alignItems: "center" },
  emptyMark: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: tint.action(0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...type.h3, color: colors.textPrimary, marginTop: spacing.md, writingDirection: "rtl" },
  emptyBody: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  emptyCta: {
    minHeight: 48,
    alignSelf: "stretch",
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  emptyCtaText: { ...type.bodyStrong, fontSize: 15, color: "#FFFFFF" },

  liveWrap: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  liveCard: { backgroundColor: colors.action, borderRadius: radii.lg, padding: spacing.lg, ...elevation(2) },
  liveTop: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  livePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.white },
  liveState: { ...type.captionStrong, color: palette.white, writingDirection: "rtl" },
  liveEta: { flexDirection: "row-reverse", alignItems: "center", gap: 5 },
  liveEtaText: { ...type.bodyStrong, ...tabular, color: palette.white },
  liveService: { ...type.h2, color: palette.white, textAlign: "right", writingDirection: "rtl", marginTop: spacing.md },
  livePro: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  liveProName: { ...type.caption, color: "rgba(255,255,255,0.92)", writingDirection: "rtl" },

  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  rowMark: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tint.action(0.1),
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, alignItems: "flex-end" },
  rowName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  rowMeta: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  rowTotal: { ...type.bodyStrong, ...tabular, color: colors.textPrimary },

  rowPro: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.border,
  },
  rowProName: { ...type.caption, flex: 1, color: colors.textSecondary, writingDirection: "rtl" },
  stars: { flexDirection: "row-reverse", gap: 1.5 },

  rowCta: {
    minHeight: 44,
    borderRadius: radii.sm,
    backgroundColor: tint.action(0.12),
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  rowCtaText: { ...type.captionStrong, color: colors.action },
});
