/** A photo or a recording did not reach storage. The request was not sent. */
export class MediaUploadError extends Error {
  constructor(cause: unknown) {
    super("media upload failed", { cause });
    this.name = "MediaUploadError";
  }
}

/**
 * What the customer reads when sending fails. Never the browser's own text:
 * Safari's "Load failed" reached the screen as it was (Dvir, 2026-09-30),
 * and the server's messages are English for logs, not for people.
 */
export function sendErrorHe(error: unknown, attachments: number): string {
  if (error instanceof MediaUploadError) {
    return attachments === 1
      ? "לא הצלחנו להעלות את הקובץ שצירפתם. אפשר לנסות שוב, או לשלוח את הקריאה בלעדיו."
      : "לא הצלחנו להעלות את הקבצים שצירפתם. אפשר לנסות שוב, או לשלוח את הקריאה בלעדיהם.";
  }
  if (isNetworkError(error)) return "אין חיבור לשרת כרגע. בדקו את החיבור לאינטרנט ונסו שוב.";
  return "לא הצלחנו לשלוח את הקריאה. נסו שוב בעוד רגע.";
}

/** fetch() rejects with a TypeError when no answer came back at all. */
function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && /load failed|failed to fetch|networkerror|network request failed/i.test(error.message);
}
