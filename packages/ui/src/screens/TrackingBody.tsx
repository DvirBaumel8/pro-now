import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { EtaView, JobState, ProfessionalSummaryView } from "@pro-now/types";

import { customerTheme, radii, spacing, tint, type } from "../theme";
import { formatCompletedJobs, formatEta, formatProNowRating } from "../format";
import { MapSurface } from "../components/MapSurface";
import { BottomSheet, Chip, RingedAvatar } from "../components/surfaces";
import { JobProgress } from "../components/JobProgress";
import { ClockMark, ShieldCheckMark, StarMark } from "../components/marks";

/**
 * C10 — Live job. The screen the customer actually sits and watches.
 *
 * Contact is deliberately abstracted: the buttons say "call" and "message",
 * and the app routes them through the masking vendor rather than exposing
 * either party's number. The vendor is an open decision (/CLAUDE.md §4), so
 * this body takes callbacks and never a phone number — there is no prop
 * here that could leak one.
 *
 * The ETA re-uses `formatEta`, so a coarse fallback estimate is marked as
 * approximate here exactly as it is on the match card. Consistency matters:
 * a number that was hedged on one screen must not look certain on the next.
 */

const colors = customerTheme.colors;

export interface TrackingBodyProps {
  status: JobState;
  serviceNameHe: string;
  professional: ProfessionalSummaryView;
  eta: EtaView | null;
  /** Already-formatted headline price, e.g. "₪179 דמי ביקור". */
  priceLineHe?: string | null;
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
  onCall,
  onMessage,
  onSafety,
  width = 390,
  height = 780,
}: TrackingBodyProps) {
  const etaDisplay = formatEta(eta);
  const rating = formatProNowRating(professional.proNowRatingAverage, professional.proNowRatingCount);
  const jobsLine = formatCompletedJobs(professional.proNowCompletedJobs);

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

  return (
    <View style={[styles.screen, { width, height }]}>
      <MapSurface
        colors={colors}
        height={height}
        showAssignedMarker
        statusText={etaDisplay ? `${headline} · ${etaDisplay.value} ${etaDisplay.unit}` : headline}
        style={styles.map}
      />

      <View style={styles.sheetWrap}>
        <BottomSheet colors={colors}>
          <JobProgress status={status} colors={colors} />

          {/* --- ETA headline --- */}
          <View style={styles.etaRow}>
            <View>
              <Text style={styles.headline}>{headline}</Text>
              <Text style={styles.service}>{serviceNameHe}</Text>
            </View>
            {etaDisplay ? (
              <View style={styles.etaBlock}>
                <Text style={styles.etaValue}>{etaDisplay.value}</Text>
                <Text style={styles.etaUnit}>{etaDisplay.unit}</Text>
              </View>
            ) : null}
          </View>

          {etaDisplay?.isApproximate ? (
            <Text style={styles.etaNote}>זמן ההגעה הוא הערכה ראשונית ויתעדכן</Text>
          ) : null}

          <View style={styles.divider} />

          {/* --- Professional --- */}
          <View style={styles.proRow}>
            <RingedAvatar
              seed={professional.id}
              size={58}
              uri={professional.profilePhotoUrl}
              name={professional.displayName}
              colors={colors}
            />
            <View style={styles.proText}>
              <Text style={styles.proName} numberOfLines={1}>
                {professional.displayName}
              </Text>
              <View style={styles.proMeta}>
                {rating ? (
                  <>
                    <StarMark size={13} />
                    <Text style={styles.proMetaText}>{rating.rating}</Text>
                    <Text style={styles.proMetaDim}>({rating.count})</Text>
                  </>
                ) : null}
                {rating && jobsLine ? <Text style={styles.proMetaDim}>·</Text> : null}
                {jobsLine ? <Text style={styles.proMetaDim}>{jobsLine}</Text> : null}
              </View>
            </View>
            {professional.verifications.includes("IDENTITY_VERIFIED") ? (
              <View style={styles.verifiedBubble}>
                <ShieldCheckMark size={18} color={colors.action} />
              </View>
            ) : null}
          </View>

          {/* --- Contact. No phone number crosses this boundary. --- */}
          <View style={styles.actions}>
            <Pressable onPress={onCall} accessibilityRole="button" style={styles.actionBtn}>
              <Text style={styles.actionLabel}>שיחה</Text>
            </Pressable>
            <Pressable onPress={onMessage} accessibilityRole="button" style={styles.actionBtn}>
              <Text style={styles.actionLabel}>הודעה</Text>
            </Pressable>
            <Pressable onPress={onSafety} accessibilityRole="button" style={[styles.actionBtn, styles.safetyBtn]}>
              <Text style={[styles.actionLabel, { color: colors.statusDanger }]}>בטיחות</Text>
            </Pressable>
          </View>

          {priceLineHe ? (
            <View style={styles.priceRow}>
              <ClockMark size={15} color={colors.textSecondary} />
              <Text style={styles.priceText}>{priceLineHe}</Text>
            </View>
          ) : null}

          <View style={styles.chipRow}>
            <Chip label="המספרים מוסתרים משני הצדדים" colors={colors} tone="neutral" />
          </View>
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  map: { ...StyleSheet.absoluteFillObject, borderRadius: 0 },
  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },

  etaRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  headline: { ...type.h1, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  service: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  etaBlock: { flexDirection: "row-reverse", alignItems: "baseline", gap: 5 },
  etaValue: { ...type.display, color: colors.action, fontVariant: ["tabular-nums"] },
  etaUnit: { ...type.h3, color: colors.action },
  etaNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 4,
  },

  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: spacing.lg },

  proRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  proText: { flex: 1, alignItems: "flex-end", gap: 3 },
  proName: { ...type.bodyStrong, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  proMeta: { flexDirection: "row-reverse", alignItems: "center", gap: 4, flexWrap: "wrap" },
  proMetaText: { ...type.caption, color: colors.textPrimary, fontWeight: "700" },
  proMetaDim: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  verifiedBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint.action(),
  },

  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.lg },
  actionBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  safetyBtn: { backgroundColor: tint.danger(0.08) },
  actionLabel: { ...type.captionStrong, color: colors.textPrimary },

  priceRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: spacing.lg },
  priceText: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  chipRow: { flexDirection: "row-reverse", marginTop: spacing.md },
});
