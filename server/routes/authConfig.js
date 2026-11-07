import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getAuthConfig,
  getPublicIntegrationStatus,
  updateAuthConfig,
  updateSidebarPreference,
} from "../controllers/authConfigController.js";

const router = express.Router();

router.get("/public", getPublicIntegrationStatus);
router.get("/", requireAuth, getAuthConfig);
router.patch("/", requireAuth, requireRole("admin"), updateAuthConfig);
router.patch("/sidebar", requireAuth, updateSidebarPreference);

export default router;
