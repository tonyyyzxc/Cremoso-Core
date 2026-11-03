import express from "express";
import { listActivityLogs } from "../controllers/activityLogsController.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin", "branch", "staff"), listActivityLogs);

export default router;
