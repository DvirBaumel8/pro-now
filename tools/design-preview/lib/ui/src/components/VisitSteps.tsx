import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { visitStepsHe } from "@pro-now/demo-types";
import type { JobState } from "@pro-now/demo-types";

import { palette, spacing, type } from "../theme";

/**
 * WHERE THIS VISIT HAS GOT TO — THE SAME FOUR STEPS ON BOTH SIDES.
 *
 * ---------------------------------------------------------------------
 * WHY IT IS ONE COMPONENT AND NOT TWO
 * ---------------------------------------------------------------------
 * Amit: *"בשלב שהמקצוען התחיל לבדוק ועד להצעת מחיר אין שום דבר בזמן
 * העבודה, אין שום תחלופה במסך"*, and then *"המסכים חייבים להתחלף כל
 * לחיצת כפתור, כל פעולה, גם ללקוח וגם למקצוען."*
 *
 * Both of them are watching ONE visit. A customer told the work is at
 * step three while the professional's screen says step two is a
 * disagreement about a fact, in a product whose whole proposition is
 * that the two sides can trust what they are shown. Two copies of this
 * would drift the first time somebody changed one of them.
 *
 * So the steps come from `visitStepsHe`, beside the state machine, and
 * the drawing of them lives here, once.
 *
 * ---------------------------------------------------------------------
 * WHAT IT REFUSES TO SAY
 * ---------------------------------------------------------------------
 * No times, no percentage, no bar filling up. How long a diagnosis takes
 * is not knowable from a state, and drawing a bar that is 40% full is a
 * measurement nobody made (/CLAUDE.md §3). A step is behind you, the one
 * you are in, or ahead — three honest answers and no fourth one
 * pretending to be a fifth of the way through something.
 */
/**
 * ---------------------------------------------------------------------
 * AND IT HAS TO BE SEEN TO MOVE
 * ---------------------------------------------------------------------
 * Amit: *"תעבוד טוב על מעברים לפחות נראים לעין בין בדירה, הצעת מחיר,
 * עבודה, סיום ותשלום — שירגישו את כל התהליך הלקוח."*
 *
 * The tracker was correct and instantaneous. A step ended, the ring was
 * simply somewhere else on the next frame, and a person watching a
 * stranger work in their kitchen — who looks up at the screen every few
 * minutes — never saw anything happen. A mark that teleports is
 * information; a mark that travels is progress.
 *
 * So the rail behind the step you just left FILLS, left to right in the
 * direction the visit runs, and the ring that has just become current
 * arrives: it comes in small and settles, once. Both are transforms, so
 * both run off the JS thread while the rest of the screen is busy.
 *
 * WHAT IT STILL REFUSES TO DO. Nothing loops, nothing pulses while you
 * wait, and nothing fills gradually DURING a step. A bar creeping across
 * while a diagnosis happens would be a measurement nobody made
 * (/CLAUDE.md §3) — the motion here marks the instant a real thing
 * changed, and is then still.
 */
const FILL_MS = 480;
const RING_MS = 320;

export interface VisitStepsProps {
  status: JobState;
  /**
   * The surface this is drawn on. Both sides use a dark panel, and the
   * two themes disagree about their accent — so the colour that means
   * "you are here" is passed in rather than chosen here.
   */
  accent: string;
  done: string;
  /** False holds the tracker still — the same switch the world takes. */
  animate?: boolean;
}

export function VisitSteps({ status, accent, done, animate = true }: VisitStepsProps) {
  const steps = visitStepsHe(status);
  // Null before the professional arrives: the journey owns the screen
  // then, and a visit tracker beside a countdown answers a question
  // nobody is asking yet.
  if (!steps) return null;

  return (
    <StepsRow steps={steps} accent={accent} done={done} animate={animate} />
  );
}

