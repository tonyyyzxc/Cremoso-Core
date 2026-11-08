import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { apiRequest } from "./utils/api.js";

const FIREBASE_APP_NAME = "cremoso-cloud-messaging";
const PUSH_BROWSER_ID_KEY = "cremoso.push.browserId";
let messagingInstance;
let foregroundListenerRegistered = false;

async function getMessagingSettings() {
  const settings = await apiRequest("/api/auth-settings/public");
  if (!settings.firebaseMessagingEnabled || !settings.firebaseMessaging) {
    throw new Error("Firebase Cloud Messaging is disabled or not configured.");
  }

  const firebaseConfig = settings.firebaseMessaging;
  const vapidKey = firebaseConfig.vapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) throw new Error("The Firebase VAPID public key is not configured.");

  return { firebaseConfig, vapidKey };
}

async function getMessagingClient(firebaseConfig) {
  if (!(await isSupported())) {
    throw new Error("This browser does not support Firebase Cloud Messaging.");
  }

  const existingApp = getApps().find((app) => app.name === FIREBASE_APP_NAME);
  const app = existingApp
    ? getApp(FIREBASE_APP_NAME)
    : initializeApp(firebaseConfig, FIREBASE_APP_NAME);
  messagingInstance ||= getMessaging(app);

  if (!foregroundListenerRegistered) {
    onMessage(messagingInstance, (payload) => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      const title = payload.notification?.title || payload.data?.title || "Cremoso-Core";
      const options = {
        body: payload.notification?.body || payload.data?.body || "",
        data: payload.data || {},
      };
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, options))
        .catch((error) => console.error("Foreground push notification display failed:", error));
    });
    foregroundListenerRegistered = true;
  }

  return messagingInstance;
}

function waitForServiceWorkerActivation(registration) {
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) return Promise.reject(new Error("The Firebase service worker did not start."));

  return new Promise((resolve, reject) => {
    const handleStateChange = () => {
      if (worker.state === "installed" || worker.state === "waiting") {
        worker.postMessage({ type: "SKIP_WAITING" });
      }
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", handleStateChange);
        resolve(registration);
      } else if (worker.state === "redundant") {
        worker.removeEventListener("statechange", handleStateChange);
        reject(new Error("The Firebase service worker could not be activated."));
      }
    };

    worker.addEventListener("statechange", handleStateChange);
    handleStateChange();
  });
}

export async function requestPushToken() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    throw new Error("Notifications are not supported in this browser.");
  }

  const { firebaseConfig, vapidKey } = await getMessagingSettings();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const messaging = await getMessagingClient(firebaseConfig);
  const serviceWorkerUrl = new URL("/firebase-messaging-sw.js", window.location.origin);
  const serviceWorkerConfig = Object.fromEntries(
    Object.entries(firebaseConfig).filter(([key]) => key !== "vapidKey"),
  );
  serviceWorkerUrl.searchParams.set("firebaseConfig", JSON.stringify(serviceWorkerConfig));
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl.toString());
  const serviceWorkerRegistration = await waitForServiceWorkerActivation(registration);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration });
  return token || null;
}

export function getPushBrowserId() {
  const existingId = localStorage.getItem(PUSH_BROWSER_ID_KEY);
  if (existingId) return existingId;

  const browserId = globalThis.crypto?.randomUUID?.();
  if (!browserId) throw new Error("This browser cannot create a push registration ID.");
  localStorage.setItem(PUSH_BROWSER_ID_KEY, browserId);
  return browserId;
}

export async function getPushRegistrationStatus() {
  const browserId = getPushBrowserId();
  return apiRequest(`/api/push/registration?browserId=${encodeURIComponent(browserId)}`);
}

export async function initializePushMessaging() {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return false;
  }

  const settings = await apiRequest("/api/auth-settings/public");
  if (!settings.firebaseMessagingEnabled || !settings.firebaseMessaging) return false;
  await getMessagingClient(settings.firebaseMessaging);
  return true;
}

export async function enablePushNotifications() {
  const token = await requestPushToken();
  if (!token) return false;

  await apiRequest("/api/push/registration", {
    method: "POST",
    body: JSON.stringify({ browserId: getPushBrowserId(), token }),
  });
  return true;
}

export async function disablePushNotifications() {
  const result = await apiRequest("/api/push/registration", {
    method: "DELETE",
    body: JSON.stringify({ browserId: getPushBrowserId() }),
  });
  if (!result.removed) return { tokenRemoved: true };

  try {
    const { firebaseConfig } = await getMessagingSettings();
    const messaging = await getMessagingClient(firebaseConfig);
    return { tokenRemoved: await deleteToken(messaging) };
  } catch (error) {
    console.error("Firebase push token removal failed:", error);
    return { tokenRemoved: false };
  }
}
