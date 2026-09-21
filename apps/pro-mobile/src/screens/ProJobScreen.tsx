import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ProJobDetailView } from "@pro-now/types";
import { ProJobBody, catalogHomeServices, proTheme, type MarkName } from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "Job">;

const POLL_MS = 4000;

/**
 * P17–P21 — the assigned job, start to finish.
 *
 * ---------------------------------------------------------------------
 * THREE SCREENS BECAME ONE, AND WHY THAT IS NOT A REFACTOR
 * ---------------------------------------------------------------------
 * There were three: Navigation, ActiveService and Complete. Each held its
 * own step of the job, and each decided for itself when to move on — which
 * meant the job's state lived in the navigation stack rather than on the
 * server. `ProJobBody` takes the status and derives the one forward move
 * that is legal from it, so the screen cannot offer a step the state
 * machine would refuse.
 *
 * ---------------------------------------------------------------------
 * WHAT THOSE THREE SCREENS CLAIMED
 * ---------------------------------------------------------------------
 * "מלצ׳ט 19, תל אביב" and "ETA: 8 דקות" — the same street and the same
 * eight minutes to every professional on every job. And a quote form
 * pre-filled with "עבודה: החלפת סיפון ₪220" and "חלקים: סיפון חדש ₪80",
 * whatever the trade: a dog groomer quoting a siphon replacement.
 *
 * ---------------------------------------------------------------------
 * AND THE PATTERN UNDERNEATH ALL THREE
 * ---------------------------------------------------------------------
 *     try { await api.arrive(jobId); } catch { /* demo fallback *\/ }
 *     setArrived(true);
 *
 * Every one of them advanced the screen whether or not the server agreed.
 * A professional could mark themselves arrived, quote, and complete a job
 * that, on the server, they had never left for. /CLAUDE.md §6: client-held
 * state is never job-state truth. A failed call now stops and says so, and
 * the status comes back from the server rather than from a `useState`.
 */
export function ProJobScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { width, height } = useWindowDimensions();

  const [job, setJob] = useState<ProJobDetailView | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api.getProJob(jobId);
      setJob(next);
      return next;
    } catch {
      /* Keep what we had. A blip is not a state change. */
      return null;
    }
  }, [jobId]);

  /*
   * Polled, because the CUSTOMER moves this job too: approving a quote is
   * their action, and the professional's screen has to notice it. The one
   * state where there is no button to press is exactly the state where
   * something has to be watched.
   */
  useEffect(() => {
    let alive = true;
    void load();
    const id = setInterval(() => {
      if (alive) void load();
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load]);

  useEffect(() => {
    // Done is done; the shift screen is where the next call arrives.
    if (job && (job.status === "COMPLETION_PENDING" || job.status === "COMPLETED")) {
      navigation.replace("Offline");
    }
  }, [job, navigation]);

  const mark = useMemo(
    () => catalogHomeServices.find((s) => s.id === job?.serviceId)?.mark ?? ("handyman" as MarkName),
    [job]
  );

  /**
   * ONE FORWARD MOVE, CHOSEN BY THE STATUS.
   *
   * The body already knows which action is legal from each state; this
   * maps that to the endpoint that performs it. If the server refuses —
   * because the job moved underneath us, or because the transition is not
   * allowed — nothing advances and the professional is told.
   */
  const onAdvance = useCallback(() => {
    void (async () => {
      if (!job || busy) return;
      setBusy(true);
      try {
        switch (job.status) {
          case "PRO_ASSIGNED":
            await api.depart(job.jobId);
            break;
          case "PRO_EN_ROUTE":
            await api.arrive(job.jobId);
            break;
          case "PRO_ARRIVED":
            await api.startService(job.jobId);
            break;
          case "IN_PROGRESS":
            await api.complete(job.jobId);
            break;
          default:
            return;
        }
        // The new status from the server, not one assumed here.
        await load();
      } catch (err) {
        const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
        Alert.alert("הפעולה לא נקלטה", message);
      } finally {
        setBusy(false);
      }
    })();
  }, [job, busy, load]);

  const onSendQuote = useCallback(() => {
    /*
     * The quote builder is its own screen, because writing a price is not
     * a button. What it must NOT do is what the old one did: pre-fill
     * "החלפת סיפון ₪220" for every trade in the marketplace.
     */
    if (job) navigation.navigate("Quote", { jobId: job.jobId, serviceNameHe: job.serviceNameHe });
  }, [job, navigation]);

  if (!job) {
    return <View style={{ flex: 1, backgroundColor: proTheme.colors.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: proTheme.colors.bg }}>
      <ProJobBody
        status={job.status}
        serviceNameHe={job.serviceNameHe}
        mark={mark}
        addressHe={job.addressHe}
        accessNoteHe={job.accessNoteHe}
        routeEtaMinutes={job.routeEtaMinutes}
        /*
         * Straight-line distance is not a route, and there is no router
         * here. Null omits the line rather than printing a number that
         * would be read as driving distance.
         */
        distanceHe={null}
        customerNameHe={job.customerNameHe}
        customerSeed={job.jobId}
        symptomsHe={[]}
        descriptionHe={job.descriptionHe}
        media={[]}
        payoutMinorUnits={job.payoutMinorUnits}
        payoutIsEstimate={job.payoutIsEstimate}
        onAdvance={onAdvance}
        onSendQuote={onSendQuote}
        width={width}
        height={height}
      />
    </View>
  );
}
