import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { handleUpload } from "../middleware/uploadMiddleware.js";
import {
  externalActionAccountRateLimit,
  externalActionIpRateLimit,
  uploadAccountRateLimit,
  uploadIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  createDriveFolder,
  disconnectDrive,
  downloadDriveFile,
  getDriveConnectUrl,
  getDriveStatus,
  handleDriveCallback,
  listDriveFiles,
  trashDriveFile,
  uploadDriveFile,
} from "../controllers/driveController.js";

const router = express.Router();

// Google OAuth callback and authenticated routes for the user's Google Drive.
router.get("/callback", handleDriveCallback);
router.use(requireAuth);
router.get("/status", getDriveStatus);
router.get("/connect", getDriveConnectUrl);
router.get("/files", externalActionIpRateLimit, externalActionAccountRateLimit, listDriveFiles);
router.post(
  "/upload",
  uploadIpRateLimit,
  uploadAccountRateLimit,
  handleUpload,
  uploadDriveFile,
);
router.post("/folder", externalActionIpRateLimit, externalActionAccountRateLimit, createDriveFolder);
router.get("/download/:id", externalActionIpRateLimit, externalActionAccountRateLimit, downloadDriveFile);
router.delete("/files/:id", externalActionIpRateLimit, externalActionAccountRateLimit, trashDriveFile);
router.post("/disconnect", externalActionIpRateLimit, externalActionAccountRateLimit, disconnectDrive);

export default router;
