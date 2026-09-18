import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius, EarningsMetric, VerificationBadge } from "@pro-now/ui";
import { money } from "@pro-now/types";
import type { ProStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProStackParamList, "Offline">;

/**
 * P13 — Offline home. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §19: dark premium operational dashboard, huge
 * GO ONLINE control, never hide deductions.
 */
export function OfflineHomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.name}>יוסי כהן</Text>
          <VerificationBadge kind="IDENTITY_VERIFIED" />
        </View>
      </View>

      <View style={styles.metricsRow}>
        <EarningsMetric label="הכנסות היום" amount={money(84000)} dark />
        <View>
          <Text style={styles.metricValue}>4</Text>
          <Text style={styles.metricLabel}>עבודות</Text>
        </View>
        <View>
          <Text style={styles.metricValue}>3:24</Text>
          <Text style={styles.metricLabel}>זמן Online</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.goOnlineButton}
        onPress={() => navigation.navigate("PreShift")}
        accessibilityRole="button"
        accessibilityLabel="התחל לעבוד"
      >
        <Text style={styles.goOnlineLabel}>🟢 התחל לעבוד</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryLink} onPress={() => navigation.navigate("Earnings")}>
        <Text style={styles.secondaryLinkLabel}>צפה בהכנסות מלאות ←</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryLink} onPress={() => navigation.navigate("VerificationCenter")}>
        <Text style={styles.secondaryLinkLabel}>מרכז אימות ←</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, position: "absolute", top: 60, right: spacing.lg },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: proTheme.colors.surfaceElevated },
  name: { ...typography.bodyStrong, color: proTheme.colors.textPrimary },
  metricsRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: spacing.xxl },
  metricValue: { ...typography.numericMetric, color: proTheme.colors.textPrimary, textAlign: "right" },
  metricLabel: { ...typography.caption, color: proTheme.colors.textSecondary, textAlign: "right" },
  goOnlineButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.lg, paddingVertical: spacing.xl, alignItems: "center" },
  goOnlineLabel: { ...typography.h1, color: "#03130A" },
  secondaryLink: { marginTop: spacing.lg, alignItems: "center" },
  secondaryLinkLabel: { ...typography.body, color: proTheme.colors.textSecondary },
});
