import type { DepartmentCode, JobMatchView, JobState } from "@pro-now/types";

import { worldModeFor, worldRouteFor } from "./worldController";
import type { WorldSceneModel } from "./types";
import { FOUND_SHOP_BY_DEPARTMENT } from "./scene/searchFlight";

export interface JobWorldModelInput {
  status: JobState | null;
  match: JobMatchView | null;
  departmentCode: DepartmentCode | null;
  /** The catalogue service id (the van's livery follows it). */
  serviceId?: string | null;
  nowMs: number;
  reducedMotion?: boolean;
  /**
   * The professional is assigned and the customer is being shown who: the
   * camera flies into the trade's shop (the demo's search "found").
   */
  revealing?: boolean;
}

export function buildJobWorldModel(input: JobWorldModelInput): WorldSceneModel {
  const route = worldRouteFor({ ...input, reducedMotion: input.reducedMotion ?? false });
  const pro = input.match?.professional ?? null;
  const found = Boolean(input.revealing && input.match);
  return {
    mode: found ? "FOUND" : worldModeFor({ ...input, reducedMotion: input.reducedMotion ?? false }),
    departmentCode: input.departmentCode,
    avatarNo: null,
    shopId: null,
    foundShopId: found ? FOUND_SHOP_BY_DEPARTMENT[input.departmentCode ?? ""] ?? "home" : null,
    route: {
      ...route,
      serviceId: input.serviceId ?? null,
      professional: pro ? { nameHe: pro.displayName, photoUrl: pro.profilePhotoUrl } : null,
    },
    trades: {},
  };
}
