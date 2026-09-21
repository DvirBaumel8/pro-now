/** Screen map — mirrors /docs/02-UX-FLOWS.md §Customer screens (C04-C15). */
export type CustomerStackParamList = {
  /**
   * The figure the customer walks the street as.
   *
   * `returning: true` means they came from the profile and want to go
   * back there; the first-run path has nothing behind it to go back to,
   * so it replaces itself with Home instead.
   */
  AvatarPicker: { returning?: boolean } | undefined;
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
