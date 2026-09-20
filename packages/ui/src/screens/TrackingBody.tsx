import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  assessArrival,
  routeAt,
  worldZoomFor,
  routeProgress,
  type ArrivalSignals,
  type EtaView,
  type JobState,
  type ProfessionalSummaryView,
} from "@pro-now/types";

import { formatCompletedJobs, formatEta, formatProNowRating } from "../format";
import { BackButton } from "../components/BackButton";
import { customerDarkTheme, depth, palette, radii, scale, spacing, tabular, type } from "../theme";
import { ArrivalPromise } from "../components/ArrivalPromise";
import { ProviderPortrait } from "../components/ProviderPortrait";
import { RealMapSurface } from "../components/RealMapSurface";
import { WorldBackdrop } from "../components/livingmap/WorldBackdrop";
import { RouteLayer } from "../components/livingmap/RouteLayer";
import { type WorldAssetSources } from "../components/livingmap/AssetSlot";
import { ScreenShell } from "../components/ScreenShell";
import { ShieldCheckMark, StarMark } from "../components/marks";

/**
 * C07 — following the professional in.
 *
 * REBUILT TO THE SYSTEM (Visual System v1 §8 in the screen map). This screen
 * was the clearest example of the drift Amit spotted: a light surface, a
 * drawn street map, three stacked elevated cards, and an ETA smaller than
 * the same number on the match screen. Beside the new screens it read as a
 * different app, which it effectively was.
 *
 * Three decisions carried over from the system:
 *
 * 1. **The map IS the screen**, not a picture inside a card. This is one of
 *    the two places a real map is honest — an assignment exists and both
 *    sides need the location to execute (§11) — so it gets the whole
 *    surface and everything else floats on it.
 * 2. **Dark, and earned.** A dark customer screen requires a live state
 *    (§12). This one has the most live state in the product: someone is
 *    physically moving toward you.
 * 3. **The ETA is the hero.** "When does he arrive" is the only question
 *    this screen answers (§9), so the number that answers it is the largest
 *    thing on it — and it renders through `HeroMetric`, which means an
 *    unknown ETA is a sentence about why rather than a dash.
 *
 * WHAT IS NOT HERE: the four-step progress rail. It was decoration dressed
 * as information — the customer already knows the professional has not
 * finished, and a rail showing three greyed-out future steps mostly
 * advertises how much has not happened yet. The current state is a word,
 * and the ETA is the fact.
 */

/**
 * DARK SHEET ON A DARK MAP. The sheet was ivory, which put a hard white
 * slab across the bottom half of the one screen that is supposed to feel
 * like a single live moment — and it was the seam Amit photographed when he
 * asked for "קו אחיד".
 */
const colors = customerDarkTheme.colors;

export interface TrackingBodyProps {
  status: JobState;
  serviceNameHe: string;
  professional: ProfessionalSummaryView;
  eta: EtaView | null;
  /** Already-formatted headline price, e.g. "₪179 דמי ביקור". */
  priceLineHe?: string | null;
  /** "22:49" — the promise, computed by the server from a real route. */
  arrivalClockHe?: string | null;
  /**
   * The raw signals. The screen does NOT take a phase — it takes the facts
   * and asks `assessArrival`, so the customer's screen and the server's
   * dispatch logic can never disagree about whether an arrival is in
   * trouble. That disagreement is the failure mode Arrival Assurance
   * exists to prevent, and it is invisible when each side decides for
   * itself.
   */
  arrival?: ArrivalSignals;
  /** For RUNNING_LATE: the clock time we gave before it moved. */
  previousClockHe?: string | null;
  onGetHelp?: () => void;
  onCancelJob?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onSafety?: () => void;
  /**
   * Leave the tracking screen. The job keeps running.
   *
   * Not a cancellation — `onCancelJob` is that, and it is a different
   * control with a different consequence. This one only goes back to the
   * app, which the screen previously offered no way to do at all.
   */
  onBack?: () => void;
  /** The world art, as far as it exists. Absent falls back to the grid. */
  worldSources?: WorldAssetSources;
  /** Which trade is on the way: decides the street and the vehicle. */
  departmentCode?: string | null;
  /**
   * The ETA in seconds as it was WHEN THE JOB WAS ASSIGNED.
   *
   * Needed because progress is "how much of the trip is done", and that
   * cannot be worked out from the remaining time alone. Held by the app
   * rather than recomputed here, so a re-render never restarts the trip.
   */
  etaSecondsAtAssignment?: number | null;
  vehicleAssetId?: string;
  animate?: boolean;
  width?: number;
  height?: number;
}

