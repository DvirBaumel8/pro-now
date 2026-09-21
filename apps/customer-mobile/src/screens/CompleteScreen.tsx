import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { JobView } from "@pro-now/types";
import { JobCompleteBody, catalogHomeServices, customerDarkTheme, type ReceiptLine } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useJobWatch } from "../api/useJobWatch";

type Props = NativeStackScreenProps<CustomerStackParamList, "Complete">;

/**
 * C14 — the job is done.
 *
 * ---------------------------------------------------------------------
 * THE WORST SENTENCE IN THE REPOSITORY
 * ---------------------------------------------------------------------
 * This screen said "סה״כ שולם ₪300 · ✓ התשלום עבר בהצלחה" — a total, and
 * a tick, and the words "the payment went through successfully" — written
 * into the component, in an app with no payment provider. Choosing one is
 * still an open business decision (/CLAUDE.md §4), so there was nothing at
 * all behind that tick.
 *
 * It is the worst kind of wrong this product can be. A customer told their
 * card was charged stops watching for the charge, and they are the only
 * person who would ever have noticed it did not arrive.
 *
 * ---------------------------------------------------------------------
 * WHAT IT SAYS NOW
 * ---------------------------------------------------------------------
 * The amount is real: it is the quote this customer approved, which is a
 * number they agreed to and the server holds. What changed is the tense.
 * Until the job reaches PAYMENT_CAPTURED the heading is "סיכום לתשלום",
 * the total is labelled "לתשלום", and the payment line says "טרם בוצע
 * חיוב" rather than promising a method will appear.
 *
 * `paymentCaptured` is driven by the job's own state machine
 * (/docs/07-JOB-STATE-MACHINE.md), which is the only thing in the system
 * entitled to say that money moved.
 */
export function CompleteScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { width, height } = useWindowDimensions();
  const { status, match } = useJobWatch(jobId);

  const [job, setJob] = useState<JobView | null>(null);
  const [reviewed, setReviewed] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getJob(jobId)
      .then(({ job: j }) => {
        if (alive) setJob(j);
      })
      .catch(() => {
        /* Unknown, not empty. */
      });
    return () => {
      alive = false;
    };
  }, [jobId]);

  /**
   * The receipt, from the quote the customer approved.
   *
   * Not from a price fixture and not from the service's price hint. The
   * only line items this screen may show are the ones somebody actually
   * agreed to, item by item — which is also why an unapproved job shows
   * no receipt rather than the pending quote's numbers.
   */
  const approved = useMemo(() => {
    if (!job?.approvedQuoteId) return null;
    return job.quotes?.find((q) => q.id === job.approvedQuoteId) ?? null;
  }, [job]);

  const receiptLines: ReceiptLine[] = useMemo(() => {
    if (!approved) return [];
    return approved.lineItems.map((li) => ({
      id: li.id,
      labelHe: li.quantity > 1 ? `${li.description} ×${li.quantity}` : li.description,
      amountMinorUnits: li.unitPriceMinorUnits * li.quantity,
    }));
  }, [approved]);

  /*
   * Only the state machine may say the money moved.
   */
  const paymentCaptured = status === "PAYMENT_CAPTURED" || status === "CLOSED";

  /**
   * When it happened, assembled from the job's own events.
   *
   * Empty when the events are not expanded, and the body then shows
   * nothing rather than "today" — a date is a fact, and a plausible one is
   * still a guess.
   */
  const whenHe = useMemo(() => {
    const done = job?.events?.find((e) => e.type === "JOB_COMPLETED" || e.type === "COMPLETED");
    const at = done?.createdAt ?? job?.updatedAt;
    if (!at) return "";
    const d = new Date(at);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString("he-IL")} · ${d.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [job]);

  const mark = useMemo(
    () => catalogHomeServices.find((s) => s.id === job?.serviceId)?.mark ?? "plumbing",
    [job]
  );

  const onSubmitReview = useCallback(
    async (rating: number, text: string) => {
      try {
        await api.submitReview(jobId, { overallRating: rating, text: text.trim() || undefined });
        // Closing the form is the server's answer, not an optimistic guess:
        // it only happens after the request actually succeeded.
        setReviewed(rating);
      } catch (err) {
        const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
        Alert.alert("הדירוג לא נשלח", message);
      }
    },
    [jobId]
  );

  if (!job || !match) {
    return <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <JobCompleteBody
        serviceNameHe={match.serviceNameHe}
        mark={mark}
        professionalDisplayName={match.professional.displayName}
        professionalPhotoUrl={match.professional.profilePhotoUrl}
        whenHe={whenHe}
        receiptLines={receiptLines}
        totalChargedMinorUnits={approved?.totalMinorUnits ?? 0}
        paymentCaptured={paymentCaptured}
        /*
         * Null, not a card. The client never holds a payment instrument,
         * and there is no provider to have taken one — the body renders
         * the honest line for whichever tense applies.
         */
        paymentMethodLabelHe={null}
        existingRating={reviewed}
        onSubmitReview={onSubmitReview}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
