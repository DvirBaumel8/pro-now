import { z } from "zod";

/**
 * Shared environment schema. Every app validates its own process.env
 * through this at startup and fails fast on a missing/invalid var —
 * never falls back to a silently wrong default in a real environment.
 * Secrets are only ever read from process.env (populated by the
 * environment/secret manager) — never hard-coded, never committed.
 * See /docs/04-TECH-ARCHITECTURE.md §Environments.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["local", "test", "staging", "production"]).default("local"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),

  // Vendor flags — 'sandbox' is the only supported value until a business
  // decision is made per /docs/18-ROADMAP.md §Open Decisions.
  PAYMENT_PROVIDER: z.enum(["sandbox"]).default("sandbox"),
  IDENTITY_PROVIDER: z.enum(["sandbox"]).default("sandbox"),
  MAPS_PROVIDER: z.enum(["sandbox", "google"]).default("sandbox"),
  EXTERNAL_REPUTATION_PROVIDER: z.enum(["sandbox", "google"]).default("sandbox"),

  GOOGLE_MAPS_API_KEY: z.string().optional(),

  DISPATCH_OFFER_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(30),
  /**
   * How long the server keeps looking before telling the customer that
   * nobody is available. Unlike the offer timeout, this one is a promise
   * to a person rather than a property of the engine, and it is recorded
   * as unconfirmed in /docs/18-ROADMAP.md §Open decisions. The default is
   * a starting point.
   */
  DISPATCH_SEARCH_DEADLINE_SECONDS: z.coerce.number().int().positive().default(300),
  DISPATCH_GEO_PREFILTER_KM: z.coerce.number().positive().default(8),
  LOCATION_FRESHNESS_THRESHOLD_SECONDS: z.coerce.number().int().positive().default(90),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
