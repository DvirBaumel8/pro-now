import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { customerTheme, elevation, proTheme, radii, scale, spacing, tabular, type } from "../theme";
import { ShieldCheckMark } from "../components/marks";
import { isPlausibleILPhone } from "../phone";

/**
 * A00 — signing in with a phone number.
 *
 * Phone plus a one-time code, and nothing else. No password to forget, no
 * social login, and no email: the number is the thing both sides of a
 * dispatch actually need, and every extra field on this screen is a
 * professional who gave up during onboarding.
 *
 * What this screen is careful about:
 *
 * - **It states what the number is for, before asking.** People are right to
 *   be suspicious of a form that wants their mobile. The sentence above the
 *   field is not legal boilerplate; it is the reason they should type.
 * - **The code field is one input, not six boxes.** Six boxes look tidy and
 *   fight paste, autofill and backspace on a real phone — and this is the
 *   single most abandoned field in any app.
 * - **Resend is time-boxed and visible.** A silent resend button that does
 *   nothing for 30 seconds reads as a broken app; the countdown says why.
 * - **A wrong code is a normal event, not a failure state.** It says so
 *   quietly and leaves what was typed in place.
 *
 * NO REAL AUTHENTICATION HAPPENS IN THE PROTOTYPE. There is no SMS provider
 * and no session; the screen says so rather than implying an account was
 * created.
 */

export type AuthStage = "phone" | "code";

