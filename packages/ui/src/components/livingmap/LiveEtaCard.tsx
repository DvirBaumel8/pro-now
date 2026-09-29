import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { palette, scale, spacing } from "../../theme";

/**
 * ---------------------------------------------------------------------
 * HE IS ON HIS WAY — ONE CARD, AND IT MOVES
 * ---------------------------------------------------------------------
 * Amit, 2026-09-29, of the waiting screen: *"מסך מת שגם השעון לא זז"*, and
 * of the buttons above it: too many, none of them the point. This card is
 * the point: who is coming, a countdown that ticks every second, the clock
 * time he arrives, and how much of the way is behind him. Safety sits in
 * it as one small control, never covered by anything.
 *
 * The countdown is the server's ETA counted down in real time from the
 * moment it was given — it moves because time does, not because anything
 * is being invented.
 */
export interface LiveEtaCardProps {
  proFirstNameHe: string;
  female?: boolean;
  proPhotoUri?: string | null;
  serviceNameHe: string;
  /** When he is due, epoch ms — the server's ETA added to when it was given. */
  arrivalAtMs: number;
  /** When the trip began, for the progress line. */
  startedAtMs: number;
  onSafety?: () => void;
  onBack?: () => void;
  width: number;
  topInset?: number;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function LiveEtaCard({ proFirstNameHe, female = false, proPhotoUri = null, serviceNameHe, arrivalAtMs, startedAtMs, onSafety, onBack, width, topInset = 0 }: LiveEtaCardProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [glow]);

  const left = Math.max(0, Math.round((arrivalAtMs - now) / 1000));
  const total = Math.max(1, (arrivalAtMs - startedAtMs) / 1000);
  const done = Math.min(1, Math.max(0, 1 - left / total));
  const at = new Date(arrivalAtMs);
  const clock = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const close = left <= 120;
  const status = left === 0 ? (female ? "כמעט אצלך" : "כמעט אצלך") : close ? `${proFirstNameHe} ${female ? "מתקרבת" : "מתקרב"}` : `${proFirstNameHe} בדרך אליך`;
  const barW = width - spacing.lg * 2 - spacing.lg * 2;

  return (
    <View style={[styles.wrap, { top: spacing.md + topInset, width: width - spacing.lg * 2 }]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" hitSlop={10} style={styles.iconBtn}>
            <Text style={styles.iconText}>›</Text>
          </Pressable>
        ) : null}
        <View style={styles.who}>
          <View style={styles.avatarRing}>
            {proPhotoUri ? <Image source={{ uri: proPhotoUri }} style={styles.avatar} /> : <View style={styles.avatar} />}
            <Animated.View style={[styles.liveDot, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }]} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.status} numberOfLines={1}>{status}</Text>
            <Text style={styles.service} numberOfLines={1}>{serviceNameHe}</Text>
          </View>
        </View>
        {onSafety ? (
          <Pressable onPress={onSafety} accessibilityRole="button" accessibilityLabel="בטיחות" hitSlop={10} style={[styles.iconBtn, styles.safety]}>
            <Text style={[styles.iconText, { color: "#FF8A7A", fontSize: scale.meta }]}>◈</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.clockRow}>
        <Text style={styles.count} accessibilityLabel={`עוד ${Math.ceil(left / 60)} דקות`}>
          {pad(Math.floor(left / 60))}:{pad(left % 60)}
        </Text>
        <View style={styles.arrive}>
          <Text style={styles.arriveLabel}>הגעה</Text>
          <Text style={styles.arriveClock}>{clock}</Text>
        </View>
      </View>

      <View style={[styles.track, { width: barW }]}>
        <View style={[styles.trackFill, { width: Math.max(10, barW * done) }]} />
        <Animated.View
          style={[
            styles.trackHead,
            { right: Math.max(0, barW * done - 7), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }] },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 2,
    borderRadius: 26,
    backgroundColor: "rgba(20,14,30,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    // Web: frosted glass over the moving street.
    ...({ backdropFilter: "blur(18px) saturate(1.3)" } as object),
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  who: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  avatarRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: "#FF6B4A", alignItems: "center", justifyContent: "center" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2a2238" },
  liveDot: { position: "absolute", bottom: -1, left: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: "#2FBF8A", borderWidth: 2, borderColor: "#140e1e" },
  status: { color: "#F7F3FA", fontSize: scale.body, fontWeight: "800", textAlign: "right" },
  service: { color: "rgba(247,243,250,0.62)", fontSize: scale.meta, textAlign: "right", marginTop: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" },
  safety: { backgroundColor: "rgba(255,90,70,0.14)", borderWidth: 1, borderColor: "rgba(255,120,100,0.35)" },
  iconText: { color: "#F7F3FA", fontSize: scale.section, fontWeight: "700", marginTop: -2 },
  clockRow: { flexDirection: "row-reverse", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing.sm },
  count: { color: "#FFFFFF", fontSize: scale.hero, fontWeight: "900", letterSpacing: 1, fontVariant: ["tabular-nums"], writingDirection: "ltr" },
  arrive: { alignItems: "flex-start", paddingBottom: 8 },
  arriveLabel: { color: "rgba(247,243,250,0.55)", fontSize: scale.micro, fontWeight: "700" },
  arriveClock: { color: "#FFB08A", fontSize: scale.title, fontWeight: "900", fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.10)", marginTop: spacing.xs, overflow: "visible" },
  trackFill: { position: "absolute", right: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: palette.signal500 },
  trackHead: { position: "absolute", top: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFD2BF", shadowColor: "#FF6B4A", shadowOpacity: 0.9, shadowRadius: 10 },
});
