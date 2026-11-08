import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import {
  createSupply,
  deleteSupply,
  listSupplies,
  setBranchSupplyQuantity,
  updateSupply,
} from "../controllers/supplyInventoryController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("admin", "branch"), listSupplies);
router.post("/", requireRole("admin"), createSupply);
router.patch("/:supplyId", requireRole("admin"), updateSupply);
router.delete("/:supplyId", requireRole("admin"), validateObjectId("supplyId", "Select a valid supply."), deleteSupply);
router.put("/:supplyId/stock", requireRole("admin"), setBranchSupplyQuantity);

export default router;
