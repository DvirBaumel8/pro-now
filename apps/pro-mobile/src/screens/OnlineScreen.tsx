import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProStackParamList, "Online">;

/**
 * P15 — Online. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §21: animated green live ring, timer,
 * "מחפשים עבורך עבודה", pause/end shift.
 */
export function OnlineScreen({ navigation }: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Demo trigger: in the real app this fires when the server pushes a
  // dispatch offer over the job WebSocket channel (/docs/06-API-SPEC.md).
  useEffect(() => {
    const timeout = setTimeout(() => navigation.navigate("Offer", { offerId: "demo-offer" }), 4000);
    return () => clearTimeout(timeout);
  }, [navigation]);

  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });

  return (
    <View style={styles.container}>
      <View style={styles.mapArea} />

      <View style={styles.statusCard}>
        <Animated.View style={[styles.liveDot, { opacity: ringOpacity }]} />
        <Text style={styles.statusLabel}>ONLINE</Text>
        <Text style={styles.timer}>00:04:12</Text>

        <View style={styles.metricsRow}>
          <View>
            <Text style={styles.metricValue}>₪840</Text>
            <Text style={styles.metricLabel}>הכנסות היום</Text>
          </View>
          <View>
            <Text style={styles.metricValue}>4</Text>
            <Text style={styles.metricLabel}>עבודות</Text>
          </View>
        </View>

        <Text style={styles.searching}>מחפשים עבורך עבודה באזור…</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.pauseButton}><Text style={styles.pauseLabel}>השהה</Text></TouchableOpacity>
          <TouchableOpacity style={styles.endButton} onPress={() => navigation.navigate("Offline")}>
            <Text style={styles.endLabel}>סיים משמרת</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg },
  mapArea: { flex: 1, backgroundColor: "#0F1512" },
  statusCard: { backgroundColor: proTheme.colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  liveDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: proTheme.colors.action, marginBottom: spacing.xs },
  statusLabel: { ...typography.h2, color: proTheme.colors.action, letterSpacing: 2 },
  timer: { ...typography.numericMetric, color: proTheme.colors.textPrimary, marginTop: 4 },
  metricsRow: { flexDirection: "row-reverse", gap: spacing.xl, marginTop: spacing.lg },
  metricValue: { ...typography.h2, color: proTheme.colors.textPrimary, textAlign: "center" },
  metricLabel: { ...typography.caption, color: proTheme.colors.textSecondary, textAlign: "center" },
  searching: { ...typography.body, color: proTheme.colors.textSecondary, marginTop: spacing.lg },
  actionsRow: { flexDirection: "row-reverse", gap: spacing.md, marginTop: spacing.xl, alignSelf: "stretch" },
  pauseButton: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: proTheme.colors.border },
  pauseLabel: { ...typography.body, color: proTheme.colors.textPrimary },
  endButton: { flex: 1, borderRadius: radius.md, padding: spacing.md, alignItems: "center", backgroundColor: "rgba(243,18,96,0.12)" },
  endLabel: { ...typography.body, color: proTheme.colors.statusDanger },
});
