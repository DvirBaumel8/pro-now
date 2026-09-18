import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Tracking">;

/** C10/C11 — Live tracking + arrival. See /docs/02-UX-FLOWS.md. */
export function TrackingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <Text style={styles.mapHint}>🚙 מפה עם מסלול חי תוצג כאן</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.status}>יוסי בדרך אליך</Text>
        <Text style={styles.eta}>11 דקות</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton}><Text style={styles.actionLabel}>📞 התקשר</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}><Text style={styles.actionLabel}>💬 הודעה</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}><Text style={styles.actionLabel}>🔗 שתף</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Quote", { jobId: "demo" })}>
          <Text style={styles.primaryButtonLabel}>המשך (דמו: לקבלת הצעת מחיר)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg },
  mapArea: { flex: 1, backgroundColor: "#EFEDE7", alignItems: "center", justifyContent: "center" },
  mapHint: { ...typography.caption, color: customerTheme.colors.textSecondary },
  card: { backgroundColor: customerTheme.colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, alignItems: "flex-end" },
  status: { ...typography.h2, color: customerTheme.colors.textPrimary },
  eta: { ...typography.numericMetric, color: customerTheme.colors.action, marginTop: 4 },
  actionsRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { backgroundColor: customerTheme.colors.bg, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: customerTheme.colors.border },
  actionLabel: { ...typography.caption, color: customerTheme.colors.textPrimary },
  primaryButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.lg, alignSelf: "stretch" },
  primaryButtonLabel: { ...typography.button, color: "#fff" },
});
