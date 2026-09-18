import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { proTheme, typography, spacing, radius, EarningsMetric } from "@pro-now/ui";
import { money } from "@pro-now/types";
import { api } from "../api/client";

/**
 * P22 — Earnings. See /docs/02-UX-FLOWS.md: gross/fees/net all visible,
 * never hidden deductions.
 */
export function EarningsScreen() {
  const [net, setNet] = useState<number | null>(null);

  useEffect(() => {
    api.getEarnings().then((res) => setNet(res.netMinorUnits)).catch(() => setNet(null));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הכנסות</Text>
      <View style={styles.summaryCard}>
        <EarningsMetric label="נטו השבוע" amount={money(net ?? 168000)} dark />
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownValue}>₪2,100</Text>
        <Text style={styles.breakdownLabel}>ברוטו</Text>
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownValue}>-₪420</Text>
        <Text style={styles.breakdownLabel}>עמלת פלטפורמה</Text>
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownValue}>17:20</Text>
        <Text style={styles.breakdownLabel}>שעות Online</Text>
      </View>
      <View style={styles.breakdownRow}>
        <Text style={styles.breakdownValue}>₪97/שעה</Text>
        <Text style={styles.breakdownLabel}>נטו לשעת Online</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg },
  title: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  summaryCard: { backgroundColor: proTheme.colors.surface, borderRadius: radius.lg, padding: spacing.xl, alignItems: "flex-end", marginBottom: spacing.lg },
  breakdownRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: proTheme.colors.border },
  breakdownLabel: { ...typography.body, color: proTheme.colors.textSecondary },
  breakdownValue: { ...typography.body, color: proTheme.colors.textPrimary },
});
