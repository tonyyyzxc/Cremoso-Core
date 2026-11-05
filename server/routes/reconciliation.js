import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireBranch } from "../middleware/requireBranch.js";
import {
  getShiftReconciliation,
  submitShiftReconciliation,
} from "../controllers/reconciliationController.js";

const router = express.Router();
router.use(requireAuth, requireRole("branch"));
router.use(requireBranch);

router.get("/", getShiftReconciliation);
router.post("/", submitShiftReconciliation);

export default router;
