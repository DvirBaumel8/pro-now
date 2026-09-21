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
  /**
   * One of the eight customer categories, NOT a department code.
   *
   * It was called `departmentCode` and carried a category id, which is how
   * the screen behind it came to ignore the value entirely and show a
   * plumbing list whatever you tapped. Naming a parameter for what is
   * actually in it is not pedantry here; it is the whole bug.
   */
  ServiceSelect: { categoryId: string };
  /**
   * `describedHe` is what the customer typed when no row was their fault.
   * Carried rather than resolved: choosing a service from a sentence is
   * the matcher's job, and it needs the catalogue, not a navigation call.
   */
  RequestDetails: { serviceId: string; serviceName: string; describedHe?: string };
  Searching: { jobId: string };
  Match: { jobId: string };
  Tracking: { jobId: string };
  Quote: { jobId: string };
  Complete: { jobId: string };
  Review: { jobId: string; professionalName: string };
};
