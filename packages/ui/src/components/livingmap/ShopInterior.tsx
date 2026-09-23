import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { districtFor, type DepartmentCode } from "@pro-now/types";

import { palette, radii, spacing, type } from "../../theme";
import { type WorldAssetSources } from "./AssetSlot";

/**
 * ---------------------------------------------------------------------
 * THE INSIDE OF A BUSINESS, DRAWN RATHER THAN PHOTOGRAPHED
 * ---------------------------------------------------------------------
 * Amit, three times and finally plainly: *"אני חייב להיכנס לתוך החנות
 * ממש."*
 *
 * One trade has an interior in the art pack — the barber's — and the
 * other ten are commissioned and not delivered. Until they land, the
 * threshold beat has nothing to show, which is the honest answer and a
 * useless one to somebody who wants to see the idea work.
 *
 * So this is the inside, built from what exists: the room itself is
 * geometry and light, both of which the renderer can make exactly, and
 * the only picture in it is the trade's OWN character — a file we have,
 * for every trade. Nothing is borrowed from another business and
 * nothing is generated to fill a hole.
 *
 * ---------------------------------------------------------------------
 * AND IT SAYS WHAT IT IS
 * ---------------------------------------------------------------------
 * The line at the bottom is not a disclaimer bolted on: it is the thing
 * that makes this allowed. A drawn room on a card about a named person
 * would otherwise read as a picture of THEIR premises, which is a claim
 * about a real business nobody has verified. It says, in the frame,
 * that it is an illustration of the trade and not a photograph of this
 * shop — and the moment a real interior arrives, the drawing is not
 * used (see `venueInteriorAssetId`).
 *
 * Every colour is from the palette and every shape is a rectangle. That
 * is deliberate: it is recognisably OURS, at a glance, which is the
 * other half of not being mistaken for a photograph.
 */
export interface ShopInteriorProps {
  departmentCode: DepartmentCode | string;
  sources?: WorldAssetSources;
  width: number;
  height: number;
}

export function ShopInterior({ departmentCode, sources, width, height }: ShopInteriorProps) {
  const district = districtFor(String(departmentCode));
  const figure = district ? sources?.[district.characterWorldAssetId] : undefined;

  /*
   * The horizon: where the back wall meets the floor. Low enough that
   * the floor reads as a room you are standing in rather than a shelf
   * seen head-on.
   */
  const horizon = Math.round(height * 0.62);
  const counterTop = Math.round(height * 0.72);
  const figureH = Math.round(height * 0.44);

  return (
    <View style={[styles.room, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* The wall, lit from the shopfront behind the viewer. */}
          <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1B1526" />
            <Stop offset="1" stopColor="#2A2038" />
          </LinearGradient>
          {/* The floor, catching the same light and losing it with depth. */}
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3A2C3F" />
            <Stop offset="1" stopColor="#170F1E" />
          </LinearGradient>
          {/* A warm pool where the work happens. */}
          <LinearGradient id="lamp" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFB45C" stopOpacity="0.30" />
            <Stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={horizon} fill="url(#wall)" />
        <Rect x={0} y={horizon} width={width} height={height - horizon} fill="url(#floor)" />

        {/* The light over the bench. Drawn, because light is a gradient. */}
        <Rect
          x={width * 0.18}
          y={horizon - height * 0.34}
          width={width * 0.64}
          height={height * 0.42}
          fill="url(#lamp)"
        />

        {/* Shelving on the back wall: the work put away, in rows. */}
        {[0, 1, 2].map((r) => (
          <Rect
            key={`shelf-${r}`}
            x={width * 0.06}
            y={horizon - height * (0.5 - r * 0.13)}
            width={width * 0.34}
            height={3}
            fill={palette.ink500}
            opacity={0.55}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect
            key={`box-${i}`}
            x={width * (0.08 + (i % 3) * 0.1)}
            y={horizon - height * (0.5 - Math.floor(i / 3) * 0.13) - height * 0.055}
            width={width * 0.07}
            height={height * 0.055}
            rx={2}
            fill={palette.ink500}
            opacity={0.38 + (i % 3) * 0.07}
          />
        ))}

        {/* The bench, with its own edge catching the lamp. */}
        <Rect
          x={0}
          y={counterTop}
          width={width}
          height={height - counterTop}
          fill="#241A2E"
        />
        <Rect x={0} y={counterTop} width={width} height={2} fill="#FFB45C" opacity={0.35} />
      </Svg>

      {/*
        * THE ONLY PICTURE IN THE ROOM, and it is one we drew for this
        * trade. A plumber's workshop has a plumber in it; the figure is
        * the same file that stands outside the shopfront on the street,
        * so the person you saw arrive is the person you are now standing
        * with.
        */}
      {figure ? (
        <Image
          source={figure}
          style={{
            position: "absolute",
            left: Math.round(width * 0.52),
            top: horizon - figureH + Math.round(height * 0.06),
            width: Math.round(figureH * 0.62),
            height: figureH,
          }}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={`איור של ${district?.labelHe ?? "העסק"}`}
        />
      ) : null}

      {district ? (
        <View style={styles.sign}>
          <Text style={styles.signBrand}>PRO NOW</Text>
          <Text style={styles.signTrade} numberOfLines={1}>
            {district.brandHe}
          </Text>
        </View>
      ) : null}

      {/*
        * WHAT MAKES THIS ALLOWED. See the note at the top of the file:
        * without it, a drawn room on a card about a named person reads
        * as a picture of their premises.
        */}
      <Text style={styles.note}>איור של העסק בתחום הזה · לא צילום של העסק הזה</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  room: { overflow: "hidden", backgroundColor: palette.night900 },
  sign: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    alignItems: "flex-end",
    backgroundColor: "rgba(14,10,20,0.55)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  signBrand: { ...type.overline, color: palette.signal300, letterSpacing: 1.6 },
  signTrade: { ...type.captionStrong, color: palette.nightText, writingDirection: "rtl" },
  /*
   * TOP LEFT, NOT ALONG THE BOTTOM.
   *
   * The profile card rises from the bottom of this screen and covers
   * roughly its lower half — so a line down there is a line nobody ever
   * reads, and this is the line that makes the drawing allowed.
   */
  note: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    maxWidth: "62%",
    ...type.micro,
    color: "rgba(247,243,250,0.62)",
    backgroundColor: "rgba(14,10,20,0.5)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.sm,
    textAlign: "right",
    writingDirection: "rtl",
    overflow: "hidden",
  },
});
