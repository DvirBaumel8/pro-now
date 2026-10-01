/**
 * Keeps one bug from becoming two hundred messages (docs/16-DEPLOYMENT.md §Observability
 * §Alert hygiene).
 *
 * - The first occurrence of a fingerprint is sent at once.
 * - Repeats inside the window are counted, and one summary is sent when the
 *   window closes ("×37 more in the last 10 min").
 * - Across all fingerprints, at most `maxPerHour` messages leave per rolling
 *   hour; what the cap dropped is reported on the next message that passes.
 *
 * In memory, which is correct for the one instance this service runs as. A
 * restart forgets the windows, so the first error after it alerts again.
 */
export interface ThrottleOptions {
  windowMs: number;
  maxPerHour: number;
  now?: () => number;
  /** Called with the summary text when a window closes with repeats in it. */
  onSummary: (fingerprint: string, repeats: number, title: string) => void;
}

export type ThrottleDecision = { send: true; droppedBefore: number } | { send: false };

const HOUR_MS = 60 * 60 * 1000;

export class AlertThrottle {
  private readonly windows = new Map<string, { repeats: number; title: string; timer: ReturnType<typeof setTimeout> }>();
  private readonly sentAt: number[] = [];
  private dropped = 0;
  private readonly now: () => number;

  constructor(private readonly opts: ThrottleOptions) {
    this.now = opts.now ?? Date.now;
  }

  /** Whether an occurrence of `fingerprint` should be announced now. */
  hit(fingerprint: string, title: string): ThrottleDecision {
    const open = this.windows.get(fingerprint);
    if (open) {
      open.repeats += 1;
      return { send: false };
    }

    const timer = setTimeout(() => this.close(fingerprint), this.opts.windowMs);
    timer.unref?.();
    this.windows.set(fingerprint, { repeats: 0, title, timer });
    return this.admit();
  }

  /** Claims a slot under the hourly cap; used for summaries too. */
  admit(): ThrottleDecision {
    const cutoff = this.now() - HOUR_MS;
    while (this.sentAt.length > 0 && this.sentAt[0]! <= cutoff) this.sentAt.shift();
    if (this.sentAt.length >= this.opts.maxPerHour) {
      this.dropped += 1;
      return { send: false };
    }
    this.sentAt.push(this.now());
    const droppedBefore = this.dropped;
    this.dropped = 0;
    return { send: true, droppedBefore };
  }

  /** Stops every pending summary timer (server shutdown, tests). */
  dispose(): void {
    for (const w of this.windows.values()) clearTimeout(w.timer);
    this.windows.clear();
  }

  private close(fingerprint: string): void {
    const w = this.windows.get(fingerprint);
    this.windows.delete(fingerprint);
    if (w && w.repeats > 0) this.opts.onSummary(fingerprint, w.repeats, w.title);
  }
}
