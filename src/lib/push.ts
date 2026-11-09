export type PushConfig = {
  apiKey: string;
  projectId: string;
  appId: string;
  vapidKey: string;
  messagingSenderId: string;
};

export type PushStatus =
  | "registered"
  | "not-configured"
  | "unsupported"
  | "open-in-new-tab"
  | "denied"
  | "failed";

/** True when every Firebase web-push value is present. */
export function pushConfigured(c: PushConfig | null | undefined): c is PushConfig {
  return Boolean(c && c.apiKey && c.projectId && c.appId && c.vapidKey && c.messagingSenderId);
}

/** Only this order's own page may be opened by an alert — never an address typed by a browser. */
export function orderAlertPath(path: string) {
  return /^\/pedido\/[A-Za-z0-9_-]{10,200}$/.test(path);
}

/**
 * Asks the browser for notification permission and returns this device's push token.
 * Must be called from a click handler. Firebase loads only here, after hydration.
 */
export async function enablePush(config: PushConfig | null): Promise<{ status: PushStatus; token?: string }> {
  if (!pushConfigured(config)) return { status: "not-configured" };
  if (typeof window === "undefined" || !("Notification" in window)) return { status: "unsupported" };

  let supported = false;
  try {
    supported = await (await import("firebase/messaging")).isSupported();
  } catch {
    supported = false;
  }
  if (!supported) return { status: "unsupported" };

  // The preview runs inside a cross-origin iframe, where the permission prompt is rejected silently.
  if (window.top !== window.self) return { status: "open-in-new-tab" };

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  try {
    const { apiKey, projectId, appId, messagingSenderId, vapidKey } = config;
    const [{ getApp, getApps, initializeApp }, { getMessaging, getToken }] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    const app = getApps().length ? getApp() : initializeApp({ apiKey, projectId, appId, messagingSenderId });
    const query = new URLSearchParams({ apiKey, projectId, appId, messagingSenderId }).toString();
    const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
    const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registration });
    return token ? { status: "registered", token } : { status: "denied" };
  } catch (error) {
    console.error("Push registration failed", error);
    return { status: "failed" };
  }
}
