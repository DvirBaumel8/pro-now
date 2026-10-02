import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { type WorldGeo, geoAspect } from "@pro-now/demo-types";

import { radii, scale, spacing, type } from "../theme";
import { GeoPlate } from "./livingmap/GeoPlate";
import { LiveField } from "./LiveField";

/**
 * A map, only where a map is the truth.
 *
 * Visual System v1 §11: a map surface is allowed when an assignment exists
 * and both sides need the location to execute — tracking and navigation.
 * Everywhere else it is the Live Field. The middle option that used to exist
 * here, a drawing of streets that is not a map, is the worst of the three:
 * it promises geography it does not have, and it invites the customer to
 * read a position off it that we have not earned the right to show.
 *
 * WHAT THIS RENDERS TODAY. Three states, in order of how much truth is
 * available.
 *
 * With a `geo` — a real street plan, fetched once and committed — this
 * draws the real geometry in the world's own ink. That is the state Amit
 * asked for: *"רק הצורה של המפה תהיה אמיתית."* It needs no vendor and
 * therefore breaks no `/CLAUDE.md §4` rule, because geometry is a file and
 * not a contract.
 *
 * With `tiles`, whatever a future provider renders.
 *
 * With neither, the Live Field in its ROUTE state and one line saying the
 * map arrives with the provider. The composition, the height and the
 * layering are already final, so the day either of the other two arrives
 * nothing around them moves.
 *
 * `assigned` is required and not decorative. A caller that cannot say a
 * professional has been assigned is a caller that should be using
 * `LiveField` directly, and passing `false` renders the field rather than
 * quietly drawing a map anyway.
 */

export interface RealMapSurfaceProps {
  /** True only once a professional has actually been assigned to this job. */
  assigned: boolean;
  width: number;
  height: number;
  /** The provider's rendered tiles, once there is a provider. */
  tiles?: React.ReactNode;
  /**
   * A real street plan. Takes precedence over `tiles`, because geometry we
   * draw ourselves is both truer to the world's art and cheaper to be
   * honest about than a picture of somebody else's city.
   */
  geo?: WorldGeo | null;
  /** Shown over the surface — an ETA pill, a status line. */
  children?: React.ReactNode;
  tone?: "light" | "dark";
}

export function RealMapSurface({
  assigned,
  width,
  height,
  tiles,
  geo = null,
  children,
  tone = "dark",
}: RealMapSurfaceProps) {
  /*
   * THE MAP BAND IS A LETTERBOX AND THE CITY IS NOT.
   *
   * A band is about 172pt tall and the full width of the phone; an extract
   * is roughly square. Drawing the whole extract into the band would
   * squash the city flat, so the plate is drawn at its OWN aspect, wide
   * enough to fill the band, and the band crops it. Same choice the
   * painted plate makes, for the same reason: a squashed street plan is
   * not a street plan.
   */
  const plateWidth = Math.max(width, height * (geo ? geoAspect(geo.bounds) : 1));
  const plateHeight = plateWidth / (geo ? geoAspect(geo.bounds) : 1);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {geo ? (
        <View style={[StyleSheet.absoluteFill, styles.crop]}>
          <View style={{ width: plateWidth, height: plateHeight, marginTop: (height - plateHeight) / 2 }}>
            <GeoPlate geo={geo} width={plateWidth} height={plateHeight} attribution={false} />
          </View>
          {geo.real && geo.attribution ? (
            <View style={styles.creditWrap} pointerEvents="none">
              <Text style={styles.credit}>{geo.attribution}</Text>
            </View>
          ) : null}
        </View>
      ) : tiles ? (
        <View style={StyleSheet.absoluteFill}>{tiles}</View>
      ) : (
        <>
          <LiveField
            state={assigned ? "ROUTE" : "SEARCHING"}
            width={width}
            height={height}
            tone={tone}
          />
          <View style={styles.noteWrap} pointerEvents="none">
            <View style={styles.note}>
              <Text style={styles.noteText}>
                תצוגת המפה תיכנס כאן עם ספק המפות
              </Text>
            </View>
          </View>
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  crop: { overflow: "hidden", alignItems: "center" },
  creditWrap: { position: "absolute", left: spacing.sm, bottom: 2 },
  credit: {
    ...type.caption,
    fontSize: scale.micro,
    color: "rgba(247,243,250,0.45)",
    writingDirection: "rtl",
  },
  /*
   * The note sits at the FOOT of the map band. At the top it landed on the
   * screen's own status pill — two pieces of chrome, centred, at the same
   * height, in two languages.
   */
  noteWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: spacing.xxl,
  },
  note: {
    paddingHorizontal: spacing.md,
    minHeight: 28,
    justifyContent: "center",
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.7)",
  },
  noteText: { ...type.caption, fontSize: scale.micro, color: "rgba(247,243,250,0.75)", writingDirection: "rtl" },
});