function StepsRow({
  steps,
  accent,
  done,
  animate,
}: {
  steps: NonNullable<ReturnType<typeof visitStepsHe>>;
  accent: string;
  done: string;
  animate: boolean;
}) {
  /*
   * The step you are IN, or one past the end when the visit is over and
   * every step is behind you. `findIndex` returns -1 there, and -1 read
   * as a position leaves every rail unfilled on the one screen where the
   * whole thing is finished.
   */
  const nowIndex = steps.findIndex((s) => s.state === "NOW");
  const at = nowIndex === -1 ? steps.length : nowIndex;
  /*
   * ONE VALUE FOR THE WHOLE ROW, not one per step.
   *
   * The rails are filled in order and the ring lands at the end of the
   * one that just filled, so they are two halves of a single move. Two
   * independent timers would drift apart the first time a render landed
   * between them.
   */
  /*
   * STARTS AT ZERO WHEN THERE IS SOMETHING TO ARRIVE AT.
   *
   * The two sides reach a new step by different routes, and the motion
   * has to work for both. On the professional's side the job's state is
   * NOT part of the screen key — one screen following one job, by design
   * — so a step change is a re-render and the effect below catches it.
   * On the customer's side every stage is its own screen and the whole
   * thing is REMOUNTED, so there is no previous value to compare with:
   * the mount IS the step change. Hence the initial value.
   *
   * The cost is that leaving this screen and coming back replays the
   * arrival. That reads correctly — the mark lands where you are — and
   * it is a far smaller price than the animation never playing at all
   * on the side that matters most, which is what happened first.
   */
  const move = useRef(new Animated.Value(at > 0 && animate ? 0 : 1)).current;
  const lastAt = useRef(at);

  /*
   * The arrival, on mount. Guarded by a ref rather than an empty
   * dependency list, so the effect can name what it actually reads and
   * still run exactly once — the effect below owns every change after
   * this one.
   */
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    if (!animate || at === 0) return;
    Animated.timing(move, {
      toValue: 1,
      duration: FILL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [at, animate, move]);
  const [railW, setRailW] = useState(0);

  useEffect(() => {
    if (at === lastAt.current) return;
    const forward = at > lastAt.current;
    lastAt.current = at;
    if (!animate) {
      move.setValue(1);
      return;
    }
    /*
     * Only forward. A visit can go BACK — a declined quote returns the
     * professional to the diagnosis — and playing an arrival animation
     * for a step you have just lost would read as progress.
     */
    move.setValue(forward ? 0 : 1);
    if (!forward) return;
    Animated.timing(move, {
      toValue: 1,
      duration: FILL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [at, animate, move]);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityLabel={`שלב ${steps.findIndex((s) => s.state === "NOW") + 1} מתוך ${steps.length}: ${
        steps.find((s) => s.state === "NOW")?.labelHe ?? "הושלם"
      }`}
    >
      {steps.map((step, i) => (
        <View key={step.labelHe} style={styles.step}>
          <View style={styles.pipRow}>
            {step.state === "NOW" ? (
              <Animated.View
                style={[
                  styles.pip,
                  styles.pipNow,
                  { borderColor: accent },
                  /*
                   * It ARRIVES. Small and settling, once, at the end of
                   * the rail that just filled — so the eye is already
                   * travelling towards it when it lands.
                   */
                  {
                    transform: [
                      {
                        scale: move.interpolate({
                          inputRange: [0, RING_MS / FILL_MS, 1],
                          outputRange: [0.55, 0.7, 1],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ) : (
              <View style={[styles.pip, step.state === "DONE" && { backgroundColor: done }]} />
            )}
            {i < steps.length - 1 ? (
              <View
                style={styles.rail}
                onLayout={(e) => {
                  const w = Math.round(e.nativeEvent.layout.width);
                  if (w > 0 && w !== railW) setRailW(w);
                }}
              >
                {/* ----------------------------------------------------
                    THE RAIL FILLS RATHER THAN CHANGING COLOUR.

                    Anchored to its RIGHT edge, which is where the visit
                    starts in Hebrew. A transform's scale is about the
                    box's CENTRE — that is what a transform does — so
                    scaling alone would grow it from the middle outwards
                    in both directions. Half the growth is put back with
                    the translate, which is the same arithmetic the
                    contact shadows use, and the same trap.
                    ---------------------------------------------------- */}
                {railW > 0 ? (
                  <Animated.View
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: railW,
                      height: 2,
                      backgroundColor: done,
                      transform:
                        i < at - 1
                          ? [{ scaleX: 1 }]
                          : i === at - 1
                            ? [
                                { scaleX: move },
                                {
                                  translateX: move.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [railW / 2, 0],
                                  }),
                                },
                              ]
                            : [{ scaleX: 0 }],
                    }}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
          <Text
            style={[
              styles.label,
              step.state === "NOW" && styles.labelNow,
              step.state === "AHEAD" && styles.labelAhead,
            ]}
            numberOfLines={1}
          >
            {step.labelHe}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * `row-reverse`, so the first step is on the RIGHT where a Hebrew
   * reader starts and the rail grows leftwards — the direction the visit
   * travels.
   */
  row: { flexDirection: "row-reverse", marginTop: spacing.lg, marginBottom: spacing.xs, alignSelf: "stretch" },
  step: { flex: 1 },
  pipRow: { flexDirection: "row-reverse", alignItems: "center" },
  /*
   * A step still ahead has to be VISIBLE as a step. A low-alpha neutral
   * on a near-black panel left one lonely ring saying nothing at all
   * about what comes after it.
   */
  pip: { width: 9, height: 9, borderRadius: 999, backgroundColor: palette.ink300 },
  /*
   * The current step is a RING, not a bigger dot. A dot that grows reads
   * as "more"; this one means "here" — and a ring still reads as the
   * current step to somebody who cannot tell the two colours apart.
   */
  pipNow: { width: 13, height: 13, backgroundColor: "transparent", borderWidth: 3 },
  rail: { flex: 1, height: 2, marginHorizontal: 4, backgroundColor: palette.ink500 },
  label: {
    ...type.caption,
    color: palette.ink300,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 6,
  },
  labelNow: { color: palette.ink100, fontWeight: "700" },
  labelAhead: { opacity: 0.55 },
});
