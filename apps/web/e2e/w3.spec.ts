import { expect, test } from "@playwright/test";

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
  await page.getByRole("button", { name: "המיקום שלי עכשיו" }).click();
  await expect(page.getByRole("button", { name: /^המיקום שלי עכשיו .+/ })).toBeVisible();
});

test("denied location permission leaves the typed-address fallback visible", async ({ page, context, baseURL }) => {
  await context.grantPermissions([], { origin: baseURL });
  await signInByEmail(page, uniqueEmail("w3-denied"));
  await finishFirstRun(page);
  await openAddresses(page);
  await page.getByRole("button", { name: "המיקום שלי עכשיו" }).click();
  await expect(page.getByText(/אין הרשאת מיקום/)).toBeVisible();
  await expect(page.getByPlaceholder("רחוב, מספר, עיר · קומה ודירה")).toBeVisible();
});
