import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  assessArrival,
  jobProgressHe,
  routeAt,
  worldZoomFor,
  routeProgress,
  type ArrivalSignals,
  type EtaView,
  type JobState,
  type ProfessionalSummaryView,
  type WorldGeo,
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
  /**
   * A REAL STREET PLAN FOR THE MAP BAND.
   *
   * This is the screen Visual System v1 §11 actually allows a map on —
   * an assignment exists and both sides need the location to execute —
   * so it is the screen where a real street plan is worth the most and
   * costs the most.
   *
   * Worth the most, because the customer is asking one question ("where
   * are they") that only real geography answers. Costs the most, because
   * a figure drawn on a real street is a claim about a real address, and
   * this screen is exactly where a decorative one would once have been
   * acceptable. Nothing is plotted on it that the server did not say —
   * see `geo-truth.ts`, and note that nothing is plotted on it at all
   * until the route comes from a route and not from a drawing.
   */
  geo?: WorldGeo | null;
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
  geo = null,
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
  /*
   * THE JOB STATE IS PART OF THE ARRIVAL SIGNAL, AND LEAVING IT OUT WAS A
   * FABRICATED ETA.
   *
   * `assessArrival` answers "how is the journey going", and a journey
   * with no bad news in it is ON_ROUTE. It had no way to be told the
   * journey had ENDED — so on this screen, with the status line reading
   * "העבודה בעיצומה", the card above it said "בדרך אליכם" over a clock
   * counting down fourteen minutes to an arrival that had already
   * happened, for the whole length of the visit.
   *
   * The server says he is there; this passes that on rather than letting
   * the screen infer it from a countdown reaching zero, which would be
   * the same invention wearing a different hat.
   */
  // The first word of the name, the way somebody in your kitchen is
  // referred to once they are in it.
  const progressHe = jobProgressHe(status, professional.displayName.split(/\s+/)[0] ?? null);

  const hasArrived =
    status === "PRO_ARRIVED" ||
    status === "DIAGNOSIS" ||
    status === "WAITING_QUOTE_APPROVAL" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETION_PENDING";

  const assessment = assessArrival(
    arrival
      ? { ...arrival, arrived: arrival.arrived ?? hasArrived }
      : {
          arrived: hasArrived,
          promisedArrivalMs: eta ? Date.now() + eta.etaSeconds * 1000 : null,
          lastLocationMs: Date.now(),
          nowMs: Date.now(),
        }
  );

  /*
   * ONE WORD PER STATE, AND "מעדכנים…" IS NOT ONE OF THEM.
   *
   * Three of the six states a visit passes through had no case here, so
   * they all fell to the default: a customer standing in their kitchen
   * while the professional inspected the fault was told the app was
   * "updating". It is the pill over the map and the second half of the
   * service line, so it was the loudest thing on the screen, and it said
   * nothing.
   *
   * The default stays, for a state that genuinely has not been seen yet
   * — a screen that guesses is worse than one that admits it does not
   * know — but it is no longer where most of the visit lands.
   */
  const headline =
    status === "PRO_EN_ROUTE"
      ? "בדרך אליך"
      : status === "PRO_ARRIVED"
        ? "הגיע אליך"
        : status === "DIAGNOSIS"
          ? "בודק מה צריך"
          : status === "WAITING_QUOTE_APPROVAL"
            ? "ממתין לאישור שלך"
            : status === "IN_PROGRESS"
              ? "העבודה בעיצומה"
              : status === "COMPLETION_PENDING"
                ? "סיים — ממתין לאישור"
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
  /*
   * A CLOCK, SO THE SECONDS BETWEEN READINGS ARE DRAWN.
   *
   * Readings arrive every few seconds, and the figure used to be pinned to
   * the last one — motionless in the road, then a jump. `routeProgress`
   * now subtracts the elapsed seconds from the ETA the server gave, which
   * renders a claim already made rather than inventing one; it still
   * refuses to move at all without an ETA, and still stops at the door.
   *
   * Ticking once a second is enough: the vehicle eases between readings on
   * its own, so this only has to keep supplying it with somewhere to ease
   * towards.
   */
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [animate]);
  const etaReadAt = useRef(Date.now());
  const lastEta = useRef(eta?.etaSeconds ?? null);
  if ((eta?.etaSeconds ?? null) !== lastEta.current) {
    lastEta.current = eta?.etaSeconds ?? null;
    etaReadAt.current = Date.now();
  }

  const tripProgress = routeProgress({
    etaSecondsAtAssignment: etaSecondsAtAssignment ?? null,
    etaSecondsNow: eta?.etaSeconds ?? null,
    etaReadAtMs: etaReadAt.current,
    nowMs: tick,
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
          <RealMapSurface assigned={assigned} width={width} height={mapH} tone="dark" geo={geo} />
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
      {/*
        * THE SHEET IS BOUNDED AND IT SCROLLS.
        *
        * It used to be anchored to the bottom and sized purely by its
        * content, on the theory that a sheet should say as much as it has
        * to say. That is right until it has more to say than the phone is
        * tall — an assurance line, a professional, three actions, a price
        * line and a masking note — and then it grows upward past the top of
        * the screen and the overflow is simply clipped, with no way to
        * reach it. Amit: *"גם פה לא נגלל ולא זז."*
        *
        * So it is capped at the space the map is not using, plus a little
        * of the map's own, and anything beyond that scrolls. The map keeps
        * its share on a tall phone; on a short one the sheet can take more
        * of the screen rather than losing its last line.
        */}
      <View style={[styles.sheet, { maxHeight: height - mapH * 0.42 }]}>
        <View style={styles.grabber} />

        {/*
          * THE PROMISE IS THE SHEET'S FIRST LINE, not a number in a corner.
          * ספץ's equivalent screen has no ETA at all — their answer to "he
          * did not arrive" is that you telephone him. Ours states a clock
          * time, says out loud when it moves, and carries its own way out.
          */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.sm }}
          bounces={false}
        >
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

        {/*
          * WHAT IS HAPPENING, AND WHAT WILL BE ASKED OF YOU.
          *
          * Once the arrival code is verified the journey is over, so
          * everything the arrival card had been saying stops being true
          * and the screen went quiet: a status word, and nothing else.
          * Amit: *"אחרי הקוד הגעתי לפה, לא קורה פה כלום."* `jobProgressHe`
          * lives beside the state machine so the sentence and the state
          * cannot drift; it promises no times, because a state does not
          * know any.
          */}
        {progressHe ? <Text style={styles.progress}>{progressHe}</Text> : null}

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
        </ScrollView>
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

  progress: {
    ...type.body,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
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
