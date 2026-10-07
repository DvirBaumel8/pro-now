import { describe, expect, it } from "vitest";
import type { JobState, MyJobSummary } from "@pro-now/types";

import { dockOrdersFrom, liveOrders, orderStage, severalOrders } from "./orders";

const job = (id: string, status: JobState, createdAt: string, pro: string | null = null): MyJobSummary => ({
  id,
  status,
  createdAt,
  serviceNameHe: `שירות ${id}`,
  serviceCode: "HOME_PLUMB_LEAK",
  professional: pro ? { id: `p-${id}`, displayName: pro, addressAs: "F" } : null,
  ratingGiven: null,
  amountMinorUnits: null,
});

describe("several orders at once", () => {
  it("keeps the orders under way, oldest first, and drops history", () => {
    const jobs = [
      job("b", "PRO_EN_ROUTE", "2026-10-07T10:05:00Z", "דנה"),
      job("a", "SEARCHING", "2026-10-07T10:00:00Z"),
      job("c", "CLOSED", "2026-10-07T09:00:00Z", "רון"),
      job("d", "REVIEW_PENDING", "2026-10-07T09:30:00Z", "רון"),
      job("e", "CANCELLED", "2026-10-07T09:40:00Z"),
    ];
    expect(liveOrders(jobs).map((j) => j.id)).toEqual(["a", "b"]);
  });

  it("says each stage in the demo's words, with a halo where it waits on the customer", () => {
    expect(orderStage("SEARCHING", null)).toMatchObject({ statusHe: "מחפשים", attention: false, driving: false });
    expect(orderStage("PRO_EN_ROUTE", 12)).toMatchObject({ statusHe: "בדרך", driving: true });
    expect(orderStage("PRO_EN_ROUTE", 3)).toMatchObject({ statusHe: "מתקרב", driving: true });
    expect(orderStage("PRO_ARRIVED", null)).toMatchObject({ statusHe: "ליד הדלת", onSite: true, attention: true });
    expect(orderStage("DIAGNOSIS", null)).toMatchObject({ statusHe: "בבדיקה", onSite: true, attention: false });
    expect(orderStage("WAITING_QUOTE_APPROVAL", null)).toMatchObject({ statusHe: "הצעה לאישור", attention: true });
    expect(orderStage("IN_PROGRESS", null)).toMatchObject({ statusHe: "בעבודה", attention: false });
    expect(orderStage("COMPLETION_PENDING", null)).toMatchObject({ statusHe: "לאישור סיום", attention: true });
  });

  it("numbers the chips by when they were made, minutes only while the server's ETA counts", () => {
    const now = Date.parse("2026-10-07T10:10:00Z");
    const jobs = [job("b", "PRO_EN_ROUTE", "2026-10-07T10:05:00Z", "דנה"), job("a", "DIAGNOSIS", "2026-10-07T10:00:00Z", "רון")];
    const orders = dockOrdersFrom(
      jobs,
      { b: { eta: { etaSeconds: 600, distanceMeters: null, isRouteBased: false, computedAt: "2026-10-07T10:10:00Z" }, etaSecondsAtAssignment: 900 } },
      "b",
      now,
    );
    expect(orders.map((o) => [o.seq, o.id, o.statusHe, o.etaMinutes, o.focused])).toEqual([
      [1, "a", "בבדיקה", null, false],
      [2, "b", "בדרך", 10, true],
    ]);
    expect(orders[0]!.progress).toBeNull();
    expect(orders[1]!.proNameHe).toBe("דנה");
    // No ETA from the server: nothing said about minutes or distance.
    const blind = dockOrdersFrom([job("x", "PRO_EN_ROUTE", "2026-10-07T10:00:00Z", "דנה")], {}, null, now);
    expect([blind[0]!.etaMinutes, blind[0]!.progress]).toEqual([null, null]);
  });

  it("shows the dock only with two orders or more", () => {
    const now = Date.now();
    const one = dockOrdersFrom([job("a", "SEARCHING", "2026-10-07T10:00:00Z")], {}, null, now);
    const two = dockOrdersFrom([job("a", "SEARCHING", "2026-10-07T10:00:00Z"), job("b", "SEARCHING", "2026-10-07T10:01:00Z")], {}, null, now);
    expect([severalOrders(one), severalOrders(two)]).toEqual([false, true]);
  });
});
