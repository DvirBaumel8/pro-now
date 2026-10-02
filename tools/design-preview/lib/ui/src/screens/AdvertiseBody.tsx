import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SPONSOR_BADGE_HE } from "@pro-now/demo-types";

import { BackButton } from "../components/BackButton";
import { customerDarkTheme, radii, spacing, type } from "../theme";

/**
 * "אני רוצה שהעסק שלי יהיה בשכונה."
 *
 * ---------------------------------------------------------------------
 * WHAT THIS PAGE IS FOR
 * ---------------------------------------------------------------------
 * Amit: *"אפילו לבנות פיצ'ר נוסף בעמוד הפתיחה שמיועד למי שרוצה לפרסם את
 * העסק שלו, ואז איך פותחים בית עסק לפרסום?"*
 *
 * It is a lead form with a picture, and it exists because the thing it
 * is selling cannot be explained in a sentence. "Advertise with us" is
 * a category every business owner has already ignored a hundred times.
 * *A shop with your name on it, in a street people walk down while they
 * wait* is not, and the only way to say it is to show it.
 *
 * ---------------------------------------------------------------------
 * WHAT IT REFUSES TO PROMISE
 * ---------------------------------------------------------------------
 * No audience size, no impressions, no "thousands of customers a
 * month", no price. Every one of those is a number nobody has measured
 * (/CLAUDE.md §3), and the first sponsor is going to be somebody Amit
 * knows personally — a made-up reach figure would be a lie told to a
 * friend.
 *
 * So the page says what is true: what you get, how it works, that it is
 * done by hand today, and that nobody is being quoted a number yet. A
 * page that admits it is early reads as early. A page that invents
 * traffic reads as a fraud the first time somebody checks.
 *
 * ---------------------------------------------------------------------
 * AND IT DOES NOT PRETEND TO SUBMIT
 * ---------------------------------------------------------------------
 * `onSubmit` absent renders no button. There is no sandbox endpoint
 * swallowing a business owner's details behind a success message — the
 * one failure mode that would cost Amit an actual customer.
 */
export interface AdvertiseLead {
  businessNameHe: string;
  categoryHe: string;
  siteUrl: string;
  contactHe: string;
}

