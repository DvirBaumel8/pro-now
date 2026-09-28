import { describe, it, expect } from "vitest";
import { loadEnv } from "@pro-now/config";

/**
 * A deployed environment must refuse to boot while a vendor setting still
 * points at a stand-in on its own machine (/docs/21-PRODUCTION-PLAN.md §0).
 */

const base = {
  DATABASE_URL: "postgresql://u:p@ep-cool-name.eu-central-1.aws.neon.tech/pronow",
  JWT_SECRET: "a-secret-of-sixteen-plus",
};

describe("loadEnv — local stand-ins", () => {
  it("boots locally with every stand-in and no Redis", () => {
    const env = loadEnv({
      ...base,
      NODE_ENV: "local",
      DATABASE_URL: "postgresql://pronow@localhost:5432/pronow",
      S3_ENDPOINT: "http://127.0.0.1:9000",
      SMTP_URL: "smtp://localhost:1025",
      GOOGLE_ISSUER_URL: "http://localhost:8080/google",
    });
    expect(env.REDIS_URL).toBeUndefined();
  });

  it("boots production when every setting points elsewhere", () => {
    expect(() =>
      loadEnv({
        ...base,
        NODE_ENV: "production",
        S3_ENDPOINT: "https://abc.r2.cloudflarestorage.com",
        SMTP_URL: "smtps://resend:key@smtp.resend.com:465",
        PUBLIC_URL: "https://pro-now.onrender.com",
      })
    ).not.toThrow();
  });

  for (const [key, value] of [
    ["DATABASE_URL", "postgresql://pronow@localhost:5432/pronow"],
    ["S3_ENDPOINT", "http://127.0.0.1:9000"],
    ["SMTP_URL", "smtp://localhost:1025"],
    ["GOOGLE_ISSUER_URL", "http://[::1]:8080/google"],
    ["PUBLIC_URL", "http://app.localhost:4000"],
    ["REDIS_URL", "redis://127.0.0.1:6379"],
  ] as const) {
    it(`refuses production with ${key} on this machine`, () => {
      expect(() => loadEnv({ ...base, NODE_ENV: "production", [key]: value })).toThrow(key);
    });
  }

  it("refuses staging the same way", () => {
    expect(() => loadEnv({ ...base, NODE_ENV: "staging", SMTP_URL: "smtp://localhost:1025" })).toThrow("SMTP_URL");
  });

  it("allows a production build against stand-ins only when asked explicitly", () => {
    expect(() =>
      loadEnv({ ...base, NODE_ENV: "production", SMTP_URL: "smtp://localhost:1025", ALLOW_LOCAL_STANDINS: "1" })
    ).not.toThrow();
  });
});
