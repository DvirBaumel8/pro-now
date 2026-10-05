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
  fallback: ReactNode;
}

/**
 * The street behind the job. While the server is still looking it is the
 * demo's search (SearchCity): the camera flies high along the street (the
 * scene's SEARCH mode) with radar waves spreading from the middle
 * — a picture of looking, never a count or a name the server has not given.
 */
export function JobWorldBackdrop({ status, match, departmentCode, fallback }: JobWorldBackdropProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const isRoute = status === "PRO_ASSIGNED" || status === "PRO_EN_ROUTE";

  useEffect(() => {
    if (!isRoute) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRoute]);

  const scene = buildJobWorldModel({ status, match, departmentCode, nowMs });
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
    </div>
  );
}
