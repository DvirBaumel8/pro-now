import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { OfferCardView } from "@pro-now/types";
import { OfferCard, OfferCardSkeleton, proTheme, spacing, typography } from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { ApiError, api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Offer">;

/**
 * P16 — Incoming offer. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §22.
 *
 * Two defects in the previous version are fixed here and are worth naming,
 * because both were cases of the client deciding something only the server
 * may decide (/CLAUDE.md §3):
 *
 *  1. It counted down from a hard-coded `OFFER_TIMEOUT_SECONDS = 30` and
 *     navigated away when its own timer hit zero. The offer's real deadline
 *     is `DispatchOffer.expiresAt`, which the server issues and which the
 *     admin-configurable dispatch timeout can change at any time. The card
 *     now counts down to the server's `expiresAt`, and an expired countdown
 *     only disables the actions — the server still decides the outcome.
 *  2. On a successful accept it navigated with a literal `"demo-job"` id
 *     instead of the `jobId` the accept response returns, so the next
 *     screen would have loaded the wrong job.
 */
export function OfferScreen({ route, navigation }: Props) {
  const { offerId } = route.params;

  const [offer, setOffer] = useState<OfferCardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .getCurrentOffer()
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          // No live offer any more — the server has already moved on.
          navigation.replace("Offline");
          return;
        }
        setOffer(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
      });

    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const handleAccept = useCallback(async () => {
    setResponding(true);
    try {
      const result = await api.acceptOffer(offer?.offerId ?? offerId);
      // Navigate with the jobId the SERVER returned, never a local guess.
      navigation.replace("Job", { jobId: result.jobId });
    } catch (err) {
      /*
       * A REFUSAL AND A LOST CONNECTION ARE OPPOSITE FACTS.
       *
       * Both used to bounce the professional silently back to the shift
       * screen. A refusal is fine to do that with — somebody else took the
       * job and there is nothing to tell them beyond that.
       *
       * A transport failure is not. The accept may well have SUCCEEDED and
       * only the answer was lost, in which case the professional is
       * assigned to a job they do not know about, sitting on the shift
       * screen waiting for offers while a customer waits for them at a
       * door. That is the worst outcome in the product and it was
       * indistinguishable from the ordinary one.
       *
       * So the unknown case says it is unknown and offers to look again,
       * and it does not navigate away from the decision on its own.
       */
      if (err instanceof ApiError && err.unreachable) {
        Alert.alert(
          "לא קיבלנו תשובה",
          "ייתכן שהעבודה כבר שלך וייתכן שלא. אל תצא מהמשמרת — נבדוק שוב.",
          [
            { text: "בדיקה שוב", onPress: () => void handleAccept() },
            { text: "חזרה למשמרת", onPress: () => navigation.replace("Offline") },
          ]
        );
        return;
      }
      // OFFER_NO_LONGER_AVAILABLE or an expiry: somebody else has it.
      navigation.replace("Offline");
    } finally {
      setResponding(false);
    }
  }, [navigation, offer, offerId]);

  const handleSkip = useCallback(async () => {
    setResponding(true);
    try {
      await api.skipOffer(offer?.offerId ?? offerId);
    } catch {
      // A failed skip is not worth blocking on; the offer expires anyway.
    } finally {
      setResponding(false);
      navigation.replace("Offline");
    }
  }, [navigation, offer, offerId]);

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateTitle}>לא הצלחנו לטעון את ההצעה</Text>
        <Text style={styles.stateDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {offer ? (
        <OfferCard offer={offer} onAccept={handleAccept} onSkip={handleSkip} responding={responding} />
      ) : (
        <OfferCardSkeleton />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: proTheme.colors.bg,
  },
  stateTitle: {
    ...typography.h2,
    color: proTheme.colors.textPrimary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  stateDetail: {
    ...typography.caption,
    color: proTheme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
