import { expect, test } from "./fixtures";

import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

async function openAddresses(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "תפריט" }).click();
  await page.getByRole("button", { name: /הכתובות שלי/ }).click();
  await expect(page).toHaveURL(/\/addresses$/);
}

test("location permission shows the server-resolved street", async ({ page, context, baseURL }) => {
  await context.setGeolocation({ latitude: 32.0853, longitude: 34.7818 });
  await context.grantPermissions(["geolocation"], { origin: baseURL });
  await signInByEmail(page, uniqueEmail("w3-location"));
  await finishFirstRun(page);
  await openAddresses(page);
  await page.getByRole("radio", { name: /המיקום שלי עכשיו/ }).click();
  await expect(page.getByRole("radio", { name: /^המיקום שלי עכשיו .+/, checked: true })).toBeVisible();
  // Saved as the device's own fix, with the floor and flat a GPS fix does not carry.
  await page.getByRole("textbox", { name: "קומה, כניסה ודירה" }).fill("קומה 2");
  await page.getByRole("button", { name: "אישור הכתובת" }).click();
  await expect(page).toHaveURL(/\/$/);
  const { addresses } = await (await page.request.get("/api/v1/me/addresses")).json();
  expect(addresses[0]).toMatchObject({ lat: 32.0853, lng: 34.7818, geoPrecision: "DEVICE" });
  expect(addresses[0].formatted).toMatch(/· קומה 2$/);
});

test("denied location permission leaves the typed-address fallback visible", async ({ page, context, baseURL }) => {
  await context.grantPermissions([], { origin: baseURL });
  await signInByEmail(page, uniqueEmail("w3-denied"));
  await finishFirstRun(page);
  await openAddresses(page);
  await page.getByRole("radio", { name: /המיקום שלי עכשיו/ }).click();
  await expect(page.getByText(/אין הרשאת מיקום/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "כתובת חדשה" })).toBeVisible();
  // Nothing is chosen, so nothing can be confirmed.
  await expect(page.getByRole("button", { name: "אישור הכתובת" })).toBeDisabled();
});
