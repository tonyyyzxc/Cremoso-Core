import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { handleUpload } from "../middleware/uploadMiddleware.js";
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
router.get("/files", listDriveFiles);
router.post("/upload", handleUpload, uploadDriveFile);
router.post("/folder", createDriveFolder);
router.get("/download/:id", downloadDriveFile);
router.delete("/files/:id", trashDriveFile);
router.post("/disconnect", disconnectDrive);

export default router;
