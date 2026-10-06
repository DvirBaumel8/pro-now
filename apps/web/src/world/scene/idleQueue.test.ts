import { describe, expect, it } from "vitest";

import { createIdleQueue } from "./idleQueue";

/** A schedule that holds each callback until the test lets it run. */
function manual() {
  const pending: Array<() => void> = [];
  return { schedule: (run: () => void) => void pending.push(run), step: () => pending.shift()?.(), pending };
}

describe("the idle queue", () => {
  it("runs one job per idle period, in order", () => {
    const { schedule, step, pending } = manual();
    const ran: number[] = [];
    const queue = createIdleQueue(schedule);
    queue.push(() => ran.push(1));
    queue.push(() => ran.push(2));
    expect(ran).toEqual([]);
    expect(pending).toHaveLength(1);
    step();
    expect(ran).toEqual([1]);
    step();
    expect(ran).toEqual([1, 2]);
    expect(pending).toHaveLength(0);
  });

  it("drops what has not run once disposed", () => {
    const { schedule, step } = manual();
    const ran: number[] = [];
    const queue = createIdleQueue(schedule);
    queue.push(() => ran.push(1));
    queue.push(() => ran.push(2));
    queue.dispose();
    step();
    queue.push(() => ran.push(3));
    step();
    expect(ran).toEqual([]);
  });
});
