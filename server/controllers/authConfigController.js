import AuthConfig from "../models/authConfig.js";
import User from "../models/user.js";

async function getConfig() {
  return AuthConfig.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
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
      showSidebarIcons: req.user.showSidebarIcons !== false,
      accountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings load error:", error);
    return res.status(500).json({ error: "Unable to load authentication settings." });
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
  if (typeof req.body.staffGoogleAuthEnabled !== "boolean") {
    return res.status(400).json({ error: "A valid Google sign-in setting is required." });
  }
  try {
    if (req.body.staffGoogleAuthEnabled === false) {
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
    config.staffGoogleAuthEnabled = req.body.staffGoogleAuthEnabled;
    await config.save();
    const accountsWithoutPassword = await User.countDocuments({
      $or: [{ passwordHash: null }, { passwordHash: "" }],
    });
    return res.json({
      staffGoogleAuthEnabled: config.staffGoogleAuthEnabled,
      accountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings update error:", error);
    return res.status(400).json({ error: "Unable to save authentication settings." });
  }
}
