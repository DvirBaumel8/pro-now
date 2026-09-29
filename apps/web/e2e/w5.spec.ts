import { expect, test } from "@playwright/test";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/**
 * W5 (docs/21): what the home screen makes of a typed sentence, by how
 * sure it is, and the feedback it sends when the customer chooses.
 */
test.beforeEach(async ({ page }) => {
  await signInByEmail(page, uniqueEmail("e2e-w5"));
  await finishFirstRun(page);
});

const box = (page: import("@playwright/test").Page) => page.getByRole("textbox", { name: "ספרו מה צריך" });

test("one clear answer: one suggestion, nothing beside it", async ({ page }) => {
  await box(page).fill("המזגן לא מקרר");
  await expect(page.getByText("נראה שזה:")).toBeVisible();
  await expect(page.getByRole("button", { name: /המשך עם מזגן/ })).toBeVisible();
  await expect(page.getByText("או אולי התכוונתם ל:")).toHaveCount(0);
});

test("a word with two meanings: a question, and both answers with equal weight", async ({ page }) => {
  await box(page).fill("יש לי עכבר");
  await expect(page.getByText("עכבר של מחשב, או עכבר בבית?")).toBeVisible();
  await expect(page.getByRole("button", { name: "המשך עם טכנאי מחשבים" })).toBeVisible();
  await expect(page.getByRole("button", { name: "המשך עם הדברה" })).toBeVisible();
  await expect(page.getByText("נראה שזה:")).toHaveCount(0);
});

test("'I don't need an electrician' does not offer one", async ({ page }) => {
  await box(page).fill("לא צריך חשמלאי, צריך אינסטלטור");
  await expect(page.getByRole("button", { name: /המשך עם פתיחת סתימה|המשך עם נזילה/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /הפסקת חשמל/ })).toHaveCount(0);
});

test("choosing after typing sends what was suggested and what was chosen", async ({ page }) => {
  const feedback = page.waitForRequest((r) => r.url().endsWith("/api/v1/match/feedback") && r.method() === "POST");
  await box(page).fill("יש לי עכבר");
  await page.getByRole("button", { name: "המשך עם הדברה" }).click();
  const sent = (await feedback).postDataJSON();
  expect(sent).toEqual({
    text: "יש לי עכבר",
    suggestedServiceIds: ["svc-computer", "svc-pest"],
    chosenServiceId: "svc-pest",
    confidence: "low",
  });
  expect((await (await feedback).response())?.status()).toBe(204);
});
