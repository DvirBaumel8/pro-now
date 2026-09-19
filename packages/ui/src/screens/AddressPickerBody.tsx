import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { customerTheme, elevation, radii, spacing, tint, type } from "../theme";
import { ClockMark, PinMark, ShieldCheckMark } from "../components/marks";
import { Persona } from "../components/Persona";
import { SectionHeader, Surface } from "../components/surfaces";

/**
 * C05 — where should the professional actually go?
 *
 * This started as a decorative chip at the top of the home screen and was
 * the first thing a real user pressed. That is worth taking seriously,
 * because the address is not a setting — it is the single fact the whole
 * dispatch is aimed at, and getting it wrong sends a stranger to the wrong
 * door.
 *
 * The feature that reframed this screen: **a call is often not for the
 * person holding the phone.** Someone books a plumber for a parent who does
 * not use apps. That is not an edge case to bolt on later; it changes what
 * the product is asking. So "for someone else" is a first-class mode here,
 * and when it is on, the screen collects the two things the professional
 * actually needs — who will open the door, and the number to call when they
 * arrive. Without those, the job fails at the doorstep no matter how good
 * the dispatch was.
 *
 * Honesty notes:
 *
 * - **Live location is a real request, not a decoration.** Tapping it asks
 *   the device. If permission is refused or unavailable, the screen says so
 *   and offers typing instead; it never silently invents a location.
 * - **A coordinate is not a street address.** Turning one into "רחוב X 12"
 *   needs a geocoding vendor, which is an open business decision
 *   (/CLAUDE.md §4). Until one is chosen this screen shows the coarse
 *   position honestly and asks for the details it cannot derive.
 * - The recipient's phone is collected but never shown to the professional
 *   before assignment (/docs/12-PRIVACY.md).
 */

const colors = customerTheme.colors;

export interface SavedAddress {
  id: string;
  /** "בית", "עבודה", "אצל סבא" */
  labelHe: string;
  formattedHe: string;
  /** Set when this address belongs to someone else. */
  forSomeoneElseNameHe?: string | null;
}

export type LiveLocationState =
  | { status: "idle" }
  | { status: "asking" }
  | { status: "ready"; coarseLabelHe: string }
  | { status: "denied" }
  | { status: "unavailable" };

