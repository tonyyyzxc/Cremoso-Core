import express, { Router } from "express";
import { signToken } from "../utils/jwt";
import User from "../models/user.js";
import { OAuth2Client } from "google-auth-library";

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Verify the credential's signature and audience so clients cannot forge a Google identity.
const verifyGoogleToken = async (idToken) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    // Reject empty requests before asking Google's verifier to process a credential.
    if (!idToken) return res.status(400).json({ error: "Google credential is required" });
    const payload = await verifyGoogleToken(idToken);

    if (!payload.email_verified) {
      return res.status(400).json({ error: "Email not verified" });
    }

    // This app allows sign-in only for users already provisioned in its database.
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

    // Google proves identity; this JWT is the session token used by Cremoso after login.
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
