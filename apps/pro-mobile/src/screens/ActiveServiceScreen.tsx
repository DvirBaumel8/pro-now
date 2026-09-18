import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "ActiveService">;

/**
 * P19 — Service, VISIT_QUOTE archetype: diagnose → build quote → wait for
 * approval → work. See /docs/02-UX-FLOWS.md and
 * /docs/09-PAYMENTS.md §Pricing archetypes.
 */
export function ActiveServiceScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [laborPrice, setLaborPrice] = useState("220");
  const [partsPrice, setPartsPrice] = useState("80");
  const [sending, setSending] = useState(false);

  async function sendQuote() {
    setSending(true);
    try {
      await api.sendQuote(jobId, [
        { description: "החלפת סיפון", quantity: 1, unitPriceMinorUnits: Number(laborPrice) * 100 },
        { description: "חלקים", quantity: 1, unitPriceMinorUnits: Number(partsPrice) * 100 },
      ]);
    } catch {
      // demo fallback
    } finally {
      setSending(false);
      navigation.replace("Complete", { jobId });
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>צור הצעת מחיר</Text>

      <View style={styles.lineItem}>
        <TextInput style={styles.priceInput} value={laborPrice} onChangeText={setLaborPrice} keyboardType="numeric" textAlign="right" />
        <Text style={styles.lineLabel}>עבודה: החלפת סיפון</Text>
      </View>
      <View style={styles.lineItem}>
        <TextInput style={styles.priceInput} value={partsPrice} onChangeText={setPartsPrice} keyboardType="numeric" textAlign="right" />
        <Text style={styles.lineLabel}>חלקים: סיפון חדש</Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>₪{Number(laborPrice) + Number(partsPrice)}</Text>
        <Text style={styles.totalLabel}>סה"כ</Text>
      </View>

      <TouchableOpacity style={styles.sendButton} onPress={sendQuote} disabled={sending} accessibilityRole="button">
        <Text style={styles.sendLabel}>{sending ? "שולח…" : "שלח לאישור"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  lineItem: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  lineLabel: { ...typography.body, color: proTheme.colors.textPrimary, flex: 1, textAlign: "right" },
  priceInput: { width: 90, backgroundColor: proTheme.colors.surface, borderRadius: radius.sm, padding: spacing.sm, color: proTheme.colors.textPrimary, borderWidth: 1, borderColor: proTheme.colors.border },
  totalRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: proTheme.colors.border, paddingTop: spacing.md },
  totalLabel: { ...typography.h2, color: proTheme.colors.textPrimary },
  totalValue: { ...typography.h2, color: proTheme.colors.textPrimary },
  sendButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xl },
  sendLabel: { ...typography.button, color: "#03130A" },
});
