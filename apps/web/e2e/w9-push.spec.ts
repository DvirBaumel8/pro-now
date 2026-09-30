import { expect, test } from "./fixtures";
import { finishFirstRun, signInByEmail, uniqueEmail } from "./helpers";

/**
 * W9 acceptance (docs/21): a push subscription, and a received message.
 * Chromium only: it is where the service worker can be handed a push
 * through the DevTools protocol. A real iPhone is Phase 2 (installed PWA).
 */
// Full Chromium in new headless mode: the default headless shell denies notifications.
test.use({ channel: "chromium" });

test("turning on phone notifications, and a push shows our notification", async ({ page, context, baseURL }) => {
  await context.grantPermissions(["notifications"], { origin: baseURL! });
  await signInByEmail(page, uniqueEmail("e2e-push"));
  await finishFirstRun(page);
  await page.goto("/inbox");
  await expect(page.getByText("עוד אין התראות", { exact: false })).toBeVisible();

  // The service worker must be in control before subscribing.
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  /*
   * The browser's push service (Google's, for Chromium) is outside this
   * test: only pushManager.subscribe is replaced, by a subscription with
   * a real-looking key. Our screen, our API call and the server's storage
   * are all real.
   */
  await page.evaluate(() => {
    const fake = {
      endpoint: `https://push.example/e2e-${Date.now()}`,
      toJSON: () => ({ endpoint: fake.endpoint, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } }),
    };
    let current: typeof fake | null = null;
    PushManager.prototype.subscribe = async () => (current = fake) as unknown as PushSubscription;
    PushManager.prototype.getSubscription = async () => current as unknown as PushSubscription;
  });
  await page.getByRole("button", { name: "הפעלת התראות לטלפון" }).click();
  await expect(page.getByText("התראות לטלפון פעילות ✓")).toBeVisible({ timeout: 15_000 });

  // The subscription reached the server: a second one for the same browser is an update, not an error.
  const endpoint = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).pushManager.getSubscription())?.endpoint);
  expect(endpoint).toMatch(/^https:\/\/push\.example\/e2e-/);
  const again = await page.request.post("/api/v1/me/push-subscriptions", {
    data: { endpoint, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(again.status()).toBe(201);

  // A push, delivered to our worker: it shows our title and line.
  const cdp = await context.newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  const registrationId = await new Promise<string>((resolve) => {
    cdp.on("ServiceWorker.workerRegistrationUpdated", (e: { registrations: Array<{ registrationId: string; scopeURL: string }> }) => {
      const r = e.registrations.find((x) => x.scopeURL.startsWith(new URL(page.url()).origin));
      if (r) resolve(r.registrationId);
    });
  });
  await cdp.send("ServiceWorker.deliverPushMessage", {
    origin: new URL(page.url()).origin,
    registrationId,
    data: JSON.stringify({ title: "דנה הגיעה", body: "נזילה/פיצוץ בצנרת", data: { url: "/inbox" } }),
  });
  await expect
    .poll(async () => page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => `${n.title} | ${n.body}`)))
    .toContain("דנה הגיעה | נזילה/פיצוץ בצנרת");
});
