import { useCallback, useEffect, useRef, useState } from "react";

import {
  chooseVoiceMimeType,
  compressImage,
  requestVoiceStream,
  VoiceRecorderSession,
} from "./media";
import { pickFile } from "./pickFile";

/*
 * The browser's own speech-to-text, where it has one (Chrome, Safari) —
 * docs/21 W5 "Voice to text". On-device and free; where it is missing the
 * recording is still attached and nothing is transcribed.
 */
type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface PhotoAttachment {
  id: string;
  blob: Blob;
  uri: string;
}

export function useWebMediaCapture() {
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [voice, setVoice] = useState<{ blob: Blob; seconds: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordBlockedHe, setRecordBlockedHe] = useState<string | null>(null);
  const recorder = useRef<VoiceRecorderSession | null>(null);
  /*
   * What the recording said, in words. Each finished phrase bumps `n`, so the
   * home screen's text box takes it and matches it like a typed sentence —
   * the recording finds its service without a search button.
   */
  const [transcript, setTranscript] = useState<{ text: string; n: number } | null>(null);
  const speech = useRef<SpeechRec | null>(null);
  const photosRef = useRef<PhotoAttachment[]>([]);
  photosRef.current = photos;

  const canRecord =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined" &&
    Boolean(chooseVoiceMimeType(MediaRecorder));

  const addPhoto = useCallback((file: File) => {
    void compressImage(file)
      .then((blob) => {
        const uri = URL.createObjectURL(blob);
        setPhotos((current) => [...current, { id: crypto.randomUUID(), blob, uri }]);
      })
      .catch(() => setRecordBlockedHe("לא הצלחנו להכין את התמונה. נסו תמונה אחרת."));
  }, []);

  const choosePhoto = useCallback(
    (capture: boolean) => {
      void pickFile("image/*", capture ? "environment" : undefined).then((file) => {
        if (file) addPhoto(file);
      });
    },
    [addPhoto]
  );

  const startSpeech = useCallback(() => {
    const Ctor = speechCtor();
    if (!Ctor) return;
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
        const text = (finalText + interim).trim();
        if (text) setTranscript((t) => ({ text, n: (t?.n ?? 0) + 1 }));
      };
      // A recogniser that fails leaves the recording itself untouched.
      sr.onerror = () => {};
      sr.start();
      speech.current = sr;
    } catch {
      speech.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    try {
      speech.current?.stop();
    } catch {
      /* already stopped */
    }
    speech.current = null;
  }, []);

  const startRecord = useCallback(async () => {
    if (!canRecord || recorder.current) return;
    try {
      const stream = await requestVoiceStream();
      const session = new VoiceRecorderSession(stream, MediaRecorder, setRecordSeconds);
      recorder.current = session;
      setRecordBlockedHe(null);
      setRecordSeconds(0);
      session.start();
      setRecording(true);
      startSpeech();
    } catch {
      setRecordBlockedHe("אין גישה למיקרופון. אפשר לאשר גישה בהגדרות הדפדפן או לכתוב במקום.");
    }
  }, [canRecord, startSpeech]);

  const stopRecord = useCallback(async () => {
    const session = recorder.current;
    if (!session) return;
    stopSpeech();
    const blob = await session.stop();
    setVoice({ blob, seconds: session.seconds });
    session.dispose();
    recorder.current = null;
    setRecording(false);
  }, [stopSpeech]);

  const deleteVoice = useCallback(() => {
    setVoice(null);
    setRecordSeconds(0);
    setTranscript(null);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.uri);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos((current) => {
      current.forEach((photo) => URL.revokeObjectURL(photo.uri));
      return [];
    });
  }, []);

  useEffect(() => {
    return () => {
      recorder.current?.dispose();
      stopSpeech();
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.uri));
    };
  }, [stopSpeech]);

  return {
    photos,
    voice,
    transcript,
    media: { photos, voice },
    capture: {
      photos: photos.length,
      voiceSeconds: voice?.seconds ?? null,
      recording,
      recordSeconds,
      canRecord,
      recordBlockedHe,
      onStartRecord: startRecord,
      onStopRecord: () => void stopRecord(),
      onDeleteVoice: deleteVoice,
      onAddPhoto: () => choosePhoto(true),
      onAddFromLibrary: () => choosePhoto(false),
      onClearPhotos: clearPhotos,
    },
    removePhoto,
  };
}
