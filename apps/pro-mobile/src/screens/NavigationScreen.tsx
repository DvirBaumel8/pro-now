import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Navigation">;

/** P17/P18 — Navigation + Arrived. See /docs/02-UX-FLOWS.md. */
export function NavigationScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [arrived, setArrived] = useState(false);

  async function onArrive() {
    try {
      await api.arrive(jobId);
    } catch {
      // demo fallback — proceed locally even if the backend isn't reachable
    }
    setArrived(true);
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <Text style={styles.destination}>📍 מלצ'ט 19, תל אביב</Text>
        <Text style={styles.eta}>ETA: 8 דקות</Text>
      </View>
      <View style={styles.card}>
        {!arrived ? (
          <>
            <TouchableOpacity style={styles.navButton}><Text style={styles.navLabel}>פתח ניווט</Text></TouchableOpacity>
            <TouchableOpacity style={styles.arrivedButton} onPress={onArrive} accessibilityRole="button">
              <Text style={styles.arrivedLabel}>הגעתי</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.arrivedButton} onPress={() => navigation.replace("ActiveService", { jobId })}>
            <Text style={styles.arrivedLabel}>המשך לאבחון/עבודה</Text>
          </TouchableOpacity>
        )}
        <View style={styles.problemRow}>
          <TouchableOpacity><Text style={styles.problemLabel}>📞 צור קשר</Text></TouchableOpacity>
          <TouchableOpacity><Text style={styles.problemLabel}>⚠️ דווח על בעיה</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg },
  mapArea: { flex: 1, backgroundColor: "#0F1512", alignItems: "center", justifyContent: "center" },
  destination: { ...typography.bodyStrong, color: proTheme.colors.textPrimary },
  eta: { ...typography.h2, color: proTheme.colors.action, marginTop: spacing.sm },
  card: { backgroundColor: proTheme.colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  navButton: { borderRadius: radius.md, padding: spacing.md, alignItems: "center", borderWidth: 1, borderColor: proTheme.colors.border, marginBottom: spacing.sm },
  navLabel: { ...typography.body, color: proTheme.colors.textPrimary },
  arrivedButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.md, padding: spacing.lg, alignItems: "center" },
  arrivedLabel: { ...typography.button, color: "#03130A" },
  problemRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: spacing.lg },
  problemLabel: { ...typography.caption, color: proTheme.colors.textSecondary },
});
