import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Complete">;

/** P20/P21 — Complete + automatic return to AVAILABLE. See /docs/02-UX-FLOWS.md. */
export function ProCompleteScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [completing, setCompleting] = useState(false);

  async function onComplete() {
    setCompleting(true);
    try {
      await api.complete(jobId);
    } catch {
      // demo fallback
    } finally {
      setCompleting(false);
      // Automatic return to AVAILABLE if the shift is still active — see
      // /docs/07-JOB-STATE-MACHINE.md §P21. Never force GO ONLINE again.
      navigation.replace("Online");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>סיום עבודה</Text>
      <View style={styles.checklist}>
        <TouchableOpacity style={styles.checklistItem}><Text style={styles.checklistLabel}>📷 תמונה אחרי</Text></TouchableOpacity>
        <TouchableOpacity style={styles.checklistItem}><Text style={styles.checklistLabel}>📝 הערה</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.completeButton} onPress={onComplete} disabled={completing} accessibilityRole="button">
        <Text style={styles.completeLabel}>{completing ? "מעדכן…" : "סיים עבודה"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "center", marginBottom: spacing.xl },
  checklist: { gap: spacing.sm },
  checklistItem: { backgroundColor: proTheme.colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: proTheme.colors.border },
  checklistLabel: { ...typography.body, color: proTheme.colors.textPrimary, textAlign: "right" },
  completeButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xl },
  completeLabel: { ...typography.button, color: "#03130A" },
});
