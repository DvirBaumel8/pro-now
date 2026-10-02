import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { customerDarkTheme, customerTheme, palette, radii, scale, spacing, tabular, type } from "../theme";
import { NavGlyph } from "./NavGlyph";
import { Pulse } from "./LiveServiceCard";

/**
 * THE CUSTOMER SIDE HAS NO TAB BAR.
 *
 * It had one — four doors along the bottom of every screen — and ChatGPT's
 * objection was not that it looked dated but that it was the wrong shape
 * for this product: "אני לא רוצה שמתחת לרגע הזה יהיו כל הזמן ארבע דלתות
 * שמבקשות מהמשתמש לחשוב על ארכיטקטורת האפליקציה."
 *
 * The customer's home is a COMMAND SURFACE. It asks one question — מה צריך
 * עכשיו? — and a permanent navigation rail underneath it quietly contradicts
 * that, by implying the answer might be somewhere else in the app. The
 * professional's side is different and keeps its bar: that one IS an
 * operational app, opened repeatedly through a shift, where knowing where
 * things live is the point.
 *
 * So two pieces replace it:
 *
 *   `UtilityRow`       — a thin top row. History and account, nothing else.
 *   `ActiveJobCapsule` — appears only while a job is live.
 *
 * AND THE CAPSULE IS NOT NAVIGATION. ChatGPT rejected the tempting version
 * — one floating bar that becomes navigation when idle and tracking when
 * busy — and the reason is worth keeping: a component that changes its job
 * depending on state gives people an unstable mental model. They stop
 * knowing what the thing at the bottom of the screen IS. The capsule has
 * exactly one job, appears only when it has something true to say, and
 * disappears when it does not.
 */

const colors = customerTheme.colors;

export function UtilityRow({
  addressLabelHe,
  onCalls,
  onAccount,
  onChangeAddress,
  trailing,
  width,
}: {
  addressLabelHe: string;
  onCalls?: () => void;
  onAccount?: () => void;
  onChangeAddress?: () => void;
  /**
   * Anything the host needs to hang here — in the prototype, the side
   * switch. It belongs at the top because the bottom of a phone screen is
   * contested space and a demo affordance has no business competing there
   * with the product's own controls.
   */
  trailing?: React.ReactNode;
  width: number;
}) {
  return (
    <View style={[styles.utility, { width }]}>
      <Pressable
        onPress={onChangeAddress}
        accessibilityRole="button"
        accessibilityLabel="שינוי כתובת"
        style={styles.address}
      >
        <NavGlyph name="home" size={15} color={colors.textSecondary} />
        <Text style={styles.addressText} numberOfLines={1}>
          {addressLabelHe}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>

      <View style={styles.utilityRight}>
        <Pressable
          onPress={onCalls}
          accessibilityRole="button"
          accessibilityLabel="הקריאות שלי"
          style={styles.iconBtn}
        >
          <NavGlyph name="list" size={21} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={onAccount}
          accessibilityRole="button"
          accessibilityLabel="החשבון שלי"
          style={styles.iconBtn}
        >
          <NavGlyph name="person" size={21} color={colors.textPrimary} />
        </Pressable>
        {trailing}
      </View>
    </View>
  );
}

export interface ActiveJobCapsuleProps {
  /**
   * "דוגמה א׳ · בדרך אליך". No longer drawn, and still required: it is
   * the capsule's accessibility label, and a screen reader that is told
   * only "14 דקות" has been told the least useful half.
   */
  textHe: string;
  /** Minutes away, when the server has computed a route. */
  etaMinutes?: number | null;
  /**
   * How far through the trip the SERVER says they are, 0…1 — from
   * `routeProgress`, which derives it from the ETA and returns null
   * rather than guessing.
   *
   * Null is not a failure state and is not drawn as one. With a number
   * the figure stands at that point on the track and the track is
   * still: a claim, rendered. Without one the figure walks and the
   * ROAD moves past it instead — motion with no position in it, which
   * says "on their way" and says nothing about how far, because we do
   * not know how far. /CLAUDE.md §3.
   */
  progress?: number | null;
  /**
   * The drawn professional for this trade, when the pack has one.
   *
   * Amit: *"שפה תהיה האווטאר של הדמות של המקצוען שבחרנו, יותר מציאותי
   * בבקשה."* The silhouette below is true of every trade and reads
   * cleanly at thirty points, which is why it was built — but where
   * there IS a drawing of that trade's professional, a drawing beats a
   * silhouette and this is the same figure the world already uses for
   * that trade, so nothing new is being claimed about who is coming.
   *
   * No uri, no drawing: the silhouette carries on.
   */
  figureUri?: string | null;
  live?: boolean;
  onPress?: () => void;
  width: number;
}

