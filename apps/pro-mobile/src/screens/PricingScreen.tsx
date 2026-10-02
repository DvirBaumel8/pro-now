import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View, useWindowDimensions } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  pilotServiceById,
  pilotServiceIdForDatabaseCode,
  type ProServiceEligibilityView,
} from "@pro-now/types";
import {
  ProPricingBody,
  proTheme,
  spacing,
  type as t,
  type MarkName,
  type ProPricingRow,
} from "@pro-now/ui";

import { api } from "../api/client";
import type { ProStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<ProStackParamList, "Pricing">;

/**
 * P-PRICING — what the professional charges, set by the professional.
 *
 * ---------------------------------------------------------------------
 * THE SCREEN THAT CLOSES THE PAYMENT CHAIN
 * ---------------------------------------------------------------------
 * `settle()` refuses to charge a job whose professional has no price, and
 * until `PATCH /v1/pro/services/:id/pricing` existed nothing could set
 * one. `ProPricingBody` had been drawn for this and rendered only in the
 * prototype. So a real professional accepted work, drove to it, finished
 * it, and the settlement answered NO_CONFIGURED_PRICE afterwards.
 *
 * ---------------------------------------------------------------------
 * SAVING AS THEY TYPE, WITHOUT LOSING WHAT THEY TYPED
 * ---------------------------------------------------------------------
 * The body holds TEXT and reports a parsed amount on every change, so a
 * naive wiring would send a request per keystroke — and a request for
 * "1", then "18", then "180" writes ₪0.01 and ₪0.18 to the server on the
 * way to ₪1.80.
 *
 * So the value is held here and written after a pause. The row shows the
 * number the professional typed the whole time, and what reaches the
 * server is what they stopped at.
 */

const SAVE_DEBOUNCE_MS = 700;

/** The icon beside a service — see EarningsScreen for why it is two hops. */
function markFor(databaseCode: string): MarkName {
  const pilotId = pilotServiceIdForDatabaseCode(databaseCode);
  const mark = pilotId ? pilotServiceById[pilotId]?.mark : undefined;
  return (mark as MarkName | undefined) ?? "handyman";
}

/**
 * Why this service cannot be dispatched, when the reason is NOT the price.
 *
 * The body has a slot for exactly this, and it matters that the two are
 * kept apart: "you have not set a price" is something the professional
 * fixes on this screen in ten seconds, and "your insurance expired" is
 * not. Showing one where the other belongs sends somebody to re-type a
 * number that was never the problem.
 */
function blockedReasonHe(row: ProServiceEligibilityView): string | null {
  if (!row.accountApproved) return "החשבון שלך עדיין בבדיקה.";
  if (!row.serviceApproved) return "השירות הזה עדיין לא אושר לך.";
  if (row.expired.length > 0) return "יש מסמך שפג תוקפו.";
  if (row.missing.length > 0) return "חסר מסמך נדרש.";
  return null;
}

export function PricingScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const [services, setServices] = useState<ProServiceEligibilityView[] | null>(null);
  const [failed, setFailed] = useState(false);
  /** Local overrides, so a row shows what was typed before the save lands. */
  const [pending, setPending] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let alive = true;
    api
      .getServices()
      .then((res) => {
        if (alive) setServices(res.services);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const save = useCallback((serviceId: string, amountMinorUnits: number | null) => {
    void api
      .setServicePricing(serviceId, { basePriceMinorUnits: amountMinorUnits })
      .catch(() => {
        /*
         * A failed save leaves the typed value on screen rather than
         * snapping back. Reverting under somebody's fingers while they are
         * still looking at the box is how a number silently becomes the
         * old one and they never notice.
         */
      });
  }, []);

  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const onChange = useCallback(
    (serviceId: string, amountMinorUnits: number | null) => {
      setPending((p) => ({ ...p, [serviceId]: amountMinorUnits }));
      // One timer per service, replaced on every keystroke, so the write
      // that lands is the number they stopped at rather than one of the
      // numbers they passed through on the way to it.
      const existing = timers.current[serviceId];
      if (existing) clearTimeout(existing);
      timers.current[serviceId] = setTimeout(
        () => save(serviceId, amountMinorUnits),
        SAVE_DEBOUNCE_MS
      );
    },
    [save]
  );

  useEffect(
    () => () => {
      for (const t of Object.values(timers.current)) clearTimeout(t);
    },
    []
  );

  const rows: ProPricingRow[] = useMemo(
    () =>
      (services ?? []).map((s) => ({
        serviceId: s.serviceId,
        nameHe: s.nameHe,
        mark: markFor(s.serviceCode),
        pricingModel: s.priceModel,
        amountMinorUnits:
          s.serviceId in pending ? pending[s.serviceId]! : s.basePriceMinorUnits,
        blockedReasonHe: blockedReasonHe(s),
      })),
    [services, pending]
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
          לא הצלחנו לטעון את השירותים שלך כרגע. המחירים ששמרת לא השתנו.
        </Text>
      </View>
    );
  }

  if (!services) {
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
    <ProPricingBody
      rows={rows}
      /*
       * Null, and it is a prop rather than a constant precisely so there
       * is nowhere to put a default — the body's own note. The commission
       * is an open business decision (/CLAUDE.md §4), and until it is
       * made the screen shows what the professional charges and says
       * nothing about what is taken.
       */
      commissionPercent={null}
      onChange={onChange}
      onBack={() => navigation.goBack()}
      width={width}
      height={height}
    />
  );
}
