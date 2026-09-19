import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { proTheme, radii, spacing, tint, type } from "../theme";
import { lex } from "../lexicon";
import { ClockMark, Mark, type MarkName, ShieldCheckMark } from "../components/marks";
import { SectionHeader, Surface } from "../components/surfaces";

/**
 * P01 — becoming dispatchable.
 *
 * This screen did not exist, and it is the spine of the product's only real
 * claim. "Verified" is the entire difference between PRO NOW and a phone
 * number scrawled on a noticeboard, and a professional's first hour in the
 * app is spent here deciding whether the platform is serious.
 *
 * Four things it refuses to do, each of which is how trust products usually
 * rot:
 *
 * 1. **No progress bar over unfinished checks.** A percentage invites the
 *    reader to treat 80% as nearly-approved. Every step shows its own real
 *    state — and PENDING is not "almost", it is waiting on someone else.
 * 2. **Eligibility is per service, never per account** (/CLAUDE.md §3). A
 *    plumber whose electrician's licence lapsed keeps taking plumbing work.
 *    So the blocking list is per service, and the screen says which services
 *    are live rather than whether "the account" is approved.
 * 3. **A sandbox check earns no badge.** If the identity vendor is running
 *    in sandbox, the step says so in words and stays unverified. Showing
 *    "זהות אומתה" for a stub response is presenting mocked data as
 *    production, which is the one thing /CLAUDE.md forbids outright.
 * 4. **Expiry is a first-class state.** Documents lapse, and a platform
 *    that treats "verified once" as "verified" is lying on a delay. An
 *    expired step blocks its services and says exactly which.
 */

const colors = proTheme.colors;

export type StepState = "NOT_STARTED" | "IN_REVIEW" | "VERIFIED" | "REJECTED" | "EXPIRED" | "SANDBOX";

export interface VerificationStep {
  id: string;
  titleHe: string;
  /** What this proves, in one line. Not what it is called internally. */
  explainHe: string;
  state: StepState;
  /** Set on REJECTED or EXPIRED — what the professional must actually do. */
  actionHe?: string | null;
  /** Services this step gates. Empty means it gates the account itself. */
  gatesServicesHe?: string[];
  /** "בתוקף עד מרץ 2027" */
  validUntilHe?: string | null;
}

export interface ProServiceEligibility {
  id: string;
  nameHe: string;
  mark: MarkName;
  live: boolean;
  /** Why it is not live. Null when it is. */
  blockedByHe: string | null;
}

export interface ProVerificationBodyProps {
  displayNameHe: string;
  steps: VerificationStep[];
  services: ProServiceEligibility[];
  onOpenStep?: (id: string) => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

const STATE_LABEL: Record<StepState, string> = {
  NOT_STARTED: "טרם הוגש",
  IN_REVIEW: "בבדיקה",
  VERIFIED: "אומת",
  REJECTED: "נדחה",
  EXPIRED: "פג תוקף",
  SANDBOX: "בדיקת נסיון",
};

export function ProVerificationBody({
  displayNameHe,
  steps,
  services,
  onOpenStep,
  onBack,
  width = 390,
  height = 780,
}: ProVerificationBodyProps) {
  const liveServices = services.filter((s) => s.live);
  const blocked = services.filter((s) => !s.live);

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backGlyph}>›</Text>
          </Pressable>

          <Text style={styles.title}>{lex.whatWeChecked}</Text>

          {/*
            * The headline is about SERVICES, not about the account, because
            * that is the unit dispatch actually uses. "Your account is 80%
            * approved" would be both meaningless and encouraging.
            */}
          <Text style={styles.subtitle}>
            {liveServices.length === 0
              ? "עדיין אין שירות שאפשר לשלוח אליך אליו עבודות."
              : liveServices.length === services.length
                ? "כל השירותים שלך מאושרים לקבלת עבודות."
                : `${liveServices.length} מתוך ${services.length} שירותים מאושרים לקבלת עבודות.`}
          </Text>
          <Text style={styles.who} numberOfLines={1}>
            {displayNameHe}
          </Text>
        </View>

