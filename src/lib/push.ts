import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const apiKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY ?? "";
const projectId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID ?? "";
const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID ?? "";
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY ?? "";
// The web app id carries the sender id as its second segment: 1:<senderId>:web:<hash>.
const messagingSenderId = appId.split(":")[1] ?? "";

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "failed";

/** True when the Firebase web-push credentials are present in the app. */
export function pushConfigured() {
  return Boolean(apiKey && projectId && appId && vapidKey && messagingSenderId);
}

/** Only this order's own page may be opened by an alert — never an address typed by a browser. */
export function orderAlertPath(path: string) {
  return /^\/pedido\/[A-Za-z0-9_-]{10,200}$/.test(path);
}

/**
 * Asks the browser for notification permission and returns this device's push token.
 * Must be called from a click handler: browsers ignore permission requests without a user gesture.
 * Firebase is loaded only here, after hydration, so server rendering never touches it.
 */
export async function enablePush(): Promise<{ status: PushStatus; token?: string }> {
  if (!pushConfigured()) return { status: "not-configured" };
  if (typeof window === "undefined" || !("Notification" in window)) return { status: "unsupported" };
  try {
    if (!(await isSupported())) return { status: "unsupported" };
  } catch {
    return { status: "unsupported" };
  }
  // The Lovable preview runs inside a cross-origin iframe, where browsers reject the
  // permission prompt without ever showing it.
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  try {
    const app = getApps().length ? getApp() : initializeApp({ apiKey, projectId, appId, messagingSenderId });
    const query = new URLSearchParams({ apiKey, projectId, appId, messagingSenderId }).toString();
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    return token ? { status: "registered", token } : { status: "denied" };
  } catch {
    return { status: "failed" };
  }
}
