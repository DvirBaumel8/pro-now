import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ServiceSupply } from "@pro-now/types";

import { lex, prosFreeShort } from "../lexicon";

import { elevation, imageRatio, radii, spacing, tint, type } from "../theme";
import { Mark, type MarkName } from "./marks";
import { ImageSlot } from "./surfaces";
import type { ThemeColors } from "./primitives";

/**
 * A service in the catalogue.
 *
 * The photograph carries the warmth and does the recognising; the mark is a
 * small wayfinding aid in the corner, not the hero. That ordering is what
 * separates this from a directory of icons in boxes.
 *
 * `availableNowCount` is the number of professionals the SERVER currently
 * reports as online and eligible for this service. It has THREE states, and
 * the tile renders three different things, because collapsing any two of
 * them is a lie:
 *
 *   n > 0   a green count — supply exists and dispatch will find it
 *   0       a muted "אין זמינות כרגע" — the server checked and there is none
 *   null    nothing at all — the server has not said, and neither will we
 *
 * The 0/null distinction is the one that is easy to lose and expensive to
 * lose. Rendering "no data" as "none available" tells the customer the
 * marketplace is empty when it may be busy; rendering "none available" as
 * "no data" invites them to tap into a dispatch that cannot succeed. Both
 * are /CLAUDE.md §3 failures, in opposite directions.
 */

export interface ServiceTileProps {
  nameHe: string;
  mark: MarkName;
  /** What the real photograph shows — see ImageSlot. */
  photoSubject: string;
  photoUri?: string | null;
  /** Server-reported count of professionals online for this service. */
  availableNowCount?: number | null;
  /** Full supply state. Preferred over availableNowCount when supplied. */
  supply?: ServiceSupply;
  /** Short price hint, already formatted, e.g. "מ-₪179". */
  priceHint?: string | null;
  colors: ThemeColors;
  dark?: boolean;
  width?: number;
  onPress?: () => void;
}

export function ServiceTile({
  nameHe,
  mark,
  photoSubject,
  photoUri,
  availableNowCount,
  supply,
  priceHint,
  colors,
  dark = false,
  width,
  onPress,
}: ServiceTileProps) {
  const state = supply
    ? supply.state
    : typeof availableNowCount === "number"
      ? availableNowCount > 0
        ? "AVAILABLE"
        : "UNAVAILABLE"
      : "UNKNOWN";
  const count = supply ? supply.count : (availableNowCount ?? null);
  const etaMinutes = supply?.nearestRouteEtaMinutes ?? null;

  const hasSupply = (state === "AVAILABLE" || state === "LIMITED") && typeof count === "number" && count > 0;
  const knownEmpty = state === "UNAVAILABLE";

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={nameHe}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: colors.surface },
        elevation(1, dark),
        pressed && styles.pressed,
      ]}
    >
      <View>
        <ImageSlot
          uri={photoUri}
          subject={photoSubject}
          ratio={imageRatio.serviceTile}
          radius={radii.md}
          colors={colors}
          dark={dark}
        />

        <View style={[styles.markBubble, { backgroundColor: colors.surface }, elevation(1, dark)]}>
          <Mark name={mark} size={19} color={colors.textPrimary} />
        </View>

        {hasSupply ? (
          <View
            style={[
              styles.supply,
              { backgroundColor: state === "LIMITED" ? "rgba(245,165,36,0.94)" : tint.action(0.92) },
            ]}
          >
            <View style={styles.supplyDot} />
            {/*
              * Hebrew has a distinct singular, so the count is never
              * interpolated straight into a plural noun — "1 זמינים" is the
              * kind of error that ships and quietly tells every reader the
              * product was not written by anyone who speaks the language.
              */}
            <Text style={styles.supplyText} numberOfLines={1}>
              {prosFreeShort(count as number, etaMinutes)}
            </Text>
          </View>
        ) : knownEmpty ? (
          <View style={[styles.supply, styles.supplyEmpty]}>
            <Text style={[styles.supplyText, { color: "#FFFFFF" }]}>{lex.noneFree}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={2}>
          {nameHe}
        </Text>
        {priceHint ? (
          <Text style={[styles.price, { color: colors.textSecondary }]} numberOfLines={1}>
            {priceHint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, padding: spacing.sm, overflow: "hidden" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },

  markBubble: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // Same shape and position as the green pill, so the eye reads them as the
  // same fact reported differently — not as two unrelated badges.
  supplyEmpty: { backgroundColor: "rgba(20,21,26,0.62)" },

  /**
   * A BAND ACROSS THE FOOT OF THE IMAGE, NOT A FLOATING PILL.
   *
   * As a pill it sat on top of whatever the image had there — and with no
   * licensed photography yet, what it sat on was the placeholder's own
   * caption, so two unrelated Hebrew strings overlapped into noise. A pill
   * is only safe over an image you control. A band is safe over anything,
   * because it covers rather than competes, and it still works once real
   * photographs land.
   */
  supply: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  supplyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" },
  supplyText: { ...type.caption, fontWeight: "700", color: "#17121F", flexShrink: 1 },

  body: { paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  name: { ...type.bodyStrong, fontSize: 15, lineHeight: 20, textAlign: "right", writingDirection: "rtl" },
  price: { ...type.caption, textAlign: "right", writingDirection: "rtl" },
});

/**
 * A compact row form for a category list — same content model, no
 * photograph, used where a grid would be too heavy.
 */
export function ServiceRow({
  nameHe,
  mark,
  metaHe,
  colors,
  dark = false,
  onPress,
}: {
  nameHe: string;
  mark: MarkName;
  metaHe?: string;
  colors: ThemeColors;
  dark?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [row.container, { backgroundColor: colors.surface }, elevation(1, dark), pressed && row.pressed]}
    >
      <View style={[row.markWrap, { backgroundColor: dark ? colors.surfaceElevated : "#F4F2EC" }]}>
        <Mark name={mark} size={21} color={colors.textPrimary} />
      </View>
      <View style={row.text}>
        <Text style={[row.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {nameHe}
        </Text>
        {metaHe ? (
          <Text style={[row.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {metaHe}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const row = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  pressed: { opacity: 0.9 },
  markWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, alignItems: "flex-end", gap: 1 },
  name: { ...type.bodyStrong, fontSize: 15, lineHeight: 20, textAlign: "right", writingDirection: "rtl" },
  meta: { ...type.caption, textAlign: "right", writingDirection: "rtl" },
});
