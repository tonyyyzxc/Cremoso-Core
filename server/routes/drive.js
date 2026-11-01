import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  createDriveFolder,
  disconnectDrive,
  downloadDriveFile,
  exportDriveSheet,
  getDriveConnectUrl,
  getDriveStatus,
  handleDriveCallback,
  listDriveFiles,
  trashDriveFile,
  uploadDriveFile,
} from "../controllers/driveController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

function handleUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Files must be 25 MB or smaller." });
    }
    return res.status(400).json({ error: error.message });
  });
}

router.get("/callback", handleDriveCallback);
router.use(requireAuth);
router.get("/status", getDriveStatus);
router.get("/connect", getDriveConnectUrl);
router.get("/files", listDriveFiles);
router.post("/upload", handleUpload, uploadDriveFile);
router.post("/folder", createDriveFolder);
router.get("/download/:id", downloadDriveFile);
router.post("/export-sheet", exportDriveSheet);
router.delete("/files/:id", trashDriveFile);
router.post("/disconnect", disconnectDrive);

export default router;
