import express from "express";
import { listActivityLogs } from "../controllers/activityLogsController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";

// Define authenticated activity-log API endpoints.
const router = express.Router();

// GET /api/activity-logs lists activity records allowed for the signed-in role.
router.get(
  "/",
  requireAuth,
  requireRole("admin", "branch", "staff"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listActivityLogs,
);

export default router;
