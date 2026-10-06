import { PNG } from "pngjs";

import { expect, test } from "./fixtures";

import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

test("the customer can walk into a catalogue-backed shop and start a request", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world"));
  await finishFirstRun(page);

  await page.goto("/world");
  // The demo's chrome: just the round back button, no title pill, no bottom bar.
  await expect(page.getByRole("button", { name: "יציאה מהעולם" })).toBeVisible();
  await expect(page.getByRole("button", { name: "להמשיך בלי העולם" })).toHaveCount(0);

  // The first shop stands up the street and to the left of where you start.
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowLeft");
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible({ timeout: 10_000 });
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "היכנסו" }).click();

  await expect(page.getByRole("button", { name: "נזילה או דליפת מים" })).toBeVisible();
  await page.getByRole("button", { name: "נזילה או דליפת מים" }).click();
  // Home opens that service's page first, as in the demo; then the form.
  await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
  await expect(page.getByRole("textbox", { name: "מה צריך, במילים שלך" })).toBeVisible();
});

test("walking into a shop is the demo's: through the door in its colour, into its room, and back out to the street", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-room"));
  await finishFirstRun(page);

  await page.goto("/world");
  await expect(page.locator(".world-canvas__surface canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });
  // The colour over the screen, as the scene sets it, frame by frame.
  await page.evaluate(() => {
    const veil = document.querySelector<HTMLElement>(".world-canvas__veil")!;
    const seen = { max: 0, colour: "" };
    (window as unknown as { __veil: typeof seen }).__veil = seen;
    new MutationObserver(() => {
      const opacity = Number(veil.style.opacity || 0);
      if (opacity > seen.max) seen.max = opacity;
      if (opacity > 0) seen.colour = veil.style.background;
    }).observe(veil, { attributes: true, attributeFilter: ["style"] });
  });

  // The home shop's door: up the street and to the left.
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("ArrowLeft");
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible();
  await page.keyboard.up("ArrowLeft");
  await page.keyboard.up("ArrowUp");
  await page.getByRole("button", { name: "היכנסו" }).click();

  // In the room: its catalogue and the demo's way back out.
  const leave = page.getByRole("button", { name: "‹ חזרה לרחוב" });
  await expect(leave).toBeVisible();
  await expect(page.getByRole("button", { name: "נזילה או דליפת מים" })).toBeVisible();
  // The walk in rose into the shop's own colour (תיקונים דחופים, #ffb45e) and opened out of it.
  const veil = await page.evaluate(() => (window as unknown as { __veil: { max: number; colour: string } }).__veil);
  console.log(`world walk-in veil: max ${veil.max}, ${veil.colour}`);
  expect(veil.max, "the shop's colour covered the door").toBeGreaterThan(0.95);
  expect(veil.colour).toBe("rgb(255, 180, 94)");
  await expect
    .poll(() => page.locator(".world-canvas__veil").evaluate((el) => Number((el as HTMLElement).style.opacity)))
    .toBe(0);

  // The room is drawn, not a blank: its lit walls fill the phone. Only the
  // home shop's dark ceiling between its downlights is near black (about 10%).
  const room = PNG.sync.read(await page.locator(".world-canvas__surface canvas").screenshot());
  const black = nearBlackShare(room);
  console.log(`world room near-black share: ${(black * 100).toFixed(1)}%`);
  expect(black, "the room is lit").toBeLessThan(0.25);

  // Pulling back at the edge of the room walks you out, as in the demo.
  await page.keyboard.down("ArrowDown");
  await expect(leave).toBeHidden({ timeout: 20_000 });
  await page.keyboard.up("ArrowDown");
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible();

  // And so does the button.
  await page.getByRole("button", { name: "היכנסו" }).click();
  await expect(leave).toBeVisible();
  await leave.click();
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible();
  await expect(leave).toBeHidden();
});

test("on a phone, dragging on the street walks to a shop", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-drag"));
  await finishFirstRun(page);

  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  // The demo's hint over the high opening view, until the first step.
  const hint = page.getByText("גררו באצבע על המסך כדי ללכת");
  await expect(hint).toBeVisible({ timeout: 30_000 });

  // Held still after the move, the offset keeps walking: up and to the left.
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 60, y - 60, { steps: 4 });
  // The thumb stick shows where the finger came down, as in the demo.
  await expect(page.locator(".world-canvas__stick")).toBeVisible();
  await expect(hint).toBeHidden();
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible({ timeout: 10_000 });
  await page.mouse.up();
  await expect(page.locator(".world-canvas__stick")).toBeHidden();
});

