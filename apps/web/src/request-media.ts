export interface WebPhotoCapture {
  id: string;
  blob: Blob;
  uri: string;
}

export interface WebVoiceCapture {
  blob: Blob;
  seconds: number;
}

export type MediaUploadInput = {
  kind: "PHOTO" | "VOICE_NOTE";
  mime: string;
  body: Blob;
};

export function mediaUploadInputs(
  photos: readonly WebPhotoCapture[],
  voice: WebVoiceCapture | null
): MediaUploadInput[] {
  const photoInputs = photos.map((photo) => ({
    kind: "PHOTO" as const,
    mime: photo.blob.type || "image/jpeg",
    body: photo.blob,
  }));
  return voice
    ? [...photoInputs, { kind: "VOICE_NOTE", mime: voice.blob.type || "audio/webm", body: voice.blob }]
    : photoInputs;
}
