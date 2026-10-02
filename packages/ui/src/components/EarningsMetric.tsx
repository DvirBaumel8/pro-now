import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { formatMoney, type Money } from "@pro-now/types";
import { typography } from "../theme";

/**
 * Never hide deductions — see /docs/02-UX-FLOWS.md P22 and
 * /docs/03-DESIGN-SYSTEM.md. Used for both the customer price card and the
 * professional earnings screen.
 */
export function EarningsMetric({
  label,
  amount,
  dark = false,
}: {
  label: string;
  amount: Money;
  dark?: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={[styles.value, { color: dark ? "#F3F5F3" : "#14151A" }]}>
        {formatMoney(amount)}
      </Text>
      <Text style={[styles.label, { color: dark ? "#9AA39C" : "#5B5F57" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "flex-end" },
  value: { ...typography.numericMetric },
  label: { ...typography.caption, marginTop: 2 },
});
