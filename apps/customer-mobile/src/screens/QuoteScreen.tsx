import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "Quote">;

/**
 * C12 — Quote approval. See /docs/02-UX-FLOWS.md and
 * /docs/05-DATABASE.md §Quote versioning: the customer approves an exact
 * quote version/hash; no work-state transition happens without it.
 */
export function QuoteScreen({ navigation }: Props) {
  const lineItems = [
    { label: "החלפת סיפון", amount: "₪220" },
    { label: "חלקים", amount: "₪80" },
  ];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>הצעת מחיר מיוסי</Text>
      {lineItems.map((item) => (
        <View key={item.label} style={styles.row}>
          <Text style={styles.amount}>{item.amount}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalAmount}>₪300</Text>
        <Text style={styles.totalLabel}>סה"כ</Text>
      </View>

      <TouchableOpacity style={styles.approveButton} onPress={() => navigation.navigate("Complete", { jobId: "demo" })}>
        <Text style={styles.approveLabel}>אשר עבודה</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.declineButton}>
        <Text style={styles.declineLabel}>דחה</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.chatButton}>
        <Text style={styles.chatLabel}>דבר עם יוסי</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg, padding: spacing.lg },
  title: { ...typography.h1, color: customerTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  row: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: customerTheme.colors.border },
  label: { ...typography.body, color: customerTheme.colors.textPrimary },
  amount: { ...typography.body, color: customerTheme.colors.textPrimary },
  totalRow: { borderBottomWidth: 0, marginTop: spacing.sm },
  totalLabel: { ...typography.h2, color: customerTheme.colors.textPrimary },
  totalAmount: { ...typography.h2, color: customerTheme.colors.textPrimary },
  approveButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xl },
  approveLabel: { ...typography.button, color: "#fff" },
  declineButton: { padding: spacing.md, alignItems: "center" },
  declineLabel: { ...typography.body, color: customerTheme.colors.statusDanger },
  chatButton: { padding: spacing.sm, alignItems: "center" },
  chatLabel: { ...typography.caption, color: customerTheme.colors.textSecondary, textDecorationLine: "underline" },
});
