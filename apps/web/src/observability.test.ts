import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@pro-now/api-client";
import { isNoise, reportError } from "./observability";

describe("isNoise", () => {
  it("ignores extensions, the ResizeObserver warning and opaque cross-origin errors", () => {
    expect(isNoise({ message: "ResizeObserver loop completed with undelivered notifications." }, true)).toBe(true);
    expect(isNoise({ message: "Script error." }, true)).toBe(true);
    expect(isNoise({ message: "x", stack: "at f (chrome-extension://abc/content.js:1:1)" }, true)).toBe(true);
  });

  it("ignores a failed fetch only while the device is offline", () => {
    expect(isNoise({ message: "Failed to fetch" }, false)).toBe(true);
    expect(isNoise({ message: "Failed to fetch" }, true)).toBe(false);
    expect(isNoise({ message: "Load failed" }, false)).toBe(true);
  });

  it("keeps a real bug", () => {
    expect(isNoise({ message: "Cannot read properties of undefined (reading 'price')" }, true)).toBe(false);
  });
});

describe("reportError", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("window", { location: { pathname: "/addresses" } });
  });
  afterEach(() => vi.unstubAllGlobals());

  const sentBody = (i = 0) => JSON.parse(fetchMock.mock.calls[i]![1]!.body as string);

  it("sends a scrubbed report to the server", () => {
    reportError(new TypeError("no address for dana@example.com"), "render");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/v1/client-errors");
    expect(init).toMatchObject({ method: "POST", keepalive: true });
    expect(sentBody()).toMatchObject({ kind: "render", name: "TypeError", message: "no address for [email]", path: "/addresses" });
  });

  it("carries the server's requestId when the crash came from an API call", () => {
    reportError(new ApiError(500, "INTERNAL_ERROR", "Internal server error", "req-42"), "unhandledrejection");
    expect(sentBody().requestId).toBe("req-42");
  });

  it("announces the same crash once a minute at most", () => {
    // One throw site, as a bug in a render loop would be.
    const crash = (n: number) => reportError(new Error(`same thing ${n}`), "error");
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    crash(1);
    crash(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    now.mockReturnValue(1_000_000 + 61_000);
    crash(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    now.mockRestore();
  });

  it("never throws, even when reporting itself fails", () => {
    fetchMock.mockImplementation(() => {
      throw new Error("fetch is broken");
    });
    expect(() => reportError(new Error("distinct failure"), "error")).not.toThrow();
  });

  it("sends nothing for noise", () => {
    reportError(new Error("ResizeObserver loop limit exceeded"), "error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