export function TrackingBody({
  status,
  serviceNameHe,
  professional,
  eta,
  priceLineHe,
  arrivalClockHe = null,
  arrival,
  previousClockHe = null,
  onGetHelp,
  onCancelJob,
  onCall,
  onMessage,
  onSafety,
  onBack,
  worldSources,
  departmentCode = null,
  etaSecondsAtAssignment = null,
  vehicleAssetId,
  animate = true,
  width = 390,
  height = 780,
}: TrackingBodyProps) {
  const etaDisplay = formatEta(eta);
  const rating = formatProNowRating(professional.proNowRatingAverage, professional.proNowRatingCount);
  const jobsLine = formatCompletedJobs(professional.proNowCompletedJobs);
  // Anything past the search means a professional is attached to this job.
  const assigned = status !== "SEARCHING" && status !== "DRAFT" && status !== "OFFERING";

  /*
   * With no signals from the caller the screen assumes nothing is wrong —
   * but it assumes it by running the SAME function, with a promise that has
   * not yet passed, rather than by hard-coding a happy phase. A default
   * that bypasses the rule is a default that will survive the rule changing.
   */
  const assessment = assessArrival(
    arrival ?? {
      promisedArrivalMs: eta ? Date.now() + eta.etaSeconds * 1000 : null,
      lastLocationMs: Date.now(),
      nowMs: Date.now(),
    }
  );

  const headline =
    status === "PRO_EN_ROUTE"
      ? "בדרך אליך"
      : status === "PRO_ARRIVED"
        ? "הגיע אליך"
        : status === "IN_PROGRESS"
          ? "העבודה בעיצומה"
          : status === "PRO_ASSIGNED"
            ? "יוצא אליך"
            : "מעדכנים…";


  /*
   * How far through the trip, read once and shared.
   *
   * The camera and the vehicle both use it, so they cannot disagree about
   * where the professional is — and it is null, not zero, when the server
   * has given no ETA, which holds the journey still rather than creeping
   * forward at an invented speed.
   */
  const tripProgress = routeProgress({
    etaSecondsAtAssignment: etaSecondsAtAssignment ?? null,
    etaSecondsNow: eta?.etaSeconds ?? null,
  });

  // The map gets the top 54%; the sheet sizes itself and overlaps the rest.
  const mapH = Math.round(height * 0.54);

  return (
    <ScreenShell side="customer" tone="dark" liveState="ROUTE" width={width} height={height}>
      {/* ---------------------------------------------------------------
          THE PROFESSIONAL, COMING DOWN OUR STREETS.
          ---------------------------------------------------------------
          Amit: *"גם את העמוד הזה נצטרך לעשות שאיש המקצוע הנכון נוסע אליך
          ורואים אותו זז במפה שבנינו."*

          This was an abstract dark grid with a dotted curve on it — the
          only screen in the product still happening somewhere other than
          the neighbourhood, at the exact moment the customer cares most.

          What moves is driven by PROGRESS through the server's own ETA, not
          by coordinates: the professional really is that far through the
          trip, and where they physically are is not claimed. The line under
          the map says so, and it stays until a maps vendor is chosen.
          --------------------------------------------------------------- */}
      <View style={{ width, height: mapH, overflow: "hidden" }}>
        {worldSources ? (
          <>
            <WorldBackdrop
              width={width}
              height={mapH}
              sources={worldSources}
              departmentCode={departmentCode}
              animate={animate}
              /*
               * THE CAMERA FOLLOWS THEM.
               *
               * A fixed shot with a vehicle crossing it is a map with a dot
               * on it. A camera that stays with the professional as they
               * come down the street is somebody approaching — and since
               * both the camera and the vehicle read the same `progress`,
               * they cannot drift apart.
               */
              focus={
                tripProgress === null
                  ? null
                  : routeAt((departmentCode as never) ?? "HOME_URGENT", tripProgress).at
              }
              /*
               * WIDE ENOUGH TO BE A JOURNEY.
               *
               * The camera used to sit at the district shot, close enough
               * that two shopfronts filled the frame — so following
               * somebody was watching a wall go past. "ROUTE" pulls back
               * far enough that the street, the shops along it and the
               * direction of travel are all in the same picture, which is
               * the only thing that makes movement legible.
               */
              zoom={worldZoomFor("ROUTE")}
            >
              {/*
                * THE ROUTE AND THE VEHICLE, INSIDE THE WORLD.
                *
                * These were siblings of the backdrop, laid out against the
                * PHONE while the ground panned and zoomed underneath them.
                * A world coordinate plotted in viewport space is not a
                * position at all: the scooter appeared wherever the
                * arithmetic put it, unrelated to the road. Amit: *"כל
                * המכוניות והבניינים והנסיעה מבולגנת ממש."*
                *
                * Now they are drawn in the world's own space, so the road
                * under the wheels is the road that was painted there.
                */}
              {(world) => (
                <RouteLayer
                  width={world.width}
                  height={world.height}
                  department={(departmentCode as never) ?? "HOME_URGENT"}
                  progress={tripProgress}
                  vehicleAssetId={vehicleAssetId}
                  sources={worldSources}
                  animate={animate}
                />
              )}
            </WorldBackdrop>
          </>
        ) : (
          <RealMapSurface assigned={assigned} width={width} height={mapH} tone="dark" />
        )}
      </View>

      {onBack ? <BackButton onPress={onBack} tone="dark" /> : null}

      {/* The state, as one word, over the map. */}
      <View style={styles.statusPill} pointerEvents="none">
        <Text style={styles.statusText}>{headline}</Text>
      </View>

      {/*
        * ONE elevated surface, anchored to the BOTTOM and sized by its
        * content. Pinning it to a fraction of the screen left a stretch of
        * empty white under the last line on a tall phone — the sheet has as
        * much to say as it has, and the map takes the rest.
        */}
      <View style={styles.sheet}>
        <View style={styles.grabber} />

        {/*
          * THE PROMISE IS THE SHEET'S FIRST LINE, not a number in a corner.
          * ספץ's equivalent screen has no ETA at all — their answer to "he
          * did not arrive" is that you telephone him. Ours states a clock
          * time, says out loud when it moves, and carries its own way out.
          */}
        <ArrivalPromise
          assessment={assessment}
          arrivalClockHe={arrivalClockHe}
          minutesAway={etaDisplay && etaDisplay.unit.includes("דק") ? Number(etaDisplay.value) : null}
          previousClockHe={previousClockHe}
          displayNameHe={professional.displayName}
          onGetHelp={onGetHelp}
          onCancel={onCancelJob}
          width={width - spacing.lg * 2}
        />

        <Text style={styles.service} numberOfLines={1}>
          {serviceNameHe} · {headline}
        </Text>

        <View style={styles.divider} />

        <View style={styles.proRow}>
          <ProviderPortrait
            photoUri={professional.profilePhotoUrl}
            displayNameHe={professional.displayName}
            size={54}
            tone="dark"
          />
          <View style={styles.proText}>
            <Text style={styles.proName} numberOfLines={1}>
              {professional.displayName}
            </Text>
            <View style={styles.proMeta}>
              {rating ? (
                <>
                  <StarMark size={13} />
                  <Text style={styles.proMetaStrong}>{rating.rating}</Text>
                  <Text style={styles.proMetaDim}>({rating.count})</Text>
                </>
              ) : null}
              {rating && jobsLine ? <Text style={styles.proMetaDim}>·</Text> : null}
              {jobsLine ? <Text style={styles.proMetaDim}>{jobsLine}</Text> : null}
            </View>
          </View>
          {professional.verifications.includes("IDENTITY_VERIFIED") ? (
            <View style={styles.verified}>
              <ShieldCheckMark size={17} color={colors.trust} />
            </View>
          ) : null}
        </View>

        {/* Contact. No phone number crosses this boundary. */}
        <View style={styles.actions}>
          <Act labelHe="שיחה" onPress={onCall} />
          <Act labelHe="הודעה" onPress={onMessage} />
          <Act labelHe="בטיחות" onPress={onSafety} danger />
        </View>

        {priceLineHe ? <Text style={styles.price}>{priceLineHe}</Text> : null}
        <Text style={styles.masked}>המספרים מוסתרים משני הצדדים</Text>
      </View>
    </ScreenShell>
  );
}

