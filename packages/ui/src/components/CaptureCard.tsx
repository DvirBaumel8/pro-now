import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { customerDarkTheme, customerTheme, depth, elevation, palette, radii, spacing, tabular, tint, type } from "../theme";

/**
 * THE LIT FIELD — a white card on a dark screen.
 *
 * This is the one surface the customer is supposed to touch first, and on
 * the visual board it is the only bright thing above the fold. That is the
 * whole composition: a dark room, one lit panel, and the panel is where you
 * speak. Everything the screen wants from the customer happens inside these
 * rounded corners, which is why it gets the light rather than the header or
 * the categories.
 *
 * WHY THE BUTTONS ARE BIG, ROUND AND LABELLED. The review's verdict on the
 * previous version was that the direction was right "אבל לא מספיק מזמין
 * משתמש להקליט". Two quiet text links under a text field are not an
 * invitation; they are a footnote. Speaking is often the FASTEST and always
 * the most natural input for a person standing in front of a burst pipe at
 * eleven at night — the mode most likely to be used is the one that was
 * hardest to see.
 *
 * So all three are 60px circles with names under them, which is also what
 * makes them pass the 44px touch-target floor with room to spare rather
 * than by exactly one pixel.
 *
 * WHAT THIS COMPONENT STILL WILL NOT DO. It will not claim to understand
 * a recording or a photograph. Audio and images are captured, carried with
 * the request and shown to the professional. A spinner labelled "ה-AI
 * מנתח…" over a setTimeout is the single most tempting lie available on
 * this screen and it is a mocked capability presented as a real one
 * (/CLAUDE.md §3).
 */

const colors = customerTheme.colors;

export interface CaptureCardProps {
  /**
   * Which surface this card is sitting on.
   *
   * It was hard-wired to the light theme, which was right when the home
   * screen was a page of ivory. The home screen is now the neighbourhood,
   * and a full-width white slab over it read as a different app pasted on
   * top — the exact complaint Amit made about the whole screen not being at
   * the level of the rest.
   *
   * Dark makes it a lit panel standing on the world instead. The light
   * variant stays, unchanged, for the service pages that are still ivory.
   */
  tone?: "light" | "dark";

  text: string;
  onChangeText: (v: string) => void;
  placeholderHe?: string;
  photos: number;
  voiceSeconds: number | null;
  recording: boolean;
  recordSeconds: number;
  canRecord: boolean;
  /** Hidden entirely when the chosen service has no use for a photograph. */
  allowPhoto?: boolean;
  onStartRecord?: () => void;
  onStopRecord?: () => void;
  onDeleteVoice?: () => void;
  onAddPhoto?: () => void;
  onAddFromLibrary?: () => void;
  onClearPhotos?: () => void;
  width: number;
}

