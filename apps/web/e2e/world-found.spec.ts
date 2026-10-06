import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * Who is coming, shown in the street (the demo's search "found"): once the
 * server assigns, the search screen stays and the camera flies into the
 * trade's shop, whose window opens onto its room; the professional stands
 * in the doorway with a pill saying who, and the match card rises over it.
 * The product used to switch to a separate match screen with no street.
 */
const LAT = 32.06;
const LNG = 34.775;

test("found: the street flies into the trade's shop and the professional stands in its doorway", async ({ page, baseURL }) => {
  test.setTimeout(150_000);
  await signInByEmail(page, uniqueEmail("e2e-world-found"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 18" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  const pro = await dispatchableProfessional({ serviceCode: "HOME_PLUMB_LEAK", lat: LAT, lng: LNG, baseURL: baseURL! });

  // The plumber's shop is "home" (the demo's DEPT_SHOP): its room is what the window opens onto.
  let homeRoom = false;
  page.on("response", (response) => {
    if (/\/world\/s\/room_home_back\.webp$/.test(new URL(response.url()).pathname) && response.ok()) homeRoom = true;
  });

  try {
    await page.getByRole("textbox", { name: "ספרו מה צריך" }).fill("נזילה במטבח");
    await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
    await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
    await page.getByRole("button", { name: "שליחת הקריאה" }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    const jobId = new URL(page.url()).pathname.split("/").pop()!;
    // Searching: nobody named, no window opened.
    await expect(page.getByTestId("search-radar").first()).toBeAttached();
    expect(homeRoom).toBe(false);

    await pro.acceptOfferFor(jobId);
    // The match card over the street, not a separate screen: the street is still there.
    await expect(page.getByRole("button", { name: "כן, מתאים לי" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("job-world")).toBeAttached();
    await expect(page.getByText("באפליקציה לא עובר כסף", { exact: false })).toBeVisible();
    // The camera lands in the shop: its window opens, and who is coming stands in the doorway.
    await expect(page.getByTestId("found-pill")).toHaveText(/^✓ .+ · פנוי(ה)? עכשיו$/, { timeout: 30_000 });
    await expect.poll(() => homeRoom, { timeout: 30_000 }).toBe(true);

    await page.getByRole("button", { name: "כן, מתאים לי" }).click();
    await expect(page.getByTestId("found-pill")).toHaveCount(0);
  } finally {
    await pro.dispose();
  }
});