function Act({
  labelHe,
  onPress,
  danger,
}: {
  labelHe: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={labelHe}
      style={({ pressed }) => [styles.act, pressed && { opacity: 0.88 }]}
    >
      <Text style={[styles.actText, danger && { color: colors.statusDanger }]} numberOfLines={1}>
        {labelHe}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    position: "absolute",
    top: spacing.lg,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    minHeight: 34,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.82)",
  },
  statusText: { ...type.captionStrong, fontSize: scale.meta, color: "#FFFFFF", writingDirection: "rtl" },

  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: spacing.xl,
    backgroundColor: depth.panel.low,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // Elevation only — a surface is raised or outlined, never both (§5).
    shadowColor: palette.ink900,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  grabber: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },

  service: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.lg },

  proRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  proText: { flex: 1, alignItems: "flex-end", gap: 2 },
  proName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  proMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4, flexWrap: "wrap" },
  proMetaStrong: { ...type.caption, ...tabular, color: colors.textPrimary, fontWeight: "700" },
  proMetaDim: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  verified: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,124,100,0.1)",
  },

  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.lg },
  act: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    backgroundColor: depth.panel.high,
  },
  actText: { ...type.captionStrong, fontSize: scale.meta, color: colors.textPrimary },

  price: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
  },
  masked: {
    ...type.caption,
    fontSize: scale.micro,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },
});
