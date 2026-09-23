import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney, money } from "@pro-now/types";

import { customerDarkTheme, radii, spacing, tabular, tint, type } from "../theme";
import { Mark, type MarkName, ShieldCheckMark, StarMark } from "../components/marks";
import { Surface } from "../components/surfaces";

/**
 * C14 — THE LAST SCREEN OF A JOB.
 *
 * ---------------------------------------------------------------------
 * WHY IT EXISTS
 * ---------------------------------------------------------------------
 * Amit: *"חייב עוד מסך כלשהו אחרי המסך של החשבונית לפני שחוזרים לתפריט."*
 *
 * He is right, and the professional already had one. Sending a review on
 * `JobCompleteBody` called `go({ name: "home" })` — a stranger came to
 * your flat, did work, took money, you wrote them a review, and the app
 * put you back at a grid of categories with no acknowledgement that any
 * of it happened. `ProJobSettledBody` closes the same job for the
 * professional, with the shift's takings and a moment to breathe. The
 * customer got a redirect.
 *
 * ---------------------------------------------------------------------
 * WHAT A CLOSING SCREEN IS ALLOWED TO SAY
 * ---------------------------------------------------------------------
 * Only what is already true. It repeats no receipt — that was the screen
 * before — and it promises nothing about the future: no "נתראה בקריאה
 * הבאה", no discount, no invented loyalty.
 *
 * What it does answer is the two questions somebody actually has at that
 * moment, and neither was answered anywhere:
 *
 *   is that it, and where did my money go — the amount, once, with the
 *   same honesty `JobCompleteBody` uses about tense: charged is
 *   "חויב", anything else is "לתשלום", because choosing a payment
 *   provider is still an open decision (/CLAUDE.md §4) and telling
 *   somebody their card was charged when it was not is the worst thing
 *   here to be wrong about;
 *
 *   and what happens to the review they just wrote. It goes on the
 *   professional's profile. It is not anonymous, and saying so at the
 *   moment it is sent is the honest time to say it — after, not in a
 *   policy page nobody opened.
 */

const colors = customerDarkTheme.colors;

export interface JobClosedBodyProps {
  serviceNameHe: string;
  mark: MarkName;
  professionalDisplayName: string;
  /** "היום, 14:20 · 55 דקות" — assembled by the caller from job events. */
  whenHe: string;
  totalChargedMinorUnits: number;
  /** See `JobCompleteBody`: only a captured payment may say "חויב". */
  paymentCaptured?: boolean;
  /**
   * The rating they just gave, 1..5, or null if they skipped it.
   *
   * Null is a real answer and gets its own words. A screen that thanked
   * somebody for a review they chose not to leave would be talking to
   * the wrong person.
   */
  ratingGiven?: number | null;
  onDone?: () => void;
  onOpenReceipt?: () => void;
  onGetHelp?: () => void;
  /**
   * The door to the street, offered here and nowhere else in the job.
   *
   * Amit: *"שאנחנו מזמינים אותו להסתובב בעולם שלנו גם אם הוא לא צריך
   * עבודה דחופה עכשיו לעכשיו."*
   *
   * This is the one moment in the product where somebody has finished
   * with us and has no reason to open the app again for months — and it
   * is also the moment they have just seen the world work. An invitation
   * anywhere earlier competes with a flooded kitchen; here it competes
   * with nothing.
   *
   * Never absent for want of a figure — see `strollNeedsAvatar`. It used
   * to be, and that was the whole invitation quietly reaching almost
   * nobody: skipping the avatar is a real answer most people give, and
   * the door vanished for every one of them.
   */
  onStroll?: () => void;
  /**
   * There is nobody to walk as yet, so this door picks a figure first.
   *
   * A street with no figure in it is a map, and the point of this door is
   * that it is not one — so the requirement stands. What changed is what
   * happens when it is not met: the card says what the tap will do
   * instead of disappearing. A control that quietly does not exist is
   * indistinguishable, to the person, from a feature that does not.
   */
  strollNeedsAvatar?: boolean;
  width?: number;
  height?: number;
}

