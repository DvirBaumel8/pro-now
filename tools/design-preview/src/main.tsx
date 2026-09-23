import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { Gallery } from "./Gallery";
import { City } from "./city/City";

/**
 * Two entry points, one bundle.
 *
 * The prototype is the default, because the question being asked of this
 * build is "does it feel like a product" and a component gallery cannot
 * answer that. The gallery is still one query string away for design review
 * — `?gallery=1` — since the two serve genuinely different purposes and
 * merging them would make both worse.
 */
const query = new URLSearchParams(window.location.search);
const showGallery = query.has("gallery");
/*
 * And the city, at `?city=1`.
 *
 * It is a WebGL scene rather than a react-native-web tree, so it does
 * not belong inside the prototype's navigation until it is finished —
 * a half-built street is not something to stumble into while walking
 * the product. It gets its own door for as long as it is being built.
 */
const showCity = query.has("city");
/* `?city=1&z=18&x=6.3` stands you in front of one shop, for screenshots. */
const citySpawn = query.has("z") || query.has("x")
  ? { x: query.has("x") ? Number(query.get("x")) : undefined,
      z: query.has("z") ? Number(query.get("z")) : undefined }
  : undefined;

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <React.StrictMode>
    {showCity ? <City spawn={citySpawn} avatarNo={query.has("av") ? Number(query.get("av")) : null} /> : showGallery ? <Gallery /> : <App />}
  </React.StrictMode>
);
