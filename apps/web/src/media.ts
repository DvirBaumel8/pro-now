export const MAX_IMAGE_EDGE = 1600;
export const JPEG_QUALITY = 0.8;
export const MAX_VOICE_SECONDS = 90;

const VOICE_MIME_TYPES = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"] as const;

export function fitImageSize(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) throw new Error("Image dimensions must be positive");
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

type ImageBitmapFactory = (source: Blob) => Promise<ImageBitmap>;

export interface ImageCompressionDependencies {
  createImageBitmap?: ImageBitmapFactory;
  createCanvas?: () => HTMLCanvasElement;
}

/**
 * Re-encodes through a canvas. Canvas serialization intentionally does not
 * carry EXIF, including GPS coordinates, into the upload.
 */
export async function compressImage(
  source: Blob,
  dependencies: ImageCompressionDependencies = {}
): Promise<Blob> {
  const decode = dependencies.createImageBitmap ?? globalThis.createImageBitmap;
  if (!decode) throw new Error("IMAGE_COMPRESSION_UNAVAILABLE");

  const bitmap = await decode(source);
  try {
    const size = fitImageSize(bitmap.width, bitmap.height, MAX_IMAGE_EDGE);
    const canvas = dependencies.createCanvas?.() ?? document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("IMAGE_COMPRESSION_UNAVAILABLE");
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error("IMAGE_COMPRESSION_FAILED"));
      }, "image/jpeg", JPEG_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}

export interface MediaRecorderConstructor {
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorderLike;
  isTypeSupported?: (mimeType: string) => boolean;
}

export interface MediaRecorderLike {
  readonly state: string;
  readonly mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onstop: ((event: Event) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  start(timeslice?: number): void;
  stop(): void;
}

export function chooseVoiceMimeType(
  recorder: Pick<MediaRecorderConstructor, "isTypeSupported"> | undefined =
    typeof MediaRecorder === "undefined" ? undefined : MediaRecorder
): string | null {
  if (!recorder?.isTypeSupported) return null;
  return VOICE_MIME_TYPES.find((mime) => recorder.isTypeSupported?.(mime)) ?? null;
}

export class VoiceRecorderSession {
  readonly mimeType: string;
  private recorder: MediaRecorderLike | null = null;
  private chunks: Blob[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private stopResult: Promise<Blob> | null = null;
  private lastBlob: Blob | null = null;
  private resolveStop: ((blob: Blob) => void) | null = null;
  private rejectStop: ((error: Error) => void) | null = null;

  constructor(
    private readonly stream: MediaStream,
    private readonly Recorder: MediaRecorderConstructor,
    private readonly onSeconds?: (seconds: number) => void
  ) {
    const mimeType = chooseVoiceMimeType(Recorder);
    if (!mimeType) throw new Error("VOICE_RECORDING_UNSUPPORTED");
    this.mimeType = mimeType;
  }

  get seconds(): number {
    return this.startedAt === 0 ? 0 : Math.min(MAX_VOICE_SECONDS, Math.floor((Date.now() - this.startedAt) / 1000));
  }

  start(): void {
    if (this.recorder) throw new Error("VOICE_RECORDING_ALREADY_STARTED");
    this.chunks = [];
    this.lastBlob = null;
    this.startedAt = Date.now();
    const recorder = new this.Recorder(this.stream, { mimeType: this.mimeType });
    this.recorder = recorder;
    recorder.ondataavailable = ({ data }) => {
      if (data.size > 0) this.chunks.push(data);
    };
    recorder.onerror = () => {
      this.rejectStop?.(new Error("VOICE_RECORDING_FAILED"));
      this.clearTimers();
    };
    recorder.onstop = () => {
      const result = new Blob(this.chunks, { type: this.mimeType });
      this.lastBlob = result;
      this.clearTimers();
      this.recorder = null;
      this.resolveStop?.(result);
      this.resolveStop = null;
      this.rejectStop = null;
    };
    recorder.start(250);
    this.timer = setInterval(() => this.onSeconds?.(this.seconds), 250);
    this.stopTimer = setTimeout(() => void this.stop(), MAX_VOICE_SECONDS * 1000);
  }

  stop(): Promise<Blob> {
    if (!this.recorder) return Promise.resolve(this.lastBlob ?? new Blob([], { type: this.mimeType }));
    if (this.stopResult) return this.stopResult;
    this.stopResult = new Promise<Blob>((resolve, reject) => {
      this.resolveStop = resolve;
      this.rejectStop = reject;
    });
    this.recorder.stop();
    return this.stopResult;
  }

  dispose(): void {
    this.clearTimers();
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.stream.getTracks().forEach((track) => track.stop());
    this.recorder = null;
  }

  private clearTimers(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.stopTimer) clearTimeout(this.stopTimer);
    this.timer = null;
    this.stopTimer = null;
  }
}

export async function requestVoiceStream(
  mediaDevices: Pick<MediaDevices, "getUserMedia"> = navigator.mediaDevices
): Promise<MediaStream> {
  return mediaDevices.getUserMedia({ audio: true });
}