export interface PhoneAuthBodyProps {
  side: "customer" | "pro";
  stage: AuthStage;
  phone: string;
  onChangePhone: (v: string) => void;
  code: string;
  onChangeCode: (v: string) => void;
  /** Seconds until resend is allowed. 0 enables it. */
  resendInSeconds: number;
  /** Set after a rejected code, cleared on the next keystroke. */
  errorHe?: string | null;
  busy?: boolean;
  onSubmitPhone?: () => void;
  onSubmitCode?: () => void;
  onResend?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function PhoneAuthBody({
  side,
  stage,
  phone,
  onChangePhone,
  code,
  onChangeCode,
  resendInSeconds,
  errorHe = null,
  busy = false,
  onSubmitPhone,
  onSubmitCode,
  onResend,
  onBack,
  width = 390,
  height = 780,
}: PhoneAuthBodyProps) {
  const colors = side === "pro" ? proTheme.colors : customerTheme.colors;
  const ref = useRef<TextInput>(null);

  // The keyboard should already be up. One tap saved here is a real
  // percentage of people who finish signing in.
  useEffect(() => {
    const id = setTimeout(() => ref.current?.focus(), 120);
    return () => clearTimeout(id);
  }, [stage]);

  const phoneOk = isPlausibleILPhone(phone);
  const codeOk = code.replace(/\D/g, "").length === 6;
  const canSubmit = stage === "phone" ? phoneOk : codeOk;

  return (
    <View style={[styles.screen, { width, height, backgroundColor: colors.bg }]}>
      <BackButton onPress={onBack} tone={"light"} placement="absolute" />

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {stage === "phone" ? "מה מספר הטלפון שלך?" : "הקוד שנשלח אליך"}
        </Text>

        <Text style={[styles.why, { color: colors.textSecondary }]}>
          {stage === "phone"
            ? side === "pro"
              ? "המספר הוא איך שעבודות מגיעות אליך. הוא לא נחשף ללקוחות — שיחות עוברות דרך מספר מסווה."
              : "המספר הוא איך שנעדכן אותך כשמקצוען יוצא אליך. הוא לא נחשף למקצוען — שיחות עוברות דרך מספר מסווה."
            : `שלחנו קוד בן 6 ספרות ל-${phone}.`}
        </Text>

        {stage === "phone" ? (
          <TextInput
            ref={ref}
            value={phone}
            onChangeText={onChangePhone}
            placeholder="050-0000000"
            accessibilityLabel="מספר טלפון"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            style={[
              styles.input,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
            ]}
            textAlign="right"
            onSubmitEditing={onSubmitPhone}
          />
        ) : (
          <>
            {/*
              * One field, not six boxes. Six boxes photograph well and then
              * fight paste, autofill and backspace on a real phone — and this
              * is the most abandoned field in any app.
              */}
            <TextInput
              ref={ref}
              value={code}
              onChangeText={onChangeCode}
              placeholder="000000"
              accessibilityLabel="קוד האימות"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              style={[
                styles.input,
                styles.codeInput,
                { backgroundColor: colors.surface, borderColor: errorHe ? colors.statusDanger : colors.border, color: colors.textPrimary },
              ]}
              textAlign="center"
              onSubmitEditing={onSubmitCode}
            />

            {errorHe ? <Text style={[styles.error, { color: colors.statusDanger }]}>{errorHe}</Text> : null}

            <Pressable
              onPress={onResend}
              disabled={resendInSeconds > 0}
              accessibilityRole="button"
              style={styles.resend}
            >
              <Text style={[styles.resendText, { color: resendInSeconds > 0 ? colors.textSecondary : colors.action }]}>
                {resendInSeconds > 0 ? `אפשר לשלוח שוב בעוד ${resendInSeconds}` : "שליחת קוד חדש"}
              </Text>
            </Pressable>
          </>
        )}

        <View style={styles.privacyRow}>
          <ShieldCheckMark size={14} color={colors.trust} />
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            {stage === "phone"
              ? "לא נשלח אליך פרסומות ולא נמכור את המספר."
              : "הקוד נשלח במסרון למספר שכתבתם."}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={stage === "phone" ? onSubmitPhone : onSubmitCode}
          disabled={!canSubmit || busy}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: canSubmit && !busy ? colors.action : colors.border },
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={[styles.ctaText, { color: canSubmit && !busy ? "#FFFFFF" : colors.textSecondary }]}>
            {busy ? "רגע…" : stage === "phone" ? "שליחת קוד" : "כניסה"}
          </Text>
        </Pressable>

        {stage === "phone" ? (
          <Text style={[styles.terms, { color: colors.textSecondary }]}>
            בכניסה מאשרים את תנאי השימוש ומדיניות הפרטיות.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden", borderRadius: radii.xl, justifyContent: "space-between" },

  /*
   * ---------------------------------------------------------------------
   * THE SCREEN WAS TWO THIRDS EMPTY
   * ---------------------------------------------------------------------
   * Amit, on the code screen: *"לא מובן ככ למעלה."*
   *
   * A fixed top padding put the whole form — a headline, a line of
   * explanation, one box and a hint — in the top third of the phone, with
   * roughly five hundred points of blank ivory beneath it and the button
   * pinned far below that. Nothing in the gap, and nothing to tell the
   * eye the two halves belong together.
   *
   * It is also the only place in the product that does this. Every other
   * screen either fills its space with the world or is a list that runs
   * to the bottom of it. These two are the first thing a new customer
   * sees after the welcome screen, and they read as a page that failed to
   * finish loading.
   *
   * `flex: 1` with the content centred gives the form the room it
   * actually occupies rather than a number somebody guessed, and it is
   * the same shape on a small phone and a large one. The minimum top
   * padding keeps it clear of the back control on short screens, where
   * centring alone would slide it under.
   */
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: "flex-end",
  },
  title: { ...type.h1, writingDirection: "rtl", textAlign: "right" },
  why: {
    ...type.body,
    fontSize: scale.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  input: {
    alignSelf: "stretch",
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    ...type.h3,
    ...tabular,
  },
  codeInput: { letterSpacing: 8, fontSize: scale.section },

  error: { ...type.caption, alignSelf: "flex-end", marginTop: spacing.sm, writingDirection: "rtl" },
  resend: { alignSelf: "flex-end", paddingVertical: spacing.md, minHeight: 44, justifyContent: "center" },
  resendText: { ...type.captionStrong, writingDirection: "rtl" },

  privacyRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.lg },
  privacyText: { ...type.caption, flex: 1, textAlign: "right", writingDirection: "rtl", lineHeight: 18 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  cta: { minHeight: 58, borderRadius: radii.md, alignItems: "center", justifyContent: "center", ...elevation(1) },
  ctaText: { ...type.bodyStrong, fontSize: scale.body },
  terms: {
    ...type.caption,
    fontSize: scale.micro,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.md,
  },
});
