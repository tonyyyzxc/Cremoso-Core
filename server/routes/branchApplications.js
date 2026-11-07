import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  listBranchApplications,
  reviewBranchApplication,
  setBranchApplicationVisibility,
  deleteBranchApplication,
  submitBranchApplication,
} from "../controllers/branchApplicationsController.js";
import { validateObjectId } from "../middleware/validateObjectId.js";

const router = express.Router();

router.post("/", submitBranchApplication);
router.get("/", requireAuth, requireRole("admin"), listBranchApplications);
router.patch("/:id", requireAuth, requireRole("admin"), validateObjectId(), reviewBranchApplication);
router.patch("/:id/visibility", requireAuth, requireRole("admin"), validateObjectId(), setBranchApplicationVisibility);
router.delete("/:id", requireAuth, requireRole("admin"), validateObjectId(), deleteBranchApplication);

export default router;
