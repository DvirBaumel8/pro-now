import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * Several orders at once (the demo's "ההזמנות שלך עכשיו"): every order under
 * way keeps a chip with its stage in words, on home in the capsule's place,
 * on an order's own screens as a switcher ("1 מתוך 2"), and over the street.
 * The product used to show only the first live order.
 */
const LAT = 32.06;
const LNG = 34.775;

async function order(page: import("@playwright/test").Page, textHe: string, pick: RegExp) {
  await page.getByRole("textbox", { name: "ספרו מה צריך" }).fill(textHe);
  await page.getByRole("button", { name: pick }).click();
  await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
  await page.getByRole("button", { name: "שליחת הקריאה" }).click();
  await expect(page).toHaveURL(/\/jobs\//);
  return new URL(page.url()).pathname.split("/").pop()!;
}

test("two orders at once: a chip each on home, a switcher on each order, a strip over the street", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  await signInByEmail(page, uniqueEmail("e2e-several"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 22" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  const pro = await dispatchableProfessional({ serviceCode: "HOME_PLUMB_LEAK", lat: LAT, lng: LNG, baseURL: baseURL! });
  let second: string | null = null;

  try {
    // The first: a plumber, on the way.
    const first = await order(page, "נזילה במטבח", /המשך עם נזילה/);
    await pro.acceptOfferFor(first);
    await page.getByRole("button", { name: "כן, מתאים לי" }).click({ timeout: 20_000 });
    await pro.step(first, "en-route");

    // The second, while the first is under way: nobody takes it yet.
    await page.goto("/");
    second = await order(page, "נזילה בשירותים", /המשך עם נזילה/);

    // On the order's own screen: the switcher, "2 מתוך 2" in focus.
    const chip2 = page.getByRole("tab", { name: /^הזמנה 2 מתוך 2: .*מחפשים/ });
    await expect(chip2).toBeVisible({ timeout: 20_000 });
    const chip1 = page.getByRole("tab", { name: /^הזמנה 1 מתוך 2: .*, (בדרך|מתקרב)/ });
    await expect(chip1).toBeVisible();
    // Its chip opens the other order.
    await chip1.click();
    await expect(page).toHaveURL(new RegExp(`/jobs/${first}$`));

    // Home: the dock in the capsule's place, one chip each.
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^הזמנה 1 מתוך 2:/ })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /^הזמנה 2 מתוך 2:/ })).toBeVisible();

    // The street: the strip, each order still in sight.
    await page.goto("/world");
    await expect(page.getByRole("button", { name: /^הזמנה 1 מתוך 2:/ })).toBeVisible({ timeout: 30_000 });
  } finally {
    // Nobody takes the second order: left searching, it would be offered to a later spec's professional nearby.
    if (second) await page.request.post(`/api/v1/jobs/${second}/cancel`, { headers: { origin: baseURL! } });
    await pro.dispose();
  }
});
