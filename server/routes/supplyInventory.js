import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  createSupply,
  deleteSupply,
  listSupplies,
  setBranchSupplyQuantity,
  updateSupply,
} from "../controllers/supplyInventoryController.js";

const router = express.Router();
// Supply routes manage supplies and branch-level stock quantities.
router.use(requireAuth);

router.get("/", requireRole("admin", "branch"), listSupplies);
router.post("/", requireRole("admin"), createSupply);
router.patch(
  "/:supplyId",
  requireRole("admin"),
  requireEditLock("Supply", (req) => req.params.supplyId),
  updateSupply,
);
router.delete(
  "/:supplyId",
  requireRole("admin"),
  validateObjectId("supplyId", "Select a valid supply."),
  requireEditLock("Supply", (req) => req.params.supplyId),
  deleteSupply,
);
router.put(
  "/:supplyId/stock",
  requireRole("admin"),
  requireEditLock(
    "SupplyInventory",
    (req) => `${req.body.branchId}:${req.params.supplyId}`,
    (req) => req.body.__v === -1,
  ),
  setBranchSupplyQuantity,
);

export default router;
