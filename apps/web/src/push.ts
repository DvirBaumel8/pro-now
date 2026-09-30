import { api } from "./api";

/**
 * Turning on the phone's notifications (docs/21 W9). Web Push needs a
 * service worker, the browser's permission, and — on iPhone — the app
 * installed on the home screen (iOS 16.4+). Each of those is reported
 * plainly rather than failing silently.
 */
export type PushState = "unsupported" | "needs-install" | "off" | "denied" | "on" | "failed";

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

export async function pushState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return isIos() && !standalone() ? "needs-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

function keyBytes(base64url: string): ArrayBuffer {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0)).buffer as ArrayBuffer;
}

/** Asks, subscribes, and tells the server. Resolves to the resulting state. */
export async function enablePush(): Promise<PushState> {
  const { publicKey } = await api.pushPublicKey();
  if (!publicKey) return "unsupported";
  if ((await Notification.requestPermission()) !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await api.savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
  return "on";
}
