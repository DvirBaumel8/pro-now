import { View, useWindowDimensions, StyleSheet } from "react-native";
import { WelcomeBody, customerDarkTheme } from "@pro-now/ui";
import { WelcomeScene } from "./art/WelcomeScene";

/**
 * The app frame, as in the demo: the full screen on a phone, a phone-wide
 * column (at most 430px) centred on a laptop.
 */
export function App() {
  const { width, height } = useWindowDimensions();
  const w = Math.min(430, width);
  return (
    <View style={[styles.root, { backgroundColor: customerDarkTheme.colors.bg }]}>
      <View style={{ width: w, height, overflow: "hidden" }}>
        <WelcomeBody background={<WelcomeScene />} width={w} height={height} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "flex-start" },
});
