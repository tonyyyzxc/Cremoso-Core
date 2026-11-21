import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createStaffSale, getSalesReport } from "../controllers/reportsController.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";

const router = express.Router();
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
