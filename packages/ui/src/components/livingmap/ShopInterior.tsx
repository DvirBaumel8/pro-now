import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Rect, Stop } from "react-native-svg";

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
  /*
   * COMPOSED FOR THE BAND THAT IS ACTUALLY SEEN.
   *
   * The profile card rises over the lower ~43% of this screen, so a
   * room composed for the full frame puts its bench, its floor and the
   * person's feet behind the card — which is what the first version
   * did, and it read as a wall with tools on it rather than a place.
   * Everything is pulled up into the top half.
   */
  const horizon = Math.round(height * 0.34);
  const counterTop = Math.round(height * 0.44);
  const figureH = Math.round(height * 0.3);

  return (
    <View style={[styles.room, { width, height }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* The back wall, lit from the shopfront behind the viewer. */}
          <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#171122" />
            <Stop offset="1" stopColor="#2C2140" />
          </LinearGradient>
          {/* The floor, catching that light and losing it with depth. */}
          <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3E2F45" />
            <Stop offset="1" stopColor="#140D1B" />
          </LinearGradient>
          {/* The pool a work lamp throws on a bench. */}
          <LinearGradient id="lamp" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFB45C" stopOpacity="0.34" />
            <Stop offset="1" stopColor="#FFB45C" stopOpacity="0" />
          </LinearGradient>
          {/* Night outside, seen through the shop's own window. */}
          <LinearGradient id="outside" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4A3A6B" />
            <Stop offset="1" stopColor="#2A1F3C" />
          </LinearGradient>
          {/* The corners fall away, which is what a room does. */}
          <LinearGradient id="vignette" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B0710" stopOpacity="0.55" />
            <Stop offset="0.35" stopColor="#0B0710" stopOpacity="0" />
            <Stop offset="0.75" stopColor="#0B0710" stopOpacity="0" />
            <Stop offset="1" stopColor="#0B0710" stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={horizon} fill="url(#wall)" />
        <Rect x={0} y={horizon} width={width} height={height - horizon} fill="url(#floor)" />

        {/* ----------------------------------------------------------
            THE FLOOR HAS A DIRECTION.

            Four lines converging is the cheapest thing that turns a
            coloured band into a room you are standing in. Without them
            the lower half reads as a second wall.
            ---------------------------------------------------------- */}
        {[0.12, 0.34, 0.66, 0.88].map((f) => (
          <Line
            key={`plank-${f}`}
            x1={width * f}
            y1={horizon}
            x2={width * (0.5 + (f - 0.5) * 2.6)}
            y2={height}
            stroke="#FFFFFF"
            strokeOpacity={0.05}
            strokeWidth={1}
          />
        ))}

        {/* The window onto the street, with the night outside it. */}
        <Rect
          x={width * 0.63}
          y={horizon - height * 0.46}
          width={width * 0.3}
          height={height * 0.34}
          rx={3}
          fill="url(#outside)"
        />
        <Rect
          x={width * 0.63}
          y={horizon - height * 0.46}
          width={width * 0.3}
          height={height * 0.34}
          rx={3}
          fill="none"
          stroke="#0B0710"
          strokeWidth={4}
        />
        <Line
          x1={width * 0.78}
          y1={horizon - height * 0.46}
          x2={width * 0.78}
          y2={horizon - height * 0.12}
          stroke="#0B0710"
          strokeWidth={3}
        />
        {/* A lamp out there, because a street at night has them. */}
        <Circle cx={width * 0.72} cy={horizon - height * 0.36} r={width * 0.02} fill="#FFC680" opacity={0.5} />

        {/* ----------------------------------------------------------
            THE PEGBOARD. What a trade's back wall actually is: tools
            hung in a grid, sizes uneven, the light falling across them.
            ---------------------------------------------------------- */}
        <Rect
          x={width * 0.05}
          y={horizon - height * 0.5}
          width={width * 0.44}
          height={height * 0.38}
          rx={3}
          fill="#221A31"
        />
        {Array.from({ length: 18 }).map((_, i) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          const tall = (i * 7) % 3 === 0;
          const w = width * (tall ? 0.018 : 0.03);
          const h = height * (tall ? 0.085 : 0.045);
          return (
            <Rect
              key={`tool-${i}`}
              x={width * (0.075 + col * 0.068)}
              y={horizon - height * (0.47 - row * 0.115)}
              width={w}
              height={h}
              rx={2}
              fill="#F7F3FA"
              opacity={0.1 + ((i * 13) % 5) * 0.045}
            />
          );
        })}

        {/* The work light over the bench. Light is a gradient, not a picture. */}
        <Rect
          x={width * 0.1}
          y={horizon - height * 0.3}
          width={width * 0.7}
          height={height * 0.4}
          fill="url(#lamp)"
        />
        {/* Its shade, hanging. */}
        <Line
          x1={width * 0.34}
          y1={0}
          x2={width * 0.34}
          y2={horizon - height * 0.3}
          stroke="#0B0710"
          strokeWidth={2}
          strokeOpacity={0.8}
        />
        <Rect
          x={width * 0.29}
          y={horizon - height * 0.32}
          width={width * 0.1}
          height={height * 0.022}
          rx={4}
          fill="#0B0710"
        />

        {/* ----------------------------------------------------------
            THE BENCH, and things left on it. A counter with nothing on
            it is a shelf; the clutter is what says somebody works here.
            ---------------------------------------------------------- */}
        <Rect x={0} y={counterTop} width={width} height={height - counterTop} fill="#241A2E" />
        <Rect x={0} y={counterTop} width={width} height={3} fill="#FFB45C" opacity={0.42} />
        {[0.08, 0.2, 0.28, 0.4].map((f, i) => (
          <Rect
            key={`thing-${f}`}
            x={width * f}
            y={counterTop - height * (0.03 + (i % 2) * 0.022)}
            width={width * (0.05 + (i % 3) * 0.02)}
            height={height * (0.03 + (i % 2) * 0.022)}
            rx={2}
            fill="#F7F3FA"
            opacity={0.12 + (i % 3) * 0.05}
          />
        ))}

        <Rect x={0} y={0} width={width} height={height} fill="url(#vignette)" />
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
            left: Math.round(width * 0.14),
            top: counterTop - figureH - Math.round(height * 0.01),
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
