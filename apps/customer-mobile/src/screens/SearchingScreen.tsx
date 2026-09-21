import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  DEMO_WORLD,
  leavingCancels,
  sceneIsOver,
  scenePhaseForJob,
  themeForDepartment,
  type CandidatePresence,
  type LivingMapPhase,
  type LivingMapState,
} from "@pro-now/types";
import { SearchingBody, customerDarkTheme } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { useJobWatch } from "../api/useJobWatch";
import { useAvatar } from "../avatar/AvatarProvider";
import { worldSources } from "../world/worldSources";

type Props = NativeStackScreenProps<CustomerStackParamList, "Searching">;

/**
 * C08 — the wait, in the app people install.
 *
 * ---------------------------------------------------------------------
 * WHAT THIS SCREEN USED TO BE
 * ---------------------------------------------------------------------
 * A blue dot with a pulsing ring over a flat beige rectangle, and a card
 * of prose. It was written in Epic 0, before any of the world existed, and
 * it was never revisited — so while the neighbourhood, the walking, the
 * avatar and the game were built in `packages/ui` and shown in the design
 * gallery every day, the app itself still shipped the radar.
 *
 * Two home screens taught this lesson once already. This is the same fix:
 * the app now renders the same `SearchingBody` the gallery does, given
 * real job data.
 *
 * ---------------------------------------------------------------------
 * THE PHASE SPLIT, WHICH IS THE POINT OF THE SCREEN
 * ---------------------------------------------------------------------
 * Amit: *"השלב של החיפוש יהיה שלב שהרדאר שלנו עובר בלי כפתור לחיצות, עם
 * הדמות בין הרחובות... השלב של המשחק מגיע בשלב ההמתנה לאיש מקצוע... יש 20
 * דקות עד שהוא מגיע, ב-20 דקות האלה אני רוצה שיהיה משחק."*
 *
 * Searching shows. Waiting plays. Nothing here implements that — the
 * enforcement lives in `LivingMapScene`, which only lets the customer
 * steer in `ASSIGNED_ROUTE`. What this screen does is supply the phase,
 * honestly, from the job's real status, so the split happens at the moment
 * a professional is actually assigned and not a second earlier.
 *
 * ---------------------------------------------------------------------
 * WHAT IS REAL HERE AND WHAT IS ABSENT ON PURPOSE
 * ---------------------------------------------------------------------
 * Candidate bubbles are absent. `GET /v1/jobs/:id` returns a status, not a
 * roster of who is being considered, and drawing bubbles for people the
 * server never named is fabricated supply (/CLAUDE.md §3). The empty orbit
 * over a lit city is the true picture of "still looking".
 *
 * The ETA is absent until the server computes one. `GET /v1/jobs/:id/match`
 * returns `eta: null` when there is nothing to say, and that null is
 * passed straight through rather than rounded up to a comforting number.
 *
 * Polling, not a socket: /docs/06-API-SPEC.md specifies a job WebSocket
 * channel and this app has no socket client yet. Polling is slower and
 * honest; a socket is an epic, not a line.
 */
