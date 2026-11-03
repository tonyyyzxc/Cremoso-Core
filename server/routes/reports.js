import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createStaffSale, getSalesReport } from "../controllers/reportsController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("branch", "admin"), getSalesReport);
router.post("/sales", requireRole("branch"), createStaffSale);

export default router;
