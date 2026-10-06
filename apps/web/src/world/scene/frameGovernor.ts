/**
 * THE GLOW IS OPTIONAL; THE WALK IS NOT.
 *
 * The bloom and colour grade (postProcessing.ts) are what make the street
 * look like the demo's, and a phone GPU pays for them easily. A slow
 * renderer does not: on the e2e phone profile (software WebGL) they cost
 * two thirds of the frame rate, about 17 fps down to 6. So the world watches
 * its first frames with the effects on and, if they come in slower than the
 * budget, drops them once and for all and renders the plain scene.
 *
 * The first few frames are skipped (shader compiles and texture uploads make
 * them slow everywhere), and the median is used so that one hitch, such as a
 * tab coming back from the background, does not decide it.
 */
export interface FrameGovernorOptions {
  /** Slowest acceptable median frame, in ms. */
  budgetMs: number;
  /** Frames ignored at the start. */
  warmupFrames: number;
  /** Decide after this many frames... */
  sampleFrames: number;
  /** ...or once this much time has been sampled, with at least `minFrames`. */
  sampleMs: number;
  minFrames: number;
}

export type FrameVerdict = "measuring" | "keep" | "drop";

export const DEFAULT_FRAME_GOVERNOR: FrameGovernorOptions = {
  budgetMs: 1000 / 30,
  warmupFrames: 5,
  sampleFrames: 12,
  sampleMs: 1500,
  minFrames: 4,
};

export function createFrameGovernor(options: FrameGovernorOptions = DEFAULT_FRAME_GOVERNOR) {
  let seen = 0;
  let total = 0;
  const samples: number[] = [];
  let verdict: FrameVerdict = "measuring";

  return {
    /** Record one frame's duration; returns the verdict so far. */
    record(frameMs: number): FrameVerdict {
      if (verdict !== "measuring") return verdict;
      seen += 1;
      if (seen <= options.warmupFrames || !Number.isFinite(frameMs) || frameMs <= 0) return verdict;
      samples.push(frameMs);
      total += frameMs;
      const enough =
        samples.length >= options.sampleFrames ||
        (total >= options.sampleMs && samples.length >= options.minFrames);
      if (!enough) return verdict;
      verdict = median(samples) > options.budgetMs ? "drop" : "keep";
      return verdict;
    },
    get verdict(): FrameVerdict {
      return verdict;
    },
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * THE PAGE COMES FIRST.
 *
 * The street renders behind the job's screens (JobWorldBackdrop), and on a
 * slow device every frame of it is main-thread time the buttons over it do not
 * get. Measured: at 4× CPU throttling the customer's "שליחת … אליי" took over
 * 15 s to become clickable with the street behind it, and 3.5 s without it; CI's
 * software WebGL failed the job flows the same way.
 *
 * So the street takes at most `share` of the main thread: after a frame that
 * cost `costMs`, the next one is drawn no sooner than `costMs / share` after
 * this one started. A phone frame of 3 ms waits 6 ms, under one display frame,
 * so nothing changes there; a 60 ms software frame waits 120 ms, leaving the
 * page half of every second.
 */
export const RENDER_SHARE = 0.5;

/** When the next frame may start, given when this one started and what it cost. */
export function nextRenderAt(startMs: number, costMs: number, share = RENDER_SHARE): number {
  if (!(costMs > 0) || !Number.isFinite(costMs)) return startMs;
  return startMs + costMs / share;
}
