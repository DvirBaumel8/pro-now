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

  /**
   * WHY RECORDING MIGHT NOT WORK, IN WORDS.
   *
   * Amit: *"הקלטה עדיין לא עושה כלום."* The button was disabled at 35%
   * opacity and said nothing, which is the worst of both worlds — it looks
   * like a button, it is dim enough to seem broken rather than
   * unavailable, and it gives no reason.
   *
   * There are three real reasons, and a customer deserves to be told which
   * one applies rather than being left to tap a dead circle:
   *   - the page is not on HTTPS, so the browser blocks the microphone
   *     outright;
   *   - the page is inside a frame that was not granted microphone access,
   *     which is the case in the published preview;
   *   - the person said no to the permission prompt, or there is no
   *     microphone.
   *
   * The first two are knowable before the tap. The third is only knowable
   * after it, which is why `recordError` is set from the failure too.
   */
  const [recordError, setRecordError] = useState<string | null>(null);

  const canRecord =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  /** Why not, when `canRecord` is false. Null when it is available. */
  const recordBlockedHe =
    canRecord
      ? null
      : typeof window !== "undefined" && !window.isSecureContext
        ? "הקלטה דורשת חיבור מאובטח (HTTPS)."
        : typeof window !== "undefined" && window.self !== window.top
          ? "בתצוגה המוטמעת אין גישה למיקרופון. פתחו את הקישור בחלון נפרד כדי להקליט."
          : "הדפדפן הזה לא מאפשר הקלטה.";

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
    if (!canRecord) {
      setRecordError(recordBlockedHe);
      return;
    }
    setRecordError(null);
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
    } catch (e) {
      // Permission refused, or no microphone. Saying which is the whole
      // point: "לא אושרה גישה" is something a person can act on, and a
      // silent no-op is not.
      const name = (e as { name?: string })?.name;
      setRecordError(
        name === "NotAllowedError"
          ? "לא אושרה גישה למיקרופון. אפשר לאשר בהגדרות הדפדפן ולנסות שוב."
          : name === "NotFoundError"
            ? "לא נמצא מיקרופון במכשיר."
            : "ההקלטה לא הצליחה להתחיל."
      );
      setRecording(false);
    }
  }, [canRecord, recordBlockedHe]);

  const stopRecord = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const deleteVoice = useCallback(() => setVoice(null), []);

  /**
   * ONE PICKER, TWO DOORS — and the difference is a single attribute.
   *
   * Amit: *"גלריה ומצלמה — שניהם פותחים מצלמה כרגע."* He is right, and the
   * cause was that both buttons called this one function, which always set
   * `capture="environment"`. That attribute is not a hint: on a phone it
   * takes the file picker away entirely and opens the camera, so the
   * gallery button could not reach the gallery.
   *
   * Two callers now, one body. With `capture` the camera opens, which is
   * what somebody standing in front of a leak wants; without it the phone
   * offers the photo library, which is what somebody who already
   * photographed the leak an hour ago wants. They are different moments and
   * they were sharing one button.
   *
   * The caption differs too. "תמונה שצילמת" on a picture chosen from the
   * library is a small false statement about where it came from, and the
   * professional reads that caption.
   */
  const pickImage = useCallback((source: "camera" | "library") => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      // Several at once: a gallery visit that takes one photo and makes you
      // come back is worse than no gallery button.
      input.multiple = true;
    }
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      const added = files.map((file, i) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        return {
          id: `${Date.now()}-${i}`,
          uri: url,
          subjectHe: source === "camera" ? "תמונה שצילמת" : "תמונה מהגלריה",
        };
      });
      setPhotos((cur) => [...cur, ...added]);
    };
    input.click();
  }, []);

  const addPhoto = useCallback(() => pickImage("camera"), [pickImage]);
  const addFromLibrary = useCallback(() => pickImage("library"), [pickImage]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((cur) => cur.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    setPhotos([]);
    setVoice(null);
    setRecordSeconds(0);
    setRecordError(null);
  }, []);

  return {
    photos,
    voice,
    recording,
    recordSeconds,
    canRecord,
    /** Why recording is unavailable or failed, in Hebrew. Null when fine. */
    recordBlockedHe: recordError ?? recordBlockedHe,
    startRecord,
    stopRecord,
    deleteVoice,
    addPhoto,
    addFromLibrary,
    removePhoto,
    reset,
  };
}
