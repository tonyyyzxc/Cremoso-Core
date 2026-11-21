import express from "express";
import { listActivityLogs } from "../controllers/activityLogsController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";

const router = express.Router();

router.get(
  "/",
  requireAuth,
  requireRole("admin", "branch", "staff"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listActivityLogs,
);

export default router;
