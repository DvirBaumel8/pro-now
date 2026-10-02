import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/**
 * A photo that cannot reach storage (Dvir, 2026-09-30: the bucket had no
 * CORS rule, and Safari's "Load failed" reached the screen as it was). The
 * customer reads Hebrew, and can still send the request without the photo.
 */
// The app's service worker would answer requests before page.route sees them.
test.use({ serviceWorkers: "block" });

test("a failed photo upload says so, and the request can go without it", async ({ page, baseURL }) => {
  page.on("dialog", (d) => void d.accept());
  await signInByEmail(page, uniqueEmail("e2e-upload-fail"));
  await finishFirstRun(page);
  await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: 32.0853, lng: 34.7818, details: "הרצל 3" },
    headers: { origin: baseURL! },
  });

  await page.getByRole("textbox", { name: "ספרו מה צריך" }).fill("המזגן לא מקרר");
  await page.getByRole("button", { name: /המשך עם מזגן/ }).click();
  await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();

  // A real JPEG, so the app's own compression accepts it.
  const jpeg = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 8;
    return Array.from(new Uint8Array(await (await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg"))).arrayBuffer()));
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "בחירה מהגלריה" }).click();
  await (await chooser).setFiles({ name: "ac.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpeg) });
  await expect(page.getByRole("button", { name: "הסרת תמונה" })).toBeVisible();

  // Storage refuses: every upload leaves the app's origin and fails there.
  await page.route(
    (url) => !url.href.startsWith(baseURL!),
    (route) => (route.request().method() === "PUT" ? route.abort("failed") : route.continue())
  );
  await page.getByRole("button", { name: "שליחת הקריאה" }).click();
  await expect(page.getByText("לא הצלחנו להעלות את הקובץ שצירפתם. אפשר לנסות שוב, או לשלוח את הקריאה בלעדיו.")).toBeVisible();
  await expect(page.getByText(/load failed|failed to fetch/i)).toHaveCount(0);

  await page.getByRole("button", { name: "שליחת הקריאה בלי הקבצים" }).click();
  await expect(page).toHaveURL(/\/jobs\//);
  await page.getByRole("button", { name: "ביטול הקריאה" }).click();
});
