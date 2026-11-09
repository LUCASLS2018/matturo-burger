import { createServerFn } from "@tanstack/react-start";

// Public Firebase web-push values (not secrets) handed to the browser at runtime.
export const getPushConfig = createServerFn({ method: "GET" }).handler(async () => {
  const appId = process.env["FIREBASE_MESSAGING_APP_ID"] ?? "";
  return {
    apiKey: process.env["FIREBASE_MESSAGING_WEB_API_KEY"] ?? "",
    projectId: process.env["FIREBASE_MESSAGING_PROJECT_ID"] ?? "",
    appId,
    vapidKey: process.env["FIREBASE_MESSAGING_VAPID_KEY"] ?? "",
    messagingSenderId: appId.split(":")[1] ?? "",
  };
});
