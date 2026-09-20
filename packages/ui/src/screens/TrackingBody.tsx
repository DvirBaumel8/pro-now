import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EtaView, JobState, ProfessionalSummaryView } from "@pro-now/types";

import { formatCompletedJobs, formatEta, formatProNowRating } from "../format";
import { customerDarkTheme, depth, palette, radii, scale, spacing, tabular, type } from "../theme";
import { ArrivalPromise, type ArrivalState } from "../components/ArrivalPromise";
import { ProviderPortrait } from "../components/ProviderPortrait";
import { RealMapSurface } from "../components/RealMapSurface";
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
   * What is actually happening to the promise. Defaults to COMMITTED, and
   * the other three are the reason this screen exists — see ArrivalPromise.
   */
  arrivalState?: ArrivalState;
  /** For RUNNING_LATE: the clock time we gave before it moved. */
  previousClockHe?: string | null;
  onGetHelp?: () => void;
  onCancelJob?: () => void;
  onCall?: () => void;
  onMessage?: () => void;
  onSafety?: () => void;
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
  arrivalState = "COMMITTED",
  previousClockHe = null,
  onGetHelp,
  onCancelJob,
  onCall,
  onMessage,
  onSafety,
  width = 390,
  height = 780,
}: TrackingBodyProps) {
  const etaDisplay = formatEta(eta);
  const rating = formatProNowRating(professional.proNowRatingAverage, professional.proNowRatingCount);
  const jobsLine = formatCompletedJobs(professional.proNowCompletedJobs);
  // Anything past the search means a professional is attached to this job.
  const assigned = status !== "SEARCHING" && status !== "DRAFT" && status !== "OFFERING";

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


  // The map gets the top 54%; the sheet sizes itself and overlaps the rest.
  const mapH = Math.round(height * 0.54);

  return (
    <ScreenShell side="customer" tone="dark" liveState="ROUTE" width={width} height={height}>
      <RealMapSurface assigned={assigned} width={width} height={mapH} tone="dark" />

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
          state={arrivalState}
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
