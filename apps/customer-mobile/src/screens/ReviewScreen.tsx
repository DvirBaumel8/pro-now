import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "Review">;

/** C15 — Review. See /docs/02-UX-FLOWS.md. */
export function ReviewScreen({ route, navigation }: Props) {
  const { jobId, professionalName } = route.params;
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");

  async function submit() {
    try {
      await api.submitReview(jobId, { overallRating: rating || 5, text });
    } catch {
      // best-effort in this demo screen; a production build surfaces the error
    }
    navigation.popToTop();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>איך היה {professionalName}?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n} כוכבים`}>
            <Text style={[styles.star, n <= rating && styles.starFilled]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.textArea}
        multiline
        placeholder="ספר לנו עוד (לא חובה)"
        placeholderTextColor={customerTheme.colors.textSecondary}
        value={text}
        onChangeText={setText}
        textAlign="right"
      />
      <TouchableOpacity style={styles.submitButton} onPress={submit}>
        <Text style={styles.submitLabel}>שלח דירוג</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...typography.h1, color: customerTheme.colors.textPrimary, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginTop: spacing.lg },
  star: { fontSize: 36, color: customerTheme.colors.border },
  starFilled: { color: "#F5A524" },
  textArea: { marginTop: spacing.xl, backgroundColor: customerTheme.colors.surface, borderWidth: 1, borderColor: customerTheme.colors.border, borderRadius: radius.md, padding: spacing.md, minHeight: 80, ...typography.body, color: customerTheme.colors.textPrimary },
  submitButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.xl },
  submitLabel: { ...typography.button, color: "#fff" },
});
