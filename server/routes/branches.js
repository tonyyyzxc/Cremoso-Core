import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  listBranches, listWorkers, createBranchAccount, createBranch, updateBranch,
} from "../controllers/branchesController.js";

const router = express.Router();
// Branch routes manage branches, branch accounts, and branch workers.
router.use(requireAuth, requireRole("admin"));

router.get("/", refreshIpRateLimit, refreshAccountRateLimit, listBranches);
router.get("/workers", refreshIpRateLimit, refreshAccountRateLimit, listWorkers);
router.post("/account", createBranchAccount);
router.post("/", createBranch);
router.patch(
  "/:id",
  requireEditLock("Branch", (req) => req.params.id),
  updateBranch,
);

export default router;
