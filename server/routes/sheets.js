import express from "express";
import {
  disconnectSheets,
  exportGoogleSheet,
  getSheetsConnectUrl,
  getSheetsStatus,
  handleSheetsCallback,
} from "../controllers/sheetsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/callback", handleSheetsCallback);
router.get("/status", requireAuth, getSheetsStatus);
router.get("/connect", requireAuth, getSheetsConnectUrl);
router.post("/export", requireAuth, exportGoogleSheet);
router.post("/disconnect", requireAuth, disconnectSheets);

export default router;