export function CaptureCard({
  text,
  onChangeText,
  placeholderHe = "תארו, הקליטו או צלמו…",
  photos,
  voiceSeconds,
  recording,
  recordSeconds,
  canRecord,
  allowPhoto = true,
  onStartRecord,
  onStopRecord,
  onDeleteVoice,
  onAddPhoto,
  onAddFromLibrary,
  onClearPhotos,
  tone = "light",
  width,
}: CaptureCardProps) {
  const hasMedia = photos > 0 || (voiceSeconds ?? 0) > 0;

  return (
    <View
      style={[
        styles.card,
        { width },
        // Depth on a dark surface comes from light, never from a shadow: a
        // dark shadow on near-black is nothing at all.
        tone === "dark" ? styles.cardDark : elevation(3),
      ]}
    >
      <TextInput
        value={text}
        onChangeText={onChangeText}
        placeholder={placeholderHe}
        placeholderTextColor={tone === "dark" ? "rgba(247,243,250,0.45)" : palette.ink300}
        style={[styles.input, tone === "dark" ? styles.inputDark : null]}
        textAlign="right"
        multiline
        accessibilityLabel="ספרו מה צריך"
      />

      {recording ? <Listening seconds={recordSeconds} /> : null}

      <View style={styles.actions}>
        <RoundAction tone={tone}
          labelHe={recording ? "עצור" : "הקלטה"}
          glyph="mic"
          active={recording}
          disabled={!canRecord}
          onPress={recording ? onStopRecord : onStartRecord}
          badgeHe={!recording && (voiceSeconds ?? 0) > 0 ? formatSeconds(voiceSeconds ?? 0) : null}
        />
        {allowPhoto ? (
          <RoundAction tone={tone} labelHe="מצלמה" glyph="camera" onPress={onAddPhoto} />
        ) : null}
        {allowPhoto ? (
          <RoundAction tone={tone}
            labelHe="גלריה"
            glyph="gallery"
            onPress={onAddFromLibrary ?? onAddPhoto}
            badgeHe={photos > 0 ? String(photos) : null}
          />
        ) : null}
      </View>

      {/* What we are actually holding, and how to take it back. */}
      {hasMedia ? (
        <View style={styles.held}>
          {(voiceSeconds ?? 0) > 0 ? (
            <Pressable
              onPress={onDeleteVoice}
              accessibilityRole="button"
              accessibilityLabel="מחיקת ההקלטה"
              style={styles.chip}
            >
              <Text style={styles.chipText}>הקלטה {formatSeconds(voiceSeconds ?? 0)}</Text>
              <Text style={styles.chipX}>×</Text>
            </Pressable>
          ) : null}
          {photos > 0 ? (
            <Pressable
              onPress={onClearPhotos}
              accessibilityRole="button"
              accessibilityLabel="מחיקת התמונות"
              style={styles.chip}
            >
              <Text style={styles.chipText}>
                {photos === 1 ? "תמונה אחת" : `${photos} תמונות`}
              </Text>
              <Text style={styles.chipX}>×</Text>
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

function RoundAction({
  labelHe,
  glyph,
  active,
  disabled,
  badgeHe,
  onPress,
  tone = "light",
}: {
  labelHe: string;
  glyph: "mic" | "camera" | "gallery";
  active?: boolean;
  disabled?: boolean;
  badgeHe?: string | null;
  onPress?: () => void;
  tone?: "light" | "dark";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={badgeHe ? `${labelHe}, ${badgeHe}` : labelHe}
      style={({ pressed }) => [styles.action, disabled && { opacity: 0.35 }, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.circle, tone === "dark" ? styles.circleDark : null, active && styles.circleActive]}>
        <CaptureGlyph
          name={glyph}
          color={active ? "#FFFFFF" : tone === "dark" ? customerDarkTheme.colors.textPrimary : colors.textPrimary}
        />
        {badgeHe ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeHe}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.actionLabel,
          tone === "dark" ? { color: customerDarkTheme.colors.textSecondary } : null,
          active && { color: colors.actionText },
        ]}
        numberOfLines={1}
      >
        {labelHe}
      </Text>
    </Pressable>
  );
}

/**
 * A live waveform, and only while the microphone is genuinely open.
 *
 * §7: motion explains a state transition. This one reports a real state —
 * it starts when recording starts and stops when it stops — rather than
 * performing liveness on a loop.
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

  const bars = [0.4, 1, 0.65, 0.95, 0.5, 0.85, 0.6];

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
                      outputRange: i % 2 === 0 ? [0.3, h] : [h, 0.3],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.listeningText}>מקליט · {formatSeconds(seconds)}</Text>
    </View>
  );
}

function CaptureGlyph({ name, color }: { name: "mic" | "camera" | "gallery"; color: string }) {
  const c = {
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24">
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
      {name === "gallery" && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={2.4} {...c} />
          <Path d="M3 15.5l4.6-4.2 3.4 3 3.1-2.6L21 17" {...c} />
          <Circle cx={8.6} cy={9.4} r={1.4} {...c} />
        </>
      )}
    </Svg>
  );
}

const styles = StyleSheet.create({
  cardDark: {
    backgroundColor: depth.panel.high,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.1)",
    ...depth.litEdge(0.1),
  },
  inputDark: { color: customerDarkTheme.colors.textPrimary },
  circleDark: { backgroundColor: "rgba(247,243,250,0.08)" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  input: {
    minHeight: 58,
    // One step above body: what the customer writes is the content of this
    // screen, so it is set like content rather than like a form field.
    ...type.section,
    fontWeight: "400",
    color: colors.textPrimary,
    writingDirection: "rtl",
    paddingTop: spacing.xs,
  },

  actions: { flexDirection: "row-reverse", gap: spacing.md },
  action: { alignItems: "center", gap: 6, flex: 1 },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.sandDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  /*
   * Coral, while recording. This is the one moment on the home screen when
   * something is genuinely happening, which is exactly what §2 reserves
   * coral for — and the fill disappears the instant recording stops.
   */
  circleActive: { backgroundColor: palette.signal700 },
  actionLabel: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl" },
  badge: {
    position: "absolute",
    top: -2,
    left: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...type.micro, ...tabular, fontWeight: "700", color: "#FFFFFF" },

  listening: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  bars: { flexDirection: "row-reverse", alignItems: "center", gap: 4, height: 26 },
  bar: { width: 3, height: 26, borderRadius: 2, backgroundColor: colors.action },
  listeningText: { ...type.meta, ...tabular, color: colors.textSecondary, writingDirection: "rtl" },

  held: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: tint.trust(0.12),
  },
  chipText: { ...type.metaStrong, color: colors.trust },
  chipX: { ...type.body, color: colors.trust },
});
