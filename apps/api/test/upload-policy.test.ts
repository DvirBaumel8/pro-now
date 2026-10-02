import { describe, expect, it } from "vitest";

import {
  MAX_UPLOAD_BYTES,
  detectUploadMime,
  validateUploadRequest,
} from "../src/domain/storage/upload-policy.js";

describe("upload policy", () => {
  it("allows the supported photo, voice and document types at their caps", () => {
    expect(validateUploadRequest({ kind: "PHOTO", mime: "image/jpeg", bytes: MAX_UPLOAD_BYTES.PHOTO })).toEqual({
      ok: true,
    });
    expect(validateUploadRequest({ kind: "VOICE_NOTE", mime: "audio/mp4", bytes: MAX_UPLOAD_BYTES.VOICE_NOTE })).toEqual({
      ok: true,
    });
    expect(validateUploadRequest({ kind: "DOCUMENT", mime: "application/pdf", bytes: MAX_UPLOAD_BYTES.DOCUMENT })).toEqual({
      ok: true,
    });
  });

  it("rejects wrong types and oversize bodies before presigning", () => {
    expect(validateUploadRequest({ kind: "PHOTO", mime: "application/pdf", bytes: 100 })).toMatchObject({
      ok: false,
      code: "UPLOAD_MIME_NOT_ALLOWED",
    });
    expect(validateUploadRequest({ kind: "VOICE_NOTE", mime: "audio/mp4", bytes: MAX_UPLOAD_BYTES.VOICE_NOTE + 1 })).toMatchObject({
      ok: false,
      code: "UPLOAD_TOO_LARGE",
    });
  });

  it("detects magic bytes rather than trusting the declared MIME", () => {
    expect(detectUploadMime(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(detectUploadMime(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
    expect(detectUploadMime(new TextEncoder().encode("not a jpeg"))).toBeNull();
  });
});
