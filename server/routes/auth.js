import express from "express";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";
import Session from "../models/session.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  username: user.username,
  office: user.office,
  email: user.email,
  role: user.role,
  status: user.status,
});

const createSession = async (user, res) => {
  const tokenId = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.create({ tokenId, user: user._id, expiresAt });
  const token = signToken(
    { id: user._id, email: user.email, role: user.role, sid: tokenId },
    "7d",
  );
  return res.json({ token, user: publicUser(user) });
};

router.post("/register", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Name, username, email, and password are required." });
    }
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      return res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, dot, underscore, or hyphen." });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ error: "That email or username is already in use." });
    }

    const user = await User.create({
      name,
      username,
      email,
      passwordHash: await hashPassword(password),
      role: "staff",
      status: "active",
    });
    return await createSession(user, res);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: "That email or username is already in use." });
    }
    console.error("Registration error:", error);
    return res.status(500).json({ error: "Unable to create account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const identifier = typeof req.body.identifier === "string"
      ? req.body.identifier.trim().toLowerCase()
      : typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";

    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/email and password are required." });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user?.passwordHash || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    return await createSession(user, res);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Unable to sign in." });
  }
});

router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Google credential is required." });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google sign-in is not configured on the server." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Google email must be verified." });
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: payload.name || "",
        email,
        googleId: payload.sub,
        role: "staff",
        status: "active",
      });
    } else {
      if (user.googleId && user.googleId !== payload.sub) {
        return res.status(401).json({ error: "This account is linked to a different Google account." });
      }
      user.googleId = payload.sub;
      user.status = "active";
      if (!user.name && payload.name) user.name = payload.name;
      await user.save();
    }

    return await createSession(user, res);
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ error: "Google authentication failed." });
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    req.session.revoked = true;
    await req.session.save();
    return res.json({ message: "Signed out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Unable to end this session." });
  }
});

export default router;
