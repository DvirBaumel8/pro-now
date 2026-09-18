import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { proTheme, typography, spacing, radius } from "@pro-now/ui";
import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Offer">;

const OFFER_TIMEOUT_SECONDS = 30; // server-configured; see /docs/08-DISPATCH-ENGINE.md

/**
 * P16 — Offer. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §22: "את/ה מקבל/ת ₪X" is the most prominent
 * money line. The countdown here is a UI convenience only — the server's
 * `expires_at` on the DispatchOffer is the real authority
 * (/docs/08-DISPATCH-ENGINE.md: "never trusted from the client's countdown").
 */
export function OfferScreen({ route, navigation }: Props) {
  const { offerId } = route.params;
  const [secondsLeft, setSecondsLeft] = useState(OFFER_TIMEOUT_SECONDS);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          navigation.replace("Online");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigation]);

  async function respond(action: "accept" | "skip") {
    setResponding(true);
    try {
      if (action === "accept") {
        await api.acceptOffer(offerId);
        navigation.replace("Navigation", { jobId: "demo-job" });
      } else {
        await api.skipOffer(offerId);
        navigation.replace("Online");
      }
    } catch {
      // OFFER_NO_LONGER_AVAILABLE or a network error — return to Online
      // rather than leaving the professional stuck on a dead offer.
      navigation.replace("Online");
    } finally {
      setResponding(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.countdownRing}>
        <Text style={styles.countdownValue}>{secondsLeft}</Text>
      </View>

      <Text style={styles.serviceTitle}>נזילה מתחת לכיור</Text>
      <Text style={styles.meta}>📍 8 דקות ממך · תמונות: 3</Text>
      <Text style={styles.customerNote}>"כשפותחים את הברז יוצאים מים מלמטה."</Text>

      <View style={styles.payoutCard}>
        <Text style={styles.payoutLabel}>את/ה מקבל/ת</Text>
        <Text style={styles.payoutValue}>₪161</Text>
        <Text style={styles.payoutSub}>מחיר ללקוח ₪179 · עמלת פלטפורמה ₪18</Text>
      </View>

      <TouchableOpacity style={styles.acceptButton} onPress={() => respond("accept")} disabled={responding} accessibilityRole="button">
        <Text style={styles.acceptLabel}>קבל עבודה</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skipButton} onPress={() => respond("skip")} disabled={responding} accessibilityRole="button">
        <Text style={styles.skipLabel}>דלג</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, alignItems: "center", justifyContent: "center" },
  countdownRing: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: proTheme.colors.action, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  countdownValue: { ...typography.h2, color: proTheme.colors.textPrimary },
  serviceTitle: { ...typography.h1, color: proTheme.colors.textPrimary, textAlign: "center" },
  meta: { ...typography.body, color: proTheme.colors.textSecondary, marginTop: spacing.xs },
  customerNote: { ...typography.caption, color: proTheme.colors.textSecondary, marginTop: spacing.md, textAlign: "center", fontStyle: "italic" },
  payoutCard: { backgroundColor: proTheme.colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: "center", marginTop: spacing.xl, alignSelf: "stretch" },
  payoutLabel: { ...typography.caption, color: proTheme.colors.textSecondary },
  payoutValue: { ...typography.display, color: proTheme.colors.action, marginTop: 4 },
  payoutSub: { ...typography.caption, color: proTheme.colors.textSecondary, marginTop: 4 },
  acceptButton: { backgroundColor: proTheme.colors.action, borderRadius: radius.md, padding: spacing.lg, alignItems: "center", marginTop: spacing.xl, alignSelf: "stretch" },
  acceptLabel: { ...typography.button, color: "#03130A" },
  skipButton: { padding: spacing.md, alignItems: "center" },
  skipLabel: { ...typography.body, color: proTheme.colors.textSecondary },
});
