import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "RequestDetails">;

/**
 * C06 + C07 — Request details and price preview, combined into one screen
 * for this delivery's prototype depth. See /docs/02-UX-FLOWS.md.
 */
export function RequestDetailsScreen({ route, navigation }: Props) {
  const { serviceId, serviceName } = route.params;
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onRequestNow() {
    setSubmitting(true);
    try {
      const idempotencyKey = `job_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const { job } = await api.createJob(
        { serviceId, addressId: "demo-address", description },
        idempotencyKey
      );
      navigation.navigate("Searching", { jobId: job.id });
    } catch (err: any) {
      Alert.alert("לא הצלחנו לשלוח את הבקשה", err.message ?? "שגיאה לא צפויה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>תראה לנו מה קרה</Text>
      <Text style={styles.subtitle}>{serviceName}</Text>

      <View style={styles.mediaRow}>
        <TouchableOpacity style={styles.mediaButton}><Text style={styles.mediaLabel}>📷 צלם תמונה</Text></TouchableOpacity>
        <TouchableOpacity style={styles.mediaButton}><Text style={styles.mediaLabel}>🎙️ תאר בקול</Text></TouchableOpacity>
      </View>

      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        placeholder="לדוגמה: יש מים מתחת לכיור וכל פעם שאני פותח את הברז זה מטפטף."
        placeholderTextColor={customerTheme.colors.textSecondary}
        value={description}
        onChangeText={setDescription}
        textAlign="right"
      />

      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>דמי ביקור החל מ-</Text>
        <Text style={styles.priceValue}>₪179</Text>
        <Text style={styles.priceNote}>עבודה נוספת רק לאחר אישורך</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
        onPress={onRequestNow}
        disabled={submitting}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonLabel}>{submitting ? "שולח בקשה…" : "בקש עכשיו"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg, padding: spacing.lg },
  title: { ...typography.h1, color: customerTheme.colors.textPrimary, textAlign: "right" },
  subtitle: { ...typography.body, color: customerTheme.colors.textSecondary, textAlign: "right", marginTop: 4 },
  mediaRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.lg },
  mediaButton: { backgroundColor: customerTheme.colors.surface, borderWidth: 1, borderColor: customerTheme.colors.border, borderRadius: radius.md, padding: spacing.md, flex: 1, alignItems: "center" },
  mediaLabel: { ...typography.caption, color: customerTheme.colors.textPrimary },
  textArea: { marginTop: spacing.md, backgroundColor: customerTheme.colors.surface, borderWidth: 1, borderColor: customerTheme.colors.border, borderRadius: radius.md, padding: spacing.md, minHeight: 100, textAlignVertical: "top", ...typography.body, color: customerTheme.colors.textPrimary },
  priceCard: { marginTop: spacing.lg, backgroundColor: "rgba(23,201,100,0.08)", borderRadius: radius.md, padding: spacing.lg, alignItems: "flex-end" },
  priceLabel: { ...typography.caption, color: customerTheme.colors.textSecondary },
  priceValue: { ...typography.h1, color: customerTheme.colors.textPrimary, marginTop: 2 },
  priceNote: { ...typography.caption, color: customerTheme.colors.textSecondary, marginTop: 4 },
  primaryButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xl },
  primaryButtonLabel: { ...typography.button, color: "#fff" },
});
