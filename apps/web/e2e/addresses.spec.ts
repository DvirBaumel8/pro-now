import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/*
 * The address screen (Dvir, 2026-10-01): suggestions from two letters, an
 * address only from a real street or the device's location, and one choice
 * at a time — typing a new address and then picking a saved one used to
 * keep whichever the confirm checked first.
 */
const target = (page: import("@playwright/test").Page) =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem("pn.orderTarget") ?? "{}").addressId as string | undefined);

test("a street from the suggestions, then a saved address, each wins in turn", async ({ page, baseURL }) => {
  await signInByEmail(page, uniqueEmail("e2e-addresses"));
  await finishFirstRun(page);
  const home = await page.request.post("/api/v1/me/addresses", {
    data: { kind: "location", lat: 32.056, lng: 34.77, label: "בית" },
    headers: { origin: baseURL! },
  });
  const homeId = (await home.json()).address.id as string;

  await page.goto("/addresses");
  const box = page.getByRole("textbox", { name: "כתובת חדשה" });
  const confirm = page.getByRole("button", { name: /אישור הכתובת|בחרו כתובת מהרשימה/ });

  // Letters that are no street: nothing to pick, nothing to confirm.
  await box.fill("קקקקק");
  await expect(page.getByText("לא מצאנו רחוב כזה")).toBeVisible();
  await expect(page.getByRole("button", { name: "בחרו כתובת מהרשימה" })).toBeDisabled();

  // Two letters are enough to start; the number carries through to the pick.
  await box.fill("הר");
  await expect(page.getByRole("button", { name: /, / }).first()).toBeVisible();
  await box.fill("הרצל 12 תל");
  await page.getByRole("button", { name: "הרצל 12, תל אביב - יפו", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "מספר בית" })).toHaveValue("12");
  await page.getByRole("textbox", { name: "קומה, כניסה ודירה" }).fill("קומה 3");
  await confirm.click();
  await expect(page).toHaveURL(/\/$/);
  const typedId = await target(page);
  expect(typedId).toBeTruthy();
  expect(typedId).not.toBe(homeId);
  const list = (await (await page.request.get("/api/v1/me/addresses")).json()).addresses as Array<{ id: string; formatted: string; geoPrecision: string }>;
  expect(list.find((a) => a.id === typedId)).toMatchObject({ formatted: "הרצל 12, תל אביב - יפו · קומה 3", geoPrecision: "HOUSE" });

  // Back on the screen the new address is the chosen one; picking the saved one switches.
  await page.goto("/addresses");
  await expect(page.getByRole("radio", { checked: true })).toContainText("הרצל 12");
  await page.getByRole("radio", { name: /בית/ }).click();
  await expect(page.getByRole("radio", { checked: true })).toContainText("בית");
  await page.getByRole("button", { name: "אישור הכתובת" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await target(page)).toBe(homeId);

  // And typing after picking a saved one un-picks it: the confirm waits for a street.
  await page.goto("/addresses");
  await page.getByRole("textbox", { name: "כתובת חדשה" }).fill("דיזנ");
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "בחרו כתובת מהרשימה" })).toBeDisabled();
});

test("a street the map does not know is refused, not guessed", async ({ page }) => {
  await signInByEmail(page, uniqueEmail("e2e-addresses-unknown"));
  await finishFirstRun(page);
  await page.goto("/addresses");
  await page.getByRole("textbox", { name: "כתובת חדשה" }).fill("דיזנגוף 50 תל");
  await page.getByRole("button", { name: "דיזנגוף 50, תל אביב - יפו", exact: true }).click();
  await page.getByRole("button", { name: "אישור הכתובת" }).click();
  await expect(page.getByText("המפה עוד לא מכירה את הרחוב הזה")).toBeVisible();
  await expect(page).toHaveURL(/\/addresses$/);
});
