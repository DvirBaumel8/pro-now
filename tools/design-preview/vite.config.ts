import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Renders the real React Native components from packages/ui in a browser by
 * aliasing `react-native` to `react-native-web`. Nothing here ships — it
 * exists so the cards can be reviewed and screenshotted without a simulator.
 */
export default defineConfig({
  // Relative asset paths, so the built page also works when it is served
  // from a sub-path (e.g. published for review rather than served at root).
  base: "./",
  plugins: [react()],
  resolve: {
    alias: [
      // react-native-svg ships a web build; without this alias the
      // `react-native` -> `react-native-web` rewrite drags its Fabric
      // native-component files into the bundle and the build fails.
      { find: /^react-native-svg$/, replacement: "react-native-svg/lib/module/ReactNativeSVG.web.js" },
      { find: /^react-native$/, replacement: "react-native-web" },
    ],
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"],
  },
  define: { global: "window", __DEV__: "true" },
});
