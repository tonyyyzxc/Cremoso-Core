import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  getAuthConfig,
  getPublicIntegrationStatus,
  updateAuthConfig,
  updateSidebarPreference,
} from "../controllers/authConfigController.js";

const router = express.Router();
// Authentication configuration routes expose public status and update settings.

router.get("/public", getPublicIntegrationStatus);
router.get("/", requireAuth, getAuthConfig);
router.patch(
  "/",
  requireAuth,
  requireRole("admin"),
  requireEditLock("AuthConfig", () => "default"),
  updateAuthConfig,
);
router.patch(
  "/sidebar",
  requireAuth,
  requireEditLock("User", (req) => req.user._id.toString()),
  updateSidebarPreference,
);

export default router;
