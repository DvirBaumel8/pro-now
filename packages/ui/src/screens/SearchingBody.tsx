import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import {
  DEMO_WORLD,
  type AvatarChoice,
  type DiscoveryState,
  type LivingMapState,
  type PlayDrawerActionId,
  type WorldTheme,
  type WorldGeo,
  type SponsorShop,
  type DepartmentCode,
} from "@pro-now/types";

import { BackButton, BACK_BUTTON_CLEARANCE } from "../components/BackButton";
import type { WorldAssetSources } from "../components/livingmap/AssetSlot";
import { LivingMapScene } from "../components/livingmap/LivingMapScene";

/**
 * C08 — the search, the found, the reveal and the route.
 *
 * ---------------------------------------------------------------------
 * ONE SCREEN, FOUR STATES, AND WHY THIS FILE IS NOW SO SHORT
 * ---------------------------------------------------------------------
 * It used to be a searching screen with a map behind a sheet of prose.
 * Then a radar. Then converging dots. Then a lattice. Then a bright
 * isometric town. Each was a better picture of the same misunderstanding:
 * that the waiting is a screen.
 *
 * It is not. ChatGPT's instruction, which Amit approved:
 *
 *   "אל תבנו עכשיו SearchScreen.tsx מהמם ואז FoundScreen.tsx מהמם… הכול
 *    צריך להיות אותו mounted scene. אל תנווט בין screens."
 *
 * So this body holds no layout of its own. It hands the Living Map a state
 * and gets out of the way, which is why the transitions can be continuous:
 * there is nothing here to unmount between them.
 *
 * The mini-game appears only once someone is actually on the way — there is
 * nothing to wait pleasantly for until then — and it is told exactly which
 * bands belong to the ETA and to safety so it can never take a touch meant
 * for either.
 */

export interface SearchingBodyProps {
  /** The real city behind the search, when the host can play it. See `LivingMapScene`. */
  backdrop?: React.ReactNode;
  /** See `LivingMapScene.onOpenRealMap`. */
  onOpenRealMap?: () => void;
  /**
   * A real street plan for the dispatch screen.
   *
   * This is the screen somebody watches while they wait, so it was the
   * worst one to leave on the painted plate while the stroll screen
   * stood on real streets.
   */
  geo?: WorldGeo | null;

  serviceNameHe: string;
  theme?: WorldTheme;
  /** The whole Living Map state. Built by the app from real dispatch data. */
  living?: LivingMapState;
  /** Seconds since the request was sent. Presentation only. */
  elapsedSeconds?: number;
  etaMinutes?: number | null;
  arrivalClockHe?: string | null;
  /** The matched professional's own visit fee, formatted. See `MatchSheet`. */
  visitFeeHe?: string | null;
  /** "פנוי בעוד 30 דק׳" when the matched professional is not free yet. See `MatchSheet`. */
  availableInHe?: string | null;
  onSiteNameHe?: string | null;
  onOpenOnSite?: () => void;
  acceptLabelHe?: string;
  acceptDisabled?: boolean;
  checkingEligibility?: boolean;
  /** Decides which trade's district the world shows. */
  departmentCode?: string;
  /**
   * The world's play, offered only while someone is en route.
   *
   * This used to be `showMiniGame` plus a dismiss handler, for a layer of
   * collectible orbs floating over the city. Amit rejected both the orbs
   * and — more seriously — the dead end they left behind. There is nothing
   * to dismiss now, because there is no layer: the world itself answers
   * when touched, and the drawer beneath it never goes away.
   */
  /**
   * The art pack, as far as it has arrived. Present switches the world
   * from the old SVG drawing to the composed stage; ids with no file yet
   * draw honest grey boxes.
   */
  worldSources?: WorldAssetSources;
  /**
   * Sponsored shops standing in the same street.
   *
   * Amit: *"אני רוצה שלכל ספונסר שלי יהיה חנות פה במפה של העולם
   * שלנו."* Passed through rather than decided here — see
   * `SponsorVenueLayer` for every rule that keeps a paid building
   * distinguishable from a trade's.
   */
  sponsors?: readonly SponsorShop[];
  onEnterSponsor?: (shop: SponsorShop) => void;
  /** Pressing one of the neighbourhood's own shops. */
  onOpenTrade?: (department: DepartmentCode) => void;
  discoveries?: DiscoveryState;
  onFound?: (discoveryId: string) => void;
  onPlayAction?: (id: PlayDrawerActionId) => void;
  onAccept?: () => void;
  onAnother?: () => void;
  onSafety?: () => void;
  animate?: boolean;
  /**
   * The way out of the wait.
   *
   * Amit: *"כל עמוד שאני נכנס אין לי חץ חזרה."* This screen was the worst
   * of them, because it is the one the customer is most likely to want out
   * of — the request is sent, nobody has answered yet, and there was no
   * control of any kind.
   *
   * What it is called matters more than that it exists. Before anyone is
   * assigned, leaving this screen means the request stops, and a bare
   * chevron would have hidden that behind a gesture people use without
   * reading. So the app passes `backLabelHe` ("ביטול הבקשה") for those
   * phases and the control becomes a labelled pill. Once a professional is
   * on the way, leaving is only navigation — the job carries on — and the
   * label goes away again.
   */
  onBack?: () => void;
  backLabelHe?: string | null;
  /** Tapping a shop opens the professional it stands for. */
  onOpenProfile?: (candidateId: string) => void;
  /** Pass-through: skipping a shop asks the scene for the next journey. */
  enterVenueId?: string | null;
  onEnterHandled?: () => void;
  /** Whether that card is on screen; closing it is a camera move. */
  profileOpen?: boolean;
  /**
   * The figure the customer walks the street as, or null if they skipped.
   *
   * Passed straight through. This screen does not know what an avatar is
   * beyond "the scene may want one" — which is the point: skipping the
   * picker has to be a first-class state all the way down, not a special
   * case anybody has to remember.
   */
  avatar?: AvatarChoice;
  width?: number;
  height?: number;
}

