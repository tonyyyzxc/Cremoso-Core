import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getAuthConfig, updateAuthConfig } from "../controllers/authConfigController.js";

const router = express.Router();

router.get("/", getAuthConfig);
router.patch("/", requireAuth, requireRole("admin"), updateAuthConfig);

export default router;
