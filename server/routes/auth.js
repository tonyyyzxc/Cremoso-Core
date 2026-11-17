import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  googleLoginRateLimit,
  loginRateLimit,
  passwordResetCompletionRateLimit,
  passwordResetRequestRateLimit,
  passwordResetVerifyRateLimit,
} from "../middleware/rateLimiters.js";
import { requireEditLock } from "../utils/editLock.js";
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

// Password login performs server-side Google reCAPTCHA verification.
router.post("/login", loginRateLimit, login);
// Google sign-in verifies a Google ID token and creates an app session.
router.post("/google", googleLoginRateLimit, googleLogin);
// Requests a password reset code sent through Brevo.
router.post("/forgot-password", passwordResetRequestRateLimit, requestPasswordResetCode);
router.post("/verify-reset-code", passwordResetVerifyRateLimit, verifyPasswordResetCode);
router.post("/reset-password", passwordResetCompletionRateLimit, resetPassword);
router.get("/password-status", requireAuth, getPasswordStatus);
router.put(
  "/password",
  requireAuth,
  requireEditLock("User", (req) => req.user._id.toString()),
  updatePassword,
);
router.get("/profile", requireAuth, getProfile);
router.patch(
  "/profile",
  requireAuth,
  requireEditLock("User", (req) => req.user._id.toString()),
  updateProfile,
);
router.post("/logout", requireAuth, logout);

export default router;
