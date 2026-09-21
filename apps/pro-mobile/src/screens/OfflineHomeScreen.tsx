import React, { useCallback, useEffect, useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ProShiftBody, proTheme, type ShiftServiceChip, type ShiftSnapshot } from "@pro-now/ui";

import { worldSources } from "../world/worldSources";
import { markForService } from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";
import { useShift } from "../api/useShift";

type Props = NativeStackScreenProps<ProStackParamList, "Offline">;

/**
 * P13/P15 — the professional's day, online or off.
 *
 * ---------------------------------------------------------------------
 * ONE SCREEN, BECAUSE IT IS ONE DECISION
 * ---------------------------------------------------------------------
 * There were two: an offline home and an online home, each with its own
 * numbers and its own layout. A professional does not experience going
 * online as arriving somewhere; they experience the same dashboard
 * switching on. `ProShiftBody` already reads `presenceState` and draws
 * both, which is why there is one screen here now.
 *
 * ---------------------------------------------------------------------
 * WHAT WAS ON IT BEFORE
 * ---------------------------------------------------------------------
 * "יוסי כהן", an IDENTITY_VERIFIED badge, ₪840, 4 jobs, 3:24 online — and
 * on the online half, "00:04:12" and a four-second timer that navigated
 * every professional to a job offer called "demo-offer". Not one of those
 * came from anywhere. Fabricated demand is the mirror of fabricated
 * supply and /CLAUDE.md §3 forbids both by name.
 *
 * Every number here is the server's or absent. `settledNetMinorUnits`
 * null means the earnings request has not answered, and `readShift`
 * already knows to withhold a rate rather than divide by a number it does
 * not have.
 */
export function OfflineHomeScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const {
    displayNameHe,
    presenceState,
    services,
    netMinorUnits,
    jobCount,
    offer,
    sessionId,
    setSession,
  } = useShift();

  /*
   * A real offer, so go and look at it. This is the path the fake timer
   * was standing in for, and it fires when dispatch actually offers work
   * rather than four seconds after the shift starts.
   */
  useEffect(() => {
    if (offer) navigation.navigate("Offer", { offerId: offer.offerId });
  }, [offer, navigation]);

  const chips: ShiftServiceChip[] = useMemo(
    () =>
      services.map((s) => ({
        id: s.serviceId,
        nameHe: s.nameHe,
          // The catalogue's own mark for this trade — see markForService.
          mark: markForService(s.serviceId),
        /*
         * "Live" is the server's eligibility, not a local switch. A row
         * the professional turned on but is not eligible for is not live,
         * and showing it as live is how somebody waits all day for calls
         * that were never going to be routed to them.
         */
        live: s.eligible,
      })),
    [services]
  );

  const shift: ShiftSnapshot = useMemo(
    () => ({
      /*
       * There is no endpoint that reports when the current shift started,
       * so this is honestly null and the screen shows no clock rather than
       * a plausible one. The old screen's "00:04:12" was a string.
       */
      onlineSinceMs: null,
      settledNetMinorUnits: netMinorUnits,
      completedJobs: jobCount,
    }),
    [netMinorUnits, jobCount]
  );

  const onToggleOnline = useCallback(() => {
    void (async () => {
      if (sessionId) {
        try {
          await api.endShift(sessionId);
          setSession(null, "OFFLINE");
        } catch {
          /*
           * The shift did NOT end. Leaving the screen showing "online" is
           * correct and uncomfortable: the server still has this
           * professional available, and pretending otherwise would have
           * them ignore a call that is genuinely theirs.
           */
        }
        return;
      }
      // Going online needs a location and a service; the pre-shift screen
      // collects both and is the only place that may start a shift.
      navigation.navigate("PreShift");
    })();
  }, [sessionId, setSession, navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: proTheme.colors.bg }}>
      <ProShiftBody
        displayNameHe={displayNameHe}
        presenceState={presenceState}
        shift={shift}
        /*
         * The same neighbourhood the customer is standing in. One file —
         * see `src/world/worldSources.ts` for why the professional's app
         * carries the plate and none of the cast.
         */
        worldSources={worldSources}
        /*
         * No briefing. "How busy is your area" is a real question with a
         * real answer on the server one day; until then `briefingLines`
         * returns nothing and the GO ONLINE button stands with no claims
         * above it, which is exactly what it was built to do.
         */
        services={chips}
        onToggleOnline={onToggleOnline}
        onOpenEarnings={() => navigation.navigate("Earnings")}
        onManageServices={() => navigation.navigate("VerificationCenter")}
        width={width}
        height={height}
      />
    </View>
  );
}
