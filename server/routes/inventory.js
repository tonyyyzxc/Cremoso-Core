import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listInventory, setInventoryQuantity } from "../controllers/inventoryController.js";
import { requireEditLock } from "../utils/editLock.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", requireRole("admin", "branch"), listInventory);
router.put(
  "/:menuItemId",
  requireRole("admin"),
  requireEditLock(
    "Inventory",
    (req) => `${req.body.branchId}:${req.params.menuItemId}`,
    (req) => req.body.__v === -1,
  ),
  setInventoryQuantity,
);

export default router;
