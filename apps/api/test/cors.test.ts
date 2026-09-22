import { describe, it, expect } from "vitest";
import { isOriginAllowed } from "../src/plugins/cors";

describe("CORS origins — apps/api/src/plugins/cors.ts", () => {
  const allowList = ["https://admin.example.com"];

  it("allows an origin the deployment named", () => {
    expect(isOriginAllowed("https://admin.example.com", allowList, false)).toBe(true);
  });

  it("refuses an origin nobody named", () => {
    expect(isOriginAllowed("https://evil.example.com", allowList, false)).toBe(false);
  });

  it("refuses a lookalike of an allowed origin", () => {
    for (const origin of [
      "https://admin.example.com.evil.com",
      "https://notadmin.example.com",
      "http://admin.example.com", // scheme is part of the origin
    ]) {
      expect(isOriginAllowed(origin, allowList, false)).toBe(false);
    }
  });

  describe("private network, local only", () => {
    const localOrigins = [
      "http://localhost:4421",
      "http://127.0.0.1:4421",
      "http://[::1]:4421",
      "http://10.100.102.13:4421",
      "http://192.168.1.42:4421",
      "http://172.16.0.9:4421",
      "http://172.31.255.254:4421",
    ];

    it("allows a phone on the same Wi-Fi when NODE_ENV is local", () => {
      for (const origin of localOrigins) {
        expect(isOriginAllowed(origin, [], true), origin).toBe(true);
      }
    });

    it("refuses every one of them when it is not", () => {
      // The whole point: this convenience must not survive into staging.
      for (const origin of localOrigins) {
        expect(isOriginAllowed(origin, [], false), origin).toBe(false);
      }
    });

    it("does not mistake a public address for a private one", () => {
      for (const origin of [
        "http://172.32.0.1:4421", // just past the private range
        "http://172.15.0.1:4421", // just before it
        "http://11.0.0.1:4421",
        "http://193.168.1.1:4421",
        "http://localhost.evil.com",
        "http://127.0.0.1.evil.com",
      ]) {
        expect(isOriginAllowed(origin, [], true), origin).toBe(false);
      }
    });
  });
});
