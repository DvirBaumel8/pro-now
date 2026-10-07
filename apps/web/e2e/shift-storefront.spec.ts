import { asPerson, expect, test } from "./fixtures";
import { linkFor } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * The shift is their shop (the demo's pro round 3, `ShiftStorefront`): a
 * professional who designed a shop when joining sees it on the shift page,
 * with their sign; off shift the shutter is down, and starting the shift
 * rolls it up. Without a shop, the city as before.
 */
test.use({ permissions: ["geolocation"], geolocation: { latitude: 32.08, longitude: 34.78 } });

test("the shift page is their shop: the shutter down off shift, up once it starts", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const pro = await dispatchableProfessional({ serviceCode: "HOME_PLUMB_LEAK", lat: 32.08, lng: 34.78, baseURL: baseURL!, offline: true });
  try {
    await page.setExtraHTTPHeaders(asPerson());
    // Their own sign-in on this device: "אני בעל מקצוע", then the emailed link.
    await page.goto("/");
    await page.getByRole("button", { name: /אני בעל מקצוע/ }).click();
    await page.getByPlaceholder("name@example.com").fill(pro.email);
    await page.getByRole("button", { name: "שליחת קישור" }).click();
    await expect(page.getByText("בדקו את המייל")).toBeVisible();
    await page.goto(await linkFor(pro.email));
    // No shop designed yet: the city, no storefront.
    await expect(page.getByRole("button", { name: "התחלת משמרת" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("shift-storefront")).toHaveCount(0);

    const saved = await page.request.put("/api/v1/pro/application/shop", {
      data: { name: "האינסטלטור של דנה", brandColor: "#2EC4B6", logoUploadId: null },
      headers: { origin: baseURL! },
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    await page.reload();

    const shop = page.getByTestId("shift-storefront");
    await expect(shop).toBeVisible({ timeout: 20_000 });
    await expect(shop).toHaveAttribute("data-open", "no");
    await expect(shop.getByText("האינסטלטור של דנה")).toBeVisible();

    await page.getByRole("button", { name: "התחלת משמרת" }).click();
    await expect(shop).toHaveAttribute("data-open", "yes", { timeout: 20_000 });
    // The shutter rolled up: nothing of it left over the shopfront.
    await expect.poll(async () => (await page.getByTestId("shift-shutter").boundingBox())?.height ?? 0, { timeout: 5_000 }).toBeLessThan(2);
  } finally {
    await pro.dispose();
  }
});
