/**
 * ONE PIECE OF HEAVY WORK AT A TIME, WHEN THE PAGE IS IDLE.
 *
 * Some of the street's work happens once, as its art arrives: a normal map
 * read from each building's drawing, a shop's window cut out of its drawing
 * and its room put behind it. Each piece is a few hundred milliseconds on a
 * slow phone, and done all at once they held the job screen's buttons over
 * the street for more than 15 s (measured at 4× CPU throttling). Queued here,
 * they run one per idle period, so the page answers in between.
 */
export interface IdleQueue {
  push(job: () => void): void;
  /** Drop what has not run yet. */
  dispose(): void;
}

type Schedule = (run: () => void) => void;

/** requestIdleCallback where there is one (with a 1 s deadline so work still progresses), else a short timeout. */
const whenIdle: Schedule = (run) => {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number })
    .requestIdleCallback;
  if (idle) idle(run, { timeout: 1000 });
  else setTimeout(run, 50);
};

export function createIdleQueue(schedule: Schedule = whenIdle): IdleQueue {
  const jobs: Array<() => void> = [];
  let waiting = false;
  let disposed = false;
  const next = () => {
    if (waiting || disposed || jobs.length === 0) return;
    waiting = true;
    schedule(() => {
      waiting = false;
      if (disposed) return;
      jobs.shift()?.();
      next();
    });
  };
  return {
    push(job) {
      if (disposed) return;
      jobs.push(job);
      next();
    },
    dispose() {
      disposed = true;
      jobs.length = 0;
    },
  };
}
