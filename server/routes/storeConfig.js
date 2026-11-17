import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getStoreConfig, updateStoreConfig } from "../controllers/storeConfigController.js";
import { requireEditLock } from "../utils/editLock.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", getStoreConfig);
router.patch(
  "/",
  requireRole("admin"),
  requireEditLock("StoreConfig", () => "default"),
  updateStoreConfig,
);

export default router;