        {/* ---------------- What is blocked, and by what ---------------- */}
        {blocked.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="חסום כרגע" colors={colors} />
            <View style={{ gap: spacing.sm }}>
              {blocked.map((s) => (
                <Surface key={s.id} colors={colors} level={1} dark style={styles.blockedCard}>
                  <View style={styles.svcRow}>
                    <View style={[styles.svcMark, { backgroundColor: tint.danger(0.14) }]}>
                      <Mark name={s.mark} size={17} color={colors.statusDanger} />
                    </View>
                    <View style={styles.svcText}>
                      <Text style={styles.svcName} numberOfLines={1}>
                        {s.nameHe}
                      </Text>
                      <Text style={styles.svcBlocked} numberOfLines={2}>
                        {s.blockedByHe}
                      </Text>
                    </View>
                  </View>
                </Surface>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------------- Live services ---------------- */}
        {liveServices.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="מאושרים לעבודה" colors={colors} />
            <View style={styles.liveGrid}>
              {liveServices.map((s) => (
                <View key={s.id} style={styles.liveChip}>
                  <Mark name={s.mark} size={15} color={colors.trust} />
                  <Text style={styles.liveChipText} numberOfLines={1}>
                    {s.nameHe}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ---------------- The checks ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="המסמכים" colors={colors} />
          <View style={{ gap: spacing.sm }}>
            {steps.map((st) => (
              <Pressable key={st.id} onPress={() => onOpenStep?.(st.id)} accessibilityRole="button">
                <Surface colors={colors} level={1} dark>
                  <View style={styles.stepRow}>
                    <StateMark state={st.state} />
                    <View style={styles.stepText}>
                      <Text style={styles.stepTitle} numberOfLines={1}>
                        {st.titleHe}
                      </Text>
                      <Text style={styles.stepExplain} numberOfLines={2}>
                        {st.explainHe}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>

                  <View style={styles.stepFoot}>
                    <View style={[styles.statePill, pillStyle(st.state)]}>
                      <Text style={[styles.stateText, { color: stateColor(st.state) }]}>
                        {STATE_LABEL[st.state]}
                      </Text>
                    </View>
                    {st.validUntilHe && st.state === "VERIFIED" ? (
                      <View style={styles.validRow}>
                        <ClockMark size={12} color={colors.textSecondary} />
                        <Text style={styles.validText}>{st.validUntilHe}</Text>
                      </View>
                    ) : null}
                  </View>

                  {st.state === "SANDBOX" ? (
                    <Text style={styles.sandboxNote}>
                      הבדיקה רצה מול סביבת נסיון של הספק, ולכן היא לא מזכה בתג אימות. כשהחיבור
                      האמיתי יהיה פעיל — הבדיקה תיספר.
                    </Text>
                  ) : null}

                  {st.actionHe ? <Text style={styles.actionText}>{st.actionHe}</Text> : null}

                  {st.gatesServicesHe && st.gatesServicesHe.length > 0 && st.state !== "VERIFIED" ? (
                    <Text style={styles.gatesText}>
                      חוסם: {st.gatesServicesHe.join(" · ")}
                    </Text>
                  ) : null}
                </Surface>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <View style={styles.noteRow}>
            <ShieldCheckMark size={14} color={colors.trust} />
            <Text style={styles.noteText}>
              האימות נבדק מול כל שירות בנפרד. אישור לשירות אחד אינו אישור לאחר — וזה מה שמאפשר
              ללקוח לסמוך על מי שמגיע אליו.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function stateColor(s: StepState): string {
  switch (s) {
    case "VERIFIED":
      return colors.trust;
    case "REJECTED":
    case "EXPIRED":
      return colors.statusDanger;
    case "IN_REVIEW":
    case "SANDBOX":
      return colors.statusWarning;
    default:
      return colors.textSecondary;
  }
}

function pillStyle(s: StepState) {
  switch (s) {
    case "VERIFIED":
      return { backgroundColor: tint.trust(0.14) };
    case "REJECTED":
    case "EXPIRED":
      return { backgroundColor: tint.danger(0.14) };
    case "IN_REVIEW":
    case "SANDBOX":
      return { backgroundColor: tint.warning(0.16) };
    default:
      return { backgroundColor: colors.surfaceElevated };
  }
}

/** A glyph per state. Never a checkmark for anything unverified. */
function StateMark({ state }: { state: StepState }) {
  const bg =
    state === "VERIFIED"
      ? tint.trust(0.16)
      : state === "REJECTED" || state === "EXPIRED"
        ? tint.danger(0.14)
        : state === "IN_REVIEW" || state === "SANDBOX"
          ? tint.warning(0.16)
          : colors.surfaceElevated;

  return (
    <View style={[styles.stateMark, { backgroundColor: bg }]}>
      {state === "VERIFIED" ? (
        <ShieldCheckMark size={18} color={colors.trust} />
      ) : state === "IN_REVIEW" || state === "SANDBOX" ? (
        <ClockMark size={17} color={colors.statusWarning} />
      ) : state === "REJECTED" || state === "EXPIRED" ? (
        <Text style={[styles.glyph, { color: colors.statusDanger }]}>!</Text>
      ) : (
        <Text style={[styles.glyph, { color: colors.textSecondary }]}>+</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  scroll: { paddingBottom: spacing.xxl },

  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, alignItems: "flex-end" },
  // 44x44 minimum. A 25px chevron is a control most thumbs miss, which
  // is the same defect that made the demo bar unhittable.
  back: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: { fontSize: 28, lineHeight: 28, color: colors.textPrimary, fontWeight: "300" },
  title: { ...type.h1, color: colors.textPrimary, writingDirection: "rtl" },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  who: { ...type.caption, color: colors.textSecondary, marginTop: spacing.md, writingDirection: "rtl" },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  blockedCard: { borderWidth: 1, borderColor: tint.danger(0.3) },
  svcRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  svcMark: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  svcText: { flex: 1, alignItems: "flex-end" },
  svcName: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  svcBlocked: { ...type.caption, color: colors.statusDanger, textAlign: "right", writingDirection: "rtl" },

  liveGrid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  liveChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: tint.trust(0.14),
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  liveChipText: { ...type.captionStrong, color: colors.trust, writingDirection: "rtl" },

  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  stateMark: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  glyph: { fontSize: 19, fontWeight: "700" },
  stepText: { flex: 1, alignItems: "flex-end" },
  stepTitle: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  stepExplain: { ...type.caption, color: colors.textSecondary, textAlign: "right", writingDirection: "rtl" },
  chevron: { fontSize: 22, color: colors.textSecondary, fontWeight: "300" },

  stepFoot: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  statePill: { paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radii.pill },
  stateText: { ...type.captionStrong, writingDirection: "rtl" },
  validRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  validText: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },

  sandboxNote: {
    ...type.caption,
    color: colors.statusWarning,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 18,
  },
  actionText: {
    ...type.caption,
    color: colors.textPrimary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.md,
    lineHeight: 18,
  },
  gatesText: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },

  noteRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm },
  noteText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },
});
