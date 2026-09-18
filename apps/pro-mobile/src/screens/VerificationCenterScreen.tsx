import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";

/**
 * P24 — Verification center. See /docs/02-UX-FLOWS.md and
 * /docs/10-TRUST-VERIFICATION.md §Verification status model: no ambiguous
 * green check for incomplete verification.
 */
export function VerificationCenterScreen() {
  const items = [
    { label: "זהות", status: "מאומת" },
    { label: "עסק", status: "מאומת" },
    { label: "רישיון חשמלאי", status: "פג תוקף — נדרש חידוש" },
    { label: "מוניטין חיצוני", status: "לא מקושר" },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>מרכז אימות</Text>
      {items.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={[styles.status, item.status.includes("פג") && styles.statusWarning]}>{item.status}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg },
  title: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", backgroundColor: proTheme.colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  label: { ...typography.body, color: proTheme.colors.textPrimary },
  status: { ...typography.body, color: proTheme.colors.action },
  statusWarning: { color: proTheme.colors.statusWarning },
});
