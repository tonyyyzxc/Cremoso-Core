import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  acquireEditLock,
  getEditLockStatus,
  releaseEditLock,
  renewEditLock,
} from "../controllers/editLocksController.js";

const router = express.Router();

router.use(requireAuth);
router.get("/status", getEditLockStatus);
router.post("/acquire", acquireEditLock);
router.post("/renew", renewEditLock);
router.post("/release", releaseEditLock);

export default router;
