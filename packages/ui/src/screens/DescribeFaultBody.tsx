import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import type { IntakeAnswer, IntakeQuestion, ServiceIntake } from "@pro-now/types";

import { customerTheme, elevation, radii, spacing, tabular, tint, type } from "../theme";
import { Mark, type MarkName, ShieldCheckMark } from "../components/marks";
import { ImageSlot, SectionHeader, Surface } from "../components/surfaces";

/**
 * C06 — describing the fault, before anyone is sent.
 *
 * This screen was missing, and its absence showed up as an inconsistency
 * rather than a gap: the professional's job screen displayed photos and a
 * voice note the customer had never been given any way to send. Media
 * appearing on one side of a marketplace that cannot be produced on the
 * other is a fiction, and finding it is exactly what walking the whole
 * journey is for.
 *
 * Why it earns a step of its own, rather than a bigger text box:
 *
 * - **People describe faults badly in writing and well out loud.** "It makes
 *   a noise like this" is thirty seconds of audio and an unanswerable
 *   paragraph. The voice note is the highest-value field here.
 * - **A photo removes a visit.** A professional who sees the fitting before
 *   leaving brings the right part; one who does not comes twice, and the
 *   second visit is the customer's money and morning.
 * - **It is the only moment the customer knows the answer.** Asked later,
 *   on the phone, half of it is forgotten.
 *
 * Nothing here is mandatory. A customer with a burst pipe should be able to
 * press send in four seconds, so every field is optional and the button
 * never waits for one.
 *
 * PLATFORM CAPABILITIES LIVE IN THE APP, NOT HERE. Recording and the camera
 * are handed in as callbacks, because this component is shared by the Expo
 * apps (expo-av, expo-image-picker) and by the web prototype
 * (MediaRecorder, a file input). A presentational screen that reached for a
 * browser API would stop being shippable on a phone.
 */

const colors = customerTheme.colors;

export interface FaultPhoto {
  id: string;
  /** Local preview URL. Null renders the honest placeholder instead. */
  uri: string | null;
  subjectHe: string;
}

export interface FaultVoice {
  uri: string | null;
  seconds: number;
}

export interface DescribeFaultBodyProps {
  serviceNameHe: string;
  mark: MarkName;
  /** Symptoms already chosen on the service page, shown back for confirmation. */
  symptomsHe: string[];
  /**
   * The questions THIS service asks. Absent for a service with no intake,
   * and the screen is then exactly what it was before — which is the point:
   * a service without a good set of questions must not be given a bad one.
   */
  intake?: ServiceIntake;
  answers?: IntakeAnswer[];
  onAnswer?: (answer: IntakeAnswer) => void;
  text: string;
  onChangeText: (v: string) => void;
  photos: FaultPhoto[];
  onAddPhoto?: () => void;
  onRemovePhoto?: (id: string) => void;
  voice: FaultVoice | null;
  recording: boolean;
  /** Seconds recorded so far, while `recording` is true. */
  recordSeconds: number;
  /** Absent when the device or browser cannot record; the row then explains. */
  canRecord: boolean;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  onDeleteVoice?: () => void;
  onSend?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function DescribeFaultBody({
  serviceNameHe,
  mark,
  symptomsHe,
  intake,
  answers = [],
  onAnswer,
  text,
  onChangeText,
  photos,
  onAddPhoto,
  onRemovePhoto,
  voice,
  recording,
  recordSeconds,
  canRecord,
  onStartRecord,
  onStopRecord,
  onDeleteVoice,
  onSend,
  onBack,
  width = 390,
  height = 780,
}: DescribeFaultBodyProps) {
  const added = photos.length + (voice ? 1 : 0) + (text.trim() ? 1 : 0) + symptomsHe.length;

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backGlyph}>›</Text>
          </Pressable>
          <View style={styles.markBubble}>
            <Mark name={mark} size={20} color={colors.action} />
          </View>
          {/*
            * Neutral, because this screen is shared. "מה קרה" is correct for
            * a burst pipe and wrong for an hour with a trainer — and a
            * heading that assumes a disaster is how a marketplace quietly
            * narrows itself back down to home repairs.
            */}
          <Text style={styles.title}>{intake ? "כמה פרטים לפני ששולחים" : "ספר לנו מה צריך"}</Text>
          <Text style={styles.subtitle}>
            כל מה שתוסיף מגיע למקצוען לפני שהוא יוצא — וזה ההבדל בין ביקור אחד לשניים. הכול אופציונלי.
          </Text>
          <Text style={styles.service} numberOfLines={1}>
            {serviceNameHe}
          </Text>
        </View>

