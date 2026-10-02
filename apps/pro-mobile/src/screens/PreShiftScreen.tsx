import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";

import type { ProServiceEligibilityView } from "@pro-now/types";
import { proTheme, radii, spacing, type as t } from "@pro-now/ui";

import type { ProStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<ProStackParamList, "PreShift">;

/**
 * P14 — the last check before taking calls.
 *
 * ---------------------------------------------------------------------
 * TWO THINGS THIS SCREEN USED TO GET WRONG
 * ---------------------------------------------------------------------
 * It listed two services written into the component —
 * `HOME_PLUMB_BLOCK` and `HOME_ELECT_FAULT` — with switches beside them,
 * for every professional in the marketplace. A cleaner was offered an
 * electrical switch. And it sent a fixed pair of coordinates, 32.0853 /
 * 34.7818, which is a point in Tel Aviv: every professional in the country
 * went online from the same street corner, and dispatch scored them all by
 * their distance from it.
 *
 * ---------------------------------------------------------------------
 * AND THE ONE IT GOT DANGEROUSLY WRONG
 * ---------------------------------------------------------------------
 *     } catch {
 *       navigation.replace("Online");
 *     }
 *
 * When starting the shift FAILED, it went online anyway. The professional
 * then sat watching a live green ring while the server had them offline
 * and routed their calls to somebody else. /CLAUDE.md §6: client-held
 * state is never job-state truth — and this is the shape that rule is
 * about. A failure now stops here and says so.
 */
export function PreShiftScreen({ navigation }: Props) {
  const [services, setServices] = useState<ProServiceEligibilityView[] | null>(null);
  const [armed, setArmed] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [locationHe, setLocationHe] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getServices()
      .then(({ services: list }) => {
        if (!alive) return;
        setServices(list);
        /*
         * Everything they are eligible for, on by default. A professional
         * opening this screen wants to work; making them tick boxes to be
         * offered the jobs they are already approved for is ceremony.
         */
        setArmed(new Set(list.filter((s) => s.eligible).map((s) => s.serviceId)));
      })
      .catch(() => {
        if (alive) setServices([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const onStart = useCallback(() => {
    void (async () => {
      if (starting) return;
      const enabledServiceIds = [...armed];
      if (enabledServiceIds.length === 0) {
        Alert.alert("בחרו שירות", "צריך לפחות שירות אחד פעיל כדי להתחבר.");
        return;
      }

      setStarting(true);
      try {
        /*
         * WHERE THEY ACTUALLY ARE.
         *
         * Dispatch scores candidates by distance, so a wrong position is
         * not a cosmetic error — it decides who gets the call. Permission
         * is asked here, at the moment it is obviously for taking nearby
         * work, and a refusal stops the shift rather than substituting a
         * default.
         */
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            "צריך מיקום",
            "קריאות מנותבות לפי מרחק, אז בלי מיקום אי אפשר להתחבר למשמרת."
          );
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const res = await api.startShift({
          enabledServiceIds,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });

        /*
         * Online only because the server said so. The response carries the
         * presence state and the session id, and both go back to the shift
         * screen rather than being assumed.
         */
        navigation.replace("Offline", { sessionId: res.sessionId, presenceState: res.presenceState });
      } catch (err) {
        const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
        // No navigation. The shift did not start.
        Alert.alert("לא הצלחנו להתחבר למשמרת", message);
      } finally {
        setStarting(false);
      }
    })();
  }, [starting, armed, navigation]);

  const onCheckLocation = useCallback(() => {
    void (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      setLocationHe(perm.granted ? "✓ מוכן" : "אין הרשאה");
    })();
  }, []);

  const toggle = (id: string) =>
    setArmed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>לפני שמתחילים</Text>

      <ScrollView contentContainerStyle={{ gap: spacing.sm }}>
        {services === null ? (
          <Text style={styles.note}>טוען את השירותים שלך…</Text>
        ) : services.length === 0 ? (
          /*
           * Not an error, and not an empty list dressed up as one. A
           * professional with no approved service genuinely cannot take
           * calls, and the verification centre is where that is fixed.
           */
          <Text style={styles.note}>
            עדיין אין שירות מאושר בחשבון שלך. במרכז האימות אפשר לראות מה חסר.
          </Text>
        ) : (
          services.map((s) => {
            const blocked = [...s.expired, ...s.missing, ...s.unverified];
            return (
              <View key={s.serviceId} style={styles.row}>
                <Switch
                  value={armed.has(s.serviceId)}
                  onValueChange={() => toggle(s.serviceId)}
                  // Not eligible means not offerable, whatever the switch says.
                  disabled={!s.eligible}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{s.nameHe}</Text>
                  {!s.eligible ? (
                    /*
                     * THE REASON, NOT JUST THE REFUSAL.
                     *
                     * A greyed row with no explanation is how somebody
                     * loses a day of work without knowing they could have
                     * fixed it in ten minutes.
                     */
                    <Text style={styles.blocked}>
                      {blocked.length > 0
                        ? `חסר: ${blocked.join(" · ")}`
                        : s.accountApproved
                          ? "השירות הזה עדיין לא אושר בחשבון שלך"
                          : "החשבון עדיין לא אושר"}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable style={styles.infoRow} onPress={onCheckLocation} accessibilityRole="button">
        <Text style={styles.infoValue}>{locationHe ?? "בדיקה"}</Text>
        <Text style={styles.infoLabel}>מיקום</Text>
      </Pressable>

      <Pressable
        style={[styles.readyButton, starting && { opacity: 0.6 }]}
        onPress={onStart}
        disabled={starting}
        accessibilityRole="button"
      >
        <Text style={styles.readyLabel}>{starting ? "מתחבר…" : "אני מוכן — התחבר"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: proTheme.colors.bg, padding: spacing.lg, justifyContent: "center" },
  title: { ...t.h1, color: proTheme.colors.textPrimary, textAlign: "right", marginBottom: spacing.xl },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  rowLabel: { ...t.body, color: proTheme.colors.textPrimary, textAlign: "right" },
  blocked: { ...t.caption, color: proTheme.colors.textSecondary, textAlign: "right" },
  note: { ...t.body, color: proTheme.colors.textSecondary, textAlign: "right" },
  infoRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: proTheme.colors.border,
    marginTop: spacing.sm,
  },
  infoLabel: { ...t.caption, color: proTheme.colors.textSecondary },
  infoValue: { ...t.body, color: proTheme.colors.textPrimary },
  readyButton: {
    backgroundColor: proTheme.colors.action,
    borderRadius: radii.md,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.xxl,
  },
  readyLabel: { ...t.bodyStrong, color: "#03130A" },
});
