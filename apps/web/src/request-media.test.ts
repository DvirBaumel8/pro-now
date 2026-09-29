import { describe, expect, it } from "vitest";

import { mediaUploadInputs } from "./request-media";

describe("request media", () => {
  it("keeps photos before the optional voice note and preserves upload MIME", () => {
    const inputs = mediaUploadInputs(
      [{ id: "photo-1", blob: new Blob(["photo"], { type: "image/jpeg" }), uri: "blob:photo" }],
      { blob: new Blob(["voice"], { type: "audio/webm" }), seconds: 4 }
    );

    expect(inputs.map(({ kind, mime }) => ({ kind, mime }))).toEqual([
      { kind: "PHOTO", mime: "image/jpeg" },
      { kind: "VOICE_NOTE", mime: "audio/webm" },
    ]);
    expect(inputs.map(({ body }) => body.size)).toEqual([5, 5]);
  });
});
