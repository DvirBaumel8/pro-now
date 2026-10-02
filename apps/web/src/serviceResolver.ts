import { databaseCodeForPilotService, serviceIdsByCode } from "@pro-now/types";

import { api } from "./api";

export class ServiceNotOpenError extends Error {
  readonly kind = "NOT_OPEN";
  constructor(readonly reasonHe: string) {
    super(reasonHe);
  }
}

export class ServiceCatalogueMismatchError extends Error {
  readonly kind = "MISMATCH";
  constructor(readonly databaseCode: string) {
    super(`Service code ${databaseCode} is bridged but the server catalogue has no such service`);
  }
}

let cached: Promise<Map<string, string>> | null = null;

async function codeToId(): Promise<Map<string, string>> {
  const request = cached ?? (cached = api.getCatalog().then(serviceIdsByCode));
  try {
    return await request;
  } catch (error) {
    cached = null;
    throw error;
  }
}

export function resetServiceCatalogueCache(): void {
  cached = null;
}

export async function resolveServiceId(pilotServiceId: string): Promise<string> {
  const { databaseCode, reasonHe } = databaseCodeForPilotService(pilotServiceId);
  if (!databaseCode) throw new ServiceNotOpenError(reasonHe ?? "השירות הזה עדיין לא פתוח להזמנה.");

  const id = (await codeToId()).get(databaseCode);
  if (!id) throw new ServiceCatalogueMismatchError(databaseCode);
  return id;
}
