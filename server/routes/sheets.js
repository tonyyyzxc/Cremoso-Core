import express from "express";
import {
  disconnectSheets,
  exportGoogleSheet,
  getSheetsConnectUrl,
  getSheetsStatus,
  handleSheetsCallback,
} from "../controllers/sheetsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  externalActionAccountRateLimit,
  externalActionIpRateLimit,
} from "../middleware/rateLimiters.js";

const router = express.Router();

router.get("/callback", handleSheetsCallback);
router.get("/status", requireAuth, getSheetsStatus);
router.get("/connect", requireAuth, getSheetsConnectUrl);
router.post(
  "/export",
  requireAuth,
  externalActionIpRateLimit,
  externalActionAccountRateLimit,
  exportGoogleSheet,
);
router.post(
  "/disconnect",
  requireAuth,
  externalActionIpRateLimit,
  externalActionAccountRateLimit,
  disconnectSheets,
);

export default router;
