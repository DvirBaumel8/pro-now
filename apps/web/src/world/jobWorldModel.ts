import type { DepartmentCode, JobMatchView, JobState } from "@pro-now/types";

import { worldModeFor, worldRouteFor } from "./worldController";
import type { WorldSceneModel } from "./types";

export interface JobWorldModelInput {
  status: JobState | null;
  match: JobMatchView | null;
  departmentCode: DepartmentCode | null;
  /** The catalogue service id (the van's livery follows it). */
  serviceId?: string | null;
  nowMs: number;
  reducedMotion?: boolean;
}

export function buildJobWorldModel(input: JobWorldModelInput): WorldSceneModel {
  const route = worldRouteFor({ ...input, reducedMotion: input.reducedMotion ?? false });
  const pro = input.match?.professional ?? null;
  return {
    mode: worldModeFor({ ...input, reducedMotion: input.reducedMotion ?? false }),
    departmentCode: input.departmentCode,
    avatarNo: null,
    shopId: null,
    route: {
      ...route,
      serviceId: input.serviceId ?? null,
      professional: pro ? { nameHe: pro.displayName, photoUrl: pro.profilePhotoUrl } : null,
    },
    trades: {},
  };
}
