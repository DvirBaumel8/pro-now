import React, { useEffect, useMemo, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ProfessionalVerificationView, ProServiceEligibilityView } from "@pro-now/types";
import {
  ProVerificationBody,
  proTheme,
  type MarkName,
  type ProServiceEligibility,
  type StepState,
  type VerificationStep,
} from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "VerificationCenter">;

/**
 * P24 — what is verified, what is not, and what to do about it.
 *
 * ---------------------------------------------------------------------
 * WHAT IT TOLD EVERYBODY
 * ---------------------------------------------------------------------
 * Four rows, written into the component:
 *
 *     זהות                  מאומת
 *     עסק                   מאומת
 *     רישיון חשמלאי         פג תוקף — נדרש חידוש
 *     מוניטין חיצוני        לא מקושר
 *
 * Every professional in the marketplace was told their identity and
 * business were verified. Every one of them was told their electrician's
 * licence had expired — including the ones who are not electricians.
 *
 * Verification is not a screen in this product; it is the product. The
 * whole promise is "a trusted, verified professional", and this screen
 * was the one place a professional could check, and it was fiction. That
 * makes it the most serious of the fabrications, not the smallest.
 *
 * ---------------------------------------------------------------------
 * A SANDBOX PASS IS NOT A PASS
 * ---------------------------------------------------------------------
 * `IdentityVerification.isSandbox` marks a result produced by the stub
 * adapter, because no identity vendor has been chosen (/CLAUDE.md §4).
 * Drawing "אומת" for one would be presenting mocked data as production,
 * which §3 forbids by name — so it gets its own state, SANDBOX, that the
 * body already knows how to render as "בדיקת נסיון".
 */
export function VerificationCenterScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();

  const [pro, setPro] = useState<ProfessionalVerificationView | null>(null);
  const [services, setServices] = useState<ProServiceEligibilityView[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.getVerification(), api.getServices()]).then(([v, s]) => {
      if (!alive) return;
      if (v.status === "fulfilled") setPro(v.value.professional);
      if (s.status === "fulfilled") setServices(s.value.services);
    });
    return () => {
      alive = false;
    };
  }, []);

  const steps: VerificationStep[] = useMemo(() => {
    if (!pro) return [];

    /*
     * ABSENT MEANS NOT SUBMITTED, NEVER VERIFIED.
     *
     * The safe direction is always to under-claim: a professional wrongly
     * told they are unverified goes and checks, and a professional wrongly
     * told they are verified finds out at somebody's front door.
     */
    const identity: StepState = !pro.identityVerification
      ? "NOT_STARTED"
      : pro.identityVerification.isSandbox
        ? "SANDBOX"
        : pro.identityVerification.status === "VERIFIED"
          ? "VERIFIED"
          : pro.identityVerification.status === "REJECTED"
            ? "REJECTED"
            : "IN_REVIEW";

    const business: StepState = !pro.businessProfile
      ? "NOT_STARTED"
      : pro.businessProfile.verificationStatus === "VERIFIED"
        ? "VERIFIED"
        : pro.businessProfile.verificationStatus === "REJECTED"
          ? "REJECTED"
          : "IN_REVIEW";

    const external: StepState = (pro.externalProfiles ?? []).some((p) => p.linkStatus === "LINKED")
      ? "VERIFIED"
      : "NOT_STARTED";

    const nameOf = (serviceId: string) =>
      services.find((s) => s.serviceId === serviceId)?.nameHe ?? serviceId;

    /*
     * One row per credential the professional actually holds. Not one row
     * per credential the marketplace can imagine: a cleaner has no
     * electrician's licence row, so the screen shows none.
     */
    const credentialSteps: VerificationStep[] = (pro.credentials ?? []).map((c) => {
      const expired = c.expiresAt !== null && Date.parse(c.expiresAt) < Date.now();
      const state: StepState = expired
        ? "EXPIRED"
        : c.status === "VERIFIED"
          ? "VERIFIED"
          : c.status === "REJECTED"
            ? "REJECTED"
            : "IN_REVIEW";
      return {
        id: c.id,
        titleHe: c.type === "LICENSE" ? "רישיון" : c.type === "INSURANCE" ? "ביטוח" : "תעודה",
        explainHe: c.issuer ? `הונפק על ידי ${c.issuer}` : "מסמך שהוגש לאימות",
        state,
        actionHe: expired ? "צריך להעלות מסמך בתוקף" : null,
        // Naming the service makes the consequence concrete: this is the
        // work that stops if the document lapses.
        gatesServicesHe: [nameOf(c.serviceId)],
        validUntilHe: c.expiresAt
          ? `בתוקף עד ${new Date(c.expiresAt).toLocaleDateString("he-IL")}`
          : null,
      };
    });

    return [
      {
        id: "identity",
        titleHe: "זהות",
        explainHe: "מי אתה, מול מסמך מזהה. זה מה שמאפשר ללקוח לפתוח את הדלת.",
        state: identity,
        actionHe: identity === "REJECTED" ? "צריך להגיש מסמך מזהה נוסף" : null,
      },
      {
        id: "business",
        titleHe: "עסק",
        explainHe: "פרטי העוסק, לחשבוניות ולתשלומים.",
        state: business,
      },
      ...credentialSteps,
      {
        id: "external",
        titleHe: "מוניטין חיצוני",
        explainHe: "קישור לפרופיל קיים, אם יש. לא חובה.",
        state: external,
      },
    ];
  }, [pro, services]);

  const serviceRows: ProServiceEligibility[] = useMemo(
    () =>
      services.map((s) => {
        const blocked = [...s.expired, ...s.missing, ...s.unverified];
        return {
          id: s.serviceId,
          nameHe: s.nameHe,
          mark: "handyman" as MarkName,
          live: s.eligible,
          blockedByHe: s.eligible
            ? null
            : blocked.length > 0
              ? blocked.join(" · ")
              : s.accountApproved
                ? "השירות עדיין לא אושר בחשבון"
                : "החשבון עדיין לא אושר",
        };
      }),
    [services]
  );

  return (
    <View style={{ flex: 1, backgroundColor: proTheme.colors.bg }}>
      <ProVerificationBody
        displayNameHe={pro?.displayName ?? ""}
        steps={steps}
        services={serviceRows}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
