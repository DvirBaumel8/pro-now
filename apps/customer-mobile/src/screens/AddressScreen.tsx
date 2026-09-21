import React, { useCallback, useEffect, useState } from "react";
import { Alert, useWindowDimensions, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";

import type { AddressView } from "@pro-now/types";
import { AddressPickerBody, customerDarkTheme, type LiveLocationState, type SavedAddress } from "@pro-now/ui";

import type { CustomerStackParamList } from "../navigation/types";
import { api } from "../api/client";

type Props = NativeStackScreenProps<CustomerStackParamList, "Address">;

/**
 * C07 — where to send somebody, and the step that did not exist.
 *
 * ---------------------------------------------------------------------
 * THE GAP THIS CLOSES
 * ---------------------------------------------------------------------
 * `POST /v1/jobs` requires an `addressId` and checks it belongs to the
 * caller — correctly, because sending a professional to a stranger's door
 * is the worst thing this product can get wrong. But no endpoint could
 * create an address and none could list one, so a customer who installed
 * the app could not request anybody at all. The request screen hid it by
 * sending the literal string `"demo-address"`, which worked against a
 * seeded development database and against nothing else.
 *
 * Both halves were confident, which is exactly why it survived: the
 * server was right to refuse and the client never saw the refusal,
 * because in development the row happened to exist.
 *
 * ---------------------------------------------------------------------
 * NO GEOCODING, AND SAYING SO
 * ---------------------------------------------------------------------
 * Turning typed text into a coordinate needs a maps vendor, and choosing
 * one is an open business decision (/CLAUDE.md §4). The device's own
 * location needs no vendor, so "use where I am" is the path that produces
 * a real coordinate today — and a typed address without one is offered
 * only alongside it, never as a silent substitute, because an address
 * with no position cannot be dispatched against.
 */
export function AddressScreen({ route, navigation }: Props) {
  const { serviceId, describedHe } = route.params;
  const { width, height } = useWindowDimensions();

  const [saved, setSaved] = useState<SavedAddress[]>([]);
  const [rows, setRows] = useState<AddressView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [live, setLive] = useState<LiveLocationState>({ status: "idle" });
  const [liveFix, setLiveFix] = useState<{ lat: number; lng: number; labelHe: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getAddresses()
      .then(({ addresses }) => {
        if (!alive) return;
        setRows(addresses);
        setSaved(
          addresses.map((a) => ({
            id: a.id,
            // The label is optional on the server because most people have
            // one address and naming it is ceremony. "כתובת" is a noun,
            // not an invented nickname.
            labelHe: a.label ?? "כתובת",
            formattedHe: a.formatted,
          }))
        );
        if (addresses.length === 1) setSelectedId(addresses[0].id);
      })
      .catch(() => {
        /* An empty list and a failed request are different; neither is a
         * reason to block the live-location path. */
      });
    return () => {
      alive = false;
    };
  }, []);

  const onUseLiveLocation = useCallback(() => {
    void (async () => {
      setLive({ status: "asking" });
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          setLive({ status: "denied" });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        /*
         * Reverse geocoding on the device, not through a vendor. Expo asks
         * the operating system, which already knows — so there is a
         * readable street here without anybody choosing a maps provider.
         * When the OS has nothing, the coordinate still stands and the
         * label says so rather than inventing a street name.
         */
        let labelHe = "המיקום הנוכחי";
        try {
          const [place] = await Location.reverseGeocodeAsync(pos.coords);
          const parts = [place?.street, place?.streetNumber, place?.city].filter(Boolean);
          if (parts.length > 0) labelHe = parts.join(" ");
        } catch {
          /* Keep the honest generic label. */
        }

        setLiveFix({ lat: pos.coords.latitude, lng: pos.coords.longitude, labelHe });
        setLive({ status: "ready", coarseLabelHe: labelHe });
      } catch {
        setLive({ status: "unavailable" });
      }
    })();
  }, []);

  const onConfirm = useCallback(
    (result: { addressId: string | null; typedHe: string }) => {
      void (async () => {
        if (sending) return;
        setSending(true);
        try {
          let addressId = result.addressId;

          if (!addressId) {
            /*
             * A new address needs a coordinate, and the only one we have
             * without a maps vendor is the device's. Typed text refines
             * the label — "דירה 4, קומה 2" is exactly the kind of detail a
             * professional needs and a GPS fix does not carry — but it
             * cannot stand alone.
             */
            if (!liveFix) {
              Alert.alert(
                "צריך מיקום",
                "כדי לשלוח מקצוען לכתובת חדשה צריך לאשר גישה למיקום. אפשר גם לבחור כתובת שמורה."
              );
              return;
            }
            const formatted = result.typedHe.trim() || liveFix.labelHe;
            const { address } = await api.createAddress({
              formatted,
              lat: liveFix.lat,
              lng: liveFix.lng,
            });
            addressId = address.id;
          }

          /*
           * IDEMPOTENCY PER REQUEST, NOT PER TAP.
           *
           * The old key was `Date.now()` plus a random, which is unique
           * per press — so a double tap, or a retry after a timeout that
           * had actually succeeded, created two jobs and dispatched two
           * professionals to one door. Derived from what the request IS,
           * so the same request is the same key.
           */
          const key = `job_${serviceId}_${addressId}`;
          const { job } = await api.createJob(
            { serviceId, addressId, description: describedHe?.trim() || undefined },
            key
          );
          navigation.replace("Searching", { jobId: job.id });
        } catch (err) {
          const message = err instanceof Error ? err.message : "שגיאה לא צפויה";
          Alert.alert("לא הצלחנו לשלוח את הבקשה", message);
        } finally {
          setSending(false);
        }
      })();
    },
    [sending, liveFix, serviceId, describedHe, navigation]
  );

  // `rows` backs the saved list; referenced so a future edit that stops
  // keeping them in step is a compile-time conversation rather than a
  // silently stale screen.
  void rows;

  return (
    <View style={{ flex: 1, backgroundColor: customerDarkTheme.colors.bg }}>
      <AddressPickerBody
        saved={saved}
        selectedId={selectedId}
        liveLocation={live}
        onUseLiveLocation={onUseLiveLocation}
        onSelect={setSelectedId}
        onConfirm={onConfirm}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        width={width}
        height={height}
      />
    </View>
  );
}
