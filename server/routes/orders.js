import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireBranch } from "../middleware/requireBranch.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
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
router.post("/:id/archive", requireRole("admin"), validateObjectId("id", "Invalid order ID."), archiveOrder);
router.delete("/:id", requireRole("admin"), validateObjectId("id", "Invalid order ID."), deleteArchivedOrder);
router.post("/", requireRole("branch", "staff"), createNewOrder);
router.get("/transactions", requireRole("branch", "staff"), requireBranch, listStaffTransactions);
router.get("/queue", requireRole("branch", "staff"), requireBranch, listStaffOrderQueue);
router.post("/queue/:id/confirm-payment", requireRole("branch", "staff"), requireBranch, validateObjectId("id", "Invalid order ID."), confirmOrderPayment);
router.post("/queue/:id/void", requireRole("branch"), requireBranch, validateObjectId("id", "Invalid order ID."), voidStaffOrder);
router.get("/:id", requireRole("admin"), validateObjectId("id", "Invalid order ID."), getOrder);
router.post("/:id/void", requireRole("admin"), validateObjectId("id", "Invalid order ID."), voidOrder);
router.post("/:id/refund", requireRole("admin"), validateObjectId("id", "Invalid order ID."), refundOrder);

export default router;
