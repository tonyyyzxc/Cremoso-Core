import express from "express";
import { exportDriveSheet } from "../controllers/sheetsController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/export-sheet", requireAuth, exportDriveSheet);

export default router;
