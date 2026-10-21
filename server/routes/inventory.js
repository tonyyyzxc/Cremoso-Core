import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { listInventory, setInventoryQuantity } from "../controllers/inventoryController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", listInventory);
router.put("/:menuItemId", requireRole("admin"), setInventoryQuantity);

export default router;
