import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  login,
  googleLogin,
  getPasswordStatus,
  updatePassword,
  logout,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.post("/google", googleLogin);
router.get("/password-status", requireAuth, getPasswordStatus);
router.put("/password", requireAuth, updatePassword);
router.post("/logout", requireAuth, logout);

export default router;
