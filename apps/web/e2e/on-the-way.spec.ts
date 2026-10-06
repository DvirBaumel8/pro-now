import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";
import { dispatchableProfessional } from "./pro-helpers";

/**
 * On the way, in the street (the demo's ASSIGNED_ROUTE): after "כן, מתאים
 * לי" the screen stays the street, their van drives to you, a live card
 * counts down to the server's ETA, and an invite offers a walk ("נקרא לכם
 * כש… מתקרב": the server's PRO_NEARBY, #120). The job's details open the
 * tracking card and come back. The product used to switch to the tracking
 * card at once.
 */
const LAT = 32.06;
const LNG = 34.775;

test("on the way: the street with the live card and the walk invite; the job's details open and close", async ({ page, baseURL }) => {
  test.setTimeout(150_000);
  await signInByEmail(page, uniqueEmail("e2e-on-the-way"));
  await finishFirstRun(page);
  const address = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: LAT, lng: LNG, details: "שינקין 20" },
    headers: { origin: baseURL! },
  });
  expect(address.ok(), await address.text()).toBe(true);
  const pro = await dispatchableProfessional({ serviceCode: "HOME_PLUMB_LEAK", lat: LAT, lng: LNG, baseURL: baseURL! });

  try {
    await page.getByRole("textbox", { name: "ספרו מה צריך" }).fill("נזילה במטבח");
    await page.getByRole("button", { name: /המשך עם נזילה/ }).click();
    await page.getByRole("button", { name: /^בקשת .* עכשיו$/ }).click();
    await page.getByRole("button", { name: "שליחת הקריאה" }).click();
    await expect(page).toHaveURL(/\/jobs\//);
    const jobId = new URL(page.url()).pathname.split("/").pop()!;
    await pro.acceptOfferFor(jobId);
    await page.getByRole("button", { name: "כן, מתאים לי" }).click({ timeout: 20_000 });
    await pro.step(jobId, "en-route");

    // The street stays, with the live card and the invite.
    await expect(page.getByTestId("job-world")).toBeAttached();
    await expect(page.getByText(/^.+ (בדרך אליך|מתקרב|מתקרבת|כמעט אצלך)$/).first()).toBeVisible({ timeout: 15_000 });
    const invite = page.getByRole("button", { name: /^כניסה לעיר שלנו — לטייל בזמן ש.+ בדרך\. נקרא לכם כש(הוא מתקרב|היא מתקרבת)\.$/ });
    await expect(invite).toBeVisible();
    // No button that does nothing: there is no real map to follow them on.
    await expect(page.getByRole("button", { name: /^לעקוב אחרי/ })).toHaveCount(0);

    // The job's details: the tracking card, and back to the street.
    await page.getByRole("button", { name: "פרטי העבודה", exact: true }).click();
    await expect(page.getByRole("progressbar", { name: /^שלב 1 מתוך 4/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "חזרה" }).first().click();
    await expect(invite).toBeVisible({ timeout: 10_000 });
  } finally {
    await pro.dispose();
  }
});