/** Share of the shot that is near-black: every channel under 24 of 255. */
function nearBlackShare(png: PNG): number {
  let dark = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i]! < 24 && png.data[i + 1]! < 24 && png.data[i + 2]! < 24) dark++;
  }
  return dark / (png.width * png.height);
}

test("at the start the street is in view, not a wall in front of the camera", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-view"));
  await finishFirstRun(page);

  // Midday, so the check reads the daylight street whatever the CI clock says.
  await page.clock.setFixedTime(new Date("2026-10-02T12:00:00"));
  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  // The arrival screen lifts once the street's art is in; then let the camera settle.
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });
  await page.waitForTimeout(3000);

  // A filler wall stood across the pavement once (#62) and filled the left
  // two thirds of the phone with black. The daylight street has almost none.
  const share = nearBlackShare(PNG.sync.read(await canvas.screenshot()));
  console.log(`world view near-black share: ${(share * 100).toFixed(1)}%`);
  expect(share, `${(share * 100).toFixed(1)}% of the street view is black`).toBeLessThan(0.15);
});

/** Mean colour of the top `share` of the shot. */
function topBand(png: PNG, share: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  const rows = Math.floor(png.height * share);
  for (let i = 0; i < rows * png.width * 4; i += 4) {
    r += png.data[i]!;
    g += png.data[i + 1]!;
    b += png.data[i + 2]!;
  }
  const n = rows * png.width;
  return [r / n, g / n, b / n];
}

test("by day the sky over the street is the demo's deep blue, not the haze", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-sky"));
  await finishFirstRun(page);

  await page.clock.setFixedTime(new Date("2026-10-02T12:00:00"));
  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });
  await page.waitForTimeout(3000);

  // The opening view looks along the street with the sky above it. The demo's
  // reads about (64, 129, 208); a sky lost in the fog was (187, 209, 229).
  const [r, , b] = topBand(PNG.sync.read(await canvas.screenshot()), 0.1);
  console.log(`world sky (top 10%): r=${r.toFixed(0)} b=${b.toFixed(0)}`);
  expect(b - r, "the sky is blue, not white haze").toBeGreaterThan(100);
});

/** Mean luma (0–255) of the bottom `share` of the shot. */
function bottomLuma(png: PNG, share: number): number {
  let sum = 0;
  const from = Math.floor(png.height * (1 - share)) * png.width * 4;
  for (let i = from; i < png.data.length; i += 4) {
    sum += 0.2126 * png.data[i]! + 0.7152 * png.data[i + 1]! + 0.0722 * png.data[i + 2]!;
  }
  return sum / ((png.data.length - from) / 4);
}

test("at eight in the evening the lamps and shops light the street around you", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-evening"));
  await finishFirstRun(page);

  await page.clock.setFixedTime(new Date("2026-10-02T20:00:00"));
  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });
  await page.waitForTimeout(3000);

  // The near street, under the opening view. Lamps at 2.4 cd left it near
  // black, a luma about 40; at the demo's 95 cd (and the shops' light) it is
  // about 75, where the demo's own street reads about 90.
  const luma = bottomLuma(PNG.sync.read(await canvas.screenshot()), 0.25);
  console.log(`world evening street luma (bottom 25%): ${luma.toFixed(0)}`);
  expect(luma, "the evening street is lit, not dark").toBeGreaterThan(58);
});

/** Share of a region (fractions of the shot) that is clear-day sky blue. */
function skyShare(png: PNG, x0: number, x1: number, y0: number, y1: number): number {
  let sky = 0;
  let n = 0;
  for (let y = Math.floor(png.height * y0); y < Math.floor(png.height * y1); y += 2) {
    for (let x = Math.floor(png.width * x0); x < Math.floor(png.width * x1); x += 2) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i]!;
      const b = png.data[i + 2]!;
      if (b > 150 && b > r + 80) sky++;
      n++;
    }
  }
  return sky / n;
}

