import React, { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { palette, radii, scale, spacing, tabular, tint } from "../theme";
import { Mark, type MarkName } from "./marks";

/*
 * ---------------------------------------------------------------------------
 * SEVERAL ORDERS AT ONCE — "ההזמנות שלך עכשיו"
 * ---------------------------------------------------------------------------
 *
 * Amit, 2026-10-01: he ordered a carpenter, walked the city during the wait,
 * ordered a barber in a shop — and the first order vanished. "צריך מקום
 * שיהיה בו את ההזמנה הנוכחית… ושיהיה אפשר לראות כמה הזמנות במקביל ואיפה כל
 * אחד מתקדם." Design: out/multi-order-spec.md (§2 dock, §3 switcher, §2.1 HUD).
 *
 * One component, three placements:
 *   "dock"     — the bottom pill on 2D screens: a count orb and a chip per order.
 *   "switcher" — the top row on an order's own screens: tabs + "1 מתוך 2".
 *   "hud"      — the compact strip over the 3D city.
 *
 * Status is always in words (never colour alone); chips never reorder (by
 * `seq`); each has a full screen-reader sentence.
 */

export interface DockOrder {
  id: string;
  /** 1, 2, 3… by creation; the chip keeps its place for the order's whole life. */
  seq: number;
  serviceNameHe: string;
  proNameHe: string | null;
  mark: MarkName;
  /** Short status in words: "בדרך", "בבדיקה", "הצעה לאישור". */
  statusHe: string;
  /** Minutes away, only while one is really counting. */
  etaMinutes: number | null;
  /** 0–1 of the drive, when known; null = say nothing about distance. */
  progress: number | null;
  /** He is here (arrived and after): the ring is full and trust-coloured. */
  onSite: boolean;
  /** Something waits on the customer (a quote, the door, confirming the end). */
  attention: boolean;
  focused: boolean;
}

const NIGHT = "#17121F";
const TEXT = "#F7F3FA";
const SOFT = "rgba(247,243,250,0.62)";
const TRUST = palette.trust500 ?? "#2FBF8A";
const ACTION = palette.signal500 ?? "#FF5C38";

function labelOf(o: DockOrder, total: number): string {
  const who = o.proNameHe ? `, ${o.proNameHe}` : "";
  const eta = o.etaMinutes !== null ? `, ${o.etaMinutes} דקות` : "";
  return `הזמנה ${o.seq} מתוך ${total}: ${o.serviceNameHe}${who}, ${o.statusHe}${eta}${o.attention ? ", מחכה לך" : ""}`;
}

/* The ring: the drive filling in coral, a full trust ring once he is here, a calm halo when it waits on you. */
function OrderRing({ o, size }: { o: DockOrder; size: number }) {
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!o.attention) return;
    /* Three slow breaths, then still — something that keeps pulsing is an alarm. */
    const a = Animated.sequence([
      ...[0, 1, 2].map(() =>
        Animated.sequence([
          Animated.timing(halo, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(halo, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      ),
    ]);
    a.start();
    return () => a.stop();
  }, [o.attention, halo]);
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = o.onSite ? 1 : o.progress ?? 0;
  const color = o.onSite ? TRUST : ACTION;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {o.attention ? (
        <Animated.View
          style={{ position: "absolute", width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, backgroundColor: tint.action(0.35), opacity: halo }}
        />
      ) : null}
      {React.createElement(
        "svg" as unknown as React.ElementType,
        { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { position: "absolute", transform: "rotate(-90deg)" } },
        React.createElement("circle", { cx: size / 2, cy: size / 2, r, fill: "none", stroke: "rgba(247,243,250,0.14)", strokeWidth: stroke }),
        fill > 0
          ? React.createElement("circle", {
              cx: size / 2,
              cy: size / 2,
              r,
              fill: "none",
              stroke: color,
              strokeWidth: stroke,
              strokeLinecap: "round",
              strokeDasharray: `${c}`,
              strokeDashoffset: `${c * (1 - Math.min(1, Math.max(0, fill)))}`,
              style: { transition: "stroke-dashoffset 600ms cubic-bezier(.2,.8,.2,1)" },
            })
          : null
      )}
      <View style={[styles.markDisc, { width: size - 12, height: size - 12, borderRadius: (size - 12) / 2 }]}>
        <Mark name={o.mark} size={Math.round(size * 0.38)} color={o.onSite ? TRUST : ACTION} />
      </View>
    </View>
  );
}

export function OrdersDock({
  orders,
  variant = "dock",
  onOpen,
  width = 390,
}: {
  orders: DockOrder[];
  variant?: "dock" | "switcher" | "hud";
  onOpen: (id: string) => void;
  width?: number;
}) {
  const list = [...orders].sort((a, b) => a.seq - b.seq);
  const total = list.length;
  const focusedIdx = list.findIndex((o) => o.focused);
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 320, easing: Easing.bezier(0.16, 0.84, 0.34, 1), useNativeDriver: true }).start();
  }, [enter, total]);
  if (total === 0) return null;

  if (variant === "switcher") {
    return (
      <View style={[styles.switcher, { width: width - spacing.lg * 2 - 56 }]} accessibilityRole="tablist">
        {list.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => onOpen(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: o.focused }}
            accessibilityLabel={labelOf(o, total)}
            style={[styles.tab, o.focused && styles.tabOn]}
          >
            <OrderRing o={o} size={28} />
            {o.focused ? (
              <Text style={styles.tabName} numberOfLines={1}>
                {o.proNameHe ?? o.serviceNameHe}
              </Text>
            ) : o.attention ? (
              <View style={styles.dot} />
            ) : null}
          </Pressable>
        ))}
        <Text style={styles.ofText}>
          {focusedIdx >= 0 ? focusedIdx + 1 : 1} מתוך {total}
        </Text>
      </View>
    );
  }

  const hud = variant === "hud";
  return (
    <Animated.View
      style={[
        hud ? styles.hud : styles.dock,
        !hud && { width: Math.round(width * 0.92) },
        { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [hud ? -10 : 10, 0] }) }] },
      ]}
      accessibilityLabel={`ההזמנות שלך עכשיו: ${total}`}
    >
      <View style={[styles.orb, hud && styles.orbHud]} accessibilityElementsHidden>
        <Text style={styles.orbText}>{total}</Text>
      </View>
      {list.map((o, i) => (
        <React.Fragment key={o.id}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <Pressable
            onPress={() => onOpen(o.id)}
            accessibilityRole="button"
            accessibilityLabel={labelOf(o, total)}
            style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}
          >
            <OrderRing o={o} size={hud ? 32 : total >= 3 ? 34 : 40} />
            <View style={styles.chipText}>
              {total <= 2 || hud ? (
                <Text style={styles.chipLine1} numberOfLines={1}>
                  {o.proNameHe ? `${o.proNameHe.split(" ")[0]} · ` : ""}
                  {o.statusHe}
                </Text>
              ) : null}
              <Text style={[styles.chipLine2, o.attention && { color: ACTION }]} numberOfLines={1}>
                {o.attention ? "מחכה לך" : o.etaMinutes !== null ? `${o.etaMinutes} דק׳` : total > 2 && !hud ? o.statusHe : o.serviceNameHe}
              </Text>
            </View>
          </Pressable>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dock: {
    alignSelf: "center",
    minHeight: 58,
    borderRadius: radii.pill,
    backgroundColor: NIGHT,
    borderRightWidth: 3,
    borderRightColor: ACTION,
    flexDirection: "row-reverse",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  hud: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.78)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.14)",
    maxWidth: 360,
  },
  orb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tint.action(0.16),
    borderWidth: 1.5,
    borderColor: "rgba(255,92,56,0.6)",
    margin: 4,
  },
  orbHud: { width: 30, height: 30, borderRadius: 15, margin: 2 },
  orbText: { color: TEXT, fontSize: scale.body, fontWeight: "800", ...tabular },
  divider: { width: 1, height: 28, backgroundColor: "rgba(247,243,250,0.12)", marginHorizontal: 4 },
  chip: { flex: 1, minHeight: 48, flexDirection: "row-reverse", alignItems: "center", gap: 8, minWidth: 0 },
  chipText: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  chipLine1: { color: TEXT, fontSize: scale.meta, fontWeight: "700", textAlign: "right", writingDirection: "rtl" },
  chipLine2: { color: ACTION, fontSize: scale.meta, fontWeight: "800", textAlign: "right", writingDirection: "rtl", ...tabular },
  markDisc: { backgroundColor: "#0F0B17", alignItems: "center", justifyContent: "center" },
  switcher: {
    flexDirection: "row-reverse",
    alignItems: "center",
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16,12,22,0.72)",
    borderWidth: 1,
    borderColor: "rgba(247,243,250,0.14)",
    paddingHorizontal: 4,
    gap: 4,
  },
  tab: { minWidth: 48, height: 44, borderRadius: radii.pill, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 6 },
  tabOn: { backgroundColor: "#2A2236", paddingHorizontal: 10 },
  tabName: { color: TEXT, fontSize: scale.meta, fontWeight: "700", maxWidth: 110 },
  dot: { position: "absolute", top: 6, left: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: ACTION },
  ofText: { marginRight: "auto", color: SOFT, fontSize: scale.micro, fontWeight: "600", paddingHorizontal: 8, ...tabular },
});
