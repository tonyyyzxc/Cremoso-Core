import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getStaffBranch, updateStaffBranch, listStaffWorkers, createStaffWorker, deleteStaffWorker,
} from "../controllers/staffController.js";

const router = express.Router();

router.get("/branch", requireAuth, requireRole("staff"), getStaffBranch);
router.patch("/branch", requireAuth, requireRole("staff"), updateStaffBranch);
router.get("/workers", requireAuth, requireRole("staff"), listStaffWorkers);
router.post("/workers", requireAuth, requireRole("staff"), createStaffWorker);
router.delete("/workers/:id", requireAuth, requireRole("staff"), deleteStaffWorker);

export default router;
