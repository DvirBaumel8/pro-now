/**
 * TRANSLATING BEFORE ORDERING.
 *
 * Every screen in this app is built from `pilot-catalog.ts`, whose service
 * ids look like `svc-leak`. `POST /v1/jobs` looks a service up by DATABASE
 * id, which is a cuid. `AddressScreen` posted the first straight into the
 * second, so the request was refused with SERVICE_NOT_FOUND — and it had
 * been refused that way for every service, for as long as the screen had
 * existed. The wiring was right and the two halves spoke different
 * languages.
 *
 * This is the translation, in one place and in one direction:
 *
 *     svc-leak  ──catalog-bridge──▶  HOME_PLUMB_LEAK  ──/v1/catalog──▶  cuid
 *
 * Two hops rather than one because they fail differently, and the customer
 * deserves to be told which:
 *
 *   - no bridge entry means the catalogue shows a service the platform has
 *     not opened yet. That is a product state, it has a sentence, and the
 *     screen can say it.
 *   - a bridge entry whose code is not in the server's catalogue means the
 *     two are out of step — a deployment problem, not a customer's. It
 *     must not be rendered as "not available in your area".
 *
 * What it never does is substitute. Sending a request for the nearest
 * service that happens to exist is how a customer who tapped "מזגן" gets a
 * plumber, which is the exact bug `catalogAdapter.ts` was written to end.
 */
import { databaseCodeForPilotService, serviceIdsByCode } from "@pro-now/types";

import { api } from "./client";

export class ServiceNotOpenError extends Error {
  readonly kind = "NOT_OPEN";
  constructor(readonly reasonHe: string) {
    super(reasonHe);
  }
}

export class ServiceCatalogueMismatchError extends Error {
  readonly kind = "MISMATCH";
  constructor(readonly databaseCode: string) {
    super(`Service code ${databaseCode} is bridged but the server's catalogue has no such service`);
  }
}

/**
 * The server's catalogue, fetched once. It changes when a deployment
 * changes it, which is not during a customer's session — and a request
 * per tap would put a network round trip in front of the button.
 */
let cached: Promise<Map<string, string>> | null = null;

async function codeToId(): Promise<Map<string, string>> {
  cached ??= api.getCatalog().then(serviceIdsByCode);
  try {
    return await cached;
  } catch (err) {
    // A failed fetch must not be cached as an empty catalogue — the next
    // tap would then report every service as missing rather than retrying.
    cached = null;
    throw err;
  }
}

/** Forget the cached catalogue. For tests, and for a pull-to-refresh. */
export function resetServiceCatalogueCache(): void {
  cached = null;
}

/**
 * The database service id for a service the customer tapped.
 *
 * @throws ServiceNotOpenError when the platform has not opened this trade.
 * @throws ServiceCatalogueMismatchError when the bridge and the server disagree.
 */
export async function resolveServiceId(pilotServiceId: string): Promise<string> {
  const { databaseCode, reasonHe } = databaseCodeForPilotService(pilotServiceId);
  if (!databaseCode) {
    throw new ServiceNotOpenError(reasonHe ?? "השירות הזה עדיין לא פתוח להזמנה.");
  }

  const map = await codeToId();
  const id = map.get(databaseCode);
  if (!id) throw new ServiceCatalogueMismatchError(databaseCode);
  return id;
}