export function SearchingBody({
  backdrop,
  onOpenRealMap,
  geo = null,
  serviceNameHe,
  theme = "HOME",
  living,
  etaMinutes = null,
  arrivalClockHe = null,
  visitFeeHe = null,
  availableInHe = null,
  onSiteNameHe = null,
  onOpenOnSite,
  acceptLabelHe,
  acceptDisabled = false,
  checkingEligibility = false,
  departmentCode,
  worldSources,
  sponsors,
  onEnterSponsor,
  onOpenTrade,
  discoveries,
  onFound,
  onPlayAction,
  onAccept,
  onAnother,
  onSafety,
  animate = true,
  onBack,
  backLabelHe = null,
  onOpenProfile,
  enterVenueId = null,
  onEnterHandled,
  profileOpen = false,
  avatar = null,
  width = 390,
  height = 780,
}: SearchingBodyProps) {
  /*
   * With nothing supplied the screen is honestly empty: searching, on the
   * demo world, with no candidates. It does not invent a state to look
   * busy — the empty orbit over a lit city is the true picture of "still
   * looking".
   */
  /*
   * MEMOISED, BECAUSE THE SCENE IS MEMOISED ON IT.
   *
   * A fresh object with a fresh `candidates: []` on every render defeats
   * `LivingMapScene`'s own memoisation, which exists specifically to stop
   * `venues`, `availability` and `sweep` recomputing — and those feed the
   * walker's destination and the camera's tour. Only the gallery reaches
   * this path (the app always supplies `living`), which is exactly why it
   * would have gone unnoticed: the place we review would stutter and the
   * place we ship would not.
   */
  const state: LivingMapState = useMemo(
    () => living ?? { phase: "SEARCHING", theme, adapter: DEMO_WORLD, candidates: [], journey: null },
    [living, theme]
  );

  return (
    <View style={[styles.screen, { width, height }]}>
      {onBack ? (
        <BackButton
          onPress={onBack}
          tone="dark"
          labelHe={backLabelHe}
          accessibilityLabelHe={backLabelHe ?? "חזרה"}
        />
      ) : null}
      <LivingMapScene
        backdrop={backdrop}
        onOpenRealMap={onOpenRealMap}
        geo={geo}
        onOpenProfile={onOpenProfile}
        enterVenueId={enterVenueId}
        onEnterHandled={onEnterHandled}
        profileOpen={profileOpen}
        avatar={avatar}
        topInset={onBack ? BACK_BUTTON_CLEARANCE : 0}
        state={state}
        serviceNameHe={serviceNameHe}
        etaMinutes={etaMinutes}
        arrivalClockHe={arrivalClockHe}
        visitFeeHe={visitFeeHe}
        availableInHe={availableInHe}
        onSiteNameHe={onSiteNameHe}
        onOpenOnSite={onOpenOnSite}
        acceptLabelHe={acceptLabelHe}
        acceptDisabled={acceptDisabled}
        checkingEligibility={checkingEligibility}
        departmentCode={departmentCode}
        onAccept={onAccept}
        onAnother={onAnother}
        onSafety={onSafety}
        worldSources={worldSources}
        /* The shops in this street that somebody paid for. */
        sponsors={sponsors}
        onEnterSponsor={onEnterSponsor}
        /* Every door in the street opens — see `TradeCard`. */
        onOpenTrade={onOpenTrade}
        discoveries={discoveries}
        onFound={onFound}
        onPlayAction={onPlayAction}
        animate={animate}
        width={width}
        height={height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
});
