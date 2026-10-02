import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";

import type { FaultPhoto, FaultVoice } from "@pro-now/ui";

/**
 * A real camera, a real photo library and a real microphone, on a phone.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS SEPARATELY FROM THE PROTOTYPE'S VERSION
 * ---------------------------------------------------------------------
 * `tools/design-preview/src/useCapture.ts` does the same job with
 * `MediaRecorder` and a file input, because a browser is what it has. That
 * file deliberately lives in the prototype and not in `packages/ui`, so
 * the shared screen never reaches for a browser API a phone will not have.
 *
 * This is the other half of that bargain: the same interface, backed by
 * the platform the app actually ships on.
 *
 * ---------------------------------------------------------------------
 * TWO DOORS, NOT ONE
 * ---------------------------------------------------------------------
 * Amit, twice: *"גלריה ומצלמה — שניהם פותחים מצלמה כרגע"*, and then
 * *"בעמוד הראשי שלוחצים גלריה שלא יפתח גם מצלמה, רק גלריה."*
 *
 * They are genuinely different doors. Somebody who photographed the leak
 * an hour ago cannot send that photograph through a camera — they would
 * have to go back and take another one — and that is not a rough edge,
 * it is the difference between sending the evidence and not sending it.
 * `addPhoto` launches the camera; `addFromLibrary` launches the library;
 * neither ever opens the other.
 *
 * ---------------------------------------------------------------------
 * A BUTTON THAT CANNOT RECORD SAYS WHY
 * ---------------------------------------------------------------------
 * Amit: *"ההקלטה לא עובדת, מה זה ההרשאות האלה, לא מצליח להבין."* The old
 * control was dim and silent, which is the worst of both worlds: it looks
 * like a button, it looks broken rather than unavailable, and it gives no
 * reason. Permission here is asked for at the moment of the tap — which is
 * when the person understands what it is for — and a refusal produces a
 * sentence rather than a dead circle.
 */
export interface Capture {
  photos: FaultPhoto[];
  voice: FaultVoice | null;
  recording: boolean;
  recordSeconds: number;
  canRecord: boolean;
  recordBlockedHe: string | null;
  addPhoto: () => void;
  addFromLibrary: () => void;
  removePhoto: (id: string) => void;
  startRecord: () => void;
  stopRecord: () => void;
  deleteVoice: () => void;
}

export function useCapture(photoSubjectHe: string): Capture {
  const [photos, setPhotos] = useState<FaultPhoto[]>([]);
  const [voice, setVoice] = useState<FaultVoice | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordBlockedHe, setRecordBlockedHe] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /*
   * A recorder left running when the screen goes away keeps the microphone
   * open and the red indicator lit, which is alarming and looks like
   * spyware. Stopped and released on unmount, always.
   */
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      const r = recordingRef.current;
      recordingRef.current = null;
      if (r) void r.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const addFrom = useCallback(
    async (source: "camera" | "library") => {
      try {
        /*
         * Permission at the moment of the tap. Asking on screen entry, for
         * something the person has not yet decided to do, is how an app
         * gets a "no" it did not need.
         */
        const perm =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;

        const opts: ImagePicker.ImagePickerOptions = {
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        };
        const res =
          source === "camera"
            ? await ImagePicker.launchCameraAsync(opts)
            : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true });

        if (res.canceled) return;
        setPhotos((prev) => [
          ...prev,
          ...res.assets.map((a, i) => ({
            id: `${Date.now()}_${i}`,
            uri: a.uri,
            subjectHe: photoSubjectHe,
            mimeType: a.mimeType,
          })),
        ]);
      } catch {
        /* A cancelled or failed picker is not an error worth a dialog. */
      }
    },
    [photoSubjectHe]
  );

  const addPhoto = useCallback(() => void addFrom("camera"), [addFrom]);
  const addFromLibrary = useCallback(() => void addFrom("library"), [addFrom]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const startRecord = useCallback(() => {
    void (async () => {
      try {
        const perm = await Audio.requestPermissionsAsync();
        if (!perm.granted) {
          // The reason, in words, on the control itself.
          setRecordBlockedHe("כדי להקליט צריך לאשר גישה למיקרופון בהגדרות.");
          return;
        }
        setRecordBlockedHe(null);

        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording: r } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = r;
        setRecording(true);
        setRecordSeconds(0);
        tickRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
      } catch {
        setRecordBlockedHe("לא הצלחנו לפתוח את המיקרופון.");
        setRecording(false);
      }
    })();
  }, []);

  const stopRecord = useCallback(() => {
    void (async () => {
      const r = recordingRef.current;
      recordingRef.current = null;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      setRecording(false);
      if (!r) return;
      try {
        await r.stopAndUnloadAsync();
        const uri = r.getURI();
        /*
         * The length is read back from the recorder rather than from the
         * tick counter, because the counter is a timer and the recording
         * is a file. They disagree when the app is backgrounded, and the
         * file is the one that is true.
         */
        const status = await r.getStatusAsync();
        const seconds =
          "durationMillis" in status && typeof status.durationMillis === "number"
            ? Math.round(status.durationMillis / 1000)
            : recordSeconds;
        setVoice({ uri: uri ?? null, seconds, mimeType: "audio/mp4" });
      } catch {
        setVoice(null);
      }
    })();
  }, [recordSeconds]);

  const deleteVoice = useCallback(() => setVoice(null), []);

  return {
    photos,
    voice,
    recording,
    recordSeconds,
    /*
     * On a phone the microphone exists. Whether we may use it is a
     * permission question, and a permission question is answered by
     * asking — so the control is live and `recordBlockedHe` carries the
     * answer if it comes back no.
     */
    canRecord: true,
    recordBlockedHe,
    addPhoto,
    addFromLibrary,
    removePhoto,
    startRecord,
    stopRecord,
    deleteVoice,
  };
}
