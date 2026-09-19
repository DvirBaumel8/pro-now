import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { formatMoney, money, type JobState } from "@pro-now/types";

import { proTheme, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { lex } from "../lexicon";
import { ClockMark, Mark, type MarkName, PinMark, ShieldCheckMark } from "../components/marks";
import { Persona } from "../components/Persona";
import { ImageSlot, SectionHeader, Surface } from "../components/surfaces";

/**
 * P20 — the job the professional actually took.
 *
 * This screen was missing, and its absence was the sharpest thing the first
 * user found: the offer card was followed by nothing. A professional who
 * accepts a job and lands back on a map has been told "you won it" and
 * nothing else — not where, not for whom, not what the problem is, not what
 * to bring.
 *
 * So this is the working screen, and it is organised around the four
 * questions asked in the van, in the order they are asked:
 *
 *   1. Where am I going, and can I start driving now?
 *   2. Who am I meeting, and how do I reach them?
 *   3. What is actually wrong — in their words, and their photos?
 *   4. What am I being paid?
 *
 * PRIVACY IS THE HINGE. Everything above the fold here is information that
 * did NOT exist on the offer card, and the difference is assignment: the
 * exact address, the door code and a way to call are released only once the
 * job is assigned (/docs/12-PRIVACY.md). The number is masked in both
 * directions — neither side ends up holding the other's personal line — and
 * the screen says so rather than leaving it to be discovered.
 *
 * ONE ACTION AT A TIME. The state machine (/docs/07-JOB-STATE-MACHINE.md)
 * allows exactly one forward move from each state, so the screen shows
 * exactly one primary button. A row of equally weighted verbs is how a
 * professional taps "סיימתי" while still parking.
 */

const colors = proTheme.colors;

export interface JobMediaItem {
  id: string;
  kind: "PHOTO" | "VOICE";
  /** What the customer's photo shows, for the honest placeholder. */
  subjectHe: string;
  /** Voice note length in seconds. */
  seconds?: number;
  /** Real media URL once storage exists; null in the prototype. */
  uri?: string | null;
}

export interface ProJobBodyProps {
  status: JobState;
  serviceNameHe: string;
  mark: MarkName;
  /** Full address — released only because the job is assigned. */
  addressHe: string;
  /** Floor, entrance, door code. The difference between arriving and finding. */
  accessNoteHe: string | null;
  /** Straight-line distance is not a route; this comes from the router. */
  routeEtaMinutes: number | null;
  distanceHe: string | null;
  customerNameHe: string;
  customerSeed: string;
  /** Set when the call was placed for someone else who is at the address. */
  onSiteContactNameHe?: string | null;
  /** The symptoms the customer tapped on the service page. */
  symptomsHe: string[];
  descriptionHe: string | null;
  media: JobMediaItem[];
  /** Expected payout, or null when it genuinely depends on the outcome. */
  payoutMinorUnits: number | null;
  payoutIsEstimate: boolean;
  onNavigate?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onAdvance?: () => void;
  onSendQuote?: () => void;
  width?: number;
  height?: number;
}

/** The single forward move allowed from each state, and what to call it. */
function nextAction(status: JobState): { label: string; kind: "advance" | "quote" } | null {
  switch (status) {
    case "PRO_ASSIGNED":
      return { label: "יוצא לדרך", kind: "advance" };
    case "PRO_EN_ROUTE":
      return { label: "הגעתי", kind: "advance" };
    case "PRO_ARRIVED":
      return { label: "מתחיל אבחון", kind: "advance" };
    case "DIAGNOSIS":
      return { label: "שליחת הצעת מחיר", kind: "quote" };
    case "WAITING_QUOTE_APPROVAL":
      return null; // The customer's move, not ours. No button to press.
    case "IN_PROGRESS":
      return { label: "סיימתי את העבודה", kind: "advance" };
    default:
      return null;
  }
}

const STATUS_HE: Partial<Record<JobState, string>> = {
  PRO_ASSIGNED: "העבודה שלך",
  PRO_EN_ROUTE: lex.onTheWay,
  PRO_ARRIVED: "הגעת לכתובת",
  DIAGNOSIS: "באבחון",
  WAITING_QUOTE_APPROVAL: "ממתין לאישור הלקוח",
  IN_PROGRESS: lex.working,
  COMPLETION_PENDING: "ממתין לאישור סיום",
};

export function ProJobBody({
  status,
  serviceNameHe,
  mark,
  addressHe,
  accessNoteHe,
  routeEtaMinutes,
  distanceHe,
  customerNameHe,
  customerSeed,
  onSiteContactNameHe = null,
  symptomsHe,
  descriptionHe,
  media,
  payoutMinorUnits,
  payoutIsEstimate,
  onNavigate,
  onCall,
  onMessage,
  onAdvance,
  onSendQuote,
  width = 390,
  height = 780,
}: ProJobBodyProps) {
  const action = nextAction(status);
  const photos = media.filter((m) => m.kind === "PHOTO");
  const voice = media.find((m) => m.kind === "VOICE");

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* ---------------- 1. Where ---------------- */}
        <View style={styles.head}>
          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{STATUS_HE[status] ?? "העבודה שלך"}</Text>
            </View>
            <View style={styles.markBubble}>
              <Mark name={mark} size={18} color={colors.trust} />
            </View>
          </View>

          <Text style={styles.service} numberOfLines={2}>
            {serviceNameHe}
          </Text>

          <View style={styles.addressRow}>
            <PinMark size={15} color={colors.textSecondary} />
            <Text style={styles.address} numberOfLines={2}>
              {addressHe}
            </Text>
          </View>
          {accessNoteHe ? <Text style={styles.access}>{accessNoteHe}</Text> : null}

          <View style={styles.metaRow}>
            {routeEtaMinutes !== null ? (
              <View style={styles.metaChip}>
                <ClockMark size={13} color={colors.textSecondary} />
                <Text style={styles.metaText}>{routeEtaMinutes} דק׳ נסיעה</Text>
              </View>
            ) : null}
            {distanceHe ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>{distanceHe}</Text>
              </View>
            ) : null}
          </View>

          <Pressable onPress={onNavigate} accessibilityRole="button" style={styles.navBtn}>
            <Text style={styles.navLabel}>ניווט לכתובת</Text>
          </Pressable>
        </View>

        {/* ---------------- 2. Who ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="הלקוח" colors={colors} />
          <Surface colors={colors} level={1} dark>
            <View style={styles.custRow}>
              <Persona seed={customerSeed} size={46} ring={colors.trust} />
              <View style={styles.custText}>
                <Text style={styles.custName} numberOfLines={1}>
                  {onSiteContactNameHe ?? customerNameHe}
                </Text>
                {onSiteContactNameHe ? (
                  // The person who booked and the person at the door are not
                  // always the same, and knocking asking for the wrong name
                  // is how a job starts badly.
                  <Text style={styles.custMeta} numberOfLines={2}>
                    נמצא בבית · הקריאה הוזמנה על ידי {customerNameHe}
                  </Text>
                ) : (
                  <Text style={styles.custMeta}>הזמין את הקריאה</Text>
                )}
              </View>
            </View>

            <View style={styles.contactRow}>
              <Pressable onPress={onCall} accessibilityRole="button" style={styles.contactBtn}>
                <Text style={styles.contactLabel}>שיחה</Text>
              </Pressable>
              <Pressable onPress={onMessage} accessibilityRole="button" style={styles.contactBtn}>
                <Text style={styles.contactLabel}>הודעה</Text>
              </Pressable>
            </View>

            <View style={styles.maskRow}>
              <ShieldCheckMark size={14} color={colors.trust} />
              <Text style={styles.maskText}>
                השיחה עוברת דרך מספר מסווה. המספר הפרטי שלך לא נחשף ללקוח, ושלו לא נחשף לך.
              </Text>
            </View>
          </Surface>
        </View>

        {/* ---------------- 3. What ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="מה הבעיה" colors={colors} />

          {symptomsHe.length > 0 ? (
            <View style={styles.symptoms}>
              {symptomsHe.map((sx) => (
                <View key={sx} style={styles.symptom}>
                  <Text style={styles.symptomText}>{sx}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {descriptionHe ? (
            <Surface colors={colors} level={1} dark style={{ marginTop: spacing.md }}>
              <Text style={styles.description}>{descriptionHe}</Text>
            </Surface>
          ) : null}

          {voice ? <VoiceNote item={voice} /> : null}

          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((ph) => (
                <ImageSlot
                  key={ph.id}
                  uri={ph.uri}
                  subject={ph.subjectHe}
                  ratio={1}
                  colors={colors}
                  dark
                  style={styles.photo}
                />
              ))}
            </View>
          ) : null}

          {symptomsHe.length === 0 && !descriptionHe && media.length === 0 ? (
            <Text style={styles.emptyLine}>
              הלקוח לא הוסיף פרטים. שווה להתקשר לפני שיוצאים.
            </Text>
          ) : null}
        </View>

        {/* ---------------- 4. Money ---------------- */}
        <View style={styles.block}>
          <SectionHeader title={lex.payout} colors={colors} />
          <Surface colors={colors} level={1} dark>
            {payoutMinorUnits !== null ? (
              <View style={styles.payRow}>
                {payoutIsEstimate ? <Text style={styles.payQualifier}>משוער</Text> : null}
                <Text style={styles.payValue}>{formatMoney(money(payoutMinorUnits, "ILS"))}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.payUnknown}>ייקבע לאחר האבחון</Text>
                <Text style={styles.payNote}>
                  הסכום ייגזר מהצעת המחיר שתשלח, אחרי שהלקוח יאשר אותה.
                </Text>
              </>
            )}
          </Surface>
        </View>
      </ScrollView>

      {/* ---------------- The one thing to do next ---------------- */}
      {action ? (
        <View style={styles.cta}>
          <Pressable
            onPress={action.kind === "quote" ? onSendQuote : onAdvance}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.ctaLabel}>{action.label}</Text>
          </Pressable>
        </View>
      ) : status === "WAITING_QUOTE_APPROVAL" ? (
        <View style={styles.cta}>
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>
              ההצעה נשלחה. הכדור אצל הלקוח — נעדכן אותך ברגע שיאשר.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * A voice note from the customer.
 *
 * People describe a fault badly in writing and well out loud, so this is
 * worth having. The player is deliberately honest about the prototype: with
 * no real file it says so instead of miming playback, because a play button
 * that does nothing is exactly the false affordance this round was spent
 * removing.
 */
function VoiceNote({ item }: { item: JobMediaItem }) {
  const [playing, setPlaying] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const seconds = item.seconds ?? 0;

  useEffect(() => {
    if (!playing) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: Math.max(1000, seconds * 1000),
      easing: Easing.linear,
      useNativeDriver: false,
    });
    anim.start(({ finished }) => finished && setPlaying(false));
    return () => anim.stop();
  }, [playing, seconds, progress]);

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <Surface colors={colors} level={1} dark style={{ marginTop: spacing.md }}>
      <View style={styles.voiceRow}>
        <Pressable
          onPress={() => item.uri && setPlaying((p) => !p)}
          disabled={!item.uri}
          accessibilityRole="button"
          accessibilityLabel={playing ? "עצירה" : "השמעה"}
          style={[styles.playBtn, !item.uri && { opacity: 0.4 }]}
        >
          <Text style={styles.playGlyph}>{playing ? "❙❙" : "▶"}</Text>
        </Pressable>

        <View style={styles.waveWrap}>
          <Wave />
          <Animated.View
            style={[
              styles.waveMask,
              { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["100%", "0%"] }) },
            ]}
          />
        </View>

        <Text style={styles.voiceTime}>{mmss}</Text>
      </View>
      <Text style={styles.voiceNote}>
        {item.uri
          ? "הקלטה מהלקוח"
          : "הקלטה מהלקוח · באב־טיפוס אין קובץ אמיתי, אז ההשמעה כבויה"}
      </Text>
    </Surface>
  );
}

