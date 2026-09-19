import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { customerTheme, radii, scale, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { PrimaryAction } from "./PrimaryAction";
import { Pulse } from "./LiveServiceCard";

/**
 * SAY IT, RECORD IT, OR SHOW IT — and we find who fits.
 *
 * WHY THIS IS NOW THE FIRST THING ON THE SCREEN. The home screen used to
 * open with a row of specific services, and Amit's objection to that was
 * sharper than a layout note: "למה זה ישר מכוון אותי לדברים האלה?" A grid of
 * named services is the app deciding, before the customer has said a word,
 * that the answer is one of twelve things it already thought of. That is a
 * directory with better typography.
 *
 * The premise of PRO NOW is the opposite: a person has a problem, not a
 * service code. They know "there's water under the sink" and "my back has
 * been killing me since Tuesday". Turning that into the right professional
 * is OUR job, and making it the customer's job — by showing them a menu
 * first — gives away the only thing that makes this better than a phone
 * book.
 *
 * THREE WAYS IN, BECAUSE PEOPLE ARE GOOD AT DIFFERENT ONES:
 *   כתיבה  — precise, and the only one that can be matched on-device today.
 *   הקלטה  — "it makes a noise like this" is thirty seconds of audio and an
 *            unanswerable paragraph.
 *   צילום  — a photograph of the fitting is worth more than any description,
 *            and it removes the second visit.
 *
 * WHAT THIS COMPONENT WILL NOT DO. It will not claim to have understood a
 * recording or a photograph. Text matching is a deterministic keyword
 * matcher (see service-match.ts) and says "נראה שזה" rather than "הבנתי";
 * audio and images are captured, carried with the request, and shown to the
 * professional — and the screen says exactly that. A spinner labelled
 * "ה-AI מנתח…" over a setTimeout would be a mocked capability presented as
 * a real one (/CLAUDE.md §3), and it is the single most tempting lie
 * available on this screen.
 */

const colors = customerTheme.colors;

export interface CapturedMedia {
  photos: number;
  voiceSeconds: number | null;
}

export interface IntentMatch {
  id: string;
  nameHe: string;
  mark: MarkName;
  /** Live supply line, when the server has one. */
  supplyHe?: string | null;
  supplyTone?: "live" | "warning" | "muted";
}

export interface IntentCaptureProps {
  text: string;
  onChangeText: (v: string) => void;
  /** What the matcher makes of the text. Empty = tried and found nothing. */
  matches: IntentMatch[] | null;
  media: CapturedMedia;
  recording: boolean;
  recordSeconds: number;
  canRecord: boolean;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  onDeleteVoice?: () => void;
  onAddPhoto?: () => void;
  onClearPhotos?: () => void;
  /**
   * What a photograph would be OF, once a service is known — or null when a
   * photograph does not apply to it. Undefined before anything is chosen,
   * which is when the generic wording is the honest one.
   */
  photoPromptHe?: string | null;
  onPick?: (serviceId: string) => void;
  /** Offered when there is something to send but nothing matched. */
  onBrowse?: () => void;
  width: number;
}

export function IntentCapture({
  text,
  onChangeText,
  matches,
  media,
  recording,
  recordSeconds,
  canRecord,
  onStartRecord,
  onStopRecord,
  onDeleteVoice,
  onAddPhoto,
  onClearPhotos,
  photoPromptHe,
  onPick,
  onBrowse,
  width,
}: IntentCaptureProps) {
  const inputRef = useRef<TextInput>(null);
  const hasMedia = media.photos > 0 || (media.voiceSeconds ?? 0) > 0;
  /*
   * Before a service is chosen we do not know what a photo would be of, so
   * the line stays about the reason rather than the subject: some things
   * are simply easier said than typed. Once a service IS chosen, the
   * catalogue supplies its own wording — "צילום של המקום שבו מופיעים המים"
   * for a leak, "תמונה של תסרוקת שאהבת" for a haircut.
   */
  const optionalLeadHe =
    photoPromptHe === undefined
      ? "לא חייבים לכתוב — אפשר גם פשוט להקליט"
      : photoPromptHe === null
        ? "אפשר גם להקליט במקום לכתוב"
        : `אפשר גם להקליט, או ${photoPromptHe}`;
  const hasText = text.trim().length >= 2;
  /* Named rather than indexed inline, so `noUncheckedIndexedAccess` gets a
     real narrowing point instead of four non-null assertions. */
  const best = matches && matches.length > 0 ? matches[0] : undefined;
  const alternatives = matches ? matches.slice(1, 3) : [];

  return (
    <View style={[styles.wrap, { width }]}>
      {/*
        * NO CONTAINER. The single most-quoted note from the design review
        * was "הקלט המרכזי כמעט ללא container" — and the reason is worth
        * more than the pixels. A text box drawn as a raised white card with
        * a border says "form field". The thing we want it to say is "start
        * talking", which is what a large line of type over a warm page says
        * and what a bordered rectangle cannot.
        *
        * What is left: the type, and a hairline underneath doing the one
        * job §5 allows a border to do — separating the place you write from
        * the things you can do instead.
        */}
      <View style={styles.field}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={onChangeText}
          placeholder="מה קורה? כתוב במילים שלך"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          textAlign="right"
          multiline
          accessibilityLabel="ספר מה צריך"
        />

        {/*
          * MEDIA IS AN OPTION, NOT A STEP.
          *
          * These were three equal pills — record, photograph, write — which
          * reads as an instruction to do all three, and silently assumes
          * that whatever you need has a picture of a problem attached to it.
          * Amit: "אם מישהו צריך ספר אני לא מצפה שהוא ישלח תמונה של השיער
          * שלו". He is right, and the fix is not to hide the buttons — a
          * photo of a haircut you liked is genuinely useful — it is to stop
          * presenting them as part of the path.
          *
          * So: the text field is the step, and this is one quiet line
          * underneath saying what else is possible.
          */}
        <View style={styles.rule} />

        <View style={styles.modes}>
          <Text style={styles.modesLead}>{optionalLeadHe}</Text>
          <View style={styles.modeRow}>
            <ModeButton
              labelHe={recording ? `עצור · ${formatSeconds(recordSeconds)}` : "הקלטה"}
              glyph="mic"
              active={recording}
              disabled={!canRecord}
              onPress={recording ? onStopRecord : onStartRecord}
            />
            {photoPromptHe !== null ? (
              <ModeButton labelHe="תמונה" glyph="camera" onPress={onAddPhoto} />
            ) : null}
          </View>
        </View>
      </View>

      {/* What we are actually holding, as removable chips. */}
      {hasMedia ? (
        <View style={styles.captured}>
          {(media.voiceSeconds ?? 0) > 0 ? (
            <Pressable
              onPress={onDeleteVoice}
              accessibilityRole="button"
              accessibilityLabel="מחיקת ההקלטה"
              style={styles.chip}
            >
              <Text style={styles.chipText}>הקלטה {formatSeconds(media.voiceSeconds ?? 0)}</Text>
              <Text style={styles.chipX}>×</Text>
            </Pressable>
          ) : null}
          {media.photos > 0 ? (
            <Pressable
              onPress={onClearPhotos}
              accessibilityRole="button"
              accessibilityLabel="מחיקת התמונות"
              style={styles.chip}
            >
              <Text style={styles.chipText}>
                {media.photos === 1 ? "תמונה אחת" : `${media.photos} תמונות`}
              </Text>
              <Text style={styles.chipX}>×</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {recording ? <Listening seconds={recordSeconds} /> : null}

      {/* ---------------- The answer ---------------- */}
      {best ? (
        <View style={styles.result}>
          <Text style={styles.resultLead}>
            {/* Not "הבנתי". It is a keyword matcher and the copy says so. */}
            נראה שזה:
          </Text>

          {/*
            * CORAL AT THE POINT OF ACTION — and only there.
            *
            * The home screen carries no filled coral until the customer has
            * said something, which is the whole discipline behind §2: coral
            * means consequence, so a screen with no consequence available
            * has no coral on it. The moment the matcher has a best guess,
            * there IS something to do, and it becomes the one filled action
            * on the viewport.
            *
            * The runners-up below it stay quiet rows. They are alternatives,
            * and an alternative styled as a button is not an alternative.
            */}
          <PrimaryAction
            labelHe={`המשך · ${best.nameHe}`}
            subLabelHe={best.supplyHe ?? null}
            onPress={() => onPick?.(best.id)}
            accessibilityLabelHe={`המשך עם ${best.nameHe}`}
          />

          {alternatives.length > 0 ? (
            <Text style={styles.resultAlt}>או אולי התכוונת ל:</Text>
          ) : null}

          {alternatives.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => onPick?.(m.id)}
              accessibilityRole="button"
              accessibilityLabel={`המשך עם ${m.nameHe}`}
              style={({ pressed }) => [
                styles.resultRow,

                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.resultMark}>
                <Mark name={m.mark} size={20} color={colors.textPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName} numberOfLines={1}>
                  {m.nameHe}
                </Text>
                {m.supplyHe ? (
                  <View style={styles.resultSupply}>
                    {m.supplyTone === "live" ? <Pulse color={colors.action} size={6} /> : null}
                    <Text
                      style={[
                        styles.resultSupplyText,
                        {
                          color:
                            m.supplyTone === "live"
                              ? colors.actionText
                              : m.supplyTone === "warning"
                                ? colors.statusWarningText
                                : colors.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {m.supplyHe}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.resultGo}>‹</Text>
            </Pressable>
          ))}
        </View>
      ) : hasText || hasMedia ? (
        <View style={styles.result}>
          {/*
            * Nothing matched — and this is where the screen has to be
            * honest twice over. It cannot read the recording or the
            * photograph, and pretending otherwise with a spinner would be
            * the easiest lie in the product. So it says what it has, says
            * what happens to it, and offers the one real next step.
            */}
          <Text style={styles.resultLead}>
            {hasText ? "לא זיהינו לפי מה שכתבת." : "יש לנו את מה שצילמת והקלטת."}
          </Text>
          <Text style={styles.resultNote}>
            {hasMedia
              ? "ההקלטה והתמונות יישלחו יחד עם הקריאה, והמקצוען יראה אותן לפני שהוא יוצא. התאמה אוטומטית מתוך קול ותמונה עוד לא פעילה — בינתיים בוחרים קטגוריה."
              : "אפשר לנסח אחרת, או לבחור קטגוריה למטה."}
          </Text>
          {onBrowse ? (
            <Pressable onPress={onBrowse} accessibilityRole="button" style={styles.browse}>
              <Text style={styles.browseText}>בחירה מהקטגוריות</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/**
 * A live waveform while recording.
 *
 * Six bars driven by one looping value at different phases — cheap, and it
 * moves only while the microphone is genuinely open, so it reports a real
 * state rather than performing one.
 */
function Listening({ seconds }: { seconds: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 520, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v]);

  const bars = [0.45, 1, 0.7, 1, 0.55, 0.85];

  return (
    <View style={styles.listening}>
      <View style={styles.bars}>
        {bars.map((h, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                transform: [
                  {
                    scaleY: v.interpolate({
                      inputRange: [0, 1],
                      outputRange: i % 2 === 0 ? [0.35, h] : [h, 0.35],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.listeningText}>מקליט · {formatSeconds(seconds)} — לחץ שוב לעצירה</Text>
    </View>
  );
}

function ModeButton({
  labelHe,
  glyph,
  active,
  disabled,
  onPress,
}: {
  labelHe: string;
  glyph: "mic" | "camera" | "keyboard";
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={labelHe}
      style={({ pressed }) => [
        styles.mode,
        active && styles.modeActive,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.85 },
      ]}
    >
      <ModeGlyph name={glyph} color={active ? colors.actionText : colors.textPrimary} />
      <Text style={[styles.modeText, active && { color: colors.actionText }]} numberOfLines={1}>
        {labelHe}
      </Text>
    </Pressable>
  );
}

/**
 * Real glyphs, not typographic stand-ins.
 *
 * These were "●", "▣" and "⌨" — characters borrowed for their shape, which
 * render at a different weight and baseline in every font and make the row
 * look like a debug build. Three small paths cost nothing and make the
 * three ways into the product look like they were designed rather than
 * typed.
 */
function ModeGlyph({ name, color }: { name: "mic" | "camera" | "keyboard"; color: string }) {
  const c = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={17} height={17} viewBox="0 0 24 24">
      {name === "mic" && (
        <>
          <Rect x={9} y={2.5} width={6} height={11} rx={3} {...c} />
          <Path d="M5.5 11a6.5 6.5 0 0 0 13 0" {...c} />
          <Path d="M12 17.5V21M9 21h6" {...c} />
        </>
      )}
      {name === "camera" && (
        <>
          <Path d="M3 8.5h3.2l1.6-2.4h8.4l1.6 2.4H21v10H3z" {...c} />
          <Circle cx={12} cy={13} r={3.4} {...c} />
        </>
      )}
      {name === "keyboard" && (
        <>
          <Rect x={2.5} y={6} width={19} height={12} rx={2.4} {...c} />
          <Path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" {...c} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },

  field: { gap: spacing.md },
  input: {
    minHeight: 64,
    // One step up from body. What the customer writes is the content of
    // this screen, so it is typed like content rather than like a field.
    ...type.section,
    fontWeight: "400",
    color: colors.textPrimary,
    writingDirection: "rtl",
    paddingVertical: spacing.xs,
  },
  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border },
  modes: { gap: spacing.sm },
  modesLead: {
    ...type.caption,
    fontSize: scale.micro,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  modeRow: { flexDirection: "row-reverse", gap: spacing.xl },
  /*
   * NOT PILLS. Two full-width outlined buttons under the input read as the
   * two choices on this screen, which is the opposite of what is true:
   * writing is the path, and these are the alternatives for the people the
   * path does not suit. A pill is also a container, and this screen had one
   * container too many to begin with.
   *
   * What is left is a glyph and a word at the 44px tap target the audit
   * requires — sized as an offer, not as a decision.
   */
  mode: {
    minHeight: 44,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  modeActive: {},
  modeText: { ...type.metaStrong, color: colors.textPrimary },

  captured: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.trust(0.12),
  },
  chipText: { ...type.caption, fontSize: scale.micro, fontWeight: "700", color: colors.trust },
  chipX: { color: colors.trust, fontSize: scale.body, lineHeight: 18 },

  listening: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  bars: { flexDirection: "row-reverse", alignItems: "center", gap: 4, height: 24 },
  bar: { width: 3, height: 24, borderRadius: 2, backgroundColor: colors.action },
  listeningText: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl", flexShrink: 1 },

  /*
   * The answer used to be a second outlined card directly under the first
   * one, which made the screen read as a form above a result panel. It is
   * one surface now: a quiet wash, no edge, no lift — §5's "a surface is
   * raised or outlined, never both", taken one step further to "usually
   * neither".
   */
  result: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultLead: { ...type.metaStrong, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  resultAlt: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  resultNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 19,
  },
  resultRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  resultMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: tint.neutralLight(0.05),
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: { ...type.bodyStrong, fontSize: scale.meta, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  resultSupply: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 2 },
  resultSupplyText: { ...type.caption, fontSize: scale.micro, writingDirection: "rtl" },
  resultGo: { color: colors.textSecondary, fontSize: scale.section, lineHeight: 24 },

  browse: { minHeight: 44, justifyContent: "center", alignItems: "flex-end", paddingHorizontal: spacing.sm },
  browseText: { ...type.captionStrong, color: colors.actionText },
});