export interface AddressPickerBodyProps {
  saved: SavedAddress[];
  selectedId: string | null;
  liveLocation: LiveLocationState;
  onUseLiveLocation?: () => void;
  onSelect?: (id: string) => void;
  onConfirm?: (result: {
    addressId: string | null;
    typedHe: string;
    forSomeoneElse: boolean;
    recipientNameHe: string;
    recipientPhone: string;
  }) => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

export function AddressPickerBody({
  saved,
  selectedId,
  liveLocation,
  onUseLiveLocation,
  onSelect,
  onConfirm,
  onBack,
  width = 390,
  height = 780,
}: AddressPickerBodyProps) {
  const [typed, setTyped] = useState("");
  const [forOther, setForOther] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  const hasTyped = typed.trim().length > 3;
  const hasPlace = selectedId !== null || hasTyped || liveLocation.status === "ready";
  // Sending someone to a stranger's door without a name and a number is how
  // a job fails at the doorstep, so the CTA waits for both.
  const recipientOk = !forOther || (recipientName.trim().length > 1 && recipientPhone.trim().length >= 9);
  const canConfirm = hasPlace && recipientOk;

  return (
    <View style={[styles.screen, { width, height }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backGlyph}>›</Text>
          </Pressable>
          <Text style={styles.title}>לאן לשלוח את המקצוען?</Text>
          <Text style={styles.subtitle}>הכתובת המלאה נחשפת רק אחרי שמקצוען מקבל את הקריאה.</Text>
        </View>

        {/* ---------------- Live location ---------------- */}
        <View style={styles.block}>
          <Pressable
            onPress={onUseLiveLocation}
            accessibilityRole="button"
            style={({ pressed }) => [styles.liveCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.liveIcon}>
              <PinMark size={19} color={colors.action} />
            </View>
            <View style={styles.liveText}>
              <Text style={styles.liveTitle}>
                {liveLocation.status === "asking" ? "מאתרים אותך…" : "המיקום שלי עכשיו"}
              </Text>
              <Text style={styles.liveSub} numberOfLines={2}>
                {liveLocation.status === "ready"
                  ? liveLocation.coarseLabelHe
                  : liveLocation.status === "denied"
                    ? "אין הרשאת מיקום. אפשר להפעיל בהגדרות, או פשוט להקליד כתובת למטה."
                    : liveLocation.status === "unavailable"
                      ? "לא הצלחנו לאתר מיקום במכשיר הזה. הקלד כתובת למטה."
                      : "נשתמש במיקום המכשיר"}
              </Text>
            </View>
            {liveLocation.status === "ready" ? (
              <View style={styles.tick}>
                <ShieldCheckMark size={15} color={colors.trust} />
              </View>
            ) : null}
          </Pressable>

          {liveLocation.status === "ready" ? (
            // A coordinate is not a door. Saying so is cheaper than sending a
            // professional to the middle of the street.
            <Text style={styles.liveNote}>
              המיקום אותר. הוסף קומה, כניסה או מספר דירה למטה — בלי זה המקצוען מגיע לרחוב, לא לדלת.
            </Text>
          ) : null}
        </View>

        {/* ---------------- Saved ---------------- */}
        {saved.length > 0 ? (
          <View style={styles.block}>
            <SectionHeader title="הכתובות שלי" colors={colors} />
            <View style={{ gap: spacing.sm }}>
              {saved.map((a) => {
                const on = a.id === selectedId;
                return (
                  <Pressable key={a.id} onPress={() => onSelect?.(a.id)} accessibilityRole="radio">
                    <Surface
                      colors={colors}
                      level={1}
                      style={[styles.savedCard, on && { borderColor: colors.action, borderWidth: 2 }]}
                    >
                      <View style={styles.savedRow}>
                        <View style={[styles.savedIcon, on && { backgroundColor: tint.action(0.14) }]}>
                          {a.forSomeoneElseNameHe ? (
                            <Persona seed={a.id} size={30} />
                          ) : (
                            <PinMark size={17} color={on ? colors.action : colors.textSecondary} />
                          )}
                        </View>
                        <View style={styles.savedText}>
                          <Text style={styles.savedLabel} numberOfLines={1}>
                            {a.labelHe}
                            {a.forSomeoneElseNameHe ? (
                              <Text style={styles.savedFor}> · עבור {a.forSomeoneElseNameHe}</Text>
                            ) : null}
                          </Text>
                          <Text style={styles.savedAddr} numberOfLines={1}>
                            {a.formattedHe}
                          </Text>
                        </View>
                        <View style={[styles.radio, on && styles.radioOn]} />
                      </View>
                    </Surface>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ---------------- Manual ---------------- */}
        <View style={styles.block}>
          <SectionHeader title="כתובת אחרת" colors={colors} />
          <TextInput
            value={typed}
            onChangeText={setTyped}
            placeholder="רחוב, מספר, עיר · קומה ודירה"
            accessibilityLabel="כתובת חדשה"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            textAlign="right"
          />
        </View>

        {/* ---------------- For someone else ---------------- */}
        <View style={styles.block}>
          <Surface colors={colors} level={1}>
            <View style={styles.switchRow}>
              <Switch
                value={forOther}
                onValueChange={setForOther}
                trackColor={{ true: colors.action, false: colors.border }}
                thumbColor="#FFFFFF"
              />
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>הקריאה היא בשביל מישהו אחר</Text>
                <Text style={styles.switchSub}>
                  מזמינים עבור הורה, סבא או שכן? המקצוען צריך לדעת מי פותח את הדלת.
                </Text>
              </View>
            </View>

            {forOther ? (
              <View style={styles.recipient}>
                <TextInput
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="שם מי שנמצא בבית"
                  accessibilityLabel="שם מי שנמצא בבית"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  textAlign="right"
                />
                <TextInput
                  value={recipientPhone}
                  onChangeText={setRecipientPhone}
                  placeholder="טלפון שלו"
                  accessibilityLabel="טלפון של מי שנמצא בבית"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  style={styles.input}
                  textAlign="right"
                />
                <View style={styles.privacyRow}>
                  <ClockMark size={13} color={colors.textSecondary} />
                  <Text style={styles.privacyText}>
                    העדכונים על ההגעה יגיעו אליך. המספר שלו נחשף למקצוען רק אחרי שהקריאה שויכה, ודרך
                    מספר מסווה.
                  </Text>
                </View>
              </View>
            ) : null}
          </Surface>
        </View>
      </ScrollView>

      <View style={styles.cta}>
        <Pressable
          disabled={!canConfirm}
          onPress={() =>
            onConfirm?.({
              addressId: selectedId,
              typedHe: typed.trim(),
              forSomeoneElse: forOther,
              recipientNameHe: recipientName.trim(),
              recipientPhone: recipientPhone.trim(),
            })
          }
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.ctaBtn,
            !canConfirm && { backgroundColor: colors.border },
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={[styles.ctaLabel, !canConfirm && { color: colors.textSecondary }]}>
            {forOther && !recipientOk ? "צריך שם וטלפון של מי שבבית" : "אישור הכתובת"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg, overflow: "hidden", borderRadius: radii.xl },
  scroll: { paddingBottom: 116 },

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
  title: { ...type.h1, color: colors.textPrimary, writingDirection: "rtl", textAlign: "right" },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.xs,
  },

  block: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },

  liveCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...elevation(1),
  },
  liveIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: tint.action(0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  liveText: { flex: 1, alignItems: "flex-end" },
  liveTitle: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  liveSub: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },
  tick: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: tint.trust(0.14),
    alignItems: "center",
    justifyContent: "center",
  },
  liveNote: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    marginTop: spacing.sm,
    lineHeight: 18,
  },

  savedCard: { paddingVertical: spacing.md, borderWidth: 2, borderColor: "transparent" },
  savedRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  savedIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  savedText: { flex: 1, alignItems: "flex-end" },
  savedLabel: { ...type.bodyStrong, color: colors.textPrimary, writingDirection: "rtl" },
  savedFor: { ...type.caption, color: colors.actionText },
  savedAddr: { ...type.caption, color: colors.textSecondary, writingDirection: "rtl" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioOn: { borderColor: colors.action, borderWidth: 6 },

  input: {
    minHeight: 52,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...type.body,
    fontSize: 15,
    color: colors.textPrimary,
    writingDirection: "rtl",
  },

  switchRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  switchText: { flex: 1, alignItems: "flex-end" },
  switchTitle: { ...type.bodyStrong, fontSize: 15, color: colors.textPrimary, writingDirection: "rtl" },
  switchSub: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  recipient: { gap: spacing.sm, marginTop: spacing.lg },
  privacyRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.xs },
  privacyText: {
    ...type.caption,
    flex: 1,
    color: colors.textSecondary,
    textAlign: "right",
    writingDirection: "rtl",
    lineHeight: 18,
  },

  cta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...elevation(3),
  },
  ctaBtn: {
    minHeight: 56,
    borderRadius: radii.md,
    backgroundColor: colors.action,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: { ...type.bodyStrong, fontSize: 17, color: colors.onAction },
});
