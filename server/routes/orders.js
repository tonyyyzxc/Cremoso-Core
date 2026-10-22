import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  confirmOrderPayment,
  createNewOrder,
  archiveOrder,
  deleteArchivedOrder,
  getOrder,
  listOrders,
  listStaffOrderQueue,
  listStaffTransactions,
  refundOrder,
  voidOrder,
  voidStaffOrder,
} from "../controllers/ordersController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("admin"), listOrders);
router.post("/:id/archive", requireRole("admin"), archiveOrder);
router.delete("/:id", requireRole("admin"), deleteArchivedOrder);
router.post("/", requireRole("staff"), createNewOrder);
router.get("/transactions", requireRole("staff"), listStaffTransactions);
router.get("/queue", requireRole("staff"), listStaffOrderQueue);
router.post("/queue/:id/confirm-payment", requireRole("staff"), confirmOrderPayment);
router.post("/queue/:id/void", requireRole("staff"), voidStaffOrder);
router.get("/:id", requireRole("admin"), getOrder);
router.post("/:id/void", requireRole("admin"), voidOrder);
router.post("/:id/refund", requireRole("admin"), refundOrder);

export default router;
