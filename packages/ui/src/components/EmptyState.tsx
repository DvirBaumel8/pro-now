import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { typography, spacing } from "../theme";

/**
 * Every list needs an honest empty state — see /docs/03-DESIGN-SYSTEM.md
 * §Component states. Never render a spinner forever instead of this.
 */
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, alignItems: "center" },
  title: { ...typography.bodyStrong, textAlign: "center" },
  subtitle: { ...typography.caption, textAlign: "center", marginTop: spacing.xs },
});
