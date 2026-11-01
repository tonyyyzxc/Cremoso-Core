import { randomInt, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";
import Session from "../models/session.js";
import AuthConfig from "../models/authConfig.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { sendPasswordResetCode } from "../utils/mailer.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const PASSWORD_RESET_CODE_EXPIRY_MS = 10 * 60 * 1000;
const PASSWORD_RESET_CODE_RESEND_DELAY_MS = 60 * 1000;
const PASSWORD_RESET_CODE_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_REQUEST_MESSAGE =
  "If an active account exists for this email, a reset code has been sent.";

async function findPasswordResetUser(email, code) {
  const user = await User.findOne({
    email,
    status: "active",
    passwordResetCodeHash: { $ne: null },
    passwordResetCodeExpiresAt: { $gt: new Date() },
    passwordResetCodeAttempts: { $lt: PASSWORD_RESET_CODE_MAX_ATTEMPTS },
  });
  if (!user || !(await comparePassword(code, user.passwordResetCodeHash))) {
    if (user) {
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: user._id,
          passwordResetCodeHash: user.passwordResetCodeHash,
          passwordResetCodeExpiresAt: { $gt: new Date() },
          passwordResetCodeAttempts: {
            $lt: PASSWORD_RESET_CODE_MAX_ATTEMPTS,
          },
        },
        { $inc: { passwordResetCodeAttempts: 1 } },
        { new: true },
      );
      if (
        updatedUser &&
        updatedUser.passwordResetCodeAttempts >= PASSWORD_RESET_CODE_MAX_ATTEMPTS
      ) {
        await User.updateOne(
          {
            _id: updatedUser._id,
            passwordResetCodeHash: updatedUser.passwordResetCodeHash,
          },
          {
            $unset: {
              passwordResetCodeHash: "",
              passwordResetCodeExpiresAt: "",
              passwordResetCodeSentAt: "",
            },
            $set: { passwordResetCodeAttempts: 0 },
          },
        );
      }
    }
    return null;
  }
  return user;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    const recaptchaToken = typeof req.body.recaptchaToken === "string"
      ? req.body.recaptchaToken
      : "";

    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/email and password are required." });
    }
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      return res.status(503).json({ error: "reCAPTCHA is not configured on the server." });
    }
    if (!recaptchaToken) {
      return res.status(400).json({ error: "Please complete the reCAPTCHA check." });
    }

    const recaptchaResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        }),
      },
    );
    if (!recaptchaResponse.ok) {
      throw new Error(`reCAPTCHA verification failed with status ${recaptchaResponse.status}.`);
    }
    const recaptchaResult = await recaptchaResponse.json();
    if (recaptchaResult.success !== true) {
      return res.status(401).json({ error: "reCAPTCHA verification failed. Please try again." });
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

export async function requestPasswordResetCode(req, res) {
  const email = typeof req.body.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  try {
    const user = await User.findOne({ email, status: "active" });
    if (!user) return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });

    const lastSentAt = user.passwordResetCodeSentAt?.getTime();
    if (
      lastSentAt &&
      Date.now() - lastSentAt < PASSWORD_RESET_CODE_RESEND_DELAY_MS
    ) {
      return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = await hashPassword(code);
    user.passwordResetCodeHash = codeHash;
    user.passwordResetCodeExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_CODE_EXPIRY_MS,
    );
    user.passwordResetCodeAttempts = 0;
    user.passwordResetCodeSentAt = new Date();
    await user.save();

    try {
      await sendPasswordResetCode(email, code);
    } catch (error) {
      await User.updateOne(
        { _id: user._id, passwordResetCodeHash: codeHash },
        {
          $unset: {
            passwordResetCodeHash: "",
            passwordResetCodeExpiresAt: "",
            passwordResetCodeSentAt: "",
          },
          $set: { passwordResetCodeAttempts: 0 },
        },
      );
      console.error("Password reset email error:", error);
      return res.status(503).json({
        error: "Unable to send a password reset email right now. Please try again later.",
      });
    }

    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (error) {
    console.error("Password reset request error:", error);
    return res.status(500).json({ error: "Unable to request a password reset." });
  }
}

export async function verifyPasswordResetCode(req, res) {
  const email = typeof req.body.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter a valid email and 6-digit code." });
  }

  try {
    const user = await findPasswordResetUser(email, code);
    if (!user) {
      return res.status(400).json({ error: "The reset code is invalid or expired." });
    }
    return res.json({ message: "Code verified." });
  } catch (error) {
    console.error("Password reset code verification error:", error);
    return res.status(500).json({ error: "Unable to verify the reset code." });
  }
}

export async function resetPassword(req, res) {
  const email = typeof req.body.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  const newPassword = typeof req.body.newPassword === "string"
    ? req.body.newPassword
    : "";

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Enter a valid email and 6-digit code." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  try {
    const user = await findPasswordResetUser(email, code);
    if (!user) {
      return res.status(400).json({ error: "The reset code is invalid or expired." });
    }

    const passwordHash = await hashPassword(newPassword);
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        status: "active",
        passwordResetCodeHash: user.passwordResetCodeHash,
        passwordResetCodeExpiresAt: { $gt: new Date() },
        passwordResetCodeAttempts: { $lt: PASSWORD_RESET_CODE_MAX_ATTEMPTS },
      },
      {
        $set: { passwordHash, passwordResetCodeAttempts: 0 },
        $unset: {
          passwordResetCodeHash: "",
          passwordResetCodeExpiresAt: "",
          passwordResetCodeSentAt: "",
        },
      },
      { new: true },
    );
    if (!updatedUser) {
      return res.status(400).json({ error: "The reset code is invalid or expired." });
    }

    return res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Unable to reset your password." });
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
    const config = await AuthConfig.findOne({ key: "default" });
    if (config?.staffGoogleAuthEnabled === false) {
      return res.status(403).json({
        error: "Google sign-in is disabled for all accounts. Please sign in with your email and password.",
      });
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

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id).select("name email phone");
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ profile: user });
  } catch (error) {
    console.error("Profile lookup error:", error);
    return res.status(500).json({ error: "Unable to load your profile." });
  }
}

export async function updateProfile(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  if (!name) return res.status(400).json({ error: "Enter your name." });

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "Account not found." });
    user.name = name;
    user.phone = phone;
    await user.save();
    return res.json({
      profile: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({ error: "Unable to save your profile." });
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
