import { useCallback, useEffect, useRef, useState } from "react";

import type {
  OfferCardView,
  ProfessionalVerificationView,
  ProPresenceState,
  ProServiceEligibilityView,
} from "@pro-now/types";

import { api } from "./client";

/** How often we ask whether an offer has arrived. */
export const OFFER_POLL_MS = 3000;

export interface ShiftWatch {
  displayNameHe: string;
  presenceState: ProPresenceState;
  /** Services this professional may go online for, per the server. */
  services: ProServiceEligibilityView[];
  /** Settled net earnings, in minor units. Null until the server answers. */
  netMinorUnits: number | null;
  jobCount: number;
  /** A real dispatch offer, when one is live. Never a demo. */
  offer: OfferCardView | null;
  /** The open shift's id, needed to end it. Null when not online. */
  sessionId: string | null;
  loading: boolean;
  setSession: (sessionId: string | null, presence: ProPresenceState) => void;
  refresh: () => void;
}

const ONLINE: ProPresenceState[] = [
  "AVAILABLE",
  "OFFER_RECEIVED",
  "RESERVED",
  "ASSIGNED",
  "EN_ROUTE",
  "ARRIVED",
  "SERVICING",
  "COMPLETING",
];

/**
 * THE PROFESSIONAL'S DAY, FROM THE SERVER.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS REPLACES
 * ---------------------------------------------------------------------
 * The online screen had this, in full:
 *
 *     setTimeout(() => navigation.navigate("Offer", { offerId: "demo-offer" }), 4000)
 *
 * Four seconds after going online, every professional received a job. Not
 * a simulation labelled as one — a navigation to a screen that then asked
 * the server for an offer that did not exist. Fabricated demand is the
 * mirror image of fabricated supply, and /CLAUDE.md §3 forbids both by
 * name. Next to it: "₪840", "4 עבודות", "00:04:12" and "יוסי כהן", none
 * of which came from anywhere.
 *
 * `GET /v1/pro/offers/current` has existed the whole time. It returns an
 * offer or nothing, and nothing is the normal answer.
 *
 * ---------------------------------------------------------------------
 * POLLING ONLY WHILE ONLINE
 * ---------------------------------------------------------------------
 * An offline professional cannot be offered work, so asking is both
 * pointless and a battery cost on a phone in somebody's pocket. The timer
 * exists only while the shift does.
 */
export function useShift(): ShiftWatch {
  const [profile, setProfile] = useState<ProfessionalVerificationView | null>(null);
  const [services, setServices] = useState<ProServiceEligibilityView[]>([]);
  const [netMinorUnits, setNet] = useState<number | null>(null);
  const [jobCount, setJobCount] = useState(0);
  const [offer, setOffer] = useState<OfferCardView | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [presenceOverride, setPresenceOverride] = useState<ProPresenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([api.getVerification(), api.getServices(), api.getEarnings()]).then(
      ([v, s, e]) => {
        if (!alive) return;
        if (v.status === "fulfilled") setProfile(v.value.professional);
        if (s.status === "fulfilled") setServices(s.value.services);
        if (e.status === "fulfilled") {
          setNet(e.value.netMinorUnits);
          setJobCount(e.value.jobCount);
        }
        setLoading(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [reloads]);

  /*
   * The presence the server reported at login, unless this session has
   * since started or ended a shift — in which case the server told us that
   * too, in the shift response. Never a value this app decided on its own:
   * a client that believes it is online while the server has it offline is
   * a professional waiting for calls that are going to somebody else.
   */
  const presenceState: ProPresenceState =
    presenceOverride ?? profile?.presenceState ?? "OFFLINE";
  const online = ONLINE.includes(presenceState);

  const onlineRef = useRef(online);
  onlineRef.current = online;

  useEffect(() => {
    if (!online) {
      setOffer(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      try {
        const next = await api.getCurrentOffer();
        if (alive) setOffer(next ?? null);
      } catch {
        /*
         * A failed poll is not "no work". Keeping the last offer is right:
         * it has a server-set deadline of its own and will expire honestly
         * whether or not this request succeeded.
         */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), OFFER_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [online]);

  const setSession = useCallback((id: string | null, presence: ProPresenceState) => {
    setSessionId(id);
    setPresenceOverride(presence);
  }, []);

  const refresh = useCallback(() => setReloads((n) => n + 1), []);

  return {
    /*
     * The professional's own name, from their profile. Empty until it
     * arrives — the screen greets nobody rather than greeting "יוסי כהן",
     * which is what it did before, to everyone.
     */
    displayNameHe: profile?.displayName ?? "",
    presenceState,
    services,
    netMinorUnits,
    jobCount,
    offer,
    sessionId,
    loading,
    setSession,
    refresh,
  };
}
