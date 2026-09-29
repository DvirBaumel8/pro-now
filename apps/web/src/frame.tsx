import { createContext, useContext, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { customerDarkTheme } from "@pro-now/ui";

/**
 * The app frame, as in the demo (tools/design-preview/src/App.tsx `App`):
 * the whole screen on a phone, a phone-wide column (at most 430px) centred
 * on a laptop. Every screen reads its size from here.
 */
const FrameContext = createContext({ width: 390, height: 780 });

export const useFrame = () => useContext(FrameContext);

export function Frame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const w = Math.min(430, width);
  return (
    <FrameContext.Provider value={{ width: w, height }}>
      <View style={[styles.root, { backgroundColor: customerDarkTheme.colors.bg }]}>
        <View style={{ width: w, height, overflow: "hidden" }}>{children}</View>
      </View>
    </FrameContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
});
