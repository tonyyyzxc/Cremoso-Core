import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  getStaffBranch, updateStaffBranch, updateStaffProfile, listStaffWorkers, createStaffWorker, deleteStaffWorker,
} from "../controllers/staffController.js";

const router = express.Router();
// Staff routes return branch details and manage worker profiles.

router.get(
  "/branch",
  requireAuth,
  requireRole("branch"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  getStaffBranch,
);
router.patch(
  "/branch",
  requireAuth,
  requireRole("branch"),
  requireEditLock("Branch", (req) => req.user.branchId?.toString() || ""),
  updateStaffBranch,
);
router.patch(
  "/profile",
  requireAuth,
  requireRole("branch"),
  requireEditLock("User", (req) => req.user._id.toString()),
  updateStaffProfile,
);
router.get(
  "/workers",
  requireAuth,
  requireRole("branch"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listStaffWorkers,
);
router.post("/workers", requireAuth, requireRole("branch"), createStaffWorker);
router.delete(
  "/workers/:id",
  requireAuth,
  requireRole("branch"),
  requireEditLock("Worker", (req) => req.params.id),
  deleteStaffWorker,
);

export default router;
