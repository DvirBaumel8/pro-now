import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { formatMoney, money } from "@pro-now/types";
import { proTheme, radii, spacing, type as t } from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Quote">;

interface DraftLine {
  id: string;
  description: string;
  /** Shekels as typed. Converted to minor units once, on send. */
  amount: string;
}

/**
 * P19 — writing the price.
 *
 * ---------------------------------------------------------------------
 * WHAT IT USED TO OPEN WITH
 * ---------------------------------------------------------------------
 * Two lines, pre-filled, for every professional in every trade:
 *
 *     עבודה: החלפת סיפון   ₪220
 *     חלקים: סיפון חדש     ₪80
 *
 * A dog groomer quoting a siphon replacement. Worse than absurd: a
 * pre-filled price is a suggested price, and suggesting ₪300 to every
 * professional in the marketplace is the platform quietly setting the
 * rate while appearing to leave it to them.
 *
 * It opens empty now. The professional writes what they are charging for,
 * which is the only thing they can write that is true.
 *
 * ---------------------------------------------------------------------
 * AND IT SENDS BEFORE IT NAVIGATES
 * ---------------------------------------------------------------------
 * The old screen sent the quote in a `try`, swallowed the failure in a
 * `catch { /* demo fallback *\/ }`, and moved to the completion screen in
 * a `finally` — so a quote that never reached the server left the
 * professional believing the customer was reading it. They would wait,
 * and then follow up about a price nobody had been shown.
 */
export function ProQuoteScreen({ route, navigation }: Props) {
  const { jobId, serviceNameHe } = route.params;

  const [lines, setLines] = useState<DraftLine[]>([
    { id: "l1", description: "", amount: "" },
  ]);
  const [sending, setSending] = useState(false);

  const update = (id: string, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const totalMinor = lines.reduce((sum, l) => {
    const shekels = Number(l.amount.replace(/[^\d.]/g, ""));
    return sum + (Number.isFinite(shekels) ? Math.round(shekels * 100) : 0);
  }, 0);

  const ready = lines.some((l) => l.description.trim().length > 1 && Number(l.amount) > 0);

  const onSend = useCallback(() => {
    void (async () => {
      if (sending || !ready) return;
      const items = lines
        .filter((l) => l.description.trim().length > 1 && Number(l.amount) > 0)
        .map((l) => ({
          description: l.description.trim(),
          quantity: 1,
          // One conversion, at the edge. Shekels never travel.
          unitPriceMinorUnits: Math.round(Number(l.amount) * 100),
        }));

      setSending(true);
      try {
        await api.sendQuote(jobId, items);
        /*
         * Back to the job, which will poll and find itself in
         * WAITING_QUOTE_APPROVAL — the state with no button, because the
         * next move is the customer's.
         */
        navigation.replace("Job", { jobId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
        // No navigation. The customer has not seen anything.
        Alert.alert("ההצעה לא נשלחה", message);
      } finally {
        setSending(false);
      }
    })();
  }, [sending, ready, lines, jobId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הצעת מחיר</Text>
      <Text style={styles.sub}>{serviceNameHe}</Text>

      <ScrollView contentContainerStyle={{ gap: spacing.sm, marginTop: spacing.lg }}>
        {lines.map((l) => (
          <View key={l.id} style={styles.lineItem}>
            <TextInput
              style={styles.priceInput}
              value={l.amount}
              onChangeText={(v) => update(l.id, { amount: v })}
              keyboardType="numeric"
              placeholder="₪"
              placeholderTextColor={proTheme.colors.textSecondary}
              textAlign="right"
              accessibilityLabel="מחיר"
            />
            <TextInput
              style={styles.descInput}
              value={l.description}
              onChangeText={(v) => update(l.id, { description: v })}
              placeholder="על מה החיוב"
              placeholderTextColor={proTheme.colors.textSecondary}
              textAlign="right"
              accessibilityLabel="תיאור"
            />
          </View>
        ))}

        <Pressable
          onPress={() =>
            setLines((prev) => [...prev, { id: `l${prev.length + 1}`, description: "", amount: "" }])
          }
          accessibilityRole="button"
          style={styles.addRow}
        >
          <Text style={styles.addLabel}>+ שורה נוספת</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>{formatMoney(money(totalMinor, "ILS"))}</Text>
        <Text style={styles.totalLabel}>סה״כ</Text>
      </View>

      <Pressable
        style={[styles.sendButton, (!ready || sending) && { opacity: 0.5 }]}
        onPress={onSend}
        disabled={!ready || sending}
        accessibilityRole="button"
      >
        <Text style={styles.sendLabel}>{sending ? "שולח…" : "שלח לאישור"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, paddingTop: spacing.xxl },
  title: { ...t.h1, color: proTheme.colors.textPrimary, textAlign: "right" },
  sub: { ...t.body, color: proTheme.colors.textSecondary, textAlign: "right" },
  lineItem: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  descInput: {
    flex: 1,
    backgroundColor: proTheme.colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: proTheme.colors.textPrimary,
    borderWidth: 1,
    borderColor: proTheme.colors.border,
  },
  priceInput: {
    width: 96,
    backgroundColor: proTheme.colors.surface,
    borderRadius: radii.sm,
    padding: spacing.sm,
    color: proTheme.colors.textPrimary,
    borderWidth: 1,
    borderColor: proTheme.colors.border,
  },
  addRow: { paddingVertical: spacing.sm, alignItems: "flex-end" },
  addLabel: { ...t.caption, color: proTheme.colors.textSecondary },
  totalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: proTheme.colors.border,
    paddingTop: spacing.md,
  },
  totalLabel: { ...t.h2, color: proTheme.colors.textPrimary },
  totalValue: { ...t.h2, color: proTheme.colors.textPrimary },
  sendButton: {
    backgroundColor: proTheme.colors.action,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  sendLabel: { ...t.bodyStrong, color: "#03130A" },
});