/**
 * The capsule had one more note against it in review: "נכונה, אבל לא
 * מרגישה חיה. כדאי להראות יותר כמו התראה חיה."
 *
 * The fix is not more animation. It is that the capsule was a near-black
 * pill on a near-black screen — correct, legible, and completely inert,
 * because nothing distinguished it from the surface it sat on. Now it is a
 * raised surface with a coral wash at its leading edge and the ETA set in
 * coral: the only object on the home screen that is lit from inside, which
 * is what "someone is on their way to you right now" should look like.
 *
 * ---------------------------------------------------------------------
 * AND THEN THE SENTENCE CAME OUT OF IT
 * ---------------------------------------------------------------------
 * Amit, pointing at a screenshot of it: *"איפה שרשום דומה ב למטה תעיף
 * את זה ותעשה איזה דמות מגניבה של המקצוען מתקדמת ותשאיר רק את הזמן בסוף
 * של הדק."*
 *
 * He is right, and the reason is not decoration. The capsule said
 * "דוגמה ב׳ · בדרך אליך · 14 דק׳" — three facts, of which the customer
 * already knows the first (they chose them), can infer the second (why
 * else would this be here), and only needs the third. A line of type
 * spending two thirds of itself on what you already know reads as
 * filler, and filler on the one live element of the screen is exactly
 * what makes it feel dead.
 *
 * A figure walking a road says "בדרך אליך" without a word of it, in a
 * way type cannot: it is the only thing on the home screen that MOVES,
 * and movement is what "right now" looks like. The minutes stay,
 * because the minutes are the part nobody can infer.
 *
 * The name does not disappear — it moves to the accessibility label,
 * where somebody who cannot see the figure still gets the sentence.
 */

/** The vertical space the capsule needs, for callers sizing the body. */
export const CAPSULE_HEIGHT = 68;

