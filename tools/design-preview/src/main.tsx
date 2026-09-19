import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { Gallery } from "./Gallery";

/**
 * Two entry points, one bundle.
 *
 * The prototype is the default, because the question being asked of this
 * build is "does it feel like a product" and a component gallery cannot
 * answer that. The gallery is still one query string away for design review
 * — `?gallery=1` — since the two serve genuinely different purposes and
 * merging them would make both worse.
 */
const showGallery = new URLSearchParams(window.location.search).has("gallery");

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <React.StrictMode>{showGallery ? <Gallery /> : <App />}</React.StrictMode>
);
