import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { customerTheme, typography, spacing, radius, VerificationBadge } from "@pro-now/ui";
import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "Match">;

/**
 * C09 — Match found. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §10 Match card: real photo, factual badges,
 * ETA visually dominant, price/visit fee, never expose precise
 * pre-assignment location beyond necessary UX.
 */
export function MatchScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const [job, setJob] = useState<any | null>(null);

  useEffect(() => {
    api.getJob(jobId).then((res) => setJob(res.job));
  }, [jobId]);

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <Text style={styles.foundBadge}>מצאנו!</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.proRow}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.proInfo}>
            <Text style={styles.proName}>יוסי כהן</Text>
            <View style={styles.badgeRow}>
              <VerificationBadge kind="IDENTITY_VERIFIED" />
            </View>
            <Text style={styles.proMeta}>⭐ 4.9 · 342 עבודות דרך PRO NOW</Text>
          </View>
          <View style={styles.etaBlock}>
            <Text style={styles.etaValue}>12–16</Text>
            <Text style={styles.etaUnit}>דקות</Text>
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>דמי ביקור</Text>
          <Text style={styles.priceValue}>₪179</Text>
        </View>
        <Text style={styles.priceNote}>
          דמי הביקור כוללים הגעה ואבחון. אם נדרשת עבודה נוספת, בעל המקצוע ישלח הצעת מחיר לפני תחילת העבודה.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.replace("Tracking", { jobId })}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonLabel}>הזמן את יוסי</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryAction}>
          <Text style={styles.secondaryActionLabel}>חפש בעל מקצוע אחר</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg },
  mapArea: { flex: 1, backgroundColor: "#EFEDE7", alignItems: "center", justifyContent: "center" },
  foundBadge: { ...typography.h1, color: customerTheme.colors.action },
  card: { backgroundColor: customerTheme.colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  proRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: customerTheme.colors.border },
  proInfo: { flex: 1, alignItems: "flex-end" },
  proName: { ...typography.bodyStrong, color: customerTheme.colors.textPrimary },
  badgeRow: { marginTop: 4 },
  proMeta: { ...typography.caption, color: customerTheme.colors.textSecondary, marginTop: 4 },
  etaBlock: { alignItems: "center" },
  etaValue: { ...typography.numericMetric, color: customerTheme.colors.action },
  etaUnit: { ...typography.caption, color: customerTheme.colors.textSecondary },
  priceRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginTop: spacing.lg },
  priceLabel: { ...typography.body, color: customerTheme.colors.textPrimary },
  priceValue: { ...typography.bodyStrong, color: customerTheme.colors.textPrimary },
  priceNote: { ...typography.caption, color: customerTheme.colors.textSecondary, textAlign: "right", marginTop: spacing.xs },
  primaryButton: { backgroundColor: customerTheme.colors.action, borderRadius: radius.md, padding: spacing.md, alignItems: "center", marginTop: spacing.lg },
  primaryButtonLabel: { ...typography.button, color: "#fff" },
  secondaryAction: { alignItems: "center", padding: spacing.sm },
  secondaryActionLabel: { ...typography.body, color: customerTheme.colors.textSecondary },
});
