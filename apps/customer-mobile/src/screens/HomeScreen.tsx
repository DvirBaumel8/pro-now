import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, I18nManager } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

// Force RTL layout — Hebrew-first per /docs/03-DESIGN-SYSTEM.md §RTL.
I18nManager.allowRTL(true);

type Props = NativeStackScreenProps<CustomerStackParamList, "Home">;

/**
 * C04 — Home. See /docs/02-UX-FLOWS.md.
 * Hero "מה צריך עכשיו?", active departments only, honest "available now"
 * count — never fabricated.
 */
export function HomeScreen({ navigation }: Props) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCatalog()
      .then((res) => setDepartments(res.departments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>בוקר טוב 👋</Text>
      <View style={styles.addressRow}>
        <Text style={styles.addressPin}>📍</Text>
        <Text style={styles.addressText}>הבית · תל אביב</Text>
      </View>

      <Text style={styles.hero}>מה צריך עכשיו?</Text>

      <TextInput
        style={styles.search}
        placeholder="חפש שירות… למשל 'תלו לי טלוויזיה'"
        placeholderTextColor={customerTheme.colors.textSecondary}
        textAlign="right"
      />

      {loading && <Text style={styles.muted}>טוען שירותים זמינים…</Text>}
      {error && <Text style={styles.errorText}>לא הצלחנו לטעון את הקטלוג כרגע. {error}</Text>}
      {!loading && !error && departments.length === 0 && (
        <Text style={styles.muted}>אין עדיין שירותים פעילים באזור שלך.</Text>
      )}

      <View style={styles.grid}>
        {departments.map((dept) => (
          <TouchableOpacity
            key={dept.code}
            style={styles.deptTile}
            onPress={() => navigation.navigate("ServiceSelect", { departmentCode: dept.code })}
            accessibilityRole="button"
            accessibilityLabel={dept.nameHe}
          >
            <Text style={styles.deptLabel}>{dept.nameHe}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.nowBanner}>
        <Text style={styles.nowBannerTitle}>⚡ צריך מישהו עכשיו?</Text>
        <Text style={styles.nowBannerSubtitle}>אנשי מקצוע זמינים כרגע באזור שלך</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  greeting: { ...typography.h2, color: customerTheme.colors.textPrimary, textAlign: "right" },
  addressRow: { flexDirection: "row-reverse", alignItems: "center", marginTop: spacing.xs, gap: 4 },
  addressPin: { fontSize: 14 },
  addressText: { ...typography.caption, color: customerTheme.colors.textSecondary },
  hero: { ...typography.display, color: customerTheme.colors.textPrimary, textAlign: "right", marginTop: spacing.lg },
  search: {
    marginTop: spacing.md,
    backgroundColor: customerTheme.colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: customerTheme.colors.border,
    padding: spacing.md,
    ...typography.body,
    color: customerTheme.colors.textPrimary,
  },
  muted: { ...typography.caption, color: customerTheme.colors.textSecondary, textAlign: "right", marginTop: spacing.md },
  errorText: { ...typography.caption, color: customerTheme.colors.statusDanger, textAlign: "right", marginTop: spacing.md },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.lg },
  deptTile: {
    width: "47%",
    backgroundColor: customerTheme.colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: customerTheme.colors.border,
    padding: spacing.lg,
  },
  deptLabel: { ...typography.bodyStrong, color: customerTheme.colors.textPrimary, textAlign: "right" },
  nowBanner: {
    marginTop: spacing.xl,
    backgroundColor: "rgba(23,201,100,0.10)",
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  nowBannerTitle: { ...typography.bodyStrong, color: customerTheme.colors.action, textAlign: "right" },
  nowBannerSubtitle: { ...typography.caption, color: customerTheme.colors.textSecondary, textAlign: "right", marginTop: 4 },
});
