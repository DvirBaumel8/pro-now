# PRO NOW — Current state and handoff (read this first)

Last updated 2026-09-28, at the end of a long working session. This page is
the short version of "who we are, where things are, how we work, what is
next". The history behind it lives in `docs/EPIC-0-REPORT.md` and the
product decisions in `docs/18-ROADMAP.md` (sections marked **DECIDED** and
**BUILT**).

---

## 1. Who is who

- **Amit** is the owner of PRO NOW. He is **not a programmer and speaks
  Hebrew only**, so every answer to him is in Hebrew, short, and free of
  jargon. He decides the product; Claude Code writes, tests, documents and
  publishes. His standing preferences are in §6.
- **Amit's friend, the reviewer**, is a senior software engineer (7 years at
  Lemonade). He writes in **English** and is reviewing the codebase: how the
  work is done, security, and cost (tokens). His brief is
  `docs/REVIEW-BRIEF.md` (Hebrew, written for him). Answer him in English,
  technically and precisely.

## 2. Phase and goal

- **Now: a browser demo for fundraising.** The demo must work end to end
  for every service, look alive, and be demonstrable in every part.
- **After fundraising:** App Store / Play, real backend deployment, and the
  vendor decisions (payments, KYC, SMS, hosting). Nothing is in production
  today (see §3).
- The product rules in `CLAUDE.md` still govern everything: NOW-first, real
  supply only, server-authoritative, and no invented business decisions
  (§4 there).

## 3. What exists and where

| Thing | Where | State |
|---|---|---|
| **The demo** (what investors see) | `tools/design-preview` → published as a Claude Artifact: https://claude.ai/artifact/7YRPcVfEuhVCmcK3PKVeJW (currently **v225**, "anyone with the link") | Static bundle, **no backend**: fixtures in the bundle, the customer↔pro loop simulated client-side. Every one of the 47 services passes the full flow to payment (`qa/pp_all.mjs`). |
| API | `apps/api` (Fastify, Prisma, Postgres 16 + PostGIS, Redis via `docker-compose.yml`) | Runs on **localhost only**. Never deployed. |
| Mobile apps | `apps/customer-mobile`, `apps/pro-mobile` (Expo) | Typecheck clean. **Never built for a device.** |
| Admin | `apps/admin` (Next.js 14) | About 320-line scaffold: KPI page with labelled demo figures, and a job inspector that fetches the API. **No auth/RBAC yet.** |
| Shared logic | `packages/types` (domain, catalogue, state machines, pricing), `packages/ui` (screens used by both demo and apps) | Tested: types 726, ui 199, api 244, validation 18. |
| Films (customer / pro / business) | `~/Desktop/PRO NOW - סרטונים/` (mp4). Code: `tools/design-preview/film/` | Recorded from the demo. They **predate** the 2026-09-28 shops, search and pricing work, and should be re-recorded. |
| NDA draft (Hebrew, .docx) | `~/Desktop/PRO NOW - הסכם סודיות.docx` | A draft, not legal advice. Blanks: parties, term in years, court district. |
| Git | Private GitHub repo `nivamit1210-sketch/pro-now` | **The shell has no GitHub credentials.** Pushing is done by Amit in **GitHub Desktop → "Push origin"**. At the end of this session local `master` was about 78 commits ahead of `origin` and waiting for that click. Check with `git status -sb`. |

## 4. How to work on the demo

**Run and check it locally**
```bash
npm run preview:build                         # builds tools/design-preview/dist
cd tools/design-preview && npx vite preview --port 4421 --strictPort --host 127.0.0.1
```

Useful URL params:
- `?time=day|night` pins the city's lighting. By default it follows the phone clock: day from 06:00 to 18:00.
- `?city=1&x=<x>&z=<z>` spawns you in the 3D street.
- `?city=1&fly=<shopId>&found=4` plays the search flight.
- `?hd=1` loads the full-size art.

