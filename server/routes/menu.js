import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import { listMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from "../controllers/menuController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", listMenuItems);
router.post("/", requireRole("admin"), createMenuItem);
router.patch(
  "/:id",
  requireRole("admin"),
  requireEditLock("MenuItem", (req) => req.params.id),
  updateMenuItem,
);
router.delete(
  "/:id",
  requireRole("admin"),
  requireEditLock("MenuItem", (req) => req.params.id),
  deleteMenuItem,
);

export default router;
