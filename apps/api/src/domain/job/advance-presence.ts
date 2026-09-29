/**
 * MOVING THE PROFESSIONAL WHEN THE JOB MOVES.
 *
 * ---------------------------------------------------------------------
 * ONE JOB PER SHIFT, FOREVER
 * ---------------------------------------------------------------------
 * `pro-presence-transitions.ts` is a complete, tested state machine:
 * AVAILABLE → OFFER_RECEIVED → RESERVED → ASSIGNED → EN_ROUTE → ARRIVED →
 * SERVICING → COMPLETING → AVAILABLE. Six of those edges had never been
 * crossed by anything.
 *
 * `atomic-accept.ts` set ASSIGNED, and that was the last word on the
 * subject. The job routes moved the JOB — en-route, arrive, start,
 * complete — and never touched the person doing it. Dispatch only
 * considers professionals who are AVAILABLE, so:
 *
 *   **a professional who accepted one job never received another.**
 *
 * Not until they ended their shift and started a new one. On a platform
 * whose promise is that somebody comes now, the supply side emptied
 * itself one accept at a time, and the only visible symptom was jobs
 * finding nobody.
 *
 * ---------------------------------------------------------------------
 * WHEN THEY GO BACK ON THE MARKET
 * ---------------------------------------------------------------------
 * At `/complete`, when they say the work is done — not when the customer
 * confirms it.
 *
 * The confirmation is the customer's to give and may take hours or never
 * come; the payment that follows needs nothing from the professional.
 * Holding them out of the market until somebody else taps something would
 * charge them for another person's inaction, and it would do it worst to
 * whoever is fastest.
 *
 * So COMPLETING is passed through rather than sat in, and the record
 * shows both steps.
 */
import type { PrismaClient } from "@prisma/client";
import type { ProPresenceState } from "@pro-now/types";

import {
  isPresenceTransitionAllowed,
  presenceAfterCancellation,
} from "./pro-presence-transitions.js";

export interface PresenceAdvance {
  moved: boolean;
  from: ProPresenceState | null;
  to: ProPresenceState | null;
}

/**
 * Move a professional along their own machine, one step, if the step is
 * legal from where they actually are.
 *
 * Deliberately forgiving in one direction and strict in the other: a
 * professional who is already in the target state is left alone (a retried
 * tap must not be an error), but a professional somewhere the machine
 * cannot legally leave for this target is NOT dragged there. The job's
 * state and the person's can disagree — a support action, a cancellation
 * racing an arrival — and silently overwriting the person to match the job
 * is how a professional ends up marked AVAILABLE while standing in
 * somebody's kitchen.
 */
export async function advancePresence(
  prisma: PrismaClient,
  professionalId: string | null,
  to: ProPresenceState
): Promise<PresenceAdvance> {
  if (!professionalId) return { moved: false, from: null, to: null };

  const pro = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { presenceState: true },
  });
  if (!pro) return { moved: false, from: null, to: null };

  const from = pro.presenceState as ProPresenceState;
  if (from === to) return { moved: false, from, to };
  if (!isPresenceTransitionAllowed(from, to)) return { moved: false, from, to };

  await prisma.professionalProfile.update({
    where: { id: professionalId },
    data: { presenceState: to },
  });
  return { moved: true, from, to };
}

/**
 * The professional's part is over: pass through COMPLETING and go back on
 * the market. Two steps because the machine has two, and because
 * COMPLETING is what a support screen would need to see if the second
 * step ever failed.
 */
export async function releaseAfterCompletion(
  prisma: PrismaClient,
  professionalId: string | null
): Promise<PresenceAdvance> {
  await advancePresence(prisma, professionalId, "COMPLETING");
  return advancePresence(prisma, professionalId, "AVAILABLE");
}

/**
 * A job ended without being finished — cancelled by anybody, for any
 * reason. Whoever was committed to it is not committed to it any more.
 *
 * The first version of this walked the professional forward through the
 * steps the job would now never take, because the machine has no backward
 * edge. That wrote ARRIVED for somebody who never arrived into the record
 * a support agent reads back — a worse fault than the one it fixed.
 *
 * Cancellation is its own edge now, and `presenceAfterCancellation` owns
 * the question of who it applies to. Somebody ending their shift is left
 * ending their shift: a cancelled job is not a reason to put them back to
 * work.
 */
export async function releaseAfterCancellation(
  prisma: PrismaClient,
  professionalId: string | null
): Promise<PresenceAdvance> {
  if (!professionalId) return { moved: false, from: null, to: null };

  const pro = await prisma.professionalProfile.findUnique({
    where: { id: professionalId },
    select: { presenceState: true },
  });
  if (!pro) return { moved: false, from: null, to: null };

  const from = pro.presenceState as ProPresenceState;
  const to = presenceAfterCancellation(from);
  if (!to) return { moved: false, from, to: null };

  await prisma.professionalProfile.update({
    where: { id: professionalId },
    data: { presenceState: to },
  });
  return { moved: true, from, to };
}
