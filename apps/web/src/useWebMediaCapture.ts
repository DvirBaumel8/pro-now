import { useCallback, useEffect, useRef, useState } from "react";

import {
  chooseVoiceMimeType,
  compressImage,
  requestVoiceStream,
  VoiceRecorderSession,
} from "./media";

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
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      if (capture) input.setAttribute("capture", "environment");
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) addPhoto(file);
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    },
    [addPhoto]
  );

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
    } catch {
      setRecordBlockedHe("אין גישה למיקרופון. אפשר לאשר גישה בהגדרות הדפדפן או לכתוב במקום.");
    }
  }, [canRecord]);

  const stopRecord = useCallback(async () => {
    const session = recorder.current;
    if (!session) return;
    const blob = await session.stop();
    setVoice({ blob, seconds: session.seconds });
    session.dispose();
    recorder.current = null;
    setRecording(false);
  }, []);

  const deleteVoice = useCallback(() => {
    setVoice(null);
    setRecordSeconds(0);
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
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.uri));
    };
  }, []);

  return {
    photos,
    voice,
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
