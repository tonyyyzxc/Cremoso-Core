import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import AuthConfig from "../models/authConfig.js";
import MenuItem from "../models/menuItem.js";
import PushRegistration from "../models/pushRegistration.js";
import Supply from "../models/supply.js";
import User from "../models/user.js";

const APP_NAME = "cremoso-push";

function getAdminMessaging() {
  const existingApp = getApps().find((app) => app.name === APP_NAME);
  if (existingApp) return getMessaging(existingApp);

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }

  const app = initializeApp(
    {
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    },
    APP_NAME,
  );
  return getMessaging(app);
}

async function isPushEnabled() {
  const config = await AuthConfig.findOne({ key: "default" }).select("firebaseMessagingEnabled");
  return config?.firebaseMessagingEnabled !== false;
}

async function sendToUsers(userIds, { title, body, url }) {
  if (!userIds.length || !(await isPushEnabled())) return;

  const registrations = await PushRegistration.find({ userId: { $in: userIds } })
    .select("_id token");
  if (!registrations.length) return;

  const messaging = getAdminMessaging();
  for (let offset = 0; offset < registrations.length; offset += 500) {
    const batch = registrations.slice(offset, offset + 500);
    const result = await messaging.sendEachForMulticast({
      tokens: batch.map((registration) => registration.token),
      notification: { title, body },
      data: { title, body, url },
    });
    const invalidRegistrationIds = [];
    result.responses.forEach((response, index) => {
      if (response.success) return;
      if (
        response.error?.code === "messaging/registration-token-not-registered" ||
        response.error?.code === "messaging/invalid-registration-token"
      ) {
        invalidRegistrationIds.push(batch[index]._id);
      } else {
        console.error("Push delivery failed:", {
          code: response.error?.code,
          message: response.error?.message,
        });
      }
    });
    if (invalidRegistrationIds.length) {
      await PushRegistration.deleteMany({ _id: { $in: invalidRegistrationIds } });
    }
  }
}

export async function notifyNewOrder(order) {
  try {
    const branchId = order.branchId?._id || order.branchId;
    const users = await User.find({
      branchId,
      role: { $in: ["branch", "staff"] },
      status: "active",
    }).select("_id");
    await sendToUsers(users.map((user) => user._id), {
      title: "New order",
      body: `Order ${order.orderNumber} was placed.`,
      url: "/order-queue",
    });
  } catch (error) {
    console.error("New order push notification error:", error);
  }
}

export async function notifyLowStockTransition({
  branchId,
  stockType,
  stockId,
  previousQuantity,
  quantity,
}) {
  try {
    const isMenuItem = stockType === "menuItem";
    const stockItem = isMenuItem
      ? await MenuItem.findOne({ _id: stockId, branchId }).select("name itemType lowStockThreshold")
      : await Supply.findById(stockId).select("name unit lowStockThreshold");
    if (!stockItem) return;

    const threshold = stockItem.lowStockThreshold ?? 0;
    if (previousQuantity <= threshold || quantity > threshold) return;

    const managers = await User.find({
      branchId,
      role: "branch",
      status: "active",
    }).select("_id");
    const name = stockItem.name;
    const unitLabel = isMenuItem
      ? stockItem.itemType === "addon" ? "portions" : "items"
      : stockItem.unit;
    await sendToUsers(managers.map((manager) => manager._id), {
      title: "Low stock alert",
      body: `${name} is at ${quantity} ${unitLabel} (threshold: ${threshold}).`,
      url: "/menu?tab=inventory",
    });
  } catch (error) {
    console.error("Low stock push notification error:", error);
  }
}
