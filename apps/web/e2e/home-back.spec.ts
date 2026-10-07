import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/**
 * The phone's back closes home's list of every service, as the demo's
 * (`openOverlay`, its button audit #13): it used to leave home instead.
 * Closed on screen, the list leaves no spare step behind.
 */
test("the phone's back closes the list of every service and stays home", async ({ page }) => {
  test.setTimeout(90_000);
  await signInByEmail(page, uniqueEmail("e2e-home-back"));
  await finishFirstRun(page);
  await page.goto("/calls");
  await page.goto("/");

  const door = page.getByRole("button", { name: /^כל \d+ השירותים$/ });
  const search = page.getByRole("textbox", { name: "חיפוש שירות" });

  // Opened, then the phone's back: the list closes, home stays.
  await door.click();
  await expect(search).toBeVisible();
  await page.goBack();
  await expect(search).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await expect(door).toBeVisible();

  // Opened, then closed on screen: the next back is an ordinary step, to the page before.
  await door.click();
  await expect(search).toBeVisible();
  await page.getByRole("button", { name: "חזרה", exact: true }).click();
  await expect(search).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/calls$/);
});

const cleanup: string[] = [];
test.afterEach(async ({ page, baseURL }) => {
  for (const id of cleanup.splice(0)) await page.request.post(`/api/v1/jobs/${id}/cancel`, { headers: { origin: baseURL! } });
});

test("the phone's back steps through home's own views: the menu, a service, its form, and home after sending", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await signInByEmail(page, uniqueEmail("e2e-home-back-views"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: 32.06, lng: 34.775, details: "שינקין 22" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  await page.goto("/calls");
  await page.goto("/");
  const box = page.getByRole("textbox", { name: "ספרו מה צריך" });

  // The menu: back closes it, home stays.
  await page.getByRole("button", { name: "תפריט" }).click();
  await expect(page.getByText("הכתובות שלי")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("הכתובות שלי")).toHaveCount(0);
  await expect(box).toBeVisible();

  // A department: back closes it, home stays.
  const faces = page.getByText("או בחרו לפי תחום").locator("..");
  await faces.getByRole("button").first().click();
  await expect(box).toHaveCount(0);
  await page.goBack();
  await expect(box).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // A service's page, then its form: back steps out one at a time.
  await box.fill("נזילה במטבח");
  await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
  const request = page.getByRole("button", { name: /^בקשת .* עכשיו$/ });
  await request.click();
  const send = page.getByRole("button", { name: "שליחת הקריאה" });
  await expect(send).toBeVisible();
  await page.goBack();
  await expect(send).toHaveCount(0);
  await expect(request).toBeVisible();
  await page.goBack();
  await expect(request).toHaveCount(0);
  await expect(box).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  // Sent: the job; back from it is home itself, and then the page before.
  await box.fill("נזילה במטבח");
  await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
  await request.click();
  await send.click();
  await expect(page).toHaveURL(/\/jobs\//);
  // Nobody takes it: left searching, it would be offered to a later spec's professional nearby.
  const sent = new URL(page.url()).pathname.split("/").pop()!;
  cleanup.push(sent);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(request).toHaveCount(0);
  await expect(box).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/calls$/);
});
