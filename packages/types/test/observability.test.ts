import { describe, expect, it } from "vitest";
import { errorFingerprint, normalizeErrorMessage, scrubText, topStackFrame } from "../src/observability";

describe("scrubText", () => {
  it("removes email addresses and phone numbers", () => {
    expect(scrubText("no user dana.cohen+x@gmail.com at 052-123-4567")).toBe("no user [email] at [phone]");
    expect(scrubText("call +972 52 123 4567 or 0521234567")).toBe("call [phone] or [phone]");
    expect(scrubText("office 03-555-1234")).toBe("office [phone]");
  });

  it("drops the query of a signed URL but keeps where it points", () => {
    expect(scrubText("PUT https://r2.example.com/media/a.jpg?X-Amz-Signature=abc&X-Amz-Credential=def failed")).toBe(
      "PUT https://r2.example.com/media/a.jpg?[redacted] failed"
    );
  });

  it("redacts bearer tokens and secret-looking parameters", () => {
    expect(scrubText("Authorization: Bearer eyJhbGciOi.abc.def")).toBe("Authorization: Bearer [redacted]");
    expect(scrubText('token=abc123 password: "hunter2" api_key=XYZ')).toBe(
      'token=[redacted] password: "[redacted]" api_key=[redacted]'
    );
  });

  it("leaves an ordinary stack trace alone", () => {
    const stack = "TypeError: x is undefined\n    at quote (/app/dist/server.js:120:7)";
    expect(scrubText(stack)).toBe(stack);
  });
});

describe("errorFingerprint", () => {
  it("groups the same failure across different ids and numbers", () => {
    const a = errorFingerprint({ source: "api", name: "Error", message: "Job clx9abc0000abcd1234efgh not found (attempt 3)" });
    const b = errorFingerprint({ source: "api", name: "Error", message: "Job clx9zzz0000zzzz9999zzzz not found (attempt 12)" });
    expect(a).toBe(b);
  });

  it("separates the same message thrown from different places", () => {
    const a = errorFingerprint({ source: "api", name: "Error", message: "boom", stack: "Error: boom\n    at a (/app/src/a.ts:1:1)" });
    const b = errorFingerprint({ source: "api", name: "Error", message: "boom", stack: "Error: boom\n    at b (/app/src/b.ts:1:1)" });
    expect(a).not.toBe(b);
  });

  it("is not split by a column shift", () => {
    expect(topStackFrame("E\n    at q (/app/src/a.ts:10:3)")).toBe(topStackFrame("E\n    at q (/app/src/a.ts:10:9)"));
  });

  it("skips library frames for the first frame of our own", () => {
    const stack = "E\n    at x (/app/node_modules/lib/index.js:1:1)\n    at ours (/app/src/jobs.ts:5:2)";
    expect(topStackFrame(stack)).toBe("at ours (/app/src/jobs.ts:5");
  });

  it("keeps the fingerprint free of personal data", () => {
    expect(normalizeErrorMessage("no account for dana@example.com")).toBe("no account for [email]");
  });
});
