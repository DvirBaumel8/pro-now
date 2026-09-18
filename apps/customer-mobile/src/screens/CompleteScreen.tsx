import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Complete">;

/** C14 — Complete/Payment. See /docs/02-UX-FLOWS.md. */
export function CompleteScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>העבודה הושלמה</Text>
      <View style={styles.receiptCard}>
        <Text style={styles.receiptLabel}>סה"כ שולם</Text>
        <Text style={styles.receiptAmount}>₪300</Text>
        <Text style={styles.receiptStatus}>✓ התשלום עבר בהצלחה</Text>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Review", { jobId: "demo", professionalName: "יוסי" })}>
        <Text style={styles.primaryButtonLabel}>המשך לדירוג</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.reportButton}>
        <Text style={styles.reportLabel}>יש בעיה עם העבודה?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...typography.h1, color: customerTheme.colors.textPrimary, textAlign: "center", marginBottom: spacing.xl },
  receiptCard: { backgroundColor: customerTheme.colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: customerTheme.colors.border, padding: spacing.xl, alignItems: "center" },
  receiptLabel: { ...typography.caption, color: customerTheme.colors.textSecondary },
  receiptAmount: { ...typography.display, color: customerTheme.colors.textPrimary, marginTop: 4 },
  receiptStatus: { ...typography.body, color: customerTheme.colors.action, marginTop: spacing.sm },
  primaryButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xl },
  primaryButtonLabel: { ...typography.button, color: "#fff" },
  reportButton: { alignItems: "center", padding: spacing.md },
  reportLabel: { ...typography.caption, color: customerTheme.colors.textSecondary, textDecorationLine: "underline" },
});
