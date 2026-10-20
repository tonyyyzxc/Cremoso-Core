import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  listBranches, listWorkers, createBranchAccount, createBranch, updateBranch,
} from "../controllers/branchesController.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.get("/", listBranches);
router.get("/workers", listWorkers);
router.post("/account", createBranchAccount);
router.post("/", createBranch);
router.patch("/:id", updateBranch);

export default router;
