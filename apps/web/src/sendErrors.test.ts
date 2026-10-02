import { describe, expect, it } from "vitest";

import { MediaUploadError, sendErrorHe } from "./sendErrors";

describe("sendErrorHe", () => {
  it("says the attachment failed and that the request can go without it", () => {
    expect(sendErrorHe(new MediaUploadError(new TypeError("Load failed")), 1)).toContain("בלעדיו");
    expect(sendErrorHe(new MediaUploadError(new TypeError("Load failed")), 3)).toContain("בלעדיהם");
  });

  it("turns Safari's and Chrome's network failures into Hebrew", () => {
    for (const m of ["Load failed", "Failed to fetch", "NetworkError when attempting to fetch resource."]) {
      expect(sendErrorHe(new TypeError(m), 0)).toBe("אין חיבור לשרת כרגע. בדקו את החיבור לאינטרנט ונסו שוב.");
    }
  });

  it("never shows a raw message", () => {
    const he = sendErrorHe(new Error("Request failed with status 500"), 0);
    expect(he).not.toMatch(/[A-Za-z]/);
  });
});
