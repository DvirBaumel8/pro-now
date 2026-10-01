import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AddressPickerBody, type LiveLocationState, type SavedAddress } from "@pro-now/ui";
import { useNavigate } from "react-router";

import { api } from "../api";
import { IL_MOBILE, resolveAddress, useOrderTarget } from "../orderTarget";
import { ErrorScreen, LoadingScreen } from "../states";
import { useFrame } from "../frame";

const addressesKey = ["addresses"] as const;

export function Addresses() {
  const { width, height } = useFrame();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addresses = useQuery({ queryKey: addressesKey, queryFn: api.getAddresses });
  /*
   * Where the next request goes, and who will be at the door — chosen here,
   * as in the demo, not on the request form (docs/DEMO-SYNC.md, 2026-10-01 C3).
   */
  const { target, setTarget } = useOrderTarget();
  const [selectedId, setSelectedId] = useState<string | null>(target.addressId);
  const onSiteFor = (addressId: string | null, r: { forSomeoneElse: boolean; recipientNameHe: string; recipientPhone: string }) =>
    setTarget({ addressId, onSite: r.forSomeoneElse ? { name: r.recipientNameHe, phone: r.recipientPhone } : null });
  // The person at home, kept for the address being saved below.
  const [pendingOnSite, setPendingOnSite] = useState<{ forSomeoneElse: boolean; recipientNameHe: string; recipientPhone: string } | null>(null);
  const [live, setLive] = useState<LiveLocationState>({ status: "idle" });
  const [liveFix, setLiveFix] = useState<{ lat: number; lng: number; labelHe: string; placeId: string | null } | null>(null);

  const save = useMutation({
    mutationFn: api.createAddress,
    onSuccess: async ({ address }) => {
      onSiteFor(address.id, pendingOnSite ?? { forSomeoneElse: false, recipientNameHe: "", recipientPhone: "" });
      await queryClient.invalidateQueries({ queryKey: addressesKey });
      navigate("/", { replace: true });
    },
  });

  const saved: SavedAddress[] = (addresses.data?.addresses ?? []).map((address) => ({
    id: address.id,
    labelHe: address.label ?? "כתובת",
    formattedHe: address.formatted,
  }));

  const onUseLiveLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLive({ status: "unavailable" });
      return;
    }
    setLive({ status: "asking" });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { result } = await api.reverseGeocode({ lat: coords.latitude, lng: coords.longitude });
          const labelHe = result?.formattedAddress ?? "המיקום הנוכחי";
          setLiveFix({ lat: coords.latitude, lng: coords.longitude, labelHe, placeId: result?.placeId ?? null });
          setLive({ status: "ready", coarseLabelHe: labelHe });
        } catch {
          setLive({ status: "unavailable" });
        }
      },
      (error) => setLive({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: false, maximumAge: 30_000, timeout: 10_000 }
    );
  }, []);

  if (addresses.isPending) return <LoadingScreen />;
  if (addresses.isError) return <ErrorScreen offline={!navigator.onLine} onRetry={() => void addresses.refetch()} />;

  return (
    <AddressPickerBody
      saved={saved}
      selectedId={resolveAddress(saved, selectedId)?.id ?? null}
      liveLocation={live}
      forSomeoneElseEnabled
      onUseLiveLocation={onUseLiveLocation}
      onSelect={setSelectedId}
      onBack={() => navigate(-1)}
      onConfirm={async (r) => {
        const { addressId, typedHe } = r;
        if (save.isPending) return;
        if (r.forSomeoneElse && !IL_MOBILE.test(r.recipientPhone.trim())) {
          window.alert("כתבו מספר נייד ישראלי של מי שיהיה בבית — הוא יקבל קישור עם שם המקצוען וקוד לדלת.");
          return;
        }
        if (addressId) {
          onSiteFor(addressId, r);
          navigate("/", { replace: true });
          return;
        }
        setPendingOnSite(r);

        const typed = typedHe.trim();
        let location = liveFix;
        if (typed) {
          const { results } = await api.searchAddresses(typed);
          if (results[0]) {
            location = {
              lat: results[0].lat,
              lng: results[0].lng,
              labelHe: results[0].formattedAddress,
              placeId: results[0].placeId,
            };
          } else if (!location) {
            window.alert("לא מצאנו את הכתובת. נסו להוסיף רחוב, מספר ועיר.");
            return;
          }
        }
        if (!location) {
          window.alert("בחרו כתובת או הפעילו את המיקום שלי עכשיו.");
          return;
        }
        save.mutate({
          formatted: typed || location.labelHe,
          lat: location.lat,
          lng: location.lng,
          placeId: location.placeId ?? undefined,
        });
      }}
      width={width}
      height={height}
    />
  );
}