export interface AdvertiseBodyProps {
  /** A real shopfront from the world — the argument, in one picture. */
  exampleVenueUri?: string | null;
  /** Whose shop the example is, so the picture is not an anonymous claim. */
  exampleBrandName?: string | null;
  onSubmit?: (lead: AdvertiseLead) => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

const STEPS: readonly { titleHe: string; bodyHe: string }[] = [
  {
    titleHe: "שולחים פרטים",
    bodyHe: "שם העסק, התחום, הלוגו והאתר. זה כל מה שצריך כדי להתחיל.",
  },
  {
    titleHe: "מעצבים לך חנות",
    bodyHe: "מבנה בשכונה בסגנון של העסק שלך, עם השלט והצבעים שלך, ופנים שאפשר להיכנס אליו.",
  },
  {
    titleHe: "החנות נפתחת",
    bodyHe: "לקוחות שממתינים למקצוען מטיילים בשכונה, נכנסים אליך, ומשם עוברים לאתר שלך.",
  },
];

export function AdvertiseBody({
  exampleVenueUri = null,
  exampleBrandName = null,
  onSubmit,
  onBack,
  width = 390,
  height = 780,
}: AdvertiseBodyProps) {
  const colors = customerDarkTheme.colors;
  const [businessNameHe, setBusinessName] = useState("");
  const [categoryHe, setCategory] = useState("");
  const [siteUrl, setSite] = useState("");
  const [contactHe, setContact] = useState("");

  /*
   * The button is live only when there is something to send. A form
   * that accepts four empty strings and says "תודה" is the same lie as
   * a fake endpoint, one screen earlier.
   */
  const ready = businessNameHe.trim().length > 1 && contactHe.trim().length > 5;

  return (
    <View style={[styles.screen, { width, height, backgroundColor: colors.bg }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.pad}>
          <Text style={[styles.kicker, { color: colors.actionText }]}>לבעלי עסקים</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            העסק שלך, חנות בשכונה
          </Text>
          <Text style={[styles.lead, { color: colors.textSecondary }]}>
            בזמן שלקוח ממתין למקצוען שבדרך אליו, הוא מטייל בשכונה של PRO NOW. חנות בחסות היא מבנה
            אמיתי ברחוב הזה — עם השלט שלך, בעיצוב של התחום שלך, ודלת שנכנסים דרכה.
          </Text>
        </View>

        {exampleVenueUri ? (
          <View style={styles.exampleWrap}>
            <Image
              source={{ uri: exampleVenueUri }}
              style={[styles.example, { height: Math.round(height * 0.24) }]}
              resizeMode="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel={
                exampleBrandName
                  ? `דוגמה: החנות של ${exampleBrandName} בשכונה`
                  : "דוגמה לחנות בחסות בשכונה"
              }
            />
            <Text style={[styles.exampleNote, { color: colors.textSecondary }]}>
              {exampleBrandName
                ? `${exampleBrandName} · ${SPONSOR_BADGE_HE} — כך נראית חנות בשכונה`
                : `${SPONSOR_BADGE_HE} — כך נראית חנות בשכונה`}
            </Text>
          </View>
        ) : null}

        <View style={styles.pad}>
          <Text style={[styles.section, { color: colors.textPrimary }]}>איך פותחים חנות</Text>
          {STEPS.map((step, i) => (
            <View key={step.titleHe} style={styles.step}>
              <View style={[styles.stepNum, { borderColor: colors.action }]}>
                <Text style={[styles.stepNumText, { color: colors.actionText }]}>{i + 1}</Text>
              </View>
              <View style={styles.stepText}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>{step.titleHe}</Text>
                <Text style={[styles.stepBody, { color: colors.textSecondary }]}>{step.bodyHe}</Text>
              </View>
            </View>
          ))}

          {/* ----------------------------------------------------------------
              THE PARAGRAPH THAT MAKES THE REST BELIEVABLE.
              ---------------------------------------------------------------- */}
          <Text style={[styles.honest, { color: colors.textSecondary }]}>
            בכנות: אנחנו בתחילת הדרך ולא נמכור לך מספרי חשיפה שעוד לא מדדנו. כל חנות נפתחת ידנית,
            אחת-אחת, ואנחנו בוחרים בקפידה מי נמצא בשכונה — כי הלקוחות שלנו מגיעים לכאן בשביל בעלי
            מקצוע, ולא בשביל פרסומות.
          </Text>

          <Text style={[styles.section, { color: colors.textPrimary }]}>נשמח לשמוע</Text>
          <Field
            label="שם העסק"
            value={businessNameHe}
            onChange={setBusinessName}
            placeholder="איך קוראים לעסק"
            colors={colors}
          />
          <Field
            label="התחום"
            value={categoryHe}
            onChange={setCategory}
            placeholder="בושם, מסעדה, אופנה…"
            colors={colors}
          />
          <Field
            label="האתר"
            value={siteUrl}
            onChange={setSite}
            placeholder="https://"
            colors={colors}
          />
          <Field
            label="איך חוזרים אליך"
            value={contactHe}
            onChange={setContact}
            placeholder="טלפון או אימייל"
            colors={colors}
          />

          {onSubmit ? (
            <Pressable
              onPress={() => ready && onSubmit({ businessNameHe, categoryHe, siteUrl, contactHe })}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready }}
              accessibilityLabel="שליחת הפרטים"
              style={[
                styles.cta,
                { backgroundColor: colors.action },
                !ready && styles.ctaOff,
              ]}
            >
              <Text style={[styles.ctaText, { color: colors.onAction }]}>שליחת הפרטים</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      {onBack ? <BackButton onPress={onBack} tone="dark" /> : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  colors,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  colors: typeof customerDarkTheme.colors;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        textAlign="right"
        /*
         * The field sits on `surfaceElevated`, not on `bg`. The quote
         * builder had exactly this bug — fields darker than the card
         * they sat on, so the text vanished into the background — and
         * it is not worth finding twice.
         */
        style={[
          styles.input,
          { backgroundColor: colors.surfaceElevated, color: colors.textPrimary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { overflow: "hidden" },
  scroll: { paddingTop: spacing.xxl * 2, paddingBottom: spacing.xxl * 2 },
  pad: { paddingHorizontal: spacing.xl },
  kicker: { ...type.microStrong, textAlign: "right", writingDirection: "rtl" },
  title: { ...type.title, textAlign: "right", writingDirection: "rtl", marginTop: spacing.sm },
  lead: { ...type.body, textAlign: "right", writingDirection: "rtl", marginTop: spacing.lg },
  exampleWrap: { marginTop: spacing.xl, paddingHorizontal: spacing.lg },
  example: { width: "100%" },
  exampleNote: {
    ...type.micro,
    textAlign: "center",
    writingDirection: "rtl",
    marginTop: spacing.sm,
  },
  section: {
    ...type.section,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  step: { flexDirection: "row-reverse", alignItems: "flex-start", marginBottom: spacing.lg },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  stepNumText: { ...type.metaStrong },
  stepText: { flex: 1 },
  stepTitle: { ...type.bodyStrong, textAlign: "right", writingDirection: "rtl" },
  stepBody: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: 2,
  },
  honest: {
    ...type.meta,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(247,243,250,0.14)",
  },
  field: { marginBottom: spacing.lg },
  fieldLabel: { ...type.micro, textAlign: "right", writingDirection: "rtl", marginBottom: 6 },
  input: {
    minHeight: 48,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.22)",
    ...type.body,
  },
  cta: {
    marginTop: spacing.md,
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaOff: { opacity: 0.4 },
  ctaText: { ...type.bodyStrong },
});
