import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import User from "../models/user.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  createBranchStaff, createUser, listBranchStaff, listUsers, updateUserContact, updateUserBranch,
  updateUserRole, updateUserStatus, deleteUser,
} from "../controllers/usersController.js";

const router = express.Router();
// User routes list staff and manage user account details.
router.get(
  "/staff",
  requireAuth,
  requireRole("branch"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listBranchStaff,
);
router.post("/staff", requireAuth, requireRole("branch"), createBranchStaff);

router.use(requireAuth, requireRole("admin"));

router.post("/", createUser);
router.get("/", refreshIpRateLimit, refreshAccountRateLimit, listUsers);
router.patch(
  "/:id/contact",
  requireEditLock("User", (req) => req.params.id),
  updateUserContact,
);
router.patch(
  "/:id/branch",
  requireEditLock("User", (req) => req.params.id),
  updateUserBranch,
);
router.patch(
  "/:id/role",
  requireEditLock("User", (req) => req.params.id),
  updateUserRole,
);
router.patch(
  "/:id/status",
  requireEditLock("User", (req) => req.params.id),
  updateUserStatus,
);
router.delete(
  "/:id",
  requireEditLock("User", (req) => req.params.id),
  requireEditLock("Branch", async (req) => {
    const target = await User.findById(req.params.id).select("branchId");
    return target?.branchId?.toString() || null;
  }),
  deleteUser,
);

export default router;
