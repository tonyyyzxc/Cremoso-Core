import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  login,
  googleLogin,
  getPasswordStatus,
  updatePassword,
  requestPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
  getProfile,
  updateProfile,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/google", googleLogin);
router.post("/forgot-password", requestPasswordResetCode);
router.post("/verify-reset-code", verifyPasswordResetCode);
router.post("/reset-password", resetPassword);
router.get("/password-status", requireAuth, getPasswordStatus);
router.put("/password", requireAuth, updatePassword);
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);
router.post("/logout", requireAuth, logout);

export default router;
