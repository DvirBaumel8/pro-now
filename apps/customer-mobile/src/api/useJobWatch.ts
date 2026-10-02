import { useEffect, useRef, useState } from "react";

import type { JobMatchView, JobState } from "@pro-now/types";

import { api } from "./client";

/** How often we ask the server what happened. */
export const JOB_POLL_MS = 2500;

export interface JobWatch {
  status: JobState;
  /** The assigned professional and the real ETA, or null until there is one. */
  match: JobMatchView | null;
  /** Which trade this job belongs to. Decides the world. */
  departmentCode: string | undefined;
  /**
   * The ETA in seconds as it stood the moment the job was assigned.
   *
   * Progress along a trip is "how much is done", and that cannot be worked
   * out from the remaining time alone — you need what the whole trip was.
   * Held here rather than recomputed in a screen, so a re-render never
   * restarts the journey.
   */
  etaSecondsAtAssignment: number | null;
  /** True until the first answer arrives. Nothing should decide yet. */
  loading: boolean;
}

/**
 * ONE JOB, WATCHED, FOR EVERY SCREEN THAT CARES.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS A HOOK AND NOT A COPY IN EACH SCREEN
 * ---------------------------------------------------------------------
 * Searching and Tracking are the same job at two moments, and both need
 * the same four things: the status, who was assigned, when they arrive,
 * and which trade's world to draw. Written twice they drift — and the way
 * they drift is not cosmetic, because every one of these answers has an
 * honesty rule attached to it that is easy to keep in one place and easy
 * to forget in the second copy.
 *
 * ---------------------------------------------------------------------
 * THE RULES THIS HOOK KEEPS
 * ---------------------------------------------------------------------
 * A network failure is not news. A timed-out poll keeps the last status it
 * knew and asks again; it never becomes "we could not find anyone",
 * because the difference between "we do not know" and "nobody is there" is
 * the whole of /CLAUDE.md §3.
 *
 * The match is asked for only once somebody is actually assigned. Before
 * that there is no one to name, and a screen that has no professional must
 * show no professional rather than a placeholder with a grey circle and an
 * initial in it.
 *
 * The ETA is the server's or nothing. `EtaView` is already nullable
 * precisely because an ETA may not be computable yet, and that null is
 * carried rather than filled in.
 *
 * Polling, not a socket: /docs/06-API-SPEC.md specifies a job WebSocket
 * channel and this app has no socket client yet. Polling is slower and
 * honest; a socket is an epic, not a line.
 */
export function useJobWatch(jobId: string): JobWatch {
  const [status, setStatus] = useState<JobState>("SEARCHING");
  const [match, setMatch] = useState<JobMatchView | null>(null);
  const [departmentCode, setDepartmentCode] = useState<string | undefined>(undefined);
  const [etaSecondsAtAssignment, setEtaAtAssignment] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Asked once. A ref rather than state because nothing renders from it:
   * it only records that we have already gone looking for the match, so a
   * later poll cannot fire a second request for something we have.
   */
  const askedForMatch = useRef(false);
  /*
   * Whether we already hold a match. A ref and not the `match` state
   * because the poll reads it: reading state inside the effect would put
   * `match` in the dependency list, and the timer would be torn down and
   * rebuilt on every ETA refresh — a poll that restarts itself is a poll
   * that never settles into a rhythm.
   */
  const haveMatch = useRef(false);

  useEffect(() => {
    let alive = true;

    const tick = async () => {
      try {
        const { job } = await api.getJob(jobId);
        if (!alive) return;
        setStatus(job.status);
        setLoading(false);

        if (job.assignedProfessionalId && !askedForMatch.current) {
          askedForMatch.current = true;
          try {
            const m = await api.getMatch(jobId);
            if (!alive) return;
            setMatch(m);
            haveMatch.current = true;
            /*
             * The trip's whole length, captured at the one moment it is
             * the whole length. Every later ETA is a remainder.
             */
            if (m.eta) setEtaAtAssignment(m.eta.etaSeconds);
          } catch {
            /*
             * Assigned, but we could not learn who. The job is real and
             * somebody is coming; the screen shows that much and no face
             * until a later attempt succeeds. Allow another attempt.
             */
            askedForMatch.current = false;
          }
        } else if (haveMatch.current) {
          /*
           * Refresh the ETA while they travel. The professional moves and
           * the remaining time changes; the name does not.
           */
          try {
            const m = await api.getMatch(jobId);
            if (alive) setMatch(m);
          } catch {
            /* Keep the last real ETA rather than blanking it on a blip. */
          }
        }
      } catch {
        /* Transient. Keep what we knew and keep asking. */
        if (alive) setLoading(false);
      }
    };

    void tick();
    const id = setInterval(() => void tick(), JOB_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [jobId]);

  /*
   * Which trade's world this is.
   *
   * The catalogue knows which department a service belongs to; the route
   * only carries a job id. Resolved once. Until it answers, screens use
   * their default world — a neighbourhood is a neighbourhood, and the
   * district it emphasises is a refinement.
   */
  useEffect(() => {
    let alive = true;
    Promise.all([api.getJob(jobId), api.getCatalog()])
      .then(([{ job }, catalog]) => {
        if (!alive) return;
        for (const d of catalog.departments) {
          for (const c of d.categories) {
            if (c.services.some((s) => s.id === job.serviceId)) {
              setDepartmentCode(d.code);
              return;
            }
          }
        }
      })
      .catch(() => {
        /* No department, default world. Nothing is claimed either way. */
      });
    return () => {
      alive = false;
    };
  }, [jobId]);

  return { status, match, departmentCode, etaSecondsAtAssignment, loading };
}
