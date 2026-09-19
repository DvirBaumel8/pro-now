import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Renders the real React Native components from packages/ui in a browser by
 * aliasing `react-native` to `react-native-web`. Nothing here ships — it
 * exists so the cards can be reviewed and screenshotted without a simulator.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "react-native": "react-native-web" },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"],
  },
  define: { global: "window", __DEV__: "true" },
});
