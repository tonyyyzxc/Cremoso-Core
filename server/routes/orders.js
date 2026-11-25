import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireBranch } from "../middleware/requireBranch.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  refreshAccountRateLimit,
  refreshIpRateLimit,
} from "../middleware/rateLimiters.js";
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
// Order routes create, list, confirm, archive, void, and refund orders.
router.use(requireAuth);

router.get(
  "/",
  requireRole("admin"),
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listOrders,
);
router.post(
  "/:id/archive",
  requireRole("admin"),
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  archiveOrder,
);
router.delete(
  "/:id",
  requireRole("admin"),
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  deleteArchivedOrder,
);
router.post("/", requireRole("branch", "staff"), createNewOrder);
router.get(
  "/transactions",
  requireRole("branch", "staff"),
  requireBranch,
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listStaffTransactions,
);
router.get(
  "/queue",
  requireRole("branch", "staff"),
  requireBranch,
  refreshIpRateLimit,
  refreshAccountRateLimit,
  listStaffOrderQueue,
);
router.post(
  "/queue/:id/confirm-payment",
  requireRole("branch", "staff"),
  requireBranch,
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  confirmOrderPayment,
);
router.post(
  "/queue/:id/void",
  requireRole("branch"),
  requireBranch,
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  voidStaffOrder,
);
router.get("/:id", requireRole("admin"), validateObjectId("id", "Invalid order ID."), getOrder);
router.post(
  "/:id/void",
  requireRole("admin"),
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  voidOrder,
);
router.post(
  "/:id/refund",
  requireRole("admin"),
  validateObjectId("id", "Invalid order ID."),
  requireEditLock("Order", (req) => req.params.id),
  refundOrder,
);

export default router;
