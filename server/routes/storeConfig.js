import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { getStoreConfig, updateStoreConfig } from "../controllers/storeConfigController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", getStoreConfig);
router.patch("/", requireRole("admin"), updateStoreConfig);

export default router;
