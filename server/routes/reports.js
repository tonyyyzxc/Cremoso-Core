import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createStaffSale, getSalesReport } from "../controllers/reportsController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("staff", "admin"), getSalesReport);
router.post("/sales", requireRole("staff"), createStaffSale);

export default router;
