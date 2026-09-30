/*
 * Web Push in the service worker (docs/21 W9). Imported into the generated
 * worker (vite.config.ts, workbox.importScripts).
 *
 * A push is a wake-up, never the truth: it shows the title and the line,
 * and a tap opens the screen that re-reads the server.
 */
self.addEventListener("push", (event) => {
  let payload = { title: "PRO NOW", body: "", data: {} };
  try {
    payload = { ...payload, ...(event.data ? event.data.json() : {}) };
  } catch {
    // A payload we cannot read still wakes the person with our name.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data,
      dir: "rtl",
      lang: "he",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: (payload.data && payload.data.url) || undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if ("focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
