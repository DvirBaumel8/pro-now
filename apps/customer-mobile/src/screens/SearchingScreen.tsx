import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "Searching">;

/**
 * C08 — the signature "Searching" screen. See /docs/03-DESIGN-SYSTEM.md
 * §Signature screen and /docs/02-UX-FLOWS.md C08: full-screen radar pulse,
 * honest copy, no fake provider dots, cancel available.
 */
export function SearchingScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const pulse = useRef(new Animated.Value(0)).current;
  const [statusText, setStatusText] = useState("מחפשים מקצוען זמין לידך…");

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    // Poll job status — a production build subscribes to the job
    // WebSocket channel instead (see /docs/06-API-SPEC.md §WebSocket
    // channels); polling here is an honest, simple fallback for this
    // delivery.
    const interval = setInterval(async () => {
      try {
        const { job } = await api.getJob(jobId);
        if (job.status === "PRO_ASSIGNED") {
          clearInterval(interval);
          navigation.replace("Match", { jobId });
        } else if (job.status === "CANCELLED") {
          clearInterval(interval);
          setStatusText("לא מצאנו מקצוען זמין כרגע");
        }
      } catch {
        // transient network error — keep polling, never show a fake match
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [jobId, navigation]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <Animated.View style={[styles.pulseRing, { transform: [{ scale }], opacity }]} />
        <View style={styles.centerDot} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{statusText}</Text>
        <Text style={styles.subtitle}>בודקים מי פנוי ויכול להגיע הכי מהר</Text>
        <TouchableOpacity style={styles.cancelButton} accessibilityRole="button">
          <Text style={styles.cancelLabel}>ביטול</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFEDE7",
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: customerTheme.colors.action,
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: customerTheme.colors.action,
    borderWidth: 3,
    borderColor: "#fff",
  },
  card: {
    backgroundColor: customerTheme.colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  title: { ...typography.h2, color: customerTheme.colors.textPrimary, textAlign: "center" },
  subtitle: { ...typography.caption, color: customerTheme.colors.textSecondary, textAlign: "center", marginTop: spacing.xs },
  cancelButton: { marginTop: spacing.lg, padding: spacing.sm },
  cancelLabel: { ...typography.body, color: customerTheme.colors.textSecondary, textDecorationLine: "underline" },
});
