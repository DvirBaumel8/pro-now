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
  /** The picture itself, for recognising what is in it. */
  file?: Blob;
}

/* The browser's own speech-to-text, where it has one (Chrome, Safari). */
type SpeechRec = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
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
  /*
   * WHAT WAS SAID, IN WORDS.
   *
   * Amit: *"כולל זיהוי קולי של ההקלטות — שיהיה אפשר להקליט מה הבעיה."* While
   * the recording runs, the browser's speech recogniser (Hebrew) writes it
   * out, and the words go where typing would — so the recording finds its
   * service the same way a typed sentence does. Where the browser has no
   * recogniser the recording is still kept, and nothing pretends.
   */
  const [transcript, setTranscript] = useState("");
  const canTranscribe = speechCtor() !== null;
  const speechRef = useRef<SpeechRec | null>(null);

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
      const Ctor = speechCtor();
      if (Ctor) {
        try {
          const sr = new Ctor();
          sr.lang = "he-IL";
          sr.continuous = true;
          sr.interimResults = true;
          let finalText = "";
          sr.onresult = (ev) => {
            let interim = "";
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
              const r = ev.results[i]!;
              if (r.isFinal) finalText += r[0]!.transcript + " ";
              else interim += r[0]!.transcript;
            }
            setTranscript((finalText + interim).trim());
          };
          sr.onerror = () => {};
          sr.start();
          speechRef.current = sr;
        } catch {
          speechRef.current = null;
        }
      }
    } catch (e) {
      // Permission refused, or no microphone. Saying which is the whole
      // point: "לא אושרה גישה" is something a person can act on, and a
      // silent no-op is not.
      /*
       * SAY WHICH REFUSAL THIS IS, AND WHAT TO DO ABOUT IT.
       *
       * Amit: *"ההקלטה לא עובדת, מזה ההרשאות האלה, לא מצליח להבין."* The
       * message before this one told him permission was refused and left
       * him to go and find a browser setting — which is the wrong
       * instruction, because in the embedded preview there is no setting to
       * find. The page is running inside a frame that was never granted
       * microphone access, and no amount of allowing it in Safari changes
       * that. The one thing that works is opening the link in its own tab.
       *
       * So the framed case is named separately from the refused-by-a-person
       * case, and it says the thing that actually fixes it.
       */
      const name = (e as { name?: string })?.name;
      const framed = typeof window !== "undefined" && window.self !== window.top;
      setRecordError(
        name === "NotAllowedError"
          ? framed
            ? "התצוגה כאן רצה בתוך מסגרת שאין לה הרשאת מיקרופון. פתחו את הקישור בלשונית נפרדת — שם ההקלטה עובדת."
            : "לא אושרה גישה למיקרופון. אפשר לאשר בהגדרות הדפדפן ולנסות שוב."
          : name === "NotFoundError"
            ? "לא נמצא מיקרופון במכשיר."
            : "ההקלטה לא הצליחה להתחיל."
      );
      setRecording(false);
    }
  }, [canRecord, recordBlockedHe]);

  const stopRecord = useCallback(() => {
    try { speechRef.current?.stop(); } catch { /* already stopped */ }
    speechRef.current = null;
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const deleteVoice = useCallback(() => {
    setVoice(null);
    setTranscript("");
  }, []);

  /**
   * Open this page in a tab of its own.
   *
   * The only real remedy for the framed case, and it is one tap rather than
   * a hunt through browser settings. Offered only when it would help — in a
   * top-level tab there is nothing to open.
   */
  const framed = typeof window !== "undefined" && window.self !== window.top;
  const openInOwnTab = useCallback(() => {
    if (typeof window === "undefined") return;
    window.open(window.location.href, "_blank", "noopener");
  }, []);

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
  const pickImage = useCallback(async (source: "camera" | "library") => {
    if (typeof document === "undefined") return;

    /*
     * THE LIBRARY, WITHOUT THE CAMERA — WHERE THE BROWSER ALLOWS IT.
     *
     * Amit: *"בעמוד הראשי שלוחצים גלריה — שלא יפתח גם מצלמה, רק גלריה."*
     *
     * Our two buttons already differ correctly: the camera one carries
     * `capture`, the gallery one does not. What he is seeing is the PHONE's
     * own sheet. On iOS, `<input type="file" accept="image/*">` always
     * offers "Take Photo" beside "Photo Library", and there is no web API
     * that removes it — the sheet belongs to the operating system.
     *
     * Where a browser has a real file picker (`showOpenFilePicker`, on
     * Chrome and Edge including Android) we use it instead, and that one
     * opens the files and nothing else. iOS Safari does not have it and
     * falls through to the input below, where the OS sheet is the best
     * available.
     *
     * In the shipped app this disappears: expo-image-picker's
     * `launchImageLibraryAsync` opens the photo library directly, with no
     * camera option, because it is the native picker rather than a file
     * input.
     */
    const picker = (window as unknown as {
      showOpenFilePicker?: (o: unknown) => Promise<{ getFile: () => Promise<File> }[]>;
    }).showOpenFilePicker;

    if (source === "library" && typeof picker === "function") {
      try {
        const handles = await picker({
          multiple: true,
          types: [{ description: "תמונות", accept: { "image/*": [".png", ".jpg", ".jpeg", ".heic", ".webp"] } }],
          excludeAcceptAllOption: true,
        });
        const files = await Promise.all(handles.map((h) => h.getFile()));
        if (files.length === 0) return;
        setPhotos((cur) => [
          ...cur,
          ...files.map((file, i) => {
            const url = URL.createObjectURL(file);
            objectUrls.current.push(url);
            return { id: `${Date.now()}-${i}`, uri: url, subjectHe: "תמונה מהגלריה", file };
          }),
        ]);
        return;
      } catch {
        // Cancelled, or the picker refused. Either way, fall through to the
        // input rather than leaving the button doing nothing.
      }
    }

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
          file,
        };
      });
      setPhotos((cur) => [...cur, ...added]);
    };
    input.click();
  }, []);

  const addPhoto = useCallback(() => {
    void pickImage("camera");
  }, [pickImage]);
  const addFromLibrary = useCallback(() => {
    void pickImage("library");
  }, [pickImage]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((cur) => cur.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    setPhotos([]);
    setVoice(null);
    setTranscript("");
    setRecordSeconds(0);
    setRecordError(null);
  }, []);

  return {
    transcript,
    canTranscribe,
    photos,
    voice,
    recording,
    recordSeconds,
    canRecord,
    /** Why recording is unavailable or failed, in Hebrew. Null when fine. */
    recordBlockedHe: recordError ?? recordBlockedHe,
    /** True when this page is embedded, so recording cannot be granted here. */
    framed,
    openInOwnTab,
    startRecord,
    stopRecord,
    deleteVoice,
    addPhoto,
    addFromLibrary,
    removePhoto,
    reset,
  };
}
