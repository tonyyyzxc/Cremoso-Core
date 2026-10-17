import express from "express";
import AuthConfig from "../models/authConfig.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

async function getConfig() {
  return AuthConfig.findOneAndUpdate(
    { key: "default" },
    { $setOnInsert: { key: "default" } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

router.get("/", async (_req, res) => {
  try {
    const config = await getConfig();
    return res.json({ staffGoogleAuthEnabled: config.staffGoogleAuthEnabled });
  } catch (error) {
    console.error("Auth settings load error:", error);
    return res.status(500).json({ error: "Unable to load authentication settings." });
  }
});

router.patch("/", requireAuth, requireRole("admin"), async (req, res) => {
  if (typeof req.body.staffGoogleAuthEnabled !== "boolean") {
    return res.status(400).json({ error: "A valid Google sign-in setting is required." });
  }

  try {
    const config = await getConfig();
    config.staffGoogleAuthEnabled = req.body.staffGoogleAuthEnabled;
    await config.save();
    return res.json({ staffGoogleAuthEnabled: config.staffGoogleAuthEnabled });
  } catch (error) {
    console.error("Auth settings update error:", error);
    return res.status(400).json({ error: "Unable to save authentication settings." });
  }
});

export default router;
