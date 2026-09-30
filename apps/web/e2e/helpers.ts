import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

export const uniqueEmail = (tag: string) =>
  `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@pronow.test`;

/** The sign-in link Mailpit caught for this address. */
export async function linkFor(email: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const found = (await (
      await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)
    ).json()) as { messages: Array<{ ID: string }> };
    const id = found.messages[0]?.ID;
    if (id) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json()) as { Text: string };
      const link = msg.Text.match(/https?:\/\/\S+/)?.[0];
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`No sign-in email reached ${email} (is Mailpit running?)`);
}

/** From the welcome screen to an opened email link, the way a person does it. */
export async function signInByEmail(page: Page, email: string) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByRole("button", { name: /אני צריך מקצוען/ }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByPlaceholder("name@example.com").fill(email);
  await page.getByRole("button", { name: "שליחת קישור" }).click();
  await expect(page.getByText("בדקו את המייל")).toBeVisible();
  await page.goto(await linkFor(email));
}

/** The intro's five slides, then skip the character: the fastest way home. */
export async function finishFirstRun(page: Page) {
  await expect(page).toHaveURL(/\/intro$/);
  for (let i = 0; i < 4; i++) await page.getByText("הבא", { exact: true }).click();
  await page.getByText("בואו נתחיל").click();
  await expect(page).toHaveURL(/\/avatar$/);
  await page.getByText("דלג כרגע").click();
  await expect(page).toHaveURL(/\/$/);
}

/** A fresh sign-in link for an existing address, opened in this page (links are single-use). */
export async function signInExisting(page: Page, email: string, baseURL: string) {
  const asked = await page.request.post("/api/auth/sign-in/magic-link", {
    data: { email, callbackURL: "/" },
    headers: { origin: baseURL },
  });
  expect(asked.ok(), await asked.text()).toBe(true);
  await page.goto(await linkFor(email));
}
