import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createPushRegistration,
  deletePushRegistration,
  getPushRegistration,
} from "../controllers/pushController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/registration", getPushRegistration);
router.post("/registration", createPushRegistration);
router.delete("/registration", deletePushRegistration);

export default router;