test("at a shop the shopfront stands two storeys along the street, not a card turned to you", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-shopfront"));
  await finishFirstRun(page);

  await page.clock.setFixedTime(new Date("2026-10-02T12:00:00"));
  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });

  // Up to the first shop, on the left, as the walk above.
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 60, { steps: 4 });
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible({ timeout: 15_000 });
  // The spawn is beside the first shop, so its door can show before a step is
  // taken; the camera comes down on the first move (camera.ts), so keep walking.
  await page.waitForTimeout(1500);
  await page.mouse.up();

  // Over the shop, upper left. The demo's facade (a bay wide, two storeys,
  // with its cornice) fills it; the old 5.2 m card left it all sky (100%).
  // The camera's descent from high over the street runs on rendered frames,
  // so on a loaded machine it can still be up there after a fixed wait (all
  // sky): measure once the view has settled, two samples half a second apart.
  const sample = async () => skyShare(PNG.sync.read(await canvas.screenshot()), 0, 0.4, 0.05, 0.3);
  let share = await sample();
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(500);
        const next = await sample();
        const settled = Math.abs(next - share) < 0.03;
        share = next;
        return settled;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
  console.log(`world sky over the first shop: ${(share * 100).toFixed(0)}%`);
  expect(share, "the shopfront rises over the pavement").toBeLessThan(0.4);
});

/** Share of a band (fractions of the shot) in the pavement's warm sand colour. */
function pavementShare(png: PNG, y0: number, y1: number): number {
  let pave = 0;
  let n = 0;
  for (let y = Math.floor(png.height * y0); y < Math.floor(png.height * y1); y += 2) {
    for (let x = 0; x < png.width; x += 2) {
      const i = (y * png.width + x) * 4;
      const r = png.data[i]!;
      const g = png.data[i + 1]!;
      const b = png.data[i + 2]!;
      if (r > 150 && r > g + 15 && g > b && r - b < 90) pave++;
      n++;
    }
  }
  return pave / n;
}

test("standing still at a shop, the camera stands back and faces it, as the demo's", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-frame"));
  await finishFirstRun(page);

  await page.clock.setFixedTime(new Date("2026-10-02T12:00:00"));
  await page.goto("/world");
  const canvas = page.locator(".world-canvas__surface canvas");
  // The street mounts once the catalogue is in; a slow runner takes a while.
  await expect(canvas).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });

  // Up to the first shop, on the left, and stop there.
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2 - 60, { steps: 4 });
  await expect(page.getByRole("button", { name: "היכנסו" })).toBeVisible({ timeout: 15_000 });
  // Keep walking a moment: the door can show before a step is taken (see above).
  await page.waitForTimeout(1500);
  await page.mouse.up();
  await page.waitForTimeout(4500);

  // The demo turns the camera's head to the shop and walks it back out over
  // the road (close, at head height, for a shop you can see into), so the
  // middle of the screen is the shopfront and its window. A camera that stays
  // over your shoulder, looking down the street, has the pavement there: 34%
  // before this was ported, 16% after.
  const share = pavementShare(PNG.sync.read(await canvas.screenshot()), 0.45, 0.75);
  console.log(`world pavement in the middle of the shot at a shop: ${(share * 100).toFixed(0)}%`);
  expect(share, "the shopfront, not the pavement, fills the middle of the screen").toBeLessThan(0.25);
});

test("the street's traffic is the trades' own vans, drawn from behind and in front", async ({ page }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-vans"));
  await finishFirstRun(page);

  // Each van is built from its trade's rear and front drawings (and its flank),
  // as the demo's; the old traffic was one side view per vehicle.
  const drawn = new Map<string, Set<string>>();
  page.on("response", (response) => {
    const m = /\/world\/s\/pn_([a-z]+)_(front|back)\.webp$/.exec(new URL(response.url()).pathname);
    if (!m || !response.ok()) return;
    const views = drawn.get(m[1]!) ?? new Set<string>();
    views.add(m[2]!);
    drawn.set(m[1]!, views);
  });

  await page.goto("/world");
  await expect(page.locator(".world-canvas__surface canvas")).toBeVisible({ timeout: 30_000 });
  // The arrival waits for the street's art, the vans' drawings with it.
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });

  const whole = [...drawn].filter(([, views]) => views.has("front") && views.has("back")).map(([trade]) => trade);
  console.log(`world fleet drawn front and back: ${whole.sort().join(", ")}`);
  // The demo's ten vans are eight trades.
  expect(whole.length, "the fleet's trades, each with its rear and front").toBeGreaterThanOrEqual(8);
});

