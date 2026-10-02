import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { scale, spacing } from "../../theme";

/**
 * ---------------------------------------------------------------------
 * A WINDOW INTO THE CITY, NOT A BUTTON ABOUT IT
 * ---------------------------------------------------------------------
 * Amit: *"צריך משהו יותר מגניב וחדשני לדבר הזה — המסר עובר אבל לא מספיק."*
 * The invitation is the city itself, moving: our shopfronts slide past in
 * the dusk, the customer's own character walks along them, and one glowing
 * door says "כניסה לעיר". It shows what you get before you tap — a street
 * to walk while he is on the way — and says you will be called back.
 */
export interface StrollInviteProps {
  proFirstNameHe: string;
  female?: boolean;
  /** Kept for callers; the walk cycle read as frantic in a small card (Amit, 2026-09-29) and is not drawn. */
  frames?: string[];
  /** The customer's own character, calm, in a glowing ring — you, at the door of the city. */
  avatarUri?: string | null;
  /** Our shopfronts, for the street that slides past behind the walker. */
  shopUris?: string[];
  onPress: () => void;
  bottom: number;
  width: number;
}

const SHOP_W = 104;

export function StrollInvite({ proFirstNameHe, female = false, avatarUri = null, shopUris = [], onPress, bottom, width }: StrollInviteProps) {

  const street = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const rowW = Math.max(1, shopUris.length) * SHOP_W;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(street, { toValue: 1, duration: Math.max(6000, shopUris.length * 2600), easing: Easing.linear, useNativeDriver: true }));
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [street, glow, shopUris.length]);

  const w = width - spacing.lg * 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`כניסה לעיר שלנו — לטייל בזמן ש${proFirstNameHe} בדרך. נקרא לכם כש${female ? "היא מתקרבת" : "הוא מתקרב"}.`}
      style={({ pressed }) => [styles.card, { bottom, width: w }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {/* The street, sliding right-to-left: you are walking up it. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.sky} />
        {shopUris.length > 0 ? (
          <Animated.View
            style={[
              styles.shopsRow,
              { width: rowW * 2, transform: [{ translateX: street.interpolate({ inputRange: [0, 1], outputRange: [-rowW, 0] }) }] },
            ]}
          >
            {[...shopUris, ...shopUris].map((u, i) => (
              <Image key={`${u}-${i}`} source={{ uri: u }} style={styles.shop} resizeMode="contain" />
            ))}
          </Animated.View>
        ) : null}
        <View style={styles.pavement} />
        <View style={styles.fadeTop} />
      </View>

      {/* You, at the door of the city — still, breathing with the glow. */}
      {avatarUri ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.me, { transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }] }]}
        >
          <Image source={{ uri: avatarUri }} style={styles.meImg} resizeMode="cover" />
        </Animated.View>
      ) : null}

      <View style={styles.copy} pointerEvents="none">
        <Text style={styles.kicker}>בזמן ש{proFirstNameHe} בדרך</Text>
        <Text style={styles.title}>טיול בעיר שלנו</Text>
        <Text style={styles.sub}>{female ? "נקרא לכם כשהיא מתקרבת" : "נקרא לכם כשהוא מתקרב"}</Text>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[styles.door, { shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }) as unknown as number, transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] }]}
      >
        <Text style={styles.doorText}>כניסה ‹</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    alignSelf: "center",
    height: 112,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(200,170,255,0.5)",
    backgroundColor: "#2A1848",
    shadowColor: "#8B5CF6",
    shadowOpacity: 0.6,
    shadowRadius: 26,
  },
  sky: { ...StyleSheet.absoluteFillObject, backgroundColor: "#2B1850", ...({ backgroundImage: "linear-gradient(180deg,#1B1036 0%,#3B1F66 55%,#6B2E6E 100%)" } as object) },
  shopsRow: { position: "absolute", left: 0, bottom: 14, height: 84, flexDirection: "row", alignItems: "flex-end", opacity: 0.9 },
  shop: { width: SHOP_W, height: 84, marginHorizontal: 0 },
  pavement: { position: "absolute", left: 0, right: 0, bottom: 0, height: 16, backgroundColor: "#3A2A3E", borderTopWidth: 1, borderTopColor: "rgba(255,200,150,0.35)" },
  fadeTop: { ...StyleSheet.absoluteFillObject, ...({ backgroundImage: "linear-gradient(270deg, rgba(20,10,36,0.95) 0%, rgba(20,10,36,0.85) 42%, rgba(20,10,36,0.2) 68%, rgba(20,10,36,0) 100%)" } as object) },
  me: { position: "absolute", left: spacing.md, bottom: 12, width: 50, height: 50, borderRadius: 25, overflow: "hidden", borderWidth: 2, borderColor: "#FFD36B", backgroundColor: "#2B1850", shadowColor: "#FFD36B", shadowOpacity: 0.7, shadowRadius: 14 },
  meImg: { width: "100%", height: "100%" },
  copy: { position: "absolute", right: spacing.md, top: 14, bottom: 14, justifyContent: "center", alignItems: "flex-end", maxWidth: "58%" },
  kicker: { color: "rgba(233,221,255,0.85)", fontSize: scale.micro, fontWeight: "700", textAlign: "right" },
  title: { color: "#FFFFFF", fontSize: scale.title, fontWeight: "900", textAlign: "right", ...({ textShadow: "0 0 18px rgba(200,160,255,.8)" } as object) },
  sub: { color: "rgba(233,221,255,0.8)", fontSize: scale.micro, textAlign: "right", marginTop: 2 },
  door: {
    position: "absolute",
    left: spacing.md,
    top: 14,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    /* Brand coral, never yellow (Amit's rule; multi-order spec finding F). */
    backgroundColor: "#FF5C38",
    shadowColor: "#FF5C38",
    shadowRadius: 16,
  },
  doorText: { color: "#FFFFFF", fontSize: scale.meta, fontWeight: "900" },
});
