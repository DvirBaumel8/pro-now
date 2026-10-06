import { describe, expect, it } from "vitest";

import { backdropGapMs, createFrameGovernor, DEFAULT_FRAME_GOVERNOR, displayFrame, isSoftwareRenderer, nextRenderAfter } from "./frameGovernor";

const feed = (frames: number[]) => {
  const governor = createFrameGovernor();
  let last = governor.verdict;
  for (const ms of frames) last = governor.record(ms);
  return last;
};

describe("frame governor", () => {
  const warmup = Array(DEFAULT_FRAME_GOVERNOR.warmupFrames).fill(400);

  it("keeps the effects on a fast device, whatever the slow warm-up", () => {
    expect(feed([...warmup, ...Array(12).fill(16.7)])).toBe("keep");
  });

  it("drops them when frames come in slower than 30 fps", () => {
    expect(feed([...warmup, ...Array(12).fill(45)])).toBe("drop");
  });

  it("decides on a very slow renderer within about 1.5 s of sampling", () => {
    // Software WebGL with the effects on: ~180 ms a frame.
    const governor = createFrameGovernor();
    warmup.forEach((ms) => governor.record(ms));
    const verdicts = Array.from({ length: 12 }, () => governor.record(180));
    expect(verdicts.indexOf("drop")).toBe(8); // 9 frames × 180 ms ≥ 1500 ms
  });

  it("is not swayed by one hitch", () => {
    expect(feed([...warmup, 16, 17, 900, 16, 17, 16, 17, 16, 17, 16, 17, 16])).toBe("keep");
  });

  it("waits while there are too few frames to judge", () => {
    expect(feed([...warmup, 20, 20, 20])).toBe("measuring");
  });

  it("ignores frames that measured nothing", () => {
    expect(feed([...warmup, 0, NaN, -5, ...Array(11).fill(20)])).toBe("measuring");
  });

  it("does not change its mind", () => {
    const governor = createFrameGovernor();
    [...warmup, ...Array(12).fill(16)].forEach((ms) => governor.record(ms));
    expect(governor.record(500)).toBe("keep");
    expect(governor.verdict).toBe("keep");
  });
});

describe("the page comes first", () => {
  it("waits as long as a frame overran, so the page gets about half the main thread", () => {
    // A software frame: rendered at 1000, read back until the next animation frame at 1500.
    expect(nextRenderAfter(1500, 1000, 16.7)).toBeCloseTo(1500 + 500 - 33.4);
  });

  it("changes nothing with a GPU: a frame takes one display frame", () => {
    expect(nextRenderAfter(1016.7, 1000, 16.7)).toBe(1016.7);
    expect(nextRenderAfter(1033, 1000, 16.7)).toBe(1033);
  });

  it("ignores a frame with no measured cost", () => {
    expect(nextRenderAfter(1000, 1000, 16.7)).toBe(1000);
    expect(nextRenderAfter(1000, NaN, 16.7)).toBe(1000);
  });

  it("learns the display frame as the shortest gap, within reason", () => {
    expect(displayFrame(1000 / 30, 16.7)).toBe(16.7);
    expect(displayFrame(16.7, 500)).toBe(16.7);
    expect(displayFrame(16.7, 0)).toBe(16.7);
    expect(displayFrame(16.7, 1)).toBeCloseTo(1000 / 240);
  });
});

describe("without a GPU the street behind a screen is a still", () => {
  it("knows a software renderer by its name", () => {
    expect(isSoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)")).toBe(true);
    expect(isSoftwareRenderer("llvmpipe (LLVM 15.0.7, 256 bits)")).toBe(true);
    expect(isSoftwareRenderer("Apple GPU")).toBe(false);
    expect(isSoftwareRenderer(null)).toBe(false);
  });

  it("caps only a backdrop, only without a GPU", () => {
    expect(backdropGapMs(true, false)).toBe(200);
    expect(backdropGapMs(true, true)).toBe(0);
    expect(backdropGapMs(false, false)).toBe(0);
  });
});
