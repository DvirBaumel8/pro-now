import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { pilotServiceById, pilotServiceIdForDatabaseCode } from "@pro-now/types";
import {
  ProEarningsBody,
  proTheme,
  spacing,
  type as t,
  type EarningDay,
  type EarningJob,
  type MarkName,
} from "@pro-now/ui";

import { api } from "../api/client";
import type { ProStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProStackParamList, "Earnings">;

/**
 * P22 — what was earned, and every deduction named.
 *
 * ---------------------------------------------------------------------
 * THE SCREEN THE GALLERY AUDITS AND THE PHONE DID NOT SHOW
 * ---------------------------------------------------------------------
 * `ProEarningsBody` has existed in `packages/ui` throughout: designed,
 * covered by the type-scale check, and walked every run by
 * `verify:a11y` as `pro-earnings`. This screen rendered its own layout
 * from tokens instead, so the audited screen and the shipped screen were
 * different code and only one of them was ever measured. §15 records the
 * same split being closed on the customer side; this is the professional
 * half of it.
 *
 * (The version before that is worth remembering, because the shared body
 * exists to make it impossible: `נטו השבוע ₪1,680` when the request
 * failed, and `עמלת פלטפורמה −₪420` — a flat twenty per cent shown to
 * every professional when the commission is an open business decision.)
 *
 * ---------------------------------------------------------------------
 * WHAT THIS FILE DOES AND DOES NOT DECIDE
 * ---------------------------------------------------------------------
 * It translates and nothing else. The money, the deductions and the days
 * come from `/v1/pro/earnings`, which derives them from `ledger_entries`
 * and never from a percentage. What is done here is the part that is
 * genuinely the client's: a weekday letter for a date, and the right mark
 * beside a service.
 *
 * A null net is carried through as null. The body renders "בחישוב" for
 * it, because ₪0.00 would tell somebody who worked all week that they
 * earned nothing.
 */

/** Sunday-first, matching the Hebrew week the bar chart is drawn for. */
const WEEKDAY_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"] as const;

/**
 * The icon beside a job.
 *
 * The server answers in database service codes; every customer-facing
 * fact about a service, the mark included, is keyed by the pilot
 * catalogue's id. `handyman` is the fallback because it is the catalogue's
 * own word for unspecified work, not because it is a safe-looking
 * default — a wrong-but-plausible icon is worse than a generic one.
 */
function markFor(databaseCode: string): MarkName {
  const pilotId = pilotServiceIdForDatabaseCode(databaseCode);
  const mark = pilotId ? pilotServiceById[pilotId]?.mark : undefined;
  return (mark as MarkName | undefined) ?? "handyman";
}

function whenHe(iso: string, now: Date): string {
  const at = new Date(iso);
  const time = at.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const sameDay = at.toDateString() === now.toDateString();
  if (sameDay) return `היום · ${time}`;
  const yesterday = new Date(now.getTime() - 86_400_000);
  if (at.toDateString() === yesterday.toDateString()) return `אתמול · ${time}`;
  return `${WEEKDAY_HE[at.getDay()]} · ${time}`;
}

interface Breakdown {
  currency: string;
  periodGrossMinorUnits: number;
  periodNetMinorUnits: number | null;
  periodJobCount: number;
  days: { dateISO: string; netMinorUnits: number | null; jobs: number }[];
  jobs: {
    jobId: string;
    serviceCode: string;
    serviceNameHe: string;
    completedAt: string;
    grossMinorUnits: number;
    deductions: { code: string; labelHe: string; minorUnits: number }[];
    netMinorUnits: number | null;
  }[];
  awaitingCommissionDecision: boolean;
}

export function EarningsScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getEarnings()
      .then((res) => {
        if (!alive) return;
        const b = (res as { breakdown?: Breakdown }).breakdown;
        if (b) setBreakdown(b);
        else setFailed(true);
      })
      .catch(() => {
        // Unknown says unknown. The screen this replaced fell back to
        // ₪1,680, so a professional with no earnings and no network saw a
        // comfortable number.
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  const days: EarningDay[] = useMemo(
    () =>
      (breakdown?.days ?? []).map((d) => {
        const date = new Date(d.dateISO);
        return {
          labelHe: WEEKDAY_HE[date.getDay()] ?? "",
          netMinorUnits: d.netMinorUnits,
          jobs: d.jobs,
          isToday: date.toDateString() === now.toDateString(),
        };
      }),
    [breakdown, now]
  );

  const jobs: EarningJob[] = useMemo(
    () =>
      (breakdown?.jobs ?? []).map((j) => ({
        id: j.jobId,
        serviceNameHe: j.serviceNameHe,
        mark: markFor(j.serviceCode),
        whenHe: whenHe(j.completedAt, now),
        grossMinorUnits: j.grossMinorUnits,
        deductions: j.deductions.map((d) => ({ labelHe: d.labelHe, minorUnits: d.minorUnits })),
        netMinorUnits: j.netMinorUnits,
      })),
    [breakdown, now]
  );

  if (failed) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: proTheme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl,
        }}
      >
        <Text style={{ ...t.body, color: proTheme.colors.textSecondary, textAlign: "center" }}>
          לא הצלחנו לטעון את ההכנסות כרגע. הסכומים שמורים בשרת ולא אבדו.
        </Text>
      </View>
    );
  }

  if (!breakdown) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: proTheme.colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={proTheme.colors.trust} />
      </View>
    );
  }

  return (
    <ProEarningsBody
      width={width}
      height={height}
      periodLabelHe="שבעת הימים האחרונים"
      periodNetMinorUnits={breakdown.periodNetMinorUnits}
      periodGrossMinorUnits={breakdown.periodGrossMinorUnits}
      periodJobCount={breakdown.periodJobCount}
      days={days}
      jobs={jobs}
      /*
       * Nothing schedules a payout yet — the Payout table exists and no
       * code writes to it. Null hides the line rather than promising a
       * date, which is the one thing on this screen a professional would
       * plan their month around.
       */
      nextPayoutHe={null}
      nextPayoutMinorUnits={null}
      onOpenJob={(id) => navigation.navigate("Job", { jobId: id })}
      onBack={() => navigation.goBack()}
    />
  );
}
