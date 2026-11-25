import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createStaffSale, getSalesReport } from "../controllers/reportsController.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";

const router = express.Router();
// Report routes create staff sales and provide branch sales reports.
router.use(requireAuth);

router.get(
  "/",
  requireRole("branch", "admin"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  getSalesReport,
);
router.post("/sales", requireRole("branch"), createStaffSale);

export default router;
