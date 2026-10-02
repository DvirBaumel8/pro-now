/**
 * PICKING UP A NEW VERSION.
 *
 * The service worker updates itself in the background (vite-plugin-pwa
 * `autoUpdate`) and takes over open pages, but the page keeps running the
 * old code until it is reloaded — so the first open after a deploy showed
 * yesterday's app, and a fix looked missing (Dvir, 2026-09-30).
 *
 * The page now reloads itself when a new version takes over, at a moment
 * that cannot cost anybody their work: straight away while the app has only
 * just been opened, otherwise the next time it comes back to the front.
 */

/** Opened this recently, nobody has started anything yet. */
export const FRESH_OPEN_MS = 20_000;

export function reloadNow(openedAtMs: number, nowMs: number, hidden: boolean): boolean {
  return hidden || nowMs - openedAtMs < FRESH_OPEN_MS;
}

export function watchForNewVersion(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // The very first install also takes control; that is not an update.
  const hadController = Boolean(sw.controller);
  const openedAt = Date.now();
  let pending = false;

  const reload = () => window.location.reload();

  sw.addEventListener("controllerchange", () => {
    if (!hadController || pending) return;
    if (reloadNow(openedAt, Date.now(), document.visibilityState === "hidden")) reload();
    else pending = true;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    if (pending) {
      reload();
      return;
    }
    // A home-screen app on iOS resumes without navigating, so nothing asks
    // for the new worker; ask on the way back to the front.
    void sw.getRegistration().then((reg) => reg?.update()).catch(() => undefined);
  });
}
