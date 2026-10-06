import { useEffect, useState, type ReactNode } from "react";

import type { DepartmentCode, JobMatchView, JobState } from "@pro-now/types";

import { WorldCanvas } from "./WorldCanvas";
import { createWorldScene } from "./scene/WorldScene";
import { buildJobWorldModel } from "./jobWorldModel";
import "./JobWorldBackdrop.css";

export interface JobWorldBackdropProps {
  status: JobState | null;
  match: JobMatchView | null;
  departmentCode: DepartmentCode | null;
  /** The catalogue service: which trade's van drives to you (scene/drive.ts). */
  serviceId?: string | null;
  /**
   * Assigned, and the customer is being shown who (the demo's search
   * "found"): the camera flies into the trade's shop window and, once there,
   * the professional stands in the doorway with a pill saying who.
   */
  reveal?: { nameHe: string; female: boolean; figure: { uri: string; round: boolean } | null } | null;
  fallback: ReactNode;
}

/** The demo's flight takes 4.2 s; the professional appears as it lands. */
export const REVEAL_AFTER_MS = 4300;

/**
 * The street behind the job. While the server is still looking it is the
 * demo's search (SearchCity): the camera flies high along the street (the
 * scene's SEARCH mode) with radar waves spreading from the middle
 * — a picture of looking, never a count or a name the server has not given.
 */
export function JobWorldBackdrop({ status, match, departmentCode, serviceId = null, reveal = null, fallback }: JobWorldBackdropProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const revealing = Boolean(reveal && match);
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    setLanded(false);
    if (!revealing) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const timer = window.setTimeout(() => setLanded(true), still ? 0 : REVEAL_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [revealing]);
  const isRoute = status === "PRO_ASSIGNED" || status === "PRO_EN_ROUTE";

  useEffect(() => {
    if (!isRoute) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRoute]);

  const scene = buildJobWorldModel({ status, match, departmentCode, serviceId, nowMs, revealing });
  const searching = scene.mode === "SEARCH";
  return (
    <div className={`job-world${searching ? " job-world--search" : ""}`} aria-hidden="true" data-testid="job-world">
      <div className="job-world__street">
        <WorldCanvas
          mode={scene.mode}
          route={scene.route}
          avatarNo={scene.avatarNo}
          scene={scene}
          sceneFactory={createWorldScene}
          onEvent={() => undefined}
          fallback={fallback}
        />
      </div>
      {searching ? (
        <>
          <div className="job-world__radar job-world__radar--1" data-testid="search-radar" />
          <div className="job-world__radar job-world__radar--2" data-testid="search-radar" />
          <div className="job-world__radar job-world__radar--3" data-testid="search-radar" />
          <div className="job-world__dot" />
        </>
      ) : null}
      {revealing && landed && reveal ? (
        <>
          {reveal.figure ? (
            <img
              src={reveal.figure.uri}
              alt=""
              className={`job-world__pro${reveal.figure.round ? " job-world__pro--photo" : ""}`}
              data-testid="found-pro"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <div className={`job-world__pro-pill${reveal.figure?.round ? " job-world__pro-pill--photo" : ""}`} data-testid="found-pill">
            ✓ {reveal.nameHe} · {reveal.female ? "פנויה עכשיו" : "פנוי עכשיו"}
          </div>
        </>
      ) : null}
    </div>
  );
}
