import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatMoney, money } from "@pro-now/types";
import { proTheme, radii, spacing, type as t } from "@pro-now/ui";

import { api } from "../api/client";

interface Earnings {
  netMinorUnits: number;
  grossMinorUnits: number | null;
  jobCount: number;
}

/**
 * P22 — what was earned, and nothing else.
 *
 * ---------------------------------------------------------------------
 * WHAT IT SHOWED
 * ---------------------------------------------------------------------
 *     נטו השבוע    money(net ?? 168000)
 *     ברוטו        ₪2,100
 *     עמלת פלטפורמה −₪420
 *     שעות Online  17:20
 *     נטו לשעה     ₪97/שעה
 *
 * Only the first had any connection to the server, and even that fell
 * back to ₪1,680 when the request failed — so a professional with no
 * earnings and no network saw a comfortable number.
 *
 * The commission line is the worst of them. ₪420 on ₪2,100 is twenty per
 * cent, shown to every professional, when the commission percentage is an
 * open business decision (/CLAUDE.md §4). The app was announcing a rate
 * nobody had set, and the professionals reading it would have planned
 * around it.
 *
 * ---------------------------------------------------------------------
 * NEVER HIDE DEDUCTIONS — AND NEVER INVENT THEM
 * ---------------------------------------------------------------------
 * /docs/02-UX-FLOWS.md is right that gross, fees and net must all be
 * visible. The way to honour that is to show all three when the ledger
 * has them and to show none of them when it does not — a subtraction of
 * two recorded facts, never a percentage applied to one.
 *
 * The hours and the per-hour rate are gone entirely: nothing records
 * online time yet, and a rate is a division, so a made-up denominator
 * produces a made-up wage.
 */
export function EarningsScreen() {
  const [data, setData] = useState<Earnings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getEarnings()
      .then((res) => {
        if (alive) setData(res);
      })
      .catch(() => {
        // Not zero, and certainly not ₪1,680. Unknown says unknown.
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const takenMinorUnits =
    data && data.grossMinorUnits !== null ? data.grossMinorUnits - data.netMinorUnits : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>הכנסות</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>נטו · סך הכול</Text>
        <Text style={styles.summaryValue}>
          {data ? formatMoney(money(data.netMinorUnits, "ILS")) : failed ? "—" : "…"}
        </Text>
        {data ? (
          <Text style={styles.summarySub}>
            {data.jobCount === 0 ? "עדיין אין עבודות שהוסדרו" : `${data.jobCount} עבודות`}
          </Text>
        ) : failed ? (
          <Text style={styles.summarySub}>לא הצלחנו לטעון את הנתונים</Text>
        ) : null}
      </View>

      {/*
        * The breakdown, only when the ledger has one. Showing "ברוטו —"
        * and "עמלה —" would be three empty rows implying that a deduction
        * happened and we are not saying how much.
        */}
      {data && data.grossMinorUnits !== null && takenMinorUnits !== null ? (
        <>
          <View style={styles.row}>
            <Text style={styles.value}>{formatMoney(money(data.grossMinorUnits, "ILS"))}</Text>
            <Text style={styles.label}>ברוטו</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.value}>−{formatMoney(money(takenMinorUnits, "ILS"))}</Text>
            <Text style={styles.label}>נוכה</Text>
          </View>
        </>
      ) : data ? (
        <Text style={styles.note}>
          פירוט ברוטו ועמלה יופיע כאן ברגע שיהיו חיובים מוסדרים.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg },
  title: { ...t.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.lg },
  summaryCard: {
    backgroundColor: proTheme.colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  summaryLabel: { ...t.caption, color: proTheme.colors.textSecondary },
  summaryValue: { ...t.h1, color: proTheme.colors.textPrimary, marginTop: 4 },
  summarySub: { ...t.caption, color: proTheme.colors.textSecondary, marginTop: 4 },
  row: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: proTheme.colors.border,
  },
  label: { ...t.body, color: proTheme.colors.textSecondary },
  value: { ...t.body, color: proTheme.colors.textPrimary },
  note: { ...t.caption, color: proTheme.colors.textSecondary, textAlign: "right" },
});
