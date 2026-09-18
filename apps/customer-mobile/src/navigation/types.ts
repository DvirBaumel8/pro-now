/** Screen map — mirrors /docs/02-UX-FLOWS.md §Customer screens (C04-C15). */
export type CustomerStackParamList = {
  Home: undefined;
  ServiceSelect: { departmentCode: string };
  RequestDetails: { serviceId: string; serviceName: string };
  Searching: { jobId: string };
  Match: { jobId: string };
  Tracking: { jobId: string };
  Quote: { jobId: string };
  Complete: { jobId: string };
  Review: { jobId: string; professionalName: string };
};
