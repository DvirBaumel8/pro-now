import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ServiceSupply } from "@pro-now/types";

import { prosFreeShort } from "../lexicon";
import { customerDarkTheme, customerTheme, radii, spacing, tabular, tint, type } from "../theme";
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
 *
 * ---------------------------------------------------------------------
 * WHY `emphasis` EXISTS
 * ---------------------------------------------------------------------
 * Every row used to render identically and differ only in the words on the
 * right, which produced the exact defect the design review named:
 *
 *   "הקטגוריה עדיין נראית כמו רשימת cards. 'נבחר עבורך', 'בקרוב אליך',
 *    'נבדוק ביחד' הן שלוש יחידות מידע, אבל הן לא חייבות להיות שלושה
 *    מלבנים כמעט זהים. ההבדל הסמנטי ביניהן צריך להיות מורגש דרך layout,
 *    typography ופעולה — לא רק copy."
 *
 * That is right, and it is a bigger point than a list style. "Someone can
 * be at your door in eleven minutes" and "we have not launched this yet"
 * are not two values of one field. Rendering them the same size, the same
 * weight and the same height asks the customer to read every row to find
 * the one that can actually happen — which is precisely the work this
 * product exists to do for them.
 *
 * So a reachable service is a taller row, its name a step larger, its ETA
 * set as a number rather than folded into a sentence, and it has a chevron
 * because it leads somewhere. Everything else is quiet: smaller, dimmer,
 * no chevron, and grouped under its own reason.
 */


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
  /**
   * `live` — someone is reachable. `quiet` — this row is information, not
   * an option right now. Defaults to `live` when supply says so.
   */
  emphasis?: "live" | "quiet";
  /** The surface this row sits on. The customer side is dark by default. */
  tone?: "light" | "dark";
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
  emphasis,
  tone = "dark",
  onPress,
}: ServiceListRowProps) {
  const colors = tone === "dark" ? customerDarkTheme.colors : customerTheme.colors;
  const wash = tone === "dark" ? tint.neutralDark : tint.neutralLight;
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

  const reachable = !comingSoon && !scheduledOnly && !notInMarket &&
    (supply.state === "AVAILABLE" || supply.state === "LIMITED");
  const loud = (emphasis ?? (reachable ? "live" : "quiet")) === "live";

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
      style={({ pressed }) => [
        styles.row,
        loud ? styles.rowLoud : styles.rowQuiet,
        pressed && { backgroundColor: wash(0.06) },
      ]}
    >
      <View
        style={[
          styles.markWrap,
          loud ? styles.markLoud : styles.markQuiet,
          { backgroundColor: loud ? tint.action(0.14) : wash(0.06) },
        ]}
      >
        <Mark name={mark} size={loud ? 21 : 17} color={loud ? colors.textPrimary : colors.textSecondary} />
      </View>

      <View style={styles.text}>
        <Text
          style={[
            loud ? styles.nameLoud : styles.nameQuiet,
            { color: loud ? colors.textPrimary : colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {nameHe}
        </Text>
        {descriptionHe && loud ? (
          <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={1}>
            {descriptionHe}
          </Text>
        ) : null}
      </View>

      <Text style={[loud ? styles.statusLoud : styles.statusQuiet, { color: statusColor }]} numberOfLines={1}>
        {status.textHe}
      </Text>

      {/* A chevron is a promise that this goes somewhere. Only the rows
          that do, get one. */}
      {loud ? <Text style={[styles.go, { color: colors.textSecondary }]}>‹</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowLoud: { minHeight: 68 },
  rowQuiet: { minHeight: 52 },
  markWrap: { borderRadius: 14, alignItems: "center", justifyContent: "center" },
  markLoud: { width: 42, height: 42 },
  markQuiet: { width: 34, height: 34 },
  text: { flex: 1 },
  nameLoud: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  nameQuiet: { ...type.meta, textAlign: "right", writingDirection: "rtl" },
  desc: { ...type.meta, textAlign: "right", writingDirection: "rtl" },
  statusLoud: { ...type.metaStrong, ...tabular, writingDirection: "rtl", maxWidth: 124, textAlign: "left" },
  statusQuiet: { ...type.micro, writingDirection: "rtl", maxWidth: 110, textAlign: "left" },
  go: { ...type.body, marginRight: -spacing.xs },
});
