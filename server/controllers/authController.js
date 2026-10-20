import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";
import Session from "../models/session.js";
import AuthConfig from "../models/authConfig.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";

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

export async function login(req, res) {
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
    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is not active." });
    }
    return await createSession(user, res);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Unable to sign in." });
  }
}

export async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Google credential is required." });
    }
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google sign-in is not configured on the server." });
    }
    const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Google email must be verified." });
    }

    const email = payload.email.toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({ error: "This Gmail account has not been added by an administrator." });
    }
    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is not active." });
    }
    if (user.role === "staff") {
      const config = await AuthConfig.findOne({ key: "default" });
      if (config?.staffGoogleAuthEnabled === false && user.passwordHash) {
        return res.status(403).json({ error: "Google sign-in is disabled for staff. Please sign in with your password." });
      }
      if (config?.staffGoogleAuthEnabled === false && !user.passwordHash) {
        config.staffGoogleAuthEnabled = true;
        await config.save();
      }
    }
    if (user.googleId && user.googleId !== payload.sub) {
      return res.status(401).json({ error: "This account is linked to a different Google account." });
    }
    user.googleId = payload.sub;
    if (!user.name && payload.name) user.name = payload.name;
    await user.save();
    return await createSession(user, res);
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({ error: "Google authentication failed." });
  }
}

export async function updatePassword(req, res) {
  const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (user.passwordHash && !(await comparePassword(currentPassword, user.passwordHash))) {
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    return res.json({ message: "Password saved successfully." });
  } catch (error) {
    console.error("Password update error:", error);
    return res.status(500).json({ error: "Unable to save your password." });
  }
}

export async function getPasswordStatus(req, res) {
  try {
    const user = await User.findById(req.user._id).select("passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({ hasPassword: Boolean(user.passwordHash) });
  } catch (error) {
    console.error("Password status lookup error:", error);
    return res.status(500).json({ error: "Unable to load password settings." });
  }
}

export async function logout(req, res) {
  try {
    req.session.revoked = true;
    await req.session.save();
    return res.json({ message: "Signed out successfully." });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Unable to end this session." });
  }
}
