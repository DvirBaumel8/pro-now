import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  arrivalDetailHe,
  arrivalHeadlineHe,
  type ArrivalAssessment,
} from "@pro-now/demo-types";

import { customerDarkTheme, depth, palette, radii, spacing, tabular, tint, type } from "../theme";
import { Glow } from "./Glow";

/**
 * THE PROMISE, AND WHAT HAPPENS WHEN IT BREAKS.
 *
 * ---------------------------------------------------------------------
 * WHY THIS COMPONENT IS THE PRODUCT
 * ---------------------------------------------------------------------
 * Researching ספץ — the closest Israeli competitor, and the one Amit
 * actually tried — turned up the gap the whole of PRO NOW is built in.
 * Their confirmation screen says **"ספץ בדרך אליך!"**, and their own FAQ
 * answer to *"איש המקצוע לא הגיע, מה אפשר לעשות?"* is that you should open
 * your referrals screen and **telephone him yourself**. Their recovery path
 * is an automated call where you press 2. There is no ETA, no tracking and
 * no re-dispatch anywhere in the product.
 *
 * They promise arrival and deliver a phone number. Amit tried it, got a
 * call in under a minute, liked it, and said the thing that defines this
 * product: *"אבל אני רוצה כמו גט טקסי וולט יותר."*
 *
 * A callback is a lead. An arrival is a commitment. This component is where
 * the commitment is stated, and — more importantly — where it is kept.
 *
 * ---------------------------------------------------------------------
 * THE FOUR STATES, AND WHY THE LAST TWO EXIST
 * ---------------------------------------------------------------------
 *   COMMITTED  someone accepted, and here is the clock time.
 *   RUNNING_LATE the ETA moved. Said out loud, with the new time, BEFORE
 *                the customer notices the old one pass.
 *   REDISPATCHING he fell through and we are already finding someone else.
 *   BROKEN     we could not. Here is what we are doing about it.
 *
 * Most products build the first state and treat the rest as error handling.
 * That is backwards for this category: an emergency product is judged
 * entirely on the day it goes wrong, because a day it goes right is
 * indistinguishable from any competitor. The failure states are the feature.
 *
 * ---------------------------------------------------------------------
 * THE HONESTY RULE
 * ---------------------------------------------------------------------
 * `arrivalClockHe` is a server value and this component will not invent
 * one. A missing ETA renders as a sentence about why it is missing, never
 * as a dash and never as a plausible number — the same rule as HeroMetric
 * and for the same reason (/CLAUDE.md §3). A promised time that was guessed
 * is worse than no promise, because it is the one thing the customer will
 * hold us to.
 */

const colors = customerDarkTheme.colors;

export interface ArrivalPromiseProps {
  /**
   * The verdict from `assessArrival`, not a UI state this screen invented.
   *
   * THE WORDS COME FROM THE SAME MODULE AS THE RULE. A screen that says
   * "בדרך אליך" while the machine says ARRIVAL_AT_RISK is the exact failure
   * Arrival Assurance exists to prevent, and it is invisible in review when
   * the sentence and the state live in different files. So this component
   * renders `arrivalHeadlineHe` and `arrivalDetailHe` and owns no copy of
   * its own for the phases.
   */
  assessment: ArrivalAssessment;
  /** "22:49" — computed by the server from a real route. */
  arrivalClockHe: string | null;
  /** Minutes remaining, when known. */
  minutesAway?: number | null;
  /** What the clock said before it moved. Shown beside the new one. */
  previousClockHe?: string | null;
  /** The professional's name, once there is one. */
  displayNameHe?: string | null;
  female?: boolean;
  /** Offered in every state except COMMITTED. */
  onGetHelp?: () => void;
  onCancel?: () => void;
  width: number;
}

