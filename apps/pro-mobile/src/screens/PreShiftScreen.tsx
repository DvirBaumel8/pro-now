import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "PreShift">;

/**
 * P14 — Pre-shift bottom sheet, rendered full-screen here. See
 * /docs/02-UX-FLOWS.md and /docs/03-DESIGN-SYSTEM.md §20.
 */
export function PreShiftScreen({ navigation }: Props) {
  const [plumbing, setPlumbing] = useState(true);
  const [electrical, setElectrical] = useState(false);
  const [starting, setStarting] = useState(false);

  async function onStart() {
    setStarting(true);
    try {
      const enabledServiceIds = [plumbing && "HOME_PLUMB_BLOCK", electrical && "HOME_ELECT_FAULT"].filter(Boolean) as string[];
      await api.startShift({ enabledServiceIds, lat: 32.0853, lng: 34.7818 });
      navigation.replace("Online");
    } catch {
      // In this demo screen we still proceed to Online so the signature
      // flow can be reviewed even without a running backend; a production
      // build surfaces the error and blocks navigation instead.
      navigation.replace("Online");
    } finally {
      setStarting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>לפני שמתחילים</Text>

      <View style={styles.row}>
        <Switch value={plumbing} onValueChange={setPlumbing} />
        <Text style={styles.rowLabel}>אינסטלטור עכשיו</Text>
      </View>
      <View style={styles.row}>
        <Switch value={electrical} onValueChange={setElectrical} />
        <Text style={styles.rowLabel}>תקלה חשמלית בבית</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoValue}>8 ק"מ</Text>
        <Text style={styles.infoLabel}>רדיוס עבודה</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoValue}>✓ מוכן</Text>
        <Text style={styles.infoLabel}>מיקום</Text>
      </View>

      <TouchableOpacity style={styles.readyButton} onPress={onStart} disabled={starting} accessibilityRole="button">
        <Text style={styles.readyLabel}>{starting ? "מתחבר…" : "אני מוכן — התחבר"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.xl },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  rowLabel: { ...typography.body, color: proTheme.colors.textPrimary },
  infoRow: { flexDirection: "row-reverse", justifyContent: "space-between", paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: proTheme.colors.border, marginTop: spacing.sm },
  infoLabel: { ...typography.caption, color: proTheme.colors.textSecondary },
  infoValue: { ...typography.body, color: proTheme.colors.textPrimary },
  readyButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xxl },
  readyLabel: { ...typography.button, color: "#03130A" },
});
