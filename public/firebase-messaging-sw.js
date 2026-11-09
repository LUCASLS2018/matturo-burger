// Firebase Cloud Messaging worker. This is a messaging worker, not an app-shell cache:
// it only receives background notifications and decides where a click opens.
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// A service worker cannot read the app's build-time configuration, so the registration
// passes the same Firebase config through the query string.
firebase.initializeApp(Object.fromEntries(new URL(self.location).searchParams));
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Matturo Burger";
  const body = payload.notification?.body || "O seu pedido teve uma novidade.";
  const path = payload.data?.path || "/";
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "matturo-order",
    data: { path },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = String(event.notification.data?.path || "/");
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.navigate(path);
            return client.focus();
          }
        }
        return self.clients.openWindow(path);
      }),
  );
});
