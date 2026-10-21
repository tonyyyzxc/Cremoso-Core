import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createSupply,
  deleteSupply,
  listSupplies,
  setBranchSupplyQuantity,
  updateSupply,
} from "../controllers/supplyInventoryController.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", listSupplies);
router.post("/", createSupply);
router.patch("/:supplyId", updateSupply);
router.delete("/:supplyId", deleteSupply);
router.put("/:supplyId/stock", setBranchSupplyQuantity);

export default router;
