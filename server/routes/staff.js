import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getStaffBranch, updateStaffBranch, updateStaffProfile, listStaffWorkers, createStaffWorker, deleteStaffWorker,
} from "../controllers/staffController.js";

const router = express.Router();

router.get("/branch", requireAuth, requireRole("branch"), getStaffBranch);
router.patch("/branch", requireAuth, requireRole("branch"), updateStaffBranch);
router.patch("/profile", requireAuth, requireRole("branch"), updateStaffProfile);
router.get("/workers", requireAuth, requireRole("branch"), listStaffWorkers);
router.post("/workers", requireAuth, requireRole("branch"), createStaffWorker);
router.delete("/workers/:id", requireAuth, requireRole("branch"), deleteStaffWorker);

export default router;