export function SearchingScreen({ route, navigation }: Props) {
  const { jobId } = route.params;
  const { width, height } = useWindowDimensions();
  const { choice: avatar } = useAvatar();

  const { status, match, departmentCode } = useJobWatch(jobId);

  /*
   * THE REVEAL IS A MOMENT, NOT A STATE THE SERVER HAS.
   *
   * `MATCH_REVEAL` is the beat where the chosen professional lands in the
   * middle of the world before the street opens up behind them. No job
   * status corresponds to it — the server goes straight from OFFERING to
   * PRO_ASSIGNED — so the screen holds the reveal for as long as the scene
   * needs and then lets the phase mapping take over.
   *
   * A ref records that the beat has already been played, so a later poll
   * cannot replay it and yank a customer who is mid-walk back into a
   * reveal. Nothing renders from it, which is why it is not state.
   */
  const revealedRef = useRef(false);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (!match || revealedRef.current) return;
    revealedRef.current = true;
    setRevealing(true);
  }, [match]);

  /* The reveal beat, then the street. */
  useEffect(() => {
    if (!revealing) return;
    const t = setTimeout(() => setRevealing(false), 2200);
    return () => clearTimeout(t);
  }, [revealing]);

  /* Once the job is over, this screen has nothing to show. */
  useEffect(() => {
    if (status === "CANCELLED") navigation.replace("Home");
    else if (sceneIsOver(status)) navigation.replace("Home");
  }, [status, navigation]);

  /**
   * THE CHOSEN PROFESSIONAL, AS THE WORLD'S ONE CANDIDATE.
   *
   * Every field is either the server's or null. `proNowRatingAverage` is
   * already nullable in the API precisely because a new professional has
   * no average, and it is carried through as null rather than defaulted —
   * a fabricated trust score is the thing /CLAUDE.md §3 names first.
   */
  const candidates: CandidatePresence[] = useMemo(() => {
    if (!match) return [];
    const p = match.professional;
    return [
      {
        candidateId: p.id,
        displayNameHe: p.displayName,
        professionHe: match.serviceNameHe,
        photoUri: p.profilePhotoUrl,
        state: "CHOSEN",
        ratingAverage: p.proNowRatingAverage,
        ratingCount: p.proNowRatingCount,
        completedJobs: p.proNowCompletedJobs,
      },
    ];
  }, [match]);

  const phase: LivingMapPhase = revealing && candidates.length === 1
    ? "MATCH_REVEAL"
    : scenePhaseForJob(status);

  const living: LivingMapState = useMemo(
    () => ({
      phase,
      theme: themeForDepartment(departmentCode ?? ""),
      adapter: DEMO_WORLD,
      /*
       * Candidates belong to the reveal. Carrying the chosen one into
       * ASSIGNED_ROUTE would leave a bubble hanging over a street the
       * customer is walking down, which is a person in two places.
       */
      candidates: phase === "MATCH_REVEAL" ? candidates : [],
      journey:
        phase === "ASSIGNED_ROUTE"
          ? {
              /*
               * The assignment is real; the position is not ours yet.
               * There is no maps vendor (/CLAUDE.md §4) and the world is
               * the illustrative adapter, so placing a real fix on it
               * would be a drawn street pretending to be a road —
               * `livingMapViolations` rejects exactly that. Null fixes
               * mean the marker does not move, which is the truth about
               * how much we know.
               */
              assignmentId: jobId,
              latestFix: null,
              previousFix: null,
            }
          : null,
    }),
    [phase, departmentCode, candidates, jobId]
  );

  const onBack = useCallback(() => {
    /*
     * Leaving before assignment ends the request; afterwards it is only
     * navigation. `leavingCancels` owns that boundary so the label and the
     * behaviour cannot drift apart.
     *
     * NOTE: there is no cancel endpoint on this client yet, so this backs
     * out of the screen rather than telling the server. Wiring
     * `POST /v1/jobs/:id/cancel` here is a one-line change the day it
     * exists; promising a cancellation we do not send would be worse than
     * the extra tap.
     */
    navigation.replace("Home");
  }, [navigation]);

  const etaMinutes = match?.eta ? Math.round(match.eta.etaSeconds / 60) : null;

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <SearchingBody
        serviceNameHe={match?.serviceNameHe ?? ""}
        theme={themeForDepartment(departmentCode ?? "")}
        living={living}
        etaMinutes={etaMinutes}
        departmentCode={departmentCode}
        worldSources={worldSources}
        avatar={avatar}
        onBack={onBack}
        backLabelHe={leavingCancels(status) ? "ביטול הבקשה" : null}
        onAccept={() => navigation.replace("Tracking", { jobId })}
        onSafety={() => navigation.navigate("Tracking", { jobId })}
        width={width}
        height={height}
      />
    </View>
  );
}
