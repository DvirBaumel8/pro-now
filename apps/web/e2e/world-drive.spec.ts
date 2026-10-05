import { PNG } from "pngjs";

import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * The professional's own van on the tracking view (scene/drive.ts), as the
 * demo's: his trade's van in the street, driving down the left lane towards
 * a light standing where you live, "הבית שלך" over it, a drone behind him.
 * The product used to draw a side-view card on the old painted route while
 * the camera followed a walker, and had no home at all.
 */
const LAT = 32.06;
const LNG = 34.775;

/** Share of the shot's pixels that are the ribbon's and the light's coral: strong red, some green, little blue. */
function coralShare(png: PNG): number {
  let coral = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
    if (r > 200 && g > 70 && g < 190 && b < 140 && r - b > 110) coral++;
  }
  return coral / (png.width * png.height);
}

test("on the way, his own van drives down the street to the light over your home", async ({ page, baseURL }) => {
  test.setTimeout(150_000);
  await signInByEmail(page, uniqueEmail("e2e-world-drive"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 16" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  const pro = await dispatchableProfessional({ serviceCode: "HOME_PLUMB_LEAK", lat: LAT, lng: LNG, baseURL: baseURL! });

  // The plumber's van, from its own drawings.
  const plumber = new Set<string>();
  page.on("response", (response) => {
    const m = /\/world\/s\/pn_plumber_(front|back)\.webp$/.exec(new URL(response.url()).pathname);
    if (m && response.ok()) plumber.add(m[1]!);
  });

  try {
    await page.getByRole("textbox", { name: "ספרו מה צריך" }).fill("נזילה במטבח");
    await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
    await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
    await page.getByRole("button", { name: "שליחת הקריאה" }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    const jobId = new URL(page.url()).pathname.split("/").pop()!;
    await pro.acceptOfferFor(jobId);
    await page.getByRole("button", { name: /^שליחת .* אליי$/ }).click({ timeout: 15_000 });
    await pro.step(jobId, "en-route");
    await expect(page.getByText(/בדרך אליכם/).first()).toBeVisible({ timeout: 15_000 });

    // Your home, labelled where its light stands, in view of the drone.
    const home = page.locator(".world-canvas__home-label");
    await expect(home).toHaveText("הבית שלך", { timeout: 30_000 });
    await expect(home).toBeVisible();
    await expect(home).toHaveCSS("opacity", "1", { timeout: 15_000 });
    expect([...plumber].sort(), "the plumber's van, front and back").toEqual(["back", "front"]);

    // The ribbon from his van to your door and the light over it are in the shot.
    const canvas = page.locator(".world-canvas__surface canvas");
    await page.waitForTimeout(2000);
    const shot = await canvas.screenshot();
    await test.info().attach("drive", { body: shot, contentType: "image/png" });
    const share = coralShare(PNG.sync.read(shot));
    console.log(`world drive: coral share ${(share * 100).toFixed(2)}%`);
    expect(share, "the way home in coral").toBeGreaterThan(0.001);
  } finally {
    await pro.dispose();
  }
});
