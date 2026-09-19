import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ServiceSupply } from "@pro-now/types";

import { prosFreeShort } from "../lexicon";
import { customerTheme, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";

/**
 * One service, in a list.
 *
 * A GRID IS THE WRONG SHAPE FOR A CATALOGUE. Two columns of picture-tiles
 * makes every service look equally important and equally photographic, and
 * with thirty services it becomes a wall to scroll past rather than a list
 * to read. Cards are for the handful of things available right now; the rest
 * of the catalogue is a list, which is scannable, dense, and honest about
 * being a list.
 *
 * The right-hand status is the whole point of the row: it says, in one
 * glance, whether tapping this leads anywhere. Four states, four different
 * sentences, and none of them is a dash.
 */

const colors = customerTheme.colors;

export interface ServiceListRowProps {
  nameHe: string;
  mark: MarkName;
  supply: ServiceSupply;
  /** True for a service that is catalogued but never dispatched NOW. */
  scheduledOnly?: boolean;
  /** True for a dispatchable service that is not open in this market yet. */
  notInMarket?: boolean;
  /**
   * True for a service the product is not offering yet at all — modelled,
   * visible, not launchable.
   *
   * Without this the pilot people-services rendered "נבדוק כשתבחר", which
   * promises a check that will never happen: they are not dispatchable, so
   * no supply query would ever run. Three different silences — planned by
   * nature, not in this city, not launched — and one of them was borrowing
   * another's words.
   */
  comingSoon?: boolean;
  descriptionHe?: string | null;
  onPress?: () => void;
}

export function ServiceListRow({
  nameHe,
  mark,
  supply,
  scheduledOnly,
  notInMarket,
  comingSoon,
  descriptionHe,
  onPress,
}: ServiceListRowProps) {
  /*
   * "לא עכשיו" and "עוד לא כאן" are different promises and must never be
   * collapsed. One says this kind of work is planned by nature; the other
   * says we have not signed up anyone here yet. Telling a customer that a
   * locksmith is "not urgent" because we have no locksmith in their city is
   * the kind of small lie that makes the whole screen untrustworthy.
   */
  const status = comingSoon
    ? { textHe: "בקרוב", tone: "muted" as const }
    : scheduledOnly
    ? { textHe: "בתיאום מראש", tone: "muted" as const }
    : notInMarket
      ? { textHe: "עוד לא באזור שלך", tone: "muted" as const }
      : supply.state === "AVAILABLE" || supply.state === "LIMITED"
        ? {
            textHe: prosFreeShort(supply.count ?? 0, supply.nearestRouteEtaMinutes),
            tone: supply.state === "LIMITED" ? ("warning" as const) : ("live" as const),
          }
        : supply.state === "UNAVAILABLE"
          ? { textHe: "אין פנויים כרגע", tone: "muted" as const }
          : { textHe: "נבדוק כשתבחר", tone: "muted" as const };

  const statusColor =
    status.tone === "live"
      ? colors.actionText
      : status.tone === "warning"
        ? colors.statusWarningText
        : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${nameHe} · ${status.textHe}`}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: tint.neutralLight(0.04) }]}
    >
      <View style={styles.markWrap}>
        <Mark name={mark} size={20} color={colors.textPrimary} />
      </View>

      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {nameHe}
        </Text>
        {descriptionHe ? (
          <Text style={styles.desc} numberOfLines={1}>
            {descriptionHe}
          </Text>
        ) : null}
      </View>

      <Text style={[styles.status, { color: statusColor }]} numberOfLines={1}>
        {status.textHe}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  markWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: tint.neutralLight(0.05),
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  name: { ...type.bodyStrong, fontSize: 15, color: colors.textPrimary, textAlign: "right", writingDirection: "rtl" },
  desc: { ...type.caption, fontSize: 12, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  status: { ...type.caption, fontSize: 12, writingDirection: "rtl", maxWidth: 110, textAlign: "left" },
});
