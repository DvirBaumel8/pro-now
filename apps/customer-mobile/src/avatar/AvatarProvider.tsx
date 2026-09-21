import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AvatarChoice } from "@pro-now/types";

import {
  AVATAR_STORAGE_KEY,
  INTRO_STORAGE_KEY,
  decodeAvatar,
  encodeAvatar,
  shouldOfferPicker,
  shouldShowIntro,
} from "./store";

/**
 * The avatar, available to every screen and remembered between launches.
 *
 * The decisions this file makes are all in `./store.ts`, where they can be
 * tested; this is the plumbing that carries them. Two things about the
 * shape are deliberate:
 *
 * `loaded` exists so that nothing flashes. Reading device storage takes a
 * frame or two, and a world that renders with no figure and then pops one
 * in looks broken in exactly the way Amit keeps calling out. Screens wait
 * for `loaded` before deciding whether to send somebody to the picker.
 *
 * `offerPicker` is separate from `choice === null`, because skipping is an
 * answer. Somebody who declined a figure must not be asked again on their
 * next launch — see the note in `shouldOfferPicker`.
 */
export interface AvatarContextValue {
  choice: AvatarChoice;
  /** False until device storage has answered. Nothing should decide yet. */
  loaded: boolean;
  /** True only when they have never been asked. */
  offerPicker: boolean;
  /**
   * True only when the three-slide explanation has never been through.
   *
   * It rides in this provider rather than one of its own because both
   * answers come out of the same storage read on the same cold start, and
   * a second provider would mean a second frame of blank screen before
   * the app can decide which door to open.
   */
  showIntro: boolean;
  choose: (next: AvatarChoice) => void;
  /** Records that the explanation has been seen, or deliberately skipped. */
  markIntroSeen: () => void;
}

const AvatarContext = createContext<AvatarContextValue>({
  choice: null,
  loaded: false,
  offerPicker: false,
  showIntro: false,
  choose: () => {},
  markIntroSeen: () => {},
});

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<AvatarChoice>(null);
  const [loaded, setLoaded] = useState(false);
  const [offerPicker, setOfferPicker] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(AVATAR_STORAGE_KEY),
      AsyncStorage.getItem(INTRO_STORAGE_KEY),
    ])
      .then(([raw, introRaw]) => {
        if (!alive) return;
        setChoice(decodeAvatar(raw));
        setOfferPicker(shouldOfferPicker(raw));
        setShowIntro(shouldShowIntro(introRaw));
        setLoaded(true);
      })
      .catch(() => {
        /*
         * Storage can fail — a full disk, a locked keystore, a simulator
         * in a strange state. The app must still open. Failing to read a
         * preference is not a reason to block somebody from requesting a
         * plumber, so this falls back to "no figure, do not nag": the
         * world draws nobody, which every screen already handles, and the
         * picker stays reachable from the profile.
         */
        if (!alive) return;
        setChoice(null);
        setOfferPicker(false);
        // Same rule for the slides: on a storage failure, do not nag.
        setShowIntro(false);
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const choose = useCallback((next: AvatarChoice) => {
    /*
     * The screen changes immediately and the write happens behind it. The
     * alternative — waiting for storage before the figure appears — puts a
     * disk write between a tap and its answer, which is the single
     * cheapest way to make a fast app feel slow.
     */
    setChoice(next);
    setOfferPicker(false);
    AsyncStorage.setItem(AVATAR_STORAGE_KEY, encodeAvatar(next)).catch(() => {
      /* Their choice holds for this session; it just will not survive a
       * restart. Not worth an error message about a decoration. */
    });
  }, []);

  const markIntroSeen = useCallback(() => {
    setShowIntro(false);
    AsyncStorage.setItem(INTRO_STORAGE_KEY, "1").catch(() => {
      /* They will see it once more after a restart. Not worth blocking on. */
    });
  }, []);

  const value = useMemo(
    () => ({ choice, loaded, offerPicker, showIntro, choose, markIntroSeen }),
    [choice, loaded, offerPicker, showIntro, choose, markIntroSeen]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar(): AvatarContextValue {
  return useContext(AvatarContext);
}
