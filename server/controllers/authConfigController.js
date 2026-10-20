import AuthConfig from "../models/authConfig.js";
import User from "../models/user.js";

async function getConfig() {
  return AuthConfig.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function getAuthConfig(_req, res) {
  try {
    const config = await getConfig();
    const staffAccountsWithoutPassword = await User.countDocuments({
      role: "staff",
      $or: [{ passwordHash: null }, { passwordHash: "" }],
    });
    return res.json({
      staffGoogleAuthEnabled:
        config.staffGoogleAuthEnabled || staffAccountsWithoutPassword > 0,
      staffAccountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings load error:", error);
    return res.status(500).json({ error: "Unable to load authentication settings." });
  }
}

export async function updateAuthConfig(req, res) {
  if (typeof req.body.staffGoogleAuthEnabled !== "boolean") {
    return res.status(400).json({ error: "A valid Google sign-in setting is required." });
  }
  try {
    if (req.body.staffGoogleAuthEnabled === false) {
      const staffAccountsWithoutPassword = await User.countDocuments({
        role: "staff",
        $or: [{ passwordHash: null }, { passwordHash: "" }],
      });
      if (staffAccountsWithoutPassword > 0) {
        return res.status(400).json({
          error: "Set a password for every staff account before disabling Google sign-in.",
        });
      }
    }
    const config = await getConfig();
    config.staffGoogleAuthEnabled = req.body.staffGoogleAuthEnabled;
    await config.save();
    const staffAccountsWithoutPassword = await User.countDocuments({
      role: "staff",
      $or: [{ passwordHash: null }, { passwordHash: "" }],
    });
    return res.json({
      staffGoogleAuthEnabled: config.staffGoogleAuthEnabled,
      staffAccountsWithoutPassword,
    });
  } catch (error) {
    console.error("Auth settings update error:", error);
    return res.status(400).json({ error: "Unable to save authentication settings." });
  }
}
