import { describe, expect, it, vi } from "vitest";

import {
  compressImage,
  chooseVoiceMimeType,
  fitImageSize,
  MAX_VOICE_SECONDS,
  VoiceRecorderSession,
} from "./media";

describe("web media helpers", () => {
  it("chooses iOS audio/mp4 before webm and falls back when unsupported", () => {
    class Recorder {
      static isTypeSupported(type: string) {
        return type === "audio/mp4" || type === "audio/webm;codecs=opus";
      }
    }
    expect(chooseVoiceMimeType(Recorder)).toBe("audio/mp4");

    class WebmOnly {
      static isTypeSupported(type: string) {
        return type === "audio/webm";
      }
    }
    expect(chooseVoiceMimeType(WebmOnly)).toBe("audio/webm");
  });

  it("fits the long edge without enlarging small images", () => {
    expect(fitImageSize(4000, 2000, 1600)).toEqual({ width: 1600, height: 800 });
    expect(fitImageSize(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it("re-encodes through a canvas, dropping the source metadata", async () => {
    const toBlob = vi.fn((done: BlobCallback) => done(new Blob(["jpeg"], { type: "image/jpeg" })));
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob,
    } as unknown as HTMLCanvasElement;
    const bitmap = { width: 4000, height: 2000, close: vi.fn() } as unknown as ImageBitmap;

    const result = await compressImage(new Blob(["exif + pixels"], { type: "image/jpeg" }), {
      createImageBitmap: async () => bitmap,
      createCanvas: () => canvas,
    });

    expect(result.type).toBe("image/jpeg");
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(800);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/jpeg", 0.8);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it("automatically stops at 90 seconds and keeps the voice blob", async () => {
    vi.useFakeTimers();
    class FakeRecorder {
      static isTypeSupported = (type: string) => type === "audio/mp4";
      state = "inactive";
      mimeType = "audio/mp4";
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: ((event: Event) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) } as BlobEvent);
        this.onstop?.({} as Event);
      }
    }
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    const session = new VoiceRecorderSession(stream, FakeRecorder);
    session.start();
    vi.advanceTimersByTime(MAX_VOICE_SECONDS * 1000);
    const result = await session.stop();

    expect(result.size).toBeGreaterThan(0);
    expect(result.type).toBe("audio/mp4");
    vi.useRealTimers();
  });
});
