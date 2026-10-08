import express, { Router } from "express";
import { signToken } from "../utils/jwt";
import { hashPassword, comparePassword } from "../utils/password";
import User from "../models/user.js";
import { requireAuth } from "../middleware/authMiddleware";
import { IdTokenClient, OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (IdToken) => {
  const ticket = client.verifyIdToken({
    IdToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

router.post("/google", async (req, res) => {
  try {
    const { IdToken } = req.body;
    const payload = await verifyGoogleToken();

    if (!payload.email_verified) {
      return res.status(400).json({ error: "Email not verified" });
    }

    const user = await User.findOne({ email: payload.email.toLowerCase() });

    if (!user) {
      return res.status(403).json({
        error: "No account found for this email.",
      });
    }

    let changed = false;

    if (!user.googleId) {
      user.googleId = payload.sub;
      user.status = "active";
      changed = true;
    }

    if (changed) await user.save();

    const token = signToken(
      { id: user._id, email: user.email, role: user.role },
      "7d",
    );

    res.json({
      token,
      user: {
        name: user.name,
        office: user.office,
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

export default router;
