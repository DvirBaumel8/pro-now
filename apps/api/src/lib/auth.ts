import jwt from "jsonwebtoken";

export interface SessionClaims {
  userId: string;
  phone: string;
}

export function signSession(claims: SessionClaims, secret: string): string {
  return jwt.sign(claims, secret, { expiresIn: "30d" });
}

export function verifySession(token: string, secret: string): SessionClaims {
  return jwt.verify(token, secret) as SessionClaims;
}

/**
 * OTP is abstracted behind this tiny in-memory store for local/test.
 * A production build would replace this with an SMS provider adapter
 * (vendor TBD) — never a hard dependency baked into route handlers.
 */
/**
 * The sandbox OTP accepts one fixed code, so on any deployed environment it
 * would let anyone sign in as any phone number. Its routes exist only on a
 * developer machine and in tests; real sign-in is W1 (Google + email link,
 * /docs/21-PRODUCTION-PLAN.md).
 */
export function sandboxOtpAllowed(nodeEnv: string): boolean {
  return nodeEnv === "local" || nodeEnv === "test";
}

const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function issueOtp(phone: string): string {
  // Deterministic, loudly-logged sandbox code so local/E2E tests don't
  // need a real SMS vendor. Never used when NODE_ENV=production.
  const code = "123456";
  otpStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
  return code;
}

export function verifyOtp(phone: string, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;
  return entry.code === code;
}
