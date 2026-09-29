import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { ConnectionBanner, customerDarkTheme, customerTheme, type ConnectionState } from "@pro-now/ui";

import { queryClient } from "./api";

/**
 * The app frame, as in the demo (tools/design-preview/src/App.tsx `App`):
 * the whole screen on a phone, a phone-wide column (at most 430px) centred
 * on a laptop, with the connection banner laid out above the screen rather
 * than over it. Every screen reads its size from here.
 */
const FrameContext = createContext({ width: 390, height: 780 });

export const useFrame = () => useContext(FrameContext);

/**
 * The browser's own online/offline events, as the demo reads them
 * (`useConnection`). Coming back online shows "reconnecting" while every
 * query refetches, so what is on screen is fresh again, not merely
 * reachable.
 */
function useConnection(): [ConnectionState, () => void] {
  const [state, setState] = useState<ConnectionState>(() =>
    typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online"
  );
  const refresh = useCallback(async () => {
    setState("reconnecting");
    await queryClient.refetchQueries({ type: "active" }).catch(() => undefined);
    setState(navigator.onLine ? "online" : "offline");
  }, []);
  useEffect(() => {
    const goOffline = () => setState("offline");
    const goOnline = () => void refresh();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, [refresh]);
  return [state, refresh];
}

export function Frame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(430, width);
  const [connection, retry] = useConnection();
  const [bannerH, setBannerH] = useState(0);
  useEffect(() => {
    if (connection === "online") setBannerH(0);
  }, [connection]);

  return (
    <FrameContext.Provider value={{ width: w, height: height - bannerH }}>
      <View style={[styles.root, { backgroundColor: customerDarkTheme.colors.bg }]}>
        <View style={{ width: w, height, overflow: "hidden" }}>
          <View onLayout={(e) => setBannerH(e.nativeEvent.layout.height)}>
            <ConnectionBanner state={connection} colors={customerTheme.colors} onRetry={retry} />
          </View>
          <View style={{ height: height - bannerH, overflow: "hidden" }}>{children}</View>
        </View>
      </View>
    </FrameContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
});
