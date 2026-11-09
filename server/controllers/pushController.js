import AuthConfig from "../models/authConfig.js";
import PushRegistration from "../models/pushRegistration.js";
import { sendBranchTestNotification } from "../utils/pushNotifications.js";

const browserIdPattern = /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i;

function isValidBrowserId(browserId) {
  return typeof browserId === "string" && browserIdPattern.test(browserId);
}

function validateBranchUser(req, res) {
  if (!["branch", "staff"].includes(req.user.role) || !req.user.branchId) {
    res.status(403).json({ error: "Push alerts are available to branch managers and staff." });
    return false;
  }
  return true;
}

export async function getPushRegistration(req, res) {
  const browserId = req.query.browserId;
  if (!isValidBrowserId(browserId)) {
    return res.status(400).json({ error: "A valid browser registration ID is required." });
  }

  try {
    const registration = await PushRegistration.exists({
      browserId,
      userId: req.user._id,
    });
    return res.json({ registered: Boolean(registration) });
  } catch (error) {
    console.error("Push registration lookup error:", error);
    return res.status(500).json({ error: "Unable to load push alert settings." });
  }
}

export async function createPushRegistration(req, res) {
  if (!validateBranchUser(req, res)) return;
  const { browserId, token } = req.body || {};
  if (!isValidBrowserId(browserId) || typeof token !== "string" || !token.trim() || token.length > 4096) {
    return res.status(400).json({ error: "A valid browser ID and push token are required." });
  }

  try {
    const config = await AuthConfig.findOne({ key: "default" }).select("firebaseMessagingEnabled");
    if (config?.firebaseMessagingEnabled === false) {
      return res.status(403).json({ error: "Firebase Cloud Messaging is disabled." });
    }

    const registration = await PushRegistration.findOneAndUpdate(
      { browserId },
      {
        $set: {
          userId: req.user._id,
          branchId: req.user.branchId,
          token: token.trim(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.status(201).json({ registered: true, id: registration._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "This push token is already registered." });
    }
    console.error("Push registration creation error:", error);
    return res.status(400).json({ error: "Unable to enable push alerts." });
  }
}

export async function deletePushRegistration(req, res) {
  const browserId = req.body?.browserId;
  if (!isValidBrowserId(browserId)) {
    return res.status(400).json({ error: "A valid browser registration ID is required." });
  }

  try {
    const result = await PushRegistration.deleteOne({
      browserId,
      userId: req.user._id,
    });
    return res.json({ registered: false, removed: result.deletedCount > 0 });
  } catch (error) {
    console.error("Push registration removal error:", error);
    return res.status(500).json({ error: "Unable to disable push alerts." });
  }
}

export async function sendPushTest(req, res) {
  if (!validateBranchUser(req, res)) return;

  try {
    const result = await sendBranchTestNotification(req.user.branchId);
    if (!result.enabled) {
      return res.status(403).json({ error: "Firebase Cloud Messaging is disabled." });
    }
    if (!result.registered) {
      return res.status(404).json({ error: "No push-enabled devices are registered for this branch." });
    }
    if (!result.sent) {
      return res.status(502).json({
        error: "Firebase could not deliver the test notification to any registered devices.",
        ...result,
      });
    }
    return res.json({ message: "Test notification sent.", ...result });
  } catch (error) {
    console.error("Push test notification error:", error);
    return res.status(500).json({ error: "Unable to send a test notification." });
  }
}
