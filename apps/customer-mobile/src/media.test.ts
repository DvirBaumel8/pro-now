import { describe, expect, it } from "vitest";

import { captureUploads } from "./media";

describe("capture uploads", () => {
  it("turns captured photos and voice into ordered native upload inputs", () => {
    expect(
      captureUploads(
        [
          { id: "photo-1", uri: "file:///leak.webp", subjectHe: "נזילה", mimeType: "image/webp" },
          { id: "photo-2", uri: null, subjectHe: "נזילה" },
          { id: "photo-3", uri: "file:///wall.jpg", subjectHe: "נזילה" },
        ],
        { uri: "file:///voice.m4a", seconds: 8 }
      )
    ).toEqual([
      { kind: "PHOTO", mime: "image/webp", uri: "file:///leak.webp" },
      { kind: "PHOTO", mime: "image/jpeg", uri: "file:///wall.jpg" },
      { kind: "VOICE_NOTE", mime: "audio/mp4", uri: "file:///voice.m4a" },
    ]);
  });
});