export function ActiveJobCapsule({
  textHe,
  etaMinutes,
  progress = null,
  figureUri = null,
  live = true,
  onPress,
  width,
}: ActiveJobCapsuleProps) {
  return (
    <View style={[styles.capsuleWrap, { width }]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${textHe}${etaMinutes ? `, ${etaMinutes} דקות` : ""}`}
        /*
         * AN EXPLICIT WIDTH, NOW THAT THE CONTENT IS NOT A SENTENCE.
         *
         * The pill used to size itself to its text and `maxWidth: 92%`
         * kept it from running off. With the text gone the only greedy
         * child is the road, and a `flex: 1` child inside a row that
         * shrink-wraps its content collapses to nothing — the first
         * build put a walker, a door and nine dashes into about sixty
         * points, all on top of the minutes.
         */
        style={({ pressed }) => [
          styles.capsule,
          { width: Math.round(width * 0.92) },
          pressed && { opacity: 0.92 },
        ]}
      >
        <ApproachTrack progress={progress} figureUri={figureUri} />
        {typeof etaMinutes === "number" ? (
          <Text style={styles.capsuleEta}>{etaMinutes} דק׳</Text>
        ) : null}
        {live ? <Pulse color={colors.action} size={7} /> : null}
        {/* "Open" points forward — in Hebrew that is left, at the far end (multi-order spec, finding E). */}
        <Text style={styles.capsuleGo}>‹</Text>
      </Pressable>
    </View>
  );
}

/**
 * THE ROAD, THE WALKER, AND YOUR DOOR.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS DRAWN AND NOT A PICTURE
 * ---------------------------------------------------------------------
 * The art pack has a professional for every trade and a vehicle for
 * three, and none of them would be right here: the capsule is 68 points
 * tall, so the figure is about thirty, and a thirty-point crop of a
 * detailed drawing is a smudge. It is also the wrong claim — a plumber
 * shown when the job is electrical is a lie told by an asset id.
 *
 * So it is a silhouette: head, body, a bag, two legs that swing. At
 * this size a silhouette reads as "a person walking" more clearly than
 * any illustration would, and it is true of every trade.
 *
 * ---------------------------------------------------------------------
 * RIGHT TO LEFT, BECAUSE THE APP IS
 * ---------------------------------------------------------------------
 * The walker starts at the right and the door is at the left. In an RTL
 * layout that is the direction of travel through a sentence, so it
 * reads as approach rather than departure without anybody deciding to
 * read it.
 */
function ApproachTrack({
  progress,
  figureUri,
}: {
  progress: number | null;
  figureUri: string | null;
}) {
  const step = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    /*
     * 1600ms, not 1100. Amit: *"שיראו התקדמות כאילו היא צועדת לאט."*
     * A stride every half second is a jog, and a jog in a status
     * capsule reads as urgency — which is a claim about the job. A
     * walk is the honest gait: somebody is on their way, calmly.
     */
    const loop = Animated.loop(
      Animated.timing(step, {
        toValue: 1,
        duration: 1600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [step]);

  /* One cycle is two strides, so each leg leads once. */
  const swing = step.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ["17deg", "0deg", "-17deg", "0deg", "17deg"],
  });
  const swingBack = step.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ["-17deg", "0deg", "17deg", "0deg", "-17deg"],
  });
  /* The small rise and fall of a body over its own stride. */
  const bob = step.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -1.2, 0, -1.2, 0],
  });

  const known = typeof progress === "number";
  const known01 = known ? Math.max(0, Math.min(1, progress as number)) : 0;

  return (
    <View style={styles.track} pointerEvents="none">
      {/*
        * THE ROAD.
        *
        * Dashes, and they only move when the walker does not. With a
        * server progress the figure travels the track and the road is
        * still; without one the figure walks on the spot and the road
        * runs past, which is motion that makes no claim about distance.
        */}
      <View style={styles.road}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dash,
              known
                ? null
                : {
                    transform: [
                      {
                        translateX: step.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 14],
                        }),
                      },
                    ],
                  },
            ]}
          />
        ))}
      </View>

      {/* Your door, at the end of it. */}
      <View style={styles.doorWrap}>
        <View style={styles.doorPin} />
        <View style={styles.doorStem} />
      </View>

      <Animated.View
        style={[
          styles.walker,
          {
            /* RTL: `right` is the start. A known progress walks it in. */
            right: known ? `${14 + known01 * 68}%` : "16%",
            transform: [{ translateY: bob }],
          },
        ]}
      >
        {figureUri ? (
          /* The drawn professional. It only bobs: a drawing has its own
             legs and swinging them from the hip would tear it in half. */
          <Image source={{ uri: figureUri }} style={styles.figure} resizeMode="contain" />
        ) : (
          <>
            <View style={styles.head} />
            <View style={styles.body} />
            <View style={styles.bag} />
            <Animated.View style={[styles.leg, { transform: [{ rotate: swing }] }]} />
            <Animated.View style={[styles.leg, { transform: [{ rotate: swingBack }] }]} />
          </>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  utility: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  address: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    flexShrink: 1,
    paddingLeft: spacing.sm,
  },
  addressText: {
    ...type.caption,
    fontSize: scale.meta,
    color: colors.textPrimary,
    writingDirection: "rtl",
    flexShrink: 1,
  },
  chevron: { ...type.caption, color: colors.textSecondary },
  utilityRight: { flexDirection: "row-reverse", alignItems: "center" },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  /**
   * IN THE LAYOUT, NOT OVER IT.
   *
   * It floated at `bottom: spacing.lg` for about ten minutes, which was
   * long enough for the Playwright walk to catch it swallowing every tap
   * meant for the strip underneath — the third time in this project a
   * bottom-anchored absolute element has eaten another control's clicks.
   * The pattern is the lesson: on a phone, the bottom of the screen is
   * contested space, and anything that floats there must be told by the
   * layout how much room it has.
   */
  capsuleWrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.sm },
  capsule: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: palette.night700,
    /*
     * A coral hairline, not a coral block. The first attempt washed the
     * leading third of the pill in tint.action(0.16), which at this radius
     * renders as a hard-edged rectangle bleeding out of a rounded shape —
     * a gradient would fix it and the system forbids gradients. One lit
     * edge says "live" without pretending to be light falling on anything.
     */
    borderRightWidth: 3,
    borderRightColor: palette.signal500,
    // Elevation only, no border: a surface may be raised or outlined, never
    // both (Visual System v1 §5).
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  capsuleEta: { ...type.bodyStrong, ...tabular, color: colors.action, flexShrink: 0 },

  /* ----- the road the professional walks, inside the capsule ----- */
  track: { flex: 1, height: 40, justifyContent: "center" },
  road: {
    position: "absolute",
    left: 6,
    right: 6,
    bottom: 7,
    height: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  dash: { width: 7, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.16)" },
  doorWrap: { position: "absolute", left: 2, bottom: 5, alignItems: "center" },
  doorPin: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.action,
    backgroundColor: "transparent",
  },
  doorStem: { width: 2, height: 4, backgroundColor: colors.action, opacity: 0.6 },
  /*
   * A silhouette, built out of four small blocks. The legs are anchored
   * at the TOP so a rotation swings them from the hip; anchored at the
   * centre, which is the default, they scissor around their own knees
   * and the figure looks like it is skating.
   */
  walker: { position: "absolute", bottom: 7, width: 16, height: 30, alignItems: "center" },
  /* Wider than the silhouette's 16, because a drawn figure has arms. */
  figure: { width: 30, height: 34, marginLeft: -7 },
  head: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: customerDarkTheme.colors.textPrimary,
  },
  body: {
    width: 9,
    height: 11,
    marginTop: 1,
    borderRadius: 3,
    backgroundColor: customerDarkTheme.colors.textPrimary,
  },
  bag: {
    position: "absolute",
    right: -1,
    top: 12,
    width: 6,
    height: 6,
    borderRadius: 1.5,
    backgroundColor: colors.action,
  },
  leg: {
    position: "absolute",
    bottom: 0,
    width: 2.5,
    height: 10,
    borderRadius: 1.5,
    backgroundColor: customerDarkTheme.colors.textPrimary,
    transformOrigin: "top",
  },
  capsuleGo: { color: "rgba(255,255,255,0.55)", fontSize: scale.section, lineHeight: 26 },
});