        {symptomsHe.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="סימנת" colors={colors} />
            <View style={styles.chips}>
              {symptomsHe.map((sx) => (
                <View key={sx} style={styles.chip}>
                  <Text style={styles.chipText}>{sx}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------------- What this service actually needs to know ---- */}
        {intake ? (
          <View style={styles.block}>
            <SectionHeader title="כמה שאלות קצרות" colors={colors} />
            <Text style={styles.intakeNote}>
              אפשר לדלג על הכל — זה רק כדי שהמקצוען יגיע מוכן.
            </Text>
            {intake.questions.map((q) => (
              <IntakeRow
                key={q.id}
                question={q}
                answer={answers.find((a) => a.questionId === q.id)}
                onAnswer={onAnswer}
              />
            ))}
          </View>
        ) : null}

        {/* ---------------- Voice — the field that carries the most ------ */}
        <View style={styles.block}>
          <SectionHeader title="הקלטה קולית" colors={colors} />
          <Surface colors={colors} level={1}>
            {voice ? (
              <View style={styles.voiceDone}>
                <View style={styles.voiceBadge}>
                  <Text style={styles.voiceBadgeText}>
                    {Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}
                  </Text>
                </View>
                <Text style={styles.voiceDoneText}>הקלטה נשמרה ותישלח למקצוען</Text>
                <Pressable onPress={onDeleteVoice} accessibilityRole="button">
                  <Text style={styles.deleteLink}>מחיקה</Text>
                </Pressable>
              </View>
            ) : canRecord ? (
              <Pressable
                onPress={recording ? onStopRecord : onStartRecord}
                accessibilityRole="button"
                accessibilityLabel={recording ? "עצירת הקלטה" : "התחלת הקלטה"}
                style={({ pressed }) => [
                  styles.recordBtn,
                  recording && styles.recordBtnActive,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <View style={[styles.recordDot, recording && styles.recordDotActive]} />
                <Text style={[styles.recordLabel, recording && { color: colors.statusDanger }]}>
                  {recording
                    ? `מקליט · ${Math.floor(recordSeconds / 60)}:${String(recordSeconds % 60).padStart(2, "0")} · לחץ לעצירה`
                    : "להקליט הסבר קצר"}
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.cannot}>
                המכשיר או הדפדפן הזה לא מאפשר הקלטה. אפשר לכתוב במקום.
              </Text>
            )}
            <Text style={styles.hint}>
              הכי קל פשוט לדבר: "יש רעש מהמזגן כשהוא נדלק". מה שקשה לכתוב — קל להגיד.
            </Text>
          </Surface>
        </View>

        {/* ---------------- Photos ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="תמונות" colors={colors} />
          <View style={styles.photoGrid}>
            {photos.map((ph) => (
              <View key={ph.id} style={styles.photoWrap}>
                <ImageSlot uri={ph.uri} subject={ph.subjectHe} ratio={1} colors={colors} />
                <Pressable
                  onPress={() => onRemovePhoto?.(ph.id)}
                  accessibilityRole="button"
                  accessibilityLabel="הסרת תמונה"
                  style={styles.photoRemove}
                >
                  <Text style={styles.photoRemoveText}>×</Text>
                </Pressable>
              </View>
            ))}

            <Pressable onPress={onAddPhoto} accessibilityRole="button" style={styles.photoAdd}>
              <Text style={styles.photoAddPlus}>+</Text>
              <Text style={styles.photoAddText}>הוספה</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            תמונה אחת של המקום מספיקה. המקצוען יראה איזה חלק צריך עוד לפני שהוא יוצא.
          </Text>
        </View>

        {/* ---------------- Words ---------------- */}
        <View style={styles.block}>
          <SectionHeader title={intake ? "עוד משהו במילים שלך" : "במילים שלך"} colors={colors} />
          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder={
              intake
                ? "כל דבר שהשאלות לא כיסו"
                : "מתי זה התחיל, מה כבר ניסית, כל דבר שיעזור"
            }
            accessibilityLabel="מה צריך, במילים שלך"
            placeholderTextColor={colors.textSecondary}
            multiline
            style={styles.textArea}
            textAlign="right"
          />
        </View>

        <View style={styles.block}>
          <View style={styles.privacyRow}>
            <ShieldCheckMark size={15} color={colors.trust} />
            <Text style={styles.privacyText}>
              מה שתוסיף נשלח רק למקצוען שיקבל את הקריאה, ואחרי שהוא מקבל אותה. הכתובת המלאה נחשפת
              באותו רגע — לא לפניו.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable
          onPress={onSend}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
        >
          {/* Never blocked on a field. Someone with a burst pipe presses send
              in four seconds, and this screen must let them. */}
          <Text style={styles.ctaLabel}>שליחת הקריאה</Text>
        </Pressable>
        <Text style={styles.ctaNote}>
          {added === 0 ? "אפשר לשלוח גם בלי פרטים" : `${added} פרטים יישלחו · לא מחויב עד שתאשר`}
        </Text>
      </View>
    </View>
  );
}

/**
 * One question.
 *
 * ALL OPTIONS ARE VISIBLE AT ONCE — no dropdown, no "show more". A dropdown
 * hides the shape of the question, and someone holding a phone over a
 * leaking pipe should be able to see every answer and hit one. It costs
 * vertical space, which is the cheapest thing on this screen.
 *
 * Tapping a chosen option UNSETS it, because the alternative is a customer
 * who mis-tapped being stuck with an answer the professional will act on.
 */
function IntakeRow({
  question,
  answer,
  onAnswer,
}: {
  question: IntakeQuestion;
  answer?: IntakeAnswer;
  onAnswer?: (a: IntakeAnswer) => void;
}) {
  const chosen = answer?.optionIds ?? [];
  const opts =
    question.kind === "YESNO"
      ? [
          { id: "yes", labelHe: "כן" },
          { id: "no", labelHe: "לא" },
          // "לא יודע" is a first-class answer, offered as plainly as the
          // other two. Leaving it out pushes people into guessing, and a
          // guess is worse than a gap because it gets acted on.
          { id: "unknown", labelHe: "לא יודע" },
        ]
      : (question.options ?? []);

  const pick = (id: string) => {
    if (!onAnswer) return;
    if (question.kind === "MULTI") {
      const next = chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];
      onAnswer({ questionId: question.id, optionIds: next });
    } else {
      onAnswer({ questionId: question.id, optionIds: chosen.includes(id) ? [] : [id] });
    }
  };

  return (
    <View style={styles.q}>
      <Text style={styles.qPrompt}>{question.promptHe}</Text>

      {question.kind === "TEXT" ? (
        <TextInput
          value={answer?.textValue ?? ""}
          onChangeText={(v) => onAnswer?.({ questionId: question.id, textValue: v })}
          placeholder={question.placeholderHe}
          accessibilityLabel={question.promptHe}
          placeholderTextColor={colors.textSecondary}
          style={styles.qInput}
          textAlign="right"
        />
      ) : question.kind === "NUMBER" ? (
        <View style={styles.qOpts}>
          {numberChoices(question).map((n) => {
            const on = answer?.numberValue === n;
            return (
              <Pressable
                key={n}
                onPress={() =>
                  onAnswer?.({
                    questionId: question.id,
                    numberValue: on ? undefined : n,
                  })
                }
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${question.promptHe} ${n}`}
                style={[styles.qOpt, on && styles.qOptOn]}
              >
                <Text style={[styles.qOptText, on && styles.qOptTextOn]}>{n}</Text>
              </Pressable>
            );
          })}
          {question.unitHe ? <Text style={styles.qUnit}>{question.unitHe}</Text> : null}
        </View>
      ) : (
        <View style={styles.qOpts}>
          {opts.map((o) => {
            const on = chosen.includes(o.id);
            return (
              <Pressable
                key={o.id}
                onPress={() => pick(o.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${question.promptHe} ${o.labelHe}`}
                style={[styles.qOpt, on && styles.qOptOn]}
              >
                <Text style={[styles.qOptText, on && styles.qOptTextOn]}>{o.labelHe}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * A NUMBER question becomes a row of taps, not a keyboard.
 *
 * "כמה חדרים?" with a numeric keyboard is four interactions — focus, type,
 * dismiss, verify — for an answer between 1 and 6. Capped at eight choices
 * so the row never wraps into a wall of digits.
 */
function numberChoices(q: IntakeQuestion): number[] {
  const min = Math.max(1, q.min ?? 1);
  const max = Math.max(min, q.max ?? min + 5);
  const out: number[] = [];
  for (let n = min; n <= max && out.length < 8; n += 1) out.push(n);
  return out;
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  scroll: { paddingBottom: 132 },

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, alignItems: "flex-end" },
  // 44x44 minimum. A 25px chevron is a control most thumbs miss, which
  // is the same defect that made the demo bar unhittable.
  back: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { fontSize: 28, lineHeight: 28, color: colors.textPrimary, fontWeight: "300" },
  markBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tint.action(0.12),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...type.h1, color: colors.textPrimary, writingDirection: "rtl", textAlign: "right" },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    lineHeight: 19,
  },
  service: { ...type.captionStrong, color: colors.actionText, marginTop: spacing.md, writingDirection: "rtl" },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  intakeNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.md,
  },
  q: { marginBottom: spacing.lg },
  qPrompt: {
    ...type.bodyStrong,
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginBottom: spacing.sm,
  },
  qOpts: { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
  qOpt: {
    minHeight: 44,
    // 44 in BOTH directions. "כן" is two narrow letters, so padding alone
    // left a 37px-wide target — tall enough to pass a height check and still
    // too small to hit with a thumb.
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  qOptOn: { borderColor: colors.action, backgroundColor: tint.action(0.1) },
  qOptText: { ...type.caption, fontSize: 14, color: colors.textPrimary, writingDirection: "rtl" },
  qOptTextOn: { color: colors.actionText, fontWeight: "700" },
  qUnit: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  qInput: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    ...type.body,
    color: colors.textPrimary,
  },
  chips: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    backgroundColor: tint.action(0.12),
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  chipText: { ...type.captionStrong, color: colors.actionText, writingDirection: "rtl" },

  recordBtn: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: tint.action(0.1),
  },
  recordBtnActive: { backgroundColor: tint.danger(0.12) },
  recordDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.action },
  recordDotActive: { backgroundColor: colors.statusDanger, borderRadius: 3 },
  recordLabel: { ...type.bodyStrong, fontSize: 15, color: colors.actionText, writingDirection: "rtl" },

  voiceDone: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  voiceBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: tint.trust(0.14),
  },
  voiceBadgeText: { ...type.captionStrong, ...tabular, color: colors.trust },
  voiceDoneText: { ...type.caption, flex: 1, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  deleteLink: { ...type.captionStrong, color: colors.statusDanger },

  cannot: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 18,
  },

  photoGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  photoWrap: { width: "31%", position: "relative" },
  photoRemove: {
    position: "absolute",
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: "#FFFFFF", fontSize: 15, lineHeight: 17 },
  photoAdd: {
    width: "31%",
    aspectRatio: 1,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  photoAddPlus: { fontSize: 26, color: colors.actionText, lineHeight: 30 },
  photoAddText: { ...type.caption, fontSize: 11, color: colors.textSecondary },

  textArea: {
    minHeight: 96,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    padding: spacing.md,
    ...type.body,
    fontSize: 15,
    color: colors.textPrimary,
    writingDirection: "rtl",
    textAlignVertical: "top",
  },

  privacyRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm },
  privacyText: {
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
    minHeight: 58,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
  ctaNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
});
