import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The product web app (docs/21 W2). Same rendering setup as the demo
 * (tools/design-preview/vite.config.ts), so the shared screens look the same:
 * `react-native` is react-native-web, and react-native-svg uses its web build.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^react-native-svg$/, replacement: "react-native-svg/lib/module/ReactNativeSVG.web.js" },
      { find: /^react-native$/, replacement: "react-native-web" },
    ],
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".jsx", ".js"],
    /*
     * packages/ui sits in the workspace next to apps that pin React 18
     * (Expo, Next). Without this, a shared screen would import the
     * root's React 18 while this app renders with React 19 — two Reacts
     * in one page.
     */
    dedupe: ["react", "react-dom", "react-native-web", "react-native-svg"],
  },
  /*
   * Pre-bundled up front. Otherwise Vite discovers a dependency the first
   * time a screen imports it, re-bundles, and reloads mid-session, and a page
   * that survives the reload can briefly hold two copies of React ("Invalid
   * hook call"). Development only; production is one bundle.
   */
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react-native-web",
      "react-router",
      "@tanstack/react-query",
      "better-auth/react",
      "better-auth/client/plugins",
    ],
  },
  define: { global: "window", __DEV__: JSON.stringify(process.env.NODE_ENV !== "production") },
  server: {
    port: 5180,
    strictPort: true,
    host: true,
    /*
     * Same origin in development as in production: the browser only ever
     * talks to this server, which hands /api to Fastify. Session cookies
     * and sign-in links then work exactly as they will when Fastify serves
     * the built app itself.
     */
    proxy: { "/api": { target: "http://localhost:4000", changeOrigin: false } },
  },
  preview: { port: 5180, strictPort: true, host: true, proxy: { "/api": { target: "http://localhost:4000" } } },
});
