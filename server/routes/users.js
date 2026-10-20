import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import {
  createUser, listUsers, updateUserContact, updateUserBranch,
  updateUserRole, updateUserStatus, deleteUser,
} from "../controllers/usersController.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.post("/", createUser);
router.get("/", listUsers);
router.patch("/:id/contact", updateUserContact);
router.patch("/:id/branch", updateUserBranch);
router.patch("/:id/role", updateUserRole);
router.patch("/:id/status", updateUserStatus);
router.delete("/:id", deleteUser);

export default router;