test("the terrace's buildings are the demo's: three drawn layers, a drawn relief and things on the roofs", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-world-terrace"));
  await finishFirstRun(page);

  // Each of the six buildings is a wall, balconies (mid) and plants (front) on
  // one registration plus the wall's height map; the old filler was one flat wall.
  const parts = new Map<string, Set<string>>();
  const roofs = new Set<string>();
  page.on("response", (response) => {
    if (!response.ok()) return;
    const path = new URL(response.url()).pathname;
    const building = /\/world\/s\/bld_(\d)_(wall|mid|front|wall_height)\.webp$/.exec(path);
    if (building) parts.set(building[1]!, (parts.get(building[1]!) ?? new Set<string>()).add(building[2]!));
    const roof = /\/world\/s\/(roof_[a-z]+)\.webp$/.exec(path);
    if (roof) roofs.add(roof[1]!);
  });

  await page.goto("/world");
  await expect(page.locator(".world-canvas__surface canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });

  const whole = [...parts].filter(([, got]) => got.size === 4).map(([kind]) => kind);
  console.log(`world buildings with all four drawings: ${whole.sort().join(", ")}; roofs: ${roofs.size}`);
  expect(whole, "all six buildings, each with wall, balconies, plants and relief").toHaveLength(6);
  expect(roofs.size, "the six roof pieces").toBe(6);
});

test.describe("the shops' windows", () => {
  // page.route cannot see what a service worker answers, so none for this one.
  test.use({ serviceWorkers: "block" });

  test("every shop can be seen into: its room arrives after the street, without holding the arrival", async ({ page }) => {
    test.setTimeout(120_000);
    await signInByEmail(page, uniqueEmail("e2e-world-windows"));
    await finishFirstRun(page);

    // Each shop's drawing has its glass cut out and its room stands behind it
    // (shopWindow.ts). Every room is held back until the arrival has lifted:
    // if the arrival waited for them, it would never lift.
    let release!: () => void;
    const arrived = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\/world\/s\/room_[a-z]+_[a-z0-9]+\.webp$/, async (route) => {
      await arrived;
      await route.continue();
    });
    const rooms = new Set<string>();
    page.on("response", (response) => {
      const m = /\/world\/s\/room_([a-z]+)_back\.webp$/.exec(new URL(response.url()).pathname);
      if (m && response.ok()) rooms.add(m[1]!);
    });

    await page.goto("/world");
    await expect(page.locator(".world-canvas__surface canvas")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("נכנסים לעיר")).toBeHidden({ timeout: 30_000 });
    expect(rooms.size, "no room is in before the arrival lifts").toBe(0);
    release();

    await expect.poll(() => rooms.size, { timeout: 45_000 }).toBe(13);
    console.log(`world rooms: ${[...rooms].sort().join(", ")}`);
  });
});

test.describe("arriving on a slow network", () => {
  // page.route cannot see what a service worker answers, so none for this one.
  test.use({ serviceWorkers: "block" });

  test("the arrival screen holds until the street's art is in, then lifts", async ({ page }) => {
    test.setTimeout(120_000);
    await signInByEmail(page, uniqueEmail("e2e-world-arrival"));
    await finishFirstRun(page);

    /*
     * A slow network, held by the test rather than by a clock: the street's
     * pictures wait until the arrival screen has been checked. A fixed delay
     * let them land mid-check (about 2 s in); the frame that then uploads all
     * of them blocks the page for seconds on CI's software renderer, and the
     * screen had lifted by the time the next check could run.
     */
    let releaseArt!: () => void;
    const artHeld = new Promise<void>((release) => (releaseArt = release));
    await page.route(/\/world\/.+\.webp$/, async (route) => {
      await artHeld;
      await route.continue();
    });
    await page.goto("/world");
    const arrival = page.getByRole("status").filter({ hasText: "נכנסים לעיר" });
    await expect(arrival.getByText("PRO NOW")).toBeVisible();
    // No art yet, so it holds (well inside its 12 s cap).
    await page.waitForTimeout(1500);
    await expect(arrival).toBeVisible();

    releaseArt();
    await expect(arrival).toBeHidden({ timeout: 30_000 });
    await expect(page.locator(".world-canvas__surface canvas")).toBeVisible({ timeout: 30_000 });
  });
});
