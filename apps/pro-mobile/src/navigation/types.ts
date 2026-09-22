import type { ProPresenceState } from "@pro-now/types";

/** Screen map — mirrors /docs/02-UX-FLOWS.md §Professional daily UX (P13-P24). */
export type ProStackParamList = {
  /**
   * The professional's home, online or off — one screen, because going
   * online is a switch and not a destination. `ProShiftBody` reads
   * `presenceState` and draws both.
   *
   * The params arrive from the pre-shift screen once the SERVER has
   * confirmed the shift. They are not how this screen decides it is
   * online; they are the server's answer being carried, which is the
   * distinction /CLAUDE.md §6 is about.
   */
  Offline: { sessionId: string; presenceState: ProPresenceState } | undefined;
  PreShift: undefined;
  Offer: { offerId: string };
  /**
   * The assigned job, start to finish.
   *
   * It was three routes — Navigation, ActiveService, Complete — and each
   * decided for itself when to move on, which put the job's state in the
   * navigation stack instead of on the server. One route, and the status
   * from `/v1/pro/jobs/:id` decides what may happen next.
   */
  Job: { jobId: string };
  /** Writing a price is its own screen, because it is not a button. */
  Quote: { jobId: string; serviceNameHe: string };
  /**
   * What the professional charges. Reached from the shift screen.
   *
   * Until this screen existed no price could be set at all, so every real
   * professional's work was unchargeable — see `professional-pricing.ts`.
   */
  Pricing: undefined;
  Earnings: undefined;
  VerificationCenter: undefined;
};
