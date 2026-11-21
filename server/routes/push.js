import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  externalActionAccountRateLimit,
  externalActionIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  createPushRegistration,
  deletePushRegistration,
  getPushRegistration,
  sendPushTest,
} from "../controllers/pushController.js";

const router = express.Router();
router.use(requireAuth);

router.get("/registration", getPushRegistration);
router.post("/registration", createPushRegistration);
router.delete(
  "/registration",
  requireEditLock("PushRegistration", (req) => req.body?.browserId),
  deletePushRegistration,
);
router.post(
  "/test",
  externalActionIpRateLimit,
  externalActionAccountRateLimit,
  sendPushTest,
);

export default router;
