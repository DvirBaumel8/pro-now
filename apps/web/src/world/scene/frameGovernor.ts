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
 * The street renders behind the job's screens (JobWorldBackdrop). Without a
 * GPU (software WebGL, as on a CI runner) Chrome composites in software too,
 * and every street frame is read back to the CPU on the main thread: the page
 * waits until that frame is fully drawn. Traced: 15 frames held the main
 * thread 15.4 s in one job flow (median 0.5 s, the first ones 4 s), and the
 * customer's "שליחת … אליי" took more than 15 s to become clickable.
 *
 * That wait lands after the render call returns, so a frame's real cost is
 * the time until the next animation frame. Whatever it overran a display
 * frame by, the street now waits again before drawing, which leaves the page
 * about half the main thread. With a GPU a frame takes one display frame and
 * nothing changes.
 */
export function nextRenderAfter(nowMs: number, lastRenderStartMs: number, displayFrameMs: number): number {
  const cost = nowMs - lastRenderStartMs;
  if (!(cost > 0) || !Number.isFinite(cost)) return nowMs;
  return nowMs + Math.max(0, cost - 2 * displayFrameMs);
}

/** The display's frame interval, learnt as the shortest gap between animation frames (at most 1/30 s). */
export function displayFrame(previousMs: number, gapMs: number): number {
  return gapMs > 0 && Number.isFinite(gapMs) ? Math.min(previousMs, Math.max(gapMs, 1000 / 240)) : previousMs;
}

/**
 * WITHOUT A GPU, THE STREET BEHIND A SCREEN IS A STILL.
 *
 * Software WebGL (SwiftShader, llvmpipe: a phone or a CI runner with no GPU)
 * renders the street on the same CPU the app and the browser run on. Behind a
 * job's screens the street is decoration, and there it costs the screens their
 * responsiveness: with SwiftShader the arrival flow took 18 s instead of 3.5 s.
 * So on a software renderer a backdrop draws at most every 200 ms. The street
 * you walk is not capped, and a renderer with a GPU never is.
 */
export const SOFTWARE_BACKDROP_GAP_MS = 200;

/** Without a GPU: one pixel per CSS pixel, and no sun shadows (3.5 s of an 18 s job flow, traced). */
export const SOFTWARE_PIXEL_RATIO = 1;

export function isSoftwareRenderer(name: string | null | undefined): boolean {
  return /swiftshader|llvmpipe|softpipe|software/i.test(name ?? "");
}

/** The least time between two backdrop frames: none with a GPU, 200 ms without. */
export function backdropGapMs(software: boolean, walking: boolean): number {
  return software && !walking ? SOFTWARE_BACKDROP_GAP_MS : 0;
}
