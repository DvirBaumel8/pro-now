import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { radii, scale, spacing, type } from "../theme";
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
 * WHAT THIS RENDERS TODAY. No maps provider has been chosen — that is a §4
 * vendor decision — so with no `tiles` supplied this shows the Live Field in
 * its ROUTE state and says, once, that the map arrives with the provider.
 * That is the honest version of "a map goes here": the composition, the
 * height and the layering are already final, so the day tiles arrive nothing
 * around them moves.
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
  /** Shown over the surface — an ETA pill, a status line. */
  children?: React.ReactNode;
  tone?: "light" | "dark";
}

export function RealMapSurface({
  assigned,
  width,
  height,
  tiles,
  children,
  tone = "dark",
}: RealMapSurfaceProps) {
  return (
    <View style={[styles.wrap, { width, height }]}>
      {tiles ? (
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
