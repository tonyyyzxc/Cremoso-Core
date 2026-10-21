import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  listBranchApplications,
  reviewBranchApplication,
  submitBranchApplication,
} from "../controllers/branchApplicationsController.js";

const router = express.Router();

router.post("/", submitBranchApplication);
router.get("/", requireAuth, requireRole("admin"), listBranchApplications);
router.patch("/:id", requireAuth, requireRole("admin"), reviewBranchApplication);

export default router;
