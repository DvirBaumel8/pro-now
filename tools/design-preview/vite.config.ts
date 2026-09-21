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
  /*
   * The verification harness (audit.mjs, sweep.mjs, game.mjs, the geo
   * shots) navigates to localhost:4421. That port was being passed on the
   * command line by hand, so `npm run preview:design` served 5173 and
   * every one of those scripts failed to connect. Pinned here so the
   * server and the scripts cannot drift apart again. The host is pinned to
   * IPv4 because some of those scripts ask for 127.0.0.1 and some for
   * localhost, and a v6-only bind answers only one of them.
   */
  server: { host: "127.0.0.1", port: 4421, strictPort: true },
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
