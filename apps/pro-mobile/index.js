// Expo entry point.
//
// The default `expo/AppEntry.js` resolves the app as `../../App`, which only
// works when `expo` sits in this package's own node_modules. In this npm
// workspaces monorepo `expo` is hoisted to the repo root, so that relative
// path escapes the app. Registering the root component here instead keeps
// the entry point independent of where the installer decides to place
// dependencies. See /docs/04-TECH-ARCHITECTURE.md §Repository layout.
import { registerRootComponent } from "expo";

import App from "./App";

registerRootComponent(App);
