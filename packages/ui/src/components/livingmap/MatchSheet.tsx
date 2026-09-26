import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { useSheetDrag } from "../useSheetDrag";

import { matchFactsHe, noReputationYetHe, type CandidatePresence } from "@pro-now/types";

import { palette, radii, scale, spacing, tabular, type } from "../../theme";
import { ProviderPortrait } from "../ProviderPortrait";

/**
 * MATCH SHEET — the identity, at the bottom, out of the world's way.
 *
 * ---------------------------------------------------------------------
 * WHY THIS EXISTS AT ALL
 * ---------------------------------------------------------------------
 * The rejected version put the name, the profession and a 44pt ETA in the
 * middle of the screen, on top of the buildings. ChatGPT's diagnosis was
 * blunt and correct: *"ה-14 דקות, השם, הטקסט והעיגול יושבים אחד על השני.
 * במקום immersion קיבלנו dashboard מעל illustration."*
 *
 * The approved composition is a short HUD at the top, 65–70% of the screen
 * given to the world, and everything about the person gathered into one
 * sheet down here — *"שם, ETA ופרטים לא יושבים באמצע העיר."* On confirm
 * the sheet folds away and the world takes the stage.
 *
 * ---------------------------------------------------------------------
 * WHAT IT REFUSES TO SAY
 * ---------------------------------------------------------------------
 * The reference image shows a photographed face and "★ 4.9 (214) · 680
 * עבודות". Both are the target state after real supply exists, not a
 * licence to invent supply now. So the portrait is `ProviderPortrait`,
 * which falls back to a monogram and never to an invented face, and the
 * facts line comes from `matchFactsHe`, which returns nothing when the
 * server has nothing. A professional with no rating gets one honest line
 * instead of a manufactured number.
 */
export interface MatchSheetProps {
  candidate: CandidatePresence;
  etaMinutes: number | null;
  arrivalClockHe?: string | null;
  onAccept?: () => void;
  onAnother?: () => void;
  /** 0 hidden, 1 fully up. Drives the fold-away on confirm. */
  progress?: Animated.AnimatedInterpolation<number> | Animated.Value;
}

