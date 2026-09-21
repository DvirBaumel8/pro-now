import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { QuoteView } from "@pro-now/types";
import { QuoteApprovalBody, customerDarkTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useJobWatch } from "../api/useJobWatch";

type Props = NativeStackScreenProps<CustomerStackParamList, "Quote">;

/**
 * C12 — approving an exact version of an exact quote.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SCREEN USED TO APPROVE
 * ---------------------------------------------------------------------
 * Nothing. It listed two line items written into the component —
 * "החלפת סיפון ₪220", "חלקים ₪80" — totalled them to ₪300, and its
 * "אשר עבודה" button navigated to a job called `"demo"`. It sent no
 * request. A customer could press approve on a quote that did not exist
 * and the server would never hear about it.
 *
 * ---------------------------------------------------------------------
 * THE VERSION HASH IS THE POINT
 * ---------------------------------------------------------------------
 * /docs/05-DATABASE.md §Quote versioning: the customer approves an exact
 * version, and the server checks the hash they echo back. That is what
 * stops a quote being edited between the moment somebody reads it and the
 * moment they agree to it — the single most valuable guarantee on this
 * screen, and the one a hard-coded list cannot offer at all, because
 * there is no version to hash.
 *
 * So `onApprove` hands back the hash of the quote that was actually on
 * screen, and if a newer version has landed the body says so rather than
 * letting the approval go through against stale numbers.
 */
export function QuoteScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { width, height } = useWindowDimensions();
  const { match } = useJobWatch(jobId);

  const [quotes, setQuotes] = useState<QuoteView[] | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getJob(jobId)
      .then(({ job }) => {
        if (alive) setQuotes(job.quotes ?? []);
      })
      .catch(() => {
        /* Leave it unknown. An empty quote list and a failed request are
         * different things, and only one of them means "no quote yet". */
      });
    return () => {
      alive = false;
    };
  }, [jobId]);

  /*
   * The newest version is the one that counts, and any version above it
   * is what `supersededByVersion` warns about. Sorting by version rather
   * than by createdAt because the version is the server's ordering and a
   * timestamp is only evidence of it.
   */
  const current = useMemo(() => {
    if (!quotes || quotes.length === 0) return null;
    return [...quotes].sort((a, b) => b.version - a.version)[0];
  }, [quotes]);

  const onApprove = useCallback(
    async (versionHash: string) => {
      if (!current || approving) return;
      setApproving(true);
      try {
        /*
         * The hash of what was on screen, not of what the server holds
         * now. If they disagree the server refuses, which is the entire
         * mechanism — approving "the latest quote" would defeat it.
         */
        await api.approveQuote(
          current.id,
          versionHash,
          `quote_${current.id}_${versionHash.slice(0, 12)}`
        );
        navigation.replace("Tracking", { jobId });
      } catch (err) {
        const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
        Alert.alert("האישור לא נקלט", message);
      } finally {
        setApproving(false);
      }
    },
    [current, approving, jobId, navigation]
  );

  /*
   * No quote, no screen. This is a real state — the professional has not
   * written one yet — and it is not an error. Showing an empty form with
   * a zero total would read as a quote for nothing.
   */
  if (!current || !match) {
    return <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <QuoteApprovalBody
        quote={current}
        serviceNameHe={match.serviceNameHe}
        professionalDisplayName={match.professional.displayName}
        professionalPhotoUrl={match.professional.profilePhotoUrl}
        onApprove={onApprove}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
