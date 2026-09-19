import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Real microphone and real camera, in the web prototype.
 *
 * The alternative was a record button that pretends — and a button that
 * mimes its own function is the exact defect this round has been spent
 * removing. `MediaRecorder` and a file input are genuinely available on an
 * iPhone once the page is added to the home screen, so the prototype uses
 * them: the recording is yours, the playback is your voice, the photo is
 * your kitchen.
 *
 * Nothing leaves the device. There is no server and no upload; the media
 * live as in-memory object URLs for as long as the tab is open and are gone
 * when it closes. The screen says so rather than letting anyone assume
 * otherwise.
 *
 * In the Expo apps this whole hook is replaced by expo-av and
 * expo-image-picker. It sits in the prototype, not in packages/ui, so the
 * shared screen never reaches for a browser API it will not have on a phone.
 */

export interface CapturedPhoto {
  id: string;
  uri: string | null;
  subjectHe: string;
}

export interface CapturedVoice {
  uri: string | null;
  seconds: number;
}

export function useCapture() {
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [voice, setVoice] = useState<CapturedVoice | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const objectUrls = useRef<string[]>([]);

  const canRecord =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  // Object URLs are a leak if nobody revokes them, and a prototype someone
  // leaves open for an hour is exactly where that shows up.
  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [recording]);

  const startRecord = useCallback(async () => {
    if (!canRecord) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setVoice({ uri: url, seconds: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)) });
        // Release the microphone immediately; holding it keeps the recording
        // indicator lit, which reads as "this app is still listening".
        stream.getTracks().forEach((t) => t.stop());
      };
      recorderRef.current = rec;
      startedAtRef.current = Date.now();
      setRecordSeconds(0);
      rec.start();
      setRecording(true);
    } catch {
      // Permission refused, or no microphone. The screen already has an
      // honest state for that; it must not look like a crash.
      setRecording(false);
    }
  }, [canRecord]);

  const stopRecord = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const deleteVoice = useCallback(() => setVoice(null), []);

  /** Opens the camera on a phone, the file picker on a laptop. */
  const addPhoto = useCallback(() => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // `capture` makes iOS offer the camera first, which is what someone
    // standing in front of a leak actually wants.
    input.setAttribute("capture", "environment");
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      setPhotos((cur) => [
        ...cur,
        { id: `${Date.now()}-${cur.length}`, uri: url, subjectHe: "תמונה שצילמת" },
      ]);
    };
    input.click();
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((cur) => cur.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    setPhotos([]);
    setVoice(null);
    setRecordSeconds(0);
  }, []);

  return {
    photos,
    voice,
    recording,
    recordSeconds,
    canRecord,
    startRecord,
    stopRecord,
    deleteVoice,
    addPhoto,
    removePhoto,
    reset,
  };
}