export function MatchSheet({ candidate, etaMinutes, arrivalClockHe, onAccept, onAnother, progress }: MatchSheetProps) {
  const facts = matchFactsHe(candidate);
  /* The handle folds the card down to see the shop behind it, and back up. */
  const drag = useSheetDrag({ peek: 44 });

  return (
    <Animated.View
      style={[
        styles.sheet,
        progress
          ? {
              opacity: progress,
              transform: [
                {
                  translateY: Animated.add(
                    (progress as Animated.Value).interpolate({
                      inputRange: [0, 1],
                      outputRange: [180, 0],
                    }),
                    drag.y
                  ),
                },
              ],
            }
          : { transform: [{ translateY: drag.y }] },
      ]}
      pointerEvents="box-none"
      onLayout={drag.measure}
      {...drag.bindBody}
    >
      {/* The grab handle — it drags. See `useSheetDrag`. */}
      <View {...drag.bind} style={styles.dragZone}>
        <View style={styles.handle} />
      </View>

      <View style={styles.row}>
        <ProviderPortrait
          photoUri={candidate.photoUri}
          displayNameHe={candidate.displayNameHe}
          size={62}
          shape="circle"
          tone="light"
        />

        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>
            {candidate.displayNameHe}
          </Text>
          <Text style={styles.profession} numberOfLines={1}>
            {candidate.professionHe}
          </Text>
          <Text style={styles.facts} numberOfLines={1}>
            {facts ?? noReputationYetHe}
          </Text>
        </View>

        {/*
         * The ETA sits beside the person rather than under them, which is
         * what keeps the sheet to three lines. It is also the only number
         * on this screen, so it can be large without competing.
         */}
        <View style={styles.etaBlock}>
          {etaMinutes !== null ? (
            <>
              <Text style={styles.eta}>{etaMinutes}</Text>
              <Text style={styles.etaUnit}>דק׳</Text>
              {arrivalClockHe ? <Text style={styles.etaClock}>{arrivalClockHe}</Text> : null}
            </>
          ) : (
            <Text style={styles.etaUnknown}>זמן הגעה{"\n"}יחושב בדרך</Text>
          )}
        </View>
      </View>

      {/*
        * PULLED UP: WHO THIS IS.
        *
        * Only what exists: what every professional offered here has
        * passed, and this one's own record on PRO NOW. No written reviews
        * are shown because none are sent yet — and none are invented.
        */}
      {drag.expanded ? (
        <View style={styles.more}>
          <Text style={styles.moreHead}>כל מי שמוצע לך עבר</Text>
          {["זהות אומתה", "תעודות נבדקו לסוג העבודה", "אושר לשירות שביקשת"].map((t) => (
            <View key={t} style={styles.moreRow}>
              <Text style={styles.moreTick}>✓</Text>
              <Text style={styles.moreText}>{t}</Text>
            </View>
          ))}
          <Text style={[styles.moreHead, { marginTop: 12 }]}>ב-PRO NOW</Text>
          <Text style={styles.moreText}>
            {candidate.ratingAverage !== null && candidate.ratingCount > 0
              ? `★ ${candidate.ratingAverage.toFixed(1)} · ${candidate.ratingCount} דירוגים`
              : "עוד אין דירוגים — חדש ב-PRO NOW"}
          </Text>
          {candidate.completedJobs ? <Text style={styles.moreText}>{candidate.completedJobs} עבודות דרך PRO NOW</Text> : null}
        </View>
      ) : (
        /*
         * A button, not only a gesture. A tester, choosing: *"כשבוחרים בעל
         * מקצוע צריכה להיות אפשרות להיכנס לפרטים שלו לפני הבחירה."* The
         * details were there, behind a pull nobody guessed.
         */
        <Pressable
          onPress={drag.expand}
          accessibilityRole="button"
          accessibilityLabel={`פרטים על ${candidate.displayNameHe}`}
          style={styles.detailsBtn}
        >
          <Text style={styles.detailsText}>פרטים על {candidate.displayNameHe.split(" ")[0]} ↑</Text>
        </Pressable>
      )}

      <Pressable
        onPress={onAccept}
        accessibilityRole="button"
        accessibilityLabel="כן, מתאים לי"
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.primaryText}>כן, מתאים לי</Text>
      </Pressable>

      {onAnother ? (
        <Pressable onPress={onAnother} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>הראה לי התאמה אחרת</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dragZone: { alignSelf: "stretch", alignItems: "center", paddingVertical: 8, marginTop: -8, minHeight: 28 },
  detailsBtn: {
    alignSelf: "center", marginTop: 8, paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(247,243,250,0.28)", backgroundColor: "rgba(255,255,255,0.06)",
  },
  detailsText: { color: "#F7F3FA", fontSize: scale.meta, fontWeight: "700", textAlign: "center", writingDirection: "rtl" },
  more: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)" },
  moreHead: { color: "#7FE3BC", fontSize: scale.meta, fontWeight: "800", textAlign: "right", writingDirection: "rtl", marginBottom: 4 },
  moreRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: 3 },
  moreTick: { color: "#2FBF8A", fontWeight: "900" },
  moreText: { color: "#F7F3FA", fontSize: scale.meta, textAlign: "right", writingDirection: "rtl" },
  sheet: {
    position: "absolute",
    /* In front of the map's own notes — see `useSheetDrag`, it can grow over them. */
    zIndex: 20,
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderRadius: radii.xl,
    /*
     * Glass: a dark translucent panel with one lit top edge. Not a solid
     * card — the world has to stay faintly visible behind it or the sheet
     * becomes a second screen sitting on the first.
     */
    backgroundColor: "rgba(16,12,22,0.86)",
    borderTopWidth: 1,
    borderTopColor: "rgba(247,243,250,0.1)",
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,243,250,0.22)",
    marginBottom: spacing.sm,
  },

  // Hebrew reads right to left; the document stays LTR, so rows reverse.
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  who: { flex: 1, alignItems: "flex-end" },
  name: { ...type.bodyStrong, color: palette.nightText, writingDirection: "rtl" },
  profession: { ...type.meta, color: palette.nightTextSoft, writingDirection: "rtl", marginTop: 1 },
  facts: { ...type.micro, color: palette.nightTextSoft, writingDirection: "rtl", marginTop: 3 },

  etaBlock: { alignItems: "center", minWidth: 58 },
  eta: { ...type.title, ...tabular, color: palette.nightText },
  etaUnit: { ...type.micro, color: palette.nightTextSoft, marginTop: -2 },
  etaClock: { ...type.micro, color: palette.nightTextSoft, marginTop: 2 },
  etaUnknown: { ...type.micro, color: palette.nightTextSoft, textAlign: "center", writingDirection: "rtl" },

  primary: {
    marginTop: spacing.md,
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: palette.signal500,
    alignItems: "center",
    justifyContent: "center",
  },
  // Ink, not white: white on coral measures 3.07:1 and fails the floor.
  primaryText: { ...type.bodyStrong, color: palette.ink900 },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 2 },
  secondaryText: { ...type.meta, color: palette.nightTextSoft, writingDirection: "rtl" },
});
