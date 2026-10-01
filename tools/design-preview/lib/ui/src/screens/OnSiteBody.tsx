/**
 * WHAT THE PERSON AT HOME SEES.
 *
 * Amit's headline case: he orders a plumber for his grandfather, or for his
 * wife at home, and handles everything from his own phone — the photos, the
 * quote, the payment. That half existed. The other half did not: the one
 * person who actually opens the door had nothing, and a stranger knocking on
 * an elderly man's door with "your grandson sent me" is precisely the moment
 * this product exists to make safe.
 *
 * So the person at home gets one text message with a link — no app to
 * install, no account — and this page: who is coming, that he was checked,
 * when, and the one thing they have to do, which is ask for the code before
 * opening. Everything else (price, approval, payment) stays with whoever
 * ordered, and the page says so, so nobody at the door is asked for money.
 *
 * Built for a phone held by someone who may not read small print: few
 * words, large type, one instruction at a time.
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { customerTheme, radii, spacing, type } from "../theme";

const colors = customerTheme.colors;

export type OnSiteStage = "coming" | "at_door" | "inside" | "done";

export interface OnSiteBodyProps {
  /** Who ordered — "עמית". */
  ordererNameHe: string;
  /** Who is at home — "סבא יוסף". */
  onSiteNameHe: string;
  serviceNameHe: string;
  proNameHe: string;
  proPhotoUri?: string | null;
  /** What was checked, in words: "זהות מאומתת", "רישיון אינסטלציה". */
  verifiedHe: string[];
  stage: OnSiteStage;
  /** "14:20", when known. */
  arrivalClockHe?: string | null;
  minutesAway?: number | null;
  /** The code the professional says at the door. */
  codeHe: string | null;
  vehicleHe?: string | null;
  /**
   * Where the price stands (Amit, 2026-10-01). "approved": the person who
   * ordered approved and paid — an SMS says so, by itself; nobody asks for
   * money at the door and nobody has to call. ("sent" adds nothing here.)
   */
  priceState?: "sent" | "approved" | null;
  onCallOrderer?: () => void;
  onCallPro?: () => void;
  onHelp?: () => void;
  onBack?: () => void;
  width?: number;
  height?: number;
}

/* One SMS bubble; a fresh one slides in and glows for a moment, the way a new message does. */
function Sms({ whenHe, fresh = false, children }: { whenHe: string; fresh?: boolean; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(fresh ? 0 : 1)).current;
  useEffect(() => {
    if (!fresh) return;
    Animated.timing(v, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [fresh, v]);
  return (
    <Animated.View
      accessibilityLiveRegion={fresh ? "polite" : undefined}
      style={[styles.sms, fresh && styles.smsFresh, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}
    >
      <Text style={styles.smsText}>{children}</Text>
      <Text style={styles.smsWhen}>{whenHe}</Text>
    </Animated.View>
  );
}

export function OnSiteBody({
  ordererNameHe,
  onSiteNameHe,
  serviceNameHe,
  proNameHe,
  stage,
  codeHe,
  priceState = null,
  onBack,
  width = 390,
  height = 780,
}: OnSiteBodyProps) {
  const first = onSiteNameHe.split(" ")[0] ?? onSiteNameHe;
  const proFirst = proNameHe.split(" ")[0] ?? proNameHe;
  /*
   * WHAT THE PERSON AT HOME ACTUALLY SEES: their phone's messages
   * (Amit, 2026-10-01 — "they are not in the app"). Not a page with our
   * header, cards and buttons: a few SMS, each one short, arriving when
   * something happens. Told plainly at the top whose phone this is.
   */
  return (
    <View style={[styles.screen, { width, height }]}>
      <View style={styles.top}>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="חזרה" style={styles.back}>
            <Text style={styles.backText}>חזרה ›</Text>
          </Pressable>
        ) : null}
        <Text style={styles.topTitle}>ככה זה נראה אצל {first}</Text>
        <Text style={styles.topSub}>בהודעות בטלפון שלו — בלי אפליקציה</Text>
      </View>

      <View style={styles.phone}>
        <View style={styles.thread}>
          <View style={styles.contact}>
            <View style={styles.contactDot}><Text style={styles.contactDotText}>P</Text></View>
            <Text style={styles.contactName}>PRO NOW</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Sms whenHe="לפני כמה דקות">
            שלום {first}, {ordererNameHe} הזמין אליך את {proFirst} ({serviceNameHe}). {proFirst} עבר אימות זהות.
          </Sms>
          {codeHe ? (
            <Sms whenHe="לפני כמה דקות">
              הקוד לדלת: {codeHe}{"\n"}אם {proFirst} לא יודע את הקוד — לא פותחים.
            </Sms>
          ) : null}
          {stage !== "coming" ? <Sms whenHe="לפני רגע">{proFirst} הגיע. אין צורך לשלם או לאשר כלום — {ordererNameHe} מטפל בהכול.</Sms> : null}
          {priceState === "approved" ? (
            <Sms whenHe="עכשיו" fresh>
              {ordererNameHe} אישר ושילם את התיקון.{"\n"}אין צורך לשלם ל{proFirst} כלום — הכול מסודר. 🙂
            </Sms>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: "#0F0B17", overflow: "hidden" },
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  back: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center" },
  backText: { ...type.bodyStrong, color: "#FF9A6B" },
  topTitle: { ...type.title, color: "#FFFFFF", textAlign: "right", writingDirection: "rtl" },
  topSub: { ...type.body, color: "rgba(247,243,250,0.72)", textAlign: "right", writingDirection: "rtl", marginTop: 2 },
  phone: { flex: 1, marginHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.xl, backgroundColor: "#F2F2F7", overflow: "hidden" },
  thread: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)", backgroundColor: "#F9F9FB" },
  contact: { alignItems: "center", gap: 4 },
  contactDot: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#17121F", alignItems: "center", justifyContent: "center" },
  contactDotText: { color: "#FF6B4A", fontWeight: "900" },
  contactName: { ...type.microStrong, color: "#1C1C1E" },
  scroll: { padding: spacing.md, gap: spacing.sm },
  sms: { alignSelf: "flex-end", maxWidth: "86%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomRightRadius: 4, backgroundColor: "#E5E5EA" },
  smsFresh: { backgroundColor: "#D7F5E6", borderWidth: 1.5, borderColor: colors.trust },
  smsText: { ...type.body, color: "#1C1C1E", textAlign: "right", writingDirection: "rtl" },
  smsWhen: { ...type.micro, color: "#8E8E93", textAlign: "left", marginTop: 4 },
});
