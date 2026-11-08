/* global importScripts, firebase */

importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js");

const workerUrl = new URL(self.location.href);
const firebaseConfig = JSON.parse(workerUrl.searchParams.get("firebaseConfig") || "{}");

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requestedUrl = event.notification.data?.url || "/";
  const destination = new URL(requestedUrl, self.location.origin);
  const targetUrl = destination.origin === self.location.origin
    ? destination.href
    : self.location.origin;

  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = clients.find((entry) => new URL(entry.url).origin === self.location.origin);
    if (client) {
      await client.navigate(targetUrl);
      return client.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "Cremoso-Core";
  const options = {
    body: payload.notification?.body || payload.data?.body || "",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});
