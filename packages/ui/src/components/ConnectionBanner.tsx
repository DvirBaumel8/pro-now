import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { radii, spacing, type } from "../theme";
import type { ThemeColors } from "./primitives";

/**
 * What the app says when it cannot hear the server.
 *
 * /CLAUDE.md §6 requires an offline state on every data screen, and this is
 * the product where that matters most: every number on screen is a claim
 * about *right now*. A dispatch app that keeps displaying a four-minute-old
 * ETA during a tunnel is not merely stale, it is confidently wrong at the
 * exact moment someone is standing outside a door.
 *
 * So the banner exists to say one thing: **what you are looking at may no
 * longer be true.** It never hides content — hiding it would lose the last
 * known state, which is still useful if it is labelled — and it never
 * silently retries forever without saying so.
 *
 * The three states are deliberately different in tone:
 *
 * - `offline`   the device has no connection. Nothing is the server's fault
 *               and nothing will improve by tapping.
 * - `reconnecting` we are trying. Shows that it is happening, because a
 *               spinner nobody can see reads as a freeze.
 * - `stale`     we are connected but the data in front of you predates the
 *               reconnection, and has not been refreshed yet.
 *
 * A live job gets a stronger line than a catalogue screen, because the
 * consequence differs: a stale catalogue wastes a tap, a stale job means
 * someone may be at the door.
 */

export type ConnectionState = "online" | "reconnecting" | "offline" | "stale";

export interface ConnectionBannerProps {
  state: ConnectionState;
  colors: ThemeColors;
  /** True while a job is in flight; raises the wording's stakes. */
  duringLiveJob?: boolean;
  onRetry?: () => void;
  /** Seconds since the last successful update, when known. */
  lastUpdatedSecondsAgo?: number | null;
}

export function ConnectionBanner({
  state,
  colors,
  duringLiveJob = false,
  onRetry,
  lastUpdatedSecondsAgo = null,
}: ConnectionBannerProps) {
  const v = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const visible = state !== "online";

  useEffect(() => {
    Animated.timing(v, {
      toValue: visible ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, v]);

  useEffect(() => {
    if (state !== "reconnecting") return;
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    spin.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [state, spin]);

  if (!visible) return null;

  const bg =
    state === "offline" ? colors.statusDanger : state === "reconnecting" ? colors.statusWarning : colors.textPrimary;

  const title =
    state === "offline"
      ? duringLiveJob
        ? "אין חיבור — ייתכן שהמצב השתנה"
        : "אין חיבור לאינטרנט"
      : state === "reconnecting"
        ? "מתחברים מחדש…"
        : "המידע כאן לא עודכן";

  const detail =
    state === "offline"
      ? duringLiveJob
        ? "מה שמוצג הוא המצב האחרון שקיבלנו. זמן ההגעה עשוי כבר לא להיות מדויק."
        : "מה שמוצג הוא המצב האחרון שקיבלנו."
      : state === "reconnecting"
        ? "ברגע שנתחבר נביא את המצב העדכני."
        : lastUpdatedSecondsAgo !== null
          ? `עודכן לפני ${formatAgo(lastUpdatedSecondsAgo)}.`
          : "לא הצלחנו לרענן.";

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: bg },
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        {state === "reconnecting" ? (
          <Animated.View
            style={[
              styles.spinner,
              { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] },
            ]}
          />
        ) : (
          <View style={styles.dot} />
        )}

        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.detail} numberOfLines={2}>
            {detail}
          </Text>
        </View>

        {state !== "reconnecting" && onRetry ? (
          <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}>
            <Text style={styles.retryText}>רענון</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function formatAgo(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))} שניות`;
  const m = Math.round(seconds / 60);
  return m === 1 ? "דקה" : `${m} דקות`;
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#FFFFFF" },
  spinner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    borderTopColor: "#FFFFFF",
  },
  text: { flex: 1, alignItems: "flex-end" },
  title: { ...type.captionStrong, color: "#FFFFFF", writingDirection: "rtl" },
  detail: { ...type.caption, fontSize: 11, color: "rgba(255,255,255,0.85)", textAlign: "right", writingDirection: "rtl" },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  retryText: { ...type.captionStrong, color: "#FFFFFF" },
});