export function ArrivalPromise({
  assessment,
  arrivalClockHe,
  minutesAway,
  previousClockHe,
  displayNameHe,
  female = false,
  onGetHelp,
  onCancel,
  width,
}: ArrivalPromiseProps) {
  const phase = assessment.phase;
  const arrived = phase === "ARRIVED";
  /*
   * ARRIVED IS A KEPT PROMISE, so it belongs with the states that have
   * nothing to recover from. The recovery actions below — "דברו איתנו
   * עכשיו" and "ביטול בלי חיוב" — are for a promise that is in trouble.
   * Offering a free cancellation to somebody whose professional is
   * already working in their kitchen is both a wrong action and a wrong
   * claim about what it would cost them.
   */
  const committed = phase === "ARRIVED" || phase === "ON_ROUTE" || phase === "NEW_PRO_ASSIGNED";
  const late = phase === "DELAYED";
  const atRisk = phase === "ARRIVAL_AT_RISK";
  const searching = phase === "REMATCHING";
  const broken = phase === "RECOVERY";

  const accent = arrived
    ? palette.trust300
    : broken
    ? colors.statusDanger
    : atRisk || late
      ? colors.statusWarning
      : searching
        ? palette.signal500
        : palette.trust300;

  const headline = arrivalHeadlineHe(assessment, displayNameHe, female);
  const detail = arrivalDetailHe(assessment);

  /*
   * THE CLOCK DISAPPEARS WITH THE CONFIDENCE BEHIND IT. Once the position
   * is stale or the professional is gone, the promised time is a real
   * number that is no longer about anything — the most seductive form of a
   * fabricated ETA (/CLAUDE.md §3). The machine has already decided this;
   * the screen only has to obey it.
   */
  /*
   * AND IT DISAPPEARS WHEN THERE IS NOTHING LEFT TO PROMISE.
   *
   * A promised arrival time under the words "הגיע אליכם" is not a
   * promise, it is a countdown to something that already happened — and
   * it ran for the whole length of the visit, ticking towards an arrival
   * fourteen minutes away while the same screen's status line said the
   * work was under way. See the `ARRIVED` phase.
   */
  const showClock = arrivalClockHe !== null && !arrived && !atRisk && !searching && !broken;

  return (
    <View style={[styles.wrap, { width }]}>
      <Glow
        color={broken ? "neutral" : searching ? "signal" : "trust"}
        width={width}
        height={150}
        intensity={0.1}
        originY={0.45}
        spread={0.55}
      />

      <View style={styles.head}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={styles.headline} numberOfLines={1}>
          {headline}
        </Text>
      </View>

      {/*
        * THE COMMITMENT ITSELF. A clock time rather than a duration, because
        * "14 דקות" is a number you watch and "אצלך ב-22:49" is a plan you
        * can make around — and a person deciding whether to wait, or to
        * start cooking, or to put a child to bed, is making a plan.
        */}
      {showClock ? (
        <>
          {/* Minutes lead, the clock time beneath — the same order as the
              waiting screen, so the two never read differently (design review). */}
          {typeof minutesAway === "number" ? (
            <>
              <Text style={styles.clock} accessibilityLabel={`עוד ${minutesAway} דקות`}>
                {minutesAway} דק׳
              </Text>
              <Text style={styles.clockLabel}>{`הגעה בשעה ${arrivalClockHe}${late ? "" : " · משוער"}`}</Text>
            </>
          ) : (
            <>
              <Text style={styles.clock}>{arrivalClockHe}</Text>
              <Text style={styles.clockLabel}>זמן ההגעה</Text>
            </>
          )}
        </>
      ) : null}

      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {/*
        * A CHANGED PROMISE IS STATED, NOT SWAPPED. When the ETA moves, the
        * old time stays visible beside the new one. Quietly replacing it is
        * how a product trains people to stop believing its numbers — they
        * remember 22:40, they see 22:55, and nobody told them.
        */}
      {late && previousClockHe ? (
        <View style={styles.changed}>
          <Text style={styles.changedText}>הבטחנו {previousClockHe}</Text>
        </View>
      ) : null}

      {/*
        * THE RECOVERY PATH. ספץ's is a robocall where you press 2. For a
        * person standing in a flooded kitchen an IVR is an insult, so the
        * way out is a button, in the product, on the screen that broke.
        */}
      {!committed ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onGetHelp}
            accessibilityRole="button"
            accessibilityLabel="דברו איתנו עכשיו"
            style={({ pressed }) => [styles.help, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.helpText}>דברו איתנו עכשיו</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="ביטול הקריאה בלי חיוב"
            style={styles.cancel}
          >
            <Text style={styles.cancelText}>ביטול בלי חיוב</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.xl,
    backgroundColor: depth.panel.mid,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    alignItems: "center",
    overflow: "hidden",
    ...depth.litEdge(0.08),
  },
  head: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  headline: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  clock: { ...type.hero, ...tabular, color: colors.textPrimary, marginTop: spacing.sm },
  clockLabel: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl", marginTop: 2 },
  detail: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  changed: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: tint.neutralDark(0.07),
  },
  changedText: {
    ...type.meta,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    lineHeight: 19,
  },
  actions: { alignSelf: "stretch", marginTop: spacing.lg, gap: spacing.xs },
  help: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  helpText: { ...type.bodyStrong, color: palette.ink900 },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  cancelText: { ...type.meta, color: colors.textSecondary, writingDirection: "rtl" },
});
