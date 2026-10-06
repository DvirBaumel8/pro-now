import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * The street in the customer's flow (DEMO-SYNC D6): the search flown over
 * it with radar waves, a walk round it while the work is done that comes
 * back to the job, and a service chosen in a shop whose back returns into
 * the shop — each as the demo does it, on the server's own job.
 */
const LAT = 32.06;
const LNG = 34.775;

test("while the server looks, the street is flown over with radar waves, and nobody is named", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-flow-search"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 12" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  // Somebody to offer it to, so the search stays a search (nobody accepts).
  const pro = await dispatchableProfessional({
    serviceCode: "HOME_PLUMB_LEAK",
    lat: LAT,
    lng: LNG,
    baseURL: baseURL!,
  });
  try {
    await page
      .getByRole("textbox", { name: "ספרו מה צריך" })
      .fill("נזילה במטבח");
    await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
    await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
    await page.getByRole("button", { name: "שליחת הקריאה" }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    const jobId = new URL(page.url()).pathname.split("/").pop()!;

    await expect(page.getByText("מחפשים מי זמין עכשיו")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator(".job-world--search .world-canvas")).toHaveCount(
      1,
    );
    await expect(page.getByTestId("search-radar")).toHaveCount(3);
    await expect(page.getByTestId("search-radar").first()).toBeVisible();
    // A picture of looking, not a result: no invented count of matches.
    await expect(page.getByText(/מצאנו \d+ התאמות/)).toHaveCount(0);

    // Reduced motion: one still ring, no waves.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.getByTestId("search-radar").nth(1)).toBeHidden();
    const ring = await page
      .getByTestId("search-radar")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(ring).toBe("none");

    await page.request.post(`/api/v1/jobs/${jobId}/cancel`, {
      data: {},
      headers: { origin: baseURL! },
    });
  } finally {
    await pro.dispose();
  }
});

test("while the work is done: a walk round the street, back to the job", async ({
  page,
  baseURL,
}) => {
  test.setTimeout(150_000);
  await signInByEmail(page, uniqueEmail("e2e-flow-stroll"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 12" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  const pro = await dispatchableProfessional({
    serviceCode: "HOME_PLUMB_LEAK",
    lat: LAT,
    lng: LNG,
    baseURL: baseURL!,
  });
  try {
    await page
      .getByRole("textbox", { name: "ספרו מה צריך" })
      .fill("נזילה במטבח");
    await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
    await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
    await page.getByRole("button", { name: "שליחת הקריאה" }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    const jobId = new URL(page.url()).pathname.split("/").pop()!;
    await pro.acceptOfferFor(jobId);
    await page
      .getByRole("button", { name: "כן, מתאים לי" })
      .click({ timeout: 15_000 });

    // On the way, following the professional is the screen: no walk offered.
    await pro.step(jobId, "en-route");
    await expect(page.getByText(/בדרך אליכם/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("button", { name: "סיור בעיר שלנו" }),
    ).toHaveCount(0);

    // At the door, then the diagnosis: the walk is offered.
    await pro.step(jobId, "arrive");
    await pro.step(jobId, "start");
    await page.goto(`/jobs/${jobId}`);
    const walk = page.getByRole("button", { name: "סיור בעיר שלנו" });
    await expect(walk).toBeVisible({ timeout: 15_000 });

    // No figure yet (the first run skipped it): the picker first, then the street.
    await walk.click();
    await expect(page).toHaveURL(/\/avatar\?then=world&from=/);
    await page.getByRole("button", { name: "דמות 1" }).click();
    await page.getByRole("button", { name: "אישור הדמות" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/world\\?from=%2Fjobs%2F${jobId}$`),
    );

    // Back is back: to the job, not home.
    await page.getByRole("button", { name: "יציאה מהעולם" }).click();
    await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}$`));

    // With a figure, straight into the street, and back again.
    await page.getByRole("button", { name: "סיור בעיר שלנו" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/world\\?from=%2Fjobs%2F${jobId}$`),
    );
    await page.getByRole("button", { name: "יציאה מהעולם" }).click();
    await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}$`));

    // A return path that is not a job's is ignored: home.
    await page.goto("/world?from=%2Fadmin");
    await page.getByRole("button", { name: "יציאה מהעולם" }).click();
    await expect(page).toHaveURL(/\/$/);
  } finally {
    await pro.dispose();
  }
});

test("a service chosen in a shop: its back returns into the shop", async ({
  page,
}) => {
  test.setTimeout(120_000);
  // Without WebGL the street's shop list is the same overlay, and quick to reach.
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await signInByEmail(page, uniqueEmail("e2e-flow-shop"));
  await finishFirstRun(page);

  await page.goto("/world");
  await page.getByRole("button", { name: "היכנסו" }).click();
  await page.getByRole("button", { name: "נזילה או דליפת מים" }).click();
  await expect(
    page.getByRole("button", { name: /^בקשת .* עכשיו$/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: "חזרה", exact: true }).first().click();
  await expect(page).toHaveURL(/\/world\?shop=[a-z_]+$/);
  // Inside the same shop: its services, not the street's door.
  await expect(
    page.getByRole("button", { name: "נזילה או דליפת מים" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "היכנסו" })).toHaveCount(0);

  // Out of the street from there: home.
  await page.getByRole("button", { name: "יציאה מהעולם" }).click();
  await expect(page).toHaveURL(/\/$/);
});
