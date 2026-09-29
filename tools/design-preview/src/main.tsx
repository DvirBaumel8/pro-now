import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { Gallery } from "./Gallery";
import { catalogServicePages, departmentCodeByServiceId } from "@pro-now/demo-ui";

import { City, CITY_SHOP_DEPARTMENTS, type CityShot } from "./city/City";

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

/*
 * THE CATALOGUE, FOR THE STANDALONE CITY DOOR.
 *
 * `?city=1` opens the street on its own, outside the app, for design
 * review and screenshots. The app builds this map with the LIVE
 * availability snapshot beside each service; here there is no snapshot,
 * so every count is null — and null is rendered as silence rather than
 * as a zero, because a zero would read as "nobody is free" and nothing
 * here knows that (/CLAUDE.md §3).
 */
const cityTradesForReview = (() => {
  const byDept: Record<string, string[]> = {};
  for (const id of Object.keys(catalogServicePages)) {
    const d = departmentCodeByServiceId[id];
    if (!d) continue;
    (byDept[d] ??= []).push(id);
  }
  const out: Record<
    string,
    { nameHe: string; services: Array<{ id: string; nameHe: string; availableNowCount: number | null }> }
  > = {};
  for (const [shopId, dept] of Object.entries(CITY_SHOP_DEPARTMENTS)) {
    const ids = byDept[dept] ?? [];
    if (ids.length === 0) continue;
    out[shopId] = {
      nameHe: "",
      services: ids.map((id) => ({
        id,
        nameHe: catalogServicePages[id]!.nameHe,
        availableNowCount: null,
      })),
    };
  }
  return out;
})();

/*
 * `?city=1&fly=hair&found=5` plays the search flight on its own — the
 * drift over the roofs, then the dive into that shop after `found`
 * seconds (or when a recorder calls `__found()`) — and `&shot=wide` holds one of the scripted camera shots.
 * Both exist for filming the city at a size no phone has.
 */
const flyTo = query.get("fly");
const cityShot = (query.get("shot") as CityShot | null) ?? null;
function CityForReview() {
  const [phase, setPhase] = useState<"searching" | "found">("searching");
  useEffect(() => {
    if (!flyTo) return;
    /* A recorder calls `__found()` itself, so the dive lands on its cue. */
    (window as unknown as { __found?: () => void }).__found = () => setPhase("found");
    if (!query.has("found")) return;
    const t = setTimeout(() => setPhase("found"), Number(query.get("found")) * 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <City
      spawn={citySpawn}
      avatarNo={query.has("av") ? Number(query.get("av")) : null}
      trades={cityTradesForReview}
      search={flyTo ? { shopId: flyTo, phase } : null}
      shot={cityShot}
    />
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
  <React.StrictMode>
    {showCity ? <CityForReview /> : showGallery ? <Gallery /> : <App />}
  </React.StrictMode>
);
