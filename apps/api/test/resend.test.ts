import { describe, expect, it, vi } from "vitest";
import { createResendEmailProvider } from "../src/infra/email/resend.js";

describe("Resend email provider", () => {
  it("posts the outgoing email to Resend's HTTPS API", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    const provider = createResendEmailProvider("re_test_key", "PRO NOW <hello@example.com>", fetchImpl);

    await provider.send({
      to: "person@example.com",
      subject: "Sign in",
      text: "Open the link",
      html: "<p>Open the link</p>",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_test_key",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PRO NOW <hello@example.com>",
        to: ["person@example.com"],
        subject: "Sign in",
        text: "Open the link",
        html: "<p>Open the link</p>",
      }),
    });
  });

  it("surfaces non-success responses without leaking the API key", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid re_secret_key" }), { status: 401 })
    );
    const provider = createResendEmailProvider("re_secret_key", "hello@example.com", fetchImpl);

    const error = await provider
      .send({ to: "person@example.com", subject: "Sign in", text: "Open", html: "<p>Open</p>" })
      .then(
        () => new Error("expected Resend to reject"),
        (caught) => caught as Error
      );
    expect(error.message).toBe("Resend email request failed (401): {\"message\":\"invalid [REDACTED]\"}");
    expect(error.message).not.toContain("re_secret_key");
  });
});