**QA tools** live in `tools/design-preview/qa/`. Run them from that folder with
`PW_CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
Screenshots go to `qa/out/`.
- `node pp_all.mjs "<category tile>" "<service>"` runs the whole customer↔pro loop for one service.
- `zsh all47b.sh` runs all 47 services. **Run it sequentially, never in parallel**: parallel runs flake under load.
- `node shops.mjs <x> <z> <name>` walks up to a shop, enters, and opens its menu. `shopcheck.mjs` also takes the street and interior shots.
- `onsite.mjs` covers the "order for someone else" flow, `price.mjs` / `price_flow.mjs` check that the price follows the answers, and `search.mjs` checks free-text search.
- `allreqs.mjs` lists every file the app requests. Use it before a publish to decide what must be uploaded.

**Publishing to the artifact**
- Build, then publish `tools/design-preview/dist/index.html` to the URL above with `root` = the `dist` folder and a `files` map.
- Upload only what changed: usually the new `assets/index-*.js` plus `null` for the previous bundle, plus any new or changed images.
- The capability `sample` is carried forward automatically.
- **Hard limit: 512 files per artifact version.** It sits around 509 now. The shop rooms added on 2026-09-28 are published only in the phone edition (`world/s/`). The city falls back `m/ → s/` on desktop.
- Always simulate the published set before publishing: block the files that aren't uploaded and check the city loads.

**Art pipeline (shops and characters)**
1. Generate in ChatGPT through Claude in Chrome, in the chat thread named "יצירת חזית Lust".
   - Per shop, generate 7 images: `<id>_street` (1254², on #00FF00), `_wall_back`/`_left`/`_right` (1536×1024, straight-on), `_floor` (1254²), `_props` (4 separate items on #00FF00), and `_venue` (1024×1536, facade with the pro in the door, on green; upload the character as a reference).
   - Type the prompt as a **single line**, because a newline sends the message.
   - Ask for **no real brand logos**.
   - Download images through a blob `<a download>` in the page.
2. `node ingest-shop.mjs ~/Downloads/shop_<id> <id>`. It keys out the green, splits the props, trims green hems off the walls, and retires the old height maps.
3. Measure the window on the facade with `qa/grid.py`, then add a `SHOP_WINDOWS` entry in `src/city/street.ts`, add the id to `BUILT_ROOMS` (with the prop count) and `VENUE_READY` in `src/city/City.tsx`, and extend the `_height` regex.
4. `node make-light.mjs` generates the `m/` and `s/` editions. Add the new `s/` rooms to `src/city/phoneFiles.json`.
5. Characters: `python3 ingest-character.py <png> <id>` writes `character_<id>_world` and `_icon`.

**City gotchas**
- Shops in the 3D street sit about 4 m from their roster `z` (the doorway of `auto` is at z ≈ -4, not 0).
- "Places" (dog park, pull-in bay, courier point, garden, bench) sit 8.8 m from shop doors. In front of a shop's frontage, the shop's "היכנס" wins.
- Rooms are `boxRoom.ts`: walls, floor, props, a procedural ceiling with downlights and cove light, and props that fade when the camera is inside them.
- Street cut-outs (trees, parked vehicles) hide when the camera passes through them.

## 5. Decisions and recent work (details in `docs/18-ROADMAP.md`)

**Recent decisions**
- Each pro sets their own visit fee. There is no floor or ceiling, and abusers are blocked.
- An approved quote **includes** the visit fee.
- Locksmith is a fixed-price service.
- A pro may set a night/Shabbat surcharge, which the customer sees before ordering.
- "פנוי בעוד XX דקות" counts as availability. Future booking is the next stage: "request for a later time", with no pro calendar.
- The preview opens every service for demonstration.
- **Only the person who ordered approves a quote and pays.** The person at home never does.

**Built in the last session**
- Free-text search understands everyday Hebrew: word forms, one-letter typos, symptoms, and Claude as a fallback when framed. A life-threatening sentence shows "מד״א 101".
- A fixed or hourly price follows the intake answers. The per-answer tables are example prices, scaled by each pro's own base.
- Every one of the 14 shops is built like the barbershop. The build and help pros were redrawn in the illustrated style.
- Ordering for someone else now reaches the door. The person at home gets a page via SMS link (`OnSiteBody`) with the pro and the door code. The pro sees who opens the door and the code to say.
- Rooms have ceilings, and camera clipping into props and trees is fixed.
- The welcome screen is the neon street alone.

## 6. Working with Amit (standing preferences)

- **Hebrew only**, plain words, short. While working on long tasks, give a one-line Hebrew status update now and then.
- **When he says "talk to me before acting", propose first and wait.** He has also given blanket approval for long autonomous runs ("יש לך אישור להכל"). Still confirm pushes, publishing anything new outward, and anything irreversible.
- Show before publishing when he asks to see first. Otherwise publish to the same artifact URL and tell him the version.
- Never invent a business, legal or vendor decision. Build an interface, mark it TBD, and ask.
- Everything "alive and bright". No robotic narration in films. Don't send redundant videos.
- Report honestly what was **not** checked. For example, a real iPhone has never been tested; ask Amit to try the link on his phone.

## 7. Open items and suggested next steps

1. **Push to GitHub.** Amit clicks "Push origin" in GitHub Desktop.
2. **Re-record the three films** so they show the new shops, search, pricing, and ordering for someone else.
3. **"Request for a later time"**, the agreed next stage.
4. **Pro-side editor for per-answer prices** (the design needs Amit).
5. **Remove the remaining real-brand logos** in the appliance lab art.
6. **Reviewer's findings:** CI (none today), Git LFS or a bucket for art (1,300+ binaries in git), splitting `tools/design-preview/src/App.tsx` (about 6,600 lines), shorter code comments, and shorter sessions to save tokens. See `docs/REVIEW-BRIEF.md`.
7. **Before any real deployment:** auth/RBAC on the API and admin, a server-issued door code, an SMS vendor, and the other vendor decisions in `docs/18-ROADMAP.md §Open Decisions`.
