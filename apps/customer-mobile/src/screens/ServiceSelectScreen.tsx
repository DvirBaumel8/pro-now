import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CustomerStackParamList, "ServiceSelect">;

/**
 * C05 — Department/Service. See /docs/02-UX-FLOWS.md. Includes the
 * mandatory "לא יודע מה הבעיה" path — a customer is never required to
 * self-diagnose.
 */
export function ServiceSelectScreen({ navigation }: Props) {
  const problems = ["סתימה", "נזילה", "ברז / כיור", "אסלה", "דוד / מים", "התקנה", "לא יודע מה הבעיה"];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>במה אפשר לעזור?</Text>
      <FlatList
        data={problems}
        keyExtractor={(item) => item}
        contentContainerStyle={{ gap: spacing.sm }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("RequestDetails", { serviceId: "HOME_PLUMB_BLOCK", serviceName: item })}
            accessibilityRole="button"
          >
            <Text style={styles.rowLabel}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg, padding: spacing.lg },
  title: { ...typography.h1, color: customerTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  row: { backgroundColor: customerTheme.colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: customerTheme.colors.border, padding: spacing.lg },
  rowLabel: { ...typography.body, color: customerTheme.colors.textPrimary, textAlign: "right" },
});