/** A fixed decorative waveform. It is not drawn from audio and does not pretend to be. */
function Wave() {
  const bars = [6, 11, 18, 9, 22, 14, 26, 12, 19, 8, 24, 15, 10, 21, 7, 17, 12, 23, 9, 14];
  return (
    <Svg width="100%" height={28} viewBox="0 0 200 28" preserveAspectRatio="none">
      {bars.map((h, i) => (
        <Rect
          key={i}
          x={i * 10 + 2}
          y={(28 - h) / 2}
          width={4}
          height={h}
          rx={2}
          fill={colors.textSecondary}
          opacity={0.7}
        />
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  scroll: { paddingBottom: 116 },

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, alignItems: "flex-end" },
  statusRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch" },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: tint.trust(0.16),
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.trust },
  statusText: { ...type.captionStrong, color: colors.trust, writingDirection: "rtl" },
  markBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  service: {
    ...type.h1,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
  addressRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 6, marginTop: spacing.sm, alignSelf: "stretch" },
  address: { ...type.body, flex: 1, fontSize: 15, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  access: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl", marginTop: 2 },

  metaRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  metaChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  metaText: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  navBtn: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  navLabel: { ...type.bodyStrong, fontSize: 15, color: colors.textPrimary },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  custRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  custText: { flex: 1, alignItems: "flex-end" },
  custName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  custMeta: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },

  contactRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.lg },
  contactBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  contactLabel: { ...type.bodyStrong, fontSize: 15, color: colors.textPrimary },

  maskRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
  maskText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  symptoms: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  symptom: {
    backgroundColor: tint.action(0.16),
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  symptomText: { ...type.captionStrong, color: colors.action, writingDirection: "rtl" },

  description: {
    ...type.body,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 22,
  },

  voiceRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  playBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: tint.action(0.2),
    alignItems: "center",
    justifyContent: "center",
  },
  playGlyph: { color: colors.action, fontSize: 14 },
  waveWrap: { flex: 1, height: 28, overflow: "hidden" },
  waveMask: { position: "absolute", top: 0, bottom: 0, left: 0, backgroundColor: "rgba(16,12,22,0.62)" },
  voiceTime: { ...type.caption, ...tabular, color: colors.textSecondary },
  voiceNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },

  photoGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  photo: { flexGrow: 1, flexBasis: "30%" },

  emptyLine: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },

  payRow: { flexDirection: "row-reverse", alignItems: "baseline", gap: spacing.sm },
  payValue: { ...type.display, ...tabular, fontSize: 40, lineHeight: 44, color: colors.textPrimary },
  payQualifier: { ...type.captionStrong, color: colors.statusWarning },
  payUnknown: { ...type.h2, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  payNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    lineHeight: 18,
  },

  cta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...elevation(3, true),
  },
  ctaBtn: {
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
  waiting: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  waitingText: { ...type.caption, color: colors.textSecondary, textAlign: "center", writingDirection: "rtl" },
});
