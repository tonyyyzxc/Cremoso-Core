import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  getShiftReconciliation,
  submitShiftReconciliation,
} from "../controllers/reconciliationController.js";

const router = express.Router();
router.use(requireAuth, requireRole("staff"));

router.get("/", getShiftReconciliation);
router.post("/", submitShiftReconciliation);

export default router;
