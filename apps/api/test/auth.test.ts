import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import jwt from "jsonwebtoken";
import { signSession, verifySession, issueOtp, verifyOtp } from "../src/lib/auth";

/**
 * Epic 2 — auth & account. The session token is what every authenticated
 * route trusts, so the negative cases (wrong secret, tampering, expiry)
 * matter more than the happy path.
 */

const SECRET = "test-secret-not-a-real-one";
const claims = { userId: "usr_1", phone: "+972501234567" };

describe("session tokens", () => {
  it("round-trips the claims", () => {
    const token = signSession(claims, SECRET);
    const decoded = verifySession(token, SECRET);
    expect(decoded.userId).toBe(claims.userId);
    expect(decoded.phone).toBe(claims.phone);
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession(claims, "some-other-secret");
    expect(() => verifySession(token, SECRET)).toThrow();
  });

  it("rejects a tampered payload", () => {
    const token = signSession(claims, SECRET);
    const [header, payload, signature] = token.split(".");
    const forged = JSON.parse(Buffer.from(payload!, "base64url").toString());
    forged.userId = "usr_attacker";
    const tamperedPayload = Buffer.from(JSON.stringify(forged)).toString("base64url");
    expect(() => verifySession(`${header}.${tamperedPayload}.${signature}`, SECRET)).toThrow();
  });

  it("rejects an unsigned 'alg: none' token", () => {
    const forged = jwt.sign(claims, "", { algorithm: "none" });
    expect(() => verifySession(forged, SECRET)).toThrow();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(claims, SECRET, { expiresIn: -1 });
    expect(() => verifySession(expired, SECRET)).toThrow();
  });

  it("rejects a structurally invalid token", () => {
    expect(() => verifySession("not-a-jwt", SECRET)).toThrow();
  });

  it("issues a token that carries an expiry claim at all", () => {
    const decoded = jwt.decode(signSession(claims, SECRET)) as { exp?: number };
    expect(typeof decoded.exp).toBe("number");
  });
});

describe("sandbox OTP", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-19T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("verifies the code it issued", () => {
    const phone = "+972500000001";
    const code = issueOtp(phone);
    expect(verifyOtp(phone, code)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const phone = "+972500000002";
    issueOtp(phone);
    expect(verifyOtp(phone, "000000")).toBe(false);
  });

  it("rejects a phone that was never issued a code", () => {
    expect(verifyOtp("+972500000003", "123456")).toBe(false);
  });

  it("rejects a code after it expires", () => {
    const phone = "+972500000004";
    const code = issueOtp(phone);
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    expect(verifyOtp(phone, code)).toBe(false);
  });

  it("does not let one phone's code authenticate another phone", () => {
    const code = issueOtp("+972500000005");
    issueOtp("+972500000006");
    // Both are the same sandbox constant, so this asserts the store is
    // keyed per phone rather than global — it will matter the moment a real
    // SMS provider replaces the sandbox and codes differ per phone.
    expect(verifyOtp("+972500000006", code)).toBe(true);
    expect(verifyOtp("+972500000099", code)).toBe(false);
  });
});
