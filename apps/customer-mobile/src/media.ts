import type { FaultPhoto, FaultVoice } from "@pro-now/ui";

export type CaptureUpload = {
  kind: "PHOTO" | "VOICE_NOTE";
  mime: string;
  uri: string;
};

const PHOTO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function captureUploads(
  photos: readonly (FaultPhoto & { mimeType?: string })[],
  voice: (FaultVoice & { mimeType?: string }) | null
): CaptureUpload[] {
  const photoUploads = photos.flatMap((photo): CaptureUpload[] => {
    if (!photo.uri) return [];
    return [{ kind: "PHOTO", mime: photoMime(photo.mimeType, photo.uri), uri: photo.uri }];
  });

  return voice?.uri
    ? [...photoUploads, { kind: "VOICE_NOTE", mime: voiceMime(voice.mimeType, voice.uri), uri: voice.uri }]
    : photoUploads;
}

function photoMime(declared: string | undefined, uri: string): string {
  const normalized = declared?.toLowerCase();
  if (normalized && PHOTO_MIMES.has(normalized)) return normalized;
  if (/\.png(?:$|\?)/i.test(uri)) return "image/png";
  if (/\.webp(?:$|\?)/i.test(uri)) return "image/webp";
  return "image/jpeg";
}

function voiceMime(declared: string | undefined, uri: string): string {
  const normalized = declared?.toLowerCase();
  if (normalized === "audio/mp4" || normalized === "audio/webm" || normalized === "audio/ogg") {
    return normalized;
  }
  if (/\.webm(?:$|\?)/i.test(uri)) return "audio/webm";
  if (/\.ogg(?:$|\?)/i.test(uri)) return "audio/ogg";
  return "audio/mp4";
}
