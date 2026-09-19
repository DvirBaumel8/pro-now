import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { JobMatchView } from "@pro-now/types";
import { MatchCard, MatchCardSkeleton, customerTheme, spacing, typography } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "Match">;

/**
 * C09 — Match found. See /docs/02-UX-FLOWS.md and
 * /docs/03-DESIGN-SYSTEM.md §10.
 *
 * This screen is a data screen and nothing more: it fetches
 * `GET /v1/jobs/:id/match` and hands the result to `MatchCard`. It holds no
 * copy of the professional, the ETA or the price, so there is nowhere for a
 * hard-coded value to live.
 *
 * (An earlier version fetched the job and then rendered an invented
 * professional, rating, ETA and visit fee — the exact failure
 * /CLAUDE.md §3 exists to prevent. See /docs/EPIC-0-REPORT.md §9.8.)
 */
export function MatchScreen({ route, navigation }: Props) {
  const { jobId } = route.params;

  const [match, setMatch] = useState<JobMatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .getMatch(jobId)
      .then((result) => {
        if (!cancelled) {
          setMatch(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "שגיאה לא צפויה");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleConfirm = useCallback(() => {
    setConfirming(true);
    navigation.replace("Tracking", { jobId });
  }, [navigation, jobId]);

  const handleRequestAnother = useCallback(() => {
    navigation.replace("Searching", { jobId });
  }, [navigation, jobId]);

  if (error) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateTitle}>לא הצלחנו לטעון את פרטי ההתאמה</Text>
        <Text style={styles.stateDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {match ? (
        <MatchCard
          match={match}
          onConfirm={handleConfirm}
          onRequestAnother={handleRequestAnother}
          confirming={confirming}
        />
      ) : (
        <MatchCardSkeleton />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: customerTheme.colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  stateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: customerTheme.colors.bg,
  },
  stateTitle: {
    ...typography.h2,
    color: customerTheme.colors.textPrimary,
    textAlign: "center",
    writingDirection: "rtl",
  },
  stateDetail: {
    ...typography.caption,
    color: customerTheme.colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
