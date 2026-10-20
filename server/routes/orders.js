import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { createNewOrder, getOrder, listOrders, refundOrder, voidOrder } from "../controllers/ordersController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("admin"), listOrders);
router.post("/", requireRole("staff"), createNewOrder);
router.get("/:id", requireRole("admin"), getOrder);
router.post("/:id/void", requireRole("admin"), voidOrder);
router.post("/:id/refund", requireRole("admin"), refundOrder);

export default router;