export function JobClosedBody({
  serviceNameHe,
  mark,
  professionalDisplayName,
  whenHe,
  totalChargedMinorUnits,
  paymentCaptured = false,
  ratingGiven = null,
  onDone,
  onOpenReceipt,
  onGetHelp,
  onStroll,
  strollNeedsAvatar = false,
  width = 390,
  height = 780,
}: JobClosedBodyProps) {
  return (
    <View style={[styles.screen, { width, height }]}>
      <View style={styles.body}>
        <View style={styles.tick}>
          <ShieldCheckMark size={30} color={colors.trust} />
        </View>

        <Text style={styles.title}>הקריאה נסגרה</Text>
        <Text style={styles.sub} numberOfLines={2}>
          {serviceNameHe} · {professionalDisplayName}
        </Text>
        <Text style={styles.when}>{whenHe}</Text>

        <Surface colors={colors} level={1} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.markBubble}>
              <Mark name={mark} size={18} color={colors.action} />
            </View>
            <View style={{ flex: 1 }}>
              {/*
                * The tense is the whole point. See `JobCompleteBody`: the
                * amount is real either way — it is the quote the customer
                * approved — and only whether the money has moved is in
                * question, because no payment provider has been chosen.
                */}
              <Text style={styles.amountLabel}>{paymentCaptured ? "חויב" : "לתשלום"}</Text>
              <Text style={styles.amount} numberOfLines={1}>
                {formatMoney(money(totalChargedMinorUnits, "ILS"))}
              </Text>
            </View>
          </View>
        </Surface>

        {/*
          * WHAT HAPPENS TO WHAT THEY JUST WROTE.
          *
          * Said at the moment it is sent, which is the honest time to say
          * it — not in a policy page nobody opened. A review here is not
          * anonymous; it goes on somebody's profile and affects whether
          * they get work.
          */}
        {ratingGiven !== null ? (
          <View style={styles.reviewRow}>
            <StarMark size={15} />
            <Text style={styles.reviewText}>
              הדירוג שלכם ({ratingGiven}/5) מופיע בפרופיל של {professionalDisplayName}.
            </Text>
          </View>
        ) : (
          <Text style={[styles.reviewText, styles.reviewAlone]}>
            לא השארתם דירוג, וזה בסדר גמור. אפשר להוסיף אותו מהקריאות שלי.
          </Text>
        )}
      </View>

      {/* ----------------------------------------------------------------
          AND THE STREET IS STILL THERE.

          Amit: *"שאנחנו מזמינים אותו להסתובב בעולם שלנו גם אם הוא לא
          צריך עבודה דחופה."*

          It promises nothing and asks for nothing: no offer, no discount,
          no "come back soon". It says the place exists and can be walked,
          which is true, and it is the only sentence on this screen that
          is about later rather than about what just happened.
          ---------------------------------------------------------------- */}
      {onStroll ? (
        <Pressable
          onPress={onStroll}
          accessibilityRole="button"
          accessibilityLabel={
            strollNeedsAvatar ? "בחירת דמות וטיול ברחוב של PRO NOW" : "טיול ברחוב של PRO NOW"
          }
          style={({ pressed }) => [styles.stroll, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.strollTitle}>הרחוב פתוח גם בלי קריאה</Text>
          <Text style={styles.strollSub} numberOfLines={2}>
            {strollNeedsAvatar
              ? "בחרו דמות ותוכלו להסתובב בעיר, לראות מי יש בה ולהיכנס לעסקים."
              : "אפשר להסתובב בעיר, לראות מי יש בה ולהיכנס לעסקים — בלי להזמין כלום."}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="סיום, חזרה למסך הבית"
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.ctaLabel}>סיום</Text>
        </Pressable>

        <View style={styles.quietRow}>
          <Quiet labelHe="החשבונית" onPress={onOpenReceipt} />
          <Quiet labelHe="משהו לא בסדר?" onPress={onGetHelp} />
        </View>
      </View>
    </View>
  );
}

function Quiet({ labelHe, onPress }: { labelHe: string; onPress?: () => void }) {
  if (!onPress) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={labelHe}
      style={({ pressed }) => [styles.quiet, pressed && { opacity: 0.85 }]}
    >
      <Text style={styles.quietLabel}>{labelHe}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
    overflow: "hidden",
    borderRadius: radii.xl,
    justifyContent: "space-between",
  },
  // Centred, because this screen's whole job is to be a pause. A closing
  // moment pinned to the top of a tall empty page is not one.
  body: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xl },
  tick: {
    width: 64,
    height: 64,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint.trust(0.16),
    marginBottom: spacing.lg,
  },
  title: { ...type.h1, color: colors.textPrimary, textAlign: "center", writingDirection: "rtl" },
  sub: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },
  when: { ...type.meta, color: colors.textSecondary, textAlign: "center", marginTop: 2 },

  card: { alignSelf: "stretch", marginTop: spacing.xl },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  markBubble: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint.action(0.14),
  },
  amountLabel: { ...type.meta, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  amount: { ...type.h2, ...tabular, color: colors.textPrimary, textAlign: "right" },

  reviewRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  reviewText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },
  /*
   * The gap belongs to the BLOCK, not to the text inside it. It was on
   * the text, so in the rated version — where the text shares a row with
   * a star — the star stayed put and only the words moved down, leaving
   * it hanging on a line of its own.
   */
  reviewAlone: { marginTop: spacing.lg },

  stroll: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: tint.trust(0.3),
    backgroundColor: tint.trust(0.08),
    gap: 2,
  },
  strollTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
  },
  strollSub: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  footer: { padding: spacing.xl, gap: spacing.md },
  cta: {
    minHeight: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.action,
  },
  ctaLabel: { ...type.bodyStrong, color: colors.onAction },
  quietRow: { flexDirection: "row-reverse", justifyContent: "center", gap: spacing.lg },
  quiet: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.sm },
  quietLabel: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
});
