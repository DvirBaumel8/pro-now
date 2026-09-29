import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { scale, spacing } from "../../theme";

/**
 * THE INVITATION TO WALK WHILE YOU WAIT.
 *
 * Amit: *"משהו מאוד מושך שיגרום למישהו לעבור בינתיים לטייל בעולם שלנו בזמן
 * ההמתנה."* The customer's own character walks in place on a glowing card —
 * the walk cycle from the city itself — and the card says what happens if you
 * go: you walk the street, and you are told the moment he is close.
 */
export interface StrollInviteProps {
  proFirstNameHe: string;
  female?: boolean;
  /** The walk cycle's frames, in order. Absent: the card still invites, without the figure. */
  frames?: string[];
  onPress: () => void;
  bottom: number;
  width: number;
}

export function StrollInvite({ proFirstNameHe, female = false, frames = [], onPress, bottom, width }: StrollInviteProps) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (frames.length < 2) return;
    const t = setInterval(() => setF((x) => (x + 1) % frames.length), 110);
    return () => clearInterval(t);
  }, [frames.length]);
  const shine = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(shine, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [shine]);
  const w = width - spacing.lg * 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`לטייל בעיר בזמן ש${proFirstNameHe} בדרך`}
      style={({ pressed }) => [styles.card, { bottom, width: w }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.sheen, { transform: [{ translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-w, w] }) }, { skewX: "-20deg" }] }]}
      />
      <View style={styles.figureWell}>
        {frames.length > 0 ? <Image source={{ uri: frames[f] }} style={styles.figure} resizeMode="contain" /> : <Text style={styles.star}>✦</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>בזמן ש{proFirstNameHe} בדרך — טיול בעיר שלנו</Text>
        <Text style={styles.sub}>{female ? "נקרא לכם כשהיא מתקרבת" : "נקרא לכם כשהוא מתקרב"}</Text>
      </View>
      <Text style={styles.go}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    alignSelf: "center",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(60,34,110,0.78)",
    borderWidth: 1,
    borderColor: "rgba(185,150,255,0.45)",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.55,
    shadowRadius: 22,
    ...({ backdropFilter: "blur(14px)" } as object),
  },
  sheen: { position: "absolute", top: 0, bottom: 0, width: 80, backgroundColor: "rgba(255,255,255,0.10)" },
  figureWell: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "flex-end", overflow: "hidden" },
  figure: { width: 46, height: 50 },
  star: { color: "#E9DDFF", fontSize: scale.section, marginBottom: 12 },
  title: { color: "#FFFFFF", fontSize: scale.body, fontWeight: "800", textAlign: "right" },
  sub: { color: "rgba(233,221,255,0.8)", fontSize: scale.meta, textAlign: "right", marginTop: 2 },
  go: { color: "#E9DDFF", fontSize: scale.title, fontWeight: "700" },
});
