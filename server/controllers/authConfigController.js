import AuthConfig from "../models/authConfig.js";
import User from "../models/user.js";
import { logActivity, updateActivityLoggingCache } from "../utils/activityLog.js";
import { getIntegrationCredentials } from "../utils/integrationCredentials.js";

async function getConfig() {
  return AuthConfig.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  );
}

export async function getAuthConfig(req, res) {
  try {
    const config = await getConfig();
    const accountsWithoutPassword = await User.countDocuments({
      $or: [{ passwordHash: null }, { passwordHash: "" }],
    });
    return res.json({
      staffGoogleAuthEnabled:
        config.staffGoogleAuthEnabled || accountsWithoutPassword > 0,
      recaptchaEnabled: config.recaptchaEnabled !== false,
      gmailEnabled: config.gmailEnabled !== false,
      pdfEnabled: config.pdfEnabled !== false,
      googleSheetsEnabled: config.googleSheetsEnabled !== false,
      googleCalendarEnabled: config.googleCalendarEnabled !== false,
      googleDriveEnabled: config.googleDriveEnabled !== false,
      firebaseMessagingEnabled: config.firebaseMessagingEnabled !== false,
      activityLoggingEnabled: config.activityLoggingEnabled !== false,
      showSidebarIcons: req.user.showSidebarIcons !== false,
      accountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings load error:", error);
    return res.status(500).json({ error: "Unable to load authentication settings." });
  }
}

export async function getPublicIntegrationStatus(req, res) {
  try {
    const config = await AuthConfig.findOne({ key: "default" });
    const [googleCredentials, recaptchaCredentials, firebaseMessagingCredentials] = await Promise.all([
      getIntegrationCredentials("googleAuth"),
      getIntegrationCredentials("recaptcha"),
      getIntegrationCredentials("firebaseMessaging"),
    ]);
    return res.json({
      staffGoogleAuthEnabled: config?.staffGoogleAuthEnabled !== false,
      recaptchaEnabled: config?.recaptchaEnabled !== false,
      gmailEnabled: config?.gmailEnabled !== false,
      googleClientId: googleCredentials.clientId,
      recaptchaSiteKey: recaptchaCredentials.siteKey,
      firebaseMessagingEnabled: config?.firebaseMessagingEnabled !== false,
      firebaseMessaging: config?.firebaseMessagingEnabled !== false
        ? firebaseMessagingCredentials
        : null,
    });
  } catch (error) {
    console.error("Public integration status load error:", error);
    return res.status(500).json({ error: "Unable to load integration status." });
  }
}

export async function updateSidebarPreference(req, res) {
  if (typeof req.body.showSidebarIcons !== "boolean") {
    return res.status(400).json({ error: "A valid sidebar setting is required." });
  }
  try {
    req.user.showSidebarIcons = req.body.showSidebarIcons;
    await req.user.save();
    return res.json({ showSidebarIcons: req.user.showSidebarIcons });
  } catch (error) {
    console.error("Sidebar preference update error:", error);
    return res.status(400).json({ error: "Unable to save the sidebar preference." });
  }
}

export async function updateAuthConfig(req, res) {
  const integrationSettings = [
    "staffGoogleAuthEnabled",
    "recaptchaEnabled",
    "gmailEnabled",
    "pdfEnabled",
    "googleSheetsEnabled",
    "googleCalendarEnabled",
    "googleDriveEnabled",
    "firebaseMessagingEnabled",
  ];
  const updates = integrationSettings.filter((setting) => Object.hasOwn(req.body, setting));
  const updatesGoogleAuth = updates.includes("staffGoogleAuthEnabled");
  const updatesActivityLogging = Object.hasOwn(req.body, "activityLoggingEnabled");
  if (
    (!updates.length && !updatesActivityLogging) ||
    updates.some((setting) => typeof req.body[setting] !== "boolean") ||
    (updatesActivityLogging && typeof req.body.activityLoggingEnabled !== "boolean")
  ) {
    return res.status(400).json({ error: "Provide valid integration or activity logging settings." });
  }
  try {
    if (updatesGoogleAuth && req.body.staffGoogleAuthEnabled === false) {
      const accountsWithoutPassword = await User.countDocuments({
        $or: [{ passwordHash: null }, { passwordHash: "" }],
      });
      if (accountsWithoutPassword > 0) {
        return res.status(400).json({
          error: "Set a password for every account before disabling Google sign-in.",
        });
      }
    }
    const config = await getConfig();
    updates.forEach((setting) => { config[setting] = req.body[setting]; });
    if (updatesActivityLogging) {
      config.activityLoggingEnabled = req.body.activityLoggingEnabled;
    }
    await config.save();
    if (updatesActivityLogging) {
      updateActivityLoggingCache(config.activityLoggingEnabled);
      await logActivity(req, {
        action: "config.activity_logging.updated",
        category: "config",
        summary: config.activityLoggingEnabled
          ? "Activity logging was enabled."
          : "Activity logging was disabled.",
        details: { activityLoggingEnabled: config.activityLoggingEnabled },
        force: true,
      });
    }
    const accountsWithoutPassword = await User.countDocuments({
      $or: [{ passwordHash: null }, { passwordHash: "" }],
    });
    return res.json({
      staffGoogleAuthEnabled:
        config.staffGoogleAuthEnabled || accountsWithoutPassword > 0,
      recaptchaEnabled: config.recaptchaEnabled !== false,
      gmailEnabled: config.gmailEnabled !== false,
      pdfEnabled: config.pdfEnabled !== false,
      googleSheetsEnabled: config.googleSheetsEnabled !== false,
      googleCalendarEnabled: config.googleCalendarEnabled !== false,
      googleDriveEnabled: config.googleDriveEnabled !== false,
      firebaseMessagingEnabled: config.firebaseMessagingEnabled !== false,
      activityLoggingEnabled: config.activityLoggingEnabled !== false,
      accountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings update error:", error);
    return res.status(400).json({ error: "Unable to save authentication settings." });
  }
}
