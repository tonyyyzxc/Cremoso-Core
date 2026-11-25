import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getStoreConfig, updateStoreConfig } from "../controllers/storeConfigController.js";
import { requireEditLock } from "../utils/editLock.js";

const router = express.Router();
// Store configuration routes read and update the active store settings.
router.use(requireAuth);

router.get("/", getStoreConfig);
router.patch(
  "/",
  requireRole("admin"),
  requireEditLock("StoreConfig", () => "default"),
  updateStoreConfig,
);

export default router;
