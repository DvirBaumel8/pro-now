import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, customerTheme, palette, radii, spacing, tabular, type } from "../theme";
import { ProviderPortrait } from "./ProviderPortrait";

/**
 * A recorded message from the professional.
 *
 * WHY IT IS ALLOWED HERE, AND ONLY HERE. ChatGPT liked the idea and then
 * asked the right question about it: "אם זו הודעה אמיתית שהמקצוען שלח
 * ללקוח הזה, מצוין. אם זו 'הקלטת היכרות' קבועה — אני פחות אוהב; זה יכול
 * להפוך מהר מאוד לגימיק."
 *
 * That distinction is the whole component, so it is in the type rather than
 * in a comment. `kind` has one value — `JOB_MESSAGE` — and there is
 * deliberately no `INTRO` to pass. A stock recording replayed to every
 * customer is a marketing asset dressed as a personal message, and the
 * first time someone hears the same voice note twice, the trust this
 * product is built on is the thing that breaks.
 *
 * SIZE IS THE OTHER NOTE. It was "רעיון מצוין, אבל הגזן קטן מדי כדי להיות
 * משמעותי" — a 28px strip under a fact row, which reads as an attachment.
 * A voice note from the person about to enter your home is not an
 * attachment; at this size it is the second thing on the screen after the
 * person's face.
 */

export interface VoiceNoteProps {
  /**
   * The only permitted kind: a message this professional recorded for THIS
   * request. There is no stock-intro variant, on purpose.
   */
  kind: "JOB_MESSAGE";
  speakerNameHe: string;
  speakerPhotoUri?: string | null;
  /** The message in text, when a transcript exists. Never invented. */
  transcriptHe?: string | null;
  seconds: number;
  playing?: boolean;
  onTogglePlay?: () => void;
  tone?: "light" | "dark";
  width: number;
}

export function VoiceNote({
  speakerNameHe,
  speakerPhotoUri,
  transcriptHe,
  seconds,
  playing = false,
  onTogglePlay,
  tone = "dark",
  width,
}: VoiceNoteProps) {
  const colors = tone === "dark" ? customerDarkTheme.colors : customerTheme.colors;

  return (
    <View
      style={[
        styles.wrap,
        { width, backgroundColor: tone === "dark" ? palette.night700 : palette.sandDeep },
      ]}
    >
      <ProviderPortrait
        photoUri={speakerPhotoUri}
        displayNameHe={speakerNameHe}
        size={46}
        tone={tone}
      />

      <View style={styles.body}>
        {transcriptHe ? (
          <Text style={[styles.transcript, { color: colors.textPrimary }]} numberOfLines={2}>
            {`"${transcriptHe}"`}
          </Text>
        ) : (
          <Text style={[styles.transcript, { color: colors.textSecondary }]} numberOfLines={1}>
            הודעה קולית מ{speakerNameHe}
          </Text>
        )}

        <View style={styles.row}>
          <Pressable
            onPress={onTogglePlay}
            accessibilityRole="button"
            accessibilityLabel={playing ? "עצירת ההודעה" : `השמעת ההודעה מ${speakerNameHe}`}
            style={({ pressed }) => [styles.play, pressed && { opacity: 0.85 }]}
          >
            {playing ? (
              <View style={styles.pauseGlyph}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            ) : (
              <View style={styles.playGlyph} />
            )}
          </Pressable>

          <Waveform playing={playing} tone={tone} />

          <Text style={[styles.time, { color: colors.textSecondary }]}>
            {formatSeconds(seconds)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
}

/**
 * Thirty-one bars at fixed heights, animated only while playing.
 *
 * The heights are a stable pseudo-random pattern rather than the real
 * amplitude envelope — and that is worth being explicit about, because a
 * waveform LOOKS like data. It is a control affordance here, not a
 * measurement, and nothing in the product reads a number off it. When the
 * audio pipeline can supply a real envelope it replaces this array.
 */
const BARS = [
  0.3, 0.55, 0.42, 0.8, 0.62, 0.95, 0.5, 0.7, 0.38, 0.85, 0.6, 0.45, 0.75, 0.52, 0.9, 0.35,
  0.68, 0.48, 0.82, 0.58, 0.4, 0.72, 0.9, 0.5, 0.65, 0.33, 0.78, 0.55, 0.44, 0.7, 0.36,
];

function Waveform({ playing, tone }: { playing: boolean; tone: "light" | "dark" }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!playing) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 620, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [playing, v]);

  const color = playing ? palette.signal500 : tone === "dark" ? palette.nightTextSoft : palette.ink300;

  return (
    <View style={styles.wave}>
      {BARS.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: Math.max(3, Math.round(h * 26)),
              backgroundColor: color,
              transform: playing
                ? [
                    {
                      scaleY: v.interpolate({
                        inputRange: [0, 1],
                        outputRange: i % 3 === 0 ? [1, 0.55] : i % 3 === 1 ? [0.7, 1] : [0.9, 0.7],
                      }),
                    },
                  ]
                : [],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  body: { flex: 1, gap: spacing.sm },
  transcript: { ...type.meta, textAlign: "right", writingDirection: "rtl", lineHeight: 19 },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.signal500,
    alignItems: "center",
    justifyContent: "center",
  },
  /* A triangle drawn with borders — no glyph font, no image. */
  playGlyph: {
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 13,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderRightColor: palette.white,
    marginRight: -2,
  },
  pauseGlyph: { flexDirection: "row", gap: 4 },
  pauseBar: { width: 4, height: 15, borderRadius: 1, backgroundColor: palette.white },
  wave: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 2, height: 28 },
  waveBar: { width: 2.5, borderRadius: 2 },
  time: { ...type.micro, ...tabular },
});
