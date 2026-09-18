/** Screen map — mirrors /docs/02-UX-FLOWS.md §Professional daily UX (P13-P24). */
export type ProStackParamList = {
  Offline: undefined;
  PreShift: undefined;
  Online: undefined;
  Offer: { offerId: string };
  Navigation: { jobId: string };
  ActiveService: { jobId: string };
  Complete: { jobId: string };
  Earnings: undefined;
  VerificationCenter: undefined;
};
