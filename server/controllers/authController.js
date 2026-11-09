import { randomInt, randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.js";
import Session from "../models/session.js";
import AuthConfig from "../models/authConfig.js";
import PushRegistration from "../models/pushRegistration.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signToken } from "../utils/jwt.js";
import { sendPasswordResetCode } from "../utils/mailer.js";
import { logActivity } from "../utils/activityLog.js";
import { isIntegrationEnabled, requireIntegration } from "../utils/integrationConfig.js";
import { isSuperAdminAccount } from "../utils/superAdmin.js";
import { getIntegrationCredentials } from "../utils/integrationCredentials.js";

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
  isSuperAdmin: isSuperAdminAccount(user),
  status: user.status,
});

const createSession = async (req, user, res, action) => {
  const tokenId = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await Session.create({ tokenId, user: user._id, expiresAt });
  const token = signToken(
    { id: user._id, email: user.email, role: user.role, sid: tokenId },
    "7d",
  );
  await logActivity(req, {
    action,
    category: "auth",
    summary: action === "auth.google.success"
      ? "Signed in with Google."
      : "Signed in with a password.",
    actor: user,
  });
  return res.json({ token, user: publicUser(user) });
};

export async function login(req, res) {
  const identifier = typeof req.body?.identifier === "string"
    ? req.body.identifier.trim().toLowerCase()
    : typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  try {
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const recaptchaToken = typeof req.body.recaptchaToken === "string"
      ? req.body.recaptchaToken
      : "";

    if (!identifier || !password) {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because required credentials were missing.",
        status: "failure",
        identifier,
      });
      return res.status(400).json({ error: "Username/email and password are required." });
    }
    const recaptchaEnabled = await isIntegrationEnabled("recaptchaEnabled");
    const recaptchaCredentials = recaptchaEnabled
      ? await getIntegrationCredentials("recaptcha")
      : null;
    if (recaptchaEnabled && !recaptchaCredentials?.secretKey) {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because reCAPTCHA is not configured.",
        status: "failure",
        identifier,
      });
      return res.status(503).json({ error: "reCAPTCHA is not configured on the server." });
    }
    if (recaptchaEnabled && !recaptchaToken) {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because reCAPTCHA was not completed.",
        status: "failure",
        identifier,
      });
      return res.status(400).json({ error: "Please complete the reCAPTCHA check." });
    }

    // Verify the login's reCAPTCHA token with Google's site verification API.
    const recaptchaResponse = recaptchaEnabled ? await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: recaptchaCredentials.secretKey,
          response: recaptchaToken,
        }),
      },
    ) : null;
    if (recaptchaResponse && !recaptchaResponse.ok) {
      throw new Error(`reCAPTCHA verification failed with status ${recaptchaResponse.status}.`);
    }
    const recaptchaResult = recaptchaResponse ? await recaptchaResponse.json() : { success: true };
    if (recaptchaResult.success !== true) {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because reCAPTCHA verification was rejected.",
        status: "failure",
        identifier,
      });
      return res.status(401).json({ error: "reCAPTCHA verification failed. Please try again." });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user?.passwordHash || !(await comparePassword(password, user.passwordHash))) {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because the credentials were invalid.",
        status: "failure",
        identifier,
      });
      return res.status(401).json({ error: "Email or password is incorrect." });
    }
    if (user.status !== "active") {
      await logActivity(req, {
        action: "auth.login.failed",
        category: "auth",
        summary: "Password sign-in failed because the account is inactive.",
        status: "failure",
        identifier,
      });
      return res.status(403).json({ error: "This account is not active." });
    }
    return await createSession(req, user, res, "auth.login.success");
  } catch (error) {
    console.error("Login error:", { name: error?.name, code: error?.code });
    await logActivity(req, {
      action: "auth.login.failed",
      category: "auth",
      summary: "Password sign-in failed because of a server error.",
      status: "failure",
      identifier,
    });
    return res.status(500).json({ error: "Unable to sign in." });
  }
}

export async function requestPasswordResetCode(req, res) {
  if (!(await requireIntegration("gmailEnabled", res, "Brevo password-reset email"))) return;
  const email = typeof req.body.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  if (!isValidEmail(email)) {
    await logActivity(req, {
      action: "auth.reset.requested",
      category: "auth",
      summary: "Password reset request failed because the email was invalid.",
      status: "failure",
      identifier: email,
    });
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  let user;
  try {
    user = await User.findOne({ email, status: "active" });
    if (!user) {
      await logActivity(req, {
        action: "auth.reset.requested",
        category: "auth",
        summary: "Password reset request received.",
        identifier: email,
      });
      return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
    }

    const lastSentAt = user.passwordResetCodeSentAt?.getTime();
    if (
      lastSentAt &&
      Date.now() - lastSentAt < PASSWORD_RESET_CODE_RESEND_DELAY_MS
    ) {
      await logActivity(req, {
        action: "auth.reset.requested",
        category: "auth",
        summary: "Password reset request received.",
        identifier: email,
        actor: user,
      });
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
      console.error("Password reset email error:", {
        name: error?.name,
        code: error?.code,
      });
      await logActivity(req, {
        action: "auth.reset.requested",
        category: "auth",
        summary: "Password reset request failed because the email could not be sent.",
        status: "failure",
        identifier: email,
        actor: user,
      });
      return res.status(503).json({
        error: "Unable to send a password reset email right now. Please try again later.",
      });
    }

    await logActivity(req, {
      action: "auth.reset.requested",
      category: "auth",
      summary: "Password reset code sent.",
      identifier: email,
      actor: user,
    });
    return res.json({ message: PASSWORD_RESET_REQUEST_MESSAGE });
  } catch (error) {
    console.error("Password reset request error:", {
      name: error?.name,
      code: error?.code,
    });
    await logActivity(req, {
      action: "auth.reset.requested",
      category: "auth",
      summary: "Password reset request failed because of a server error.",
      status: "failure",
      identifier: email,
    });
    return res.status(500).json({ error: "Unable to request a password reset." });
  }
}

export async function verifyPasswordResetCode(req, res) {
  const email = typeof req.body.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "";
  const code = typeof req.body.code === "string" ? req.body.code.trim() : "";
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    await logActivity(req, {
      action: "auth.reset.verified",
      category: "auth",
      summary: "Password reset code verification failed because the input was invalid.",
      status: "failure",
      identifier: email,
    });
    return res.status(400).json({ error: "Enter a valid email and 6-digit code." });
  }

  try {
    const user = await findPasswordResetUser(email, code);
    if (!user) {
      await logActivity(req, {
        action: "auth.reset.verified",
        category: "auth",
        summary: "Password reset code verification failed.",
        status: "failure",
        identifier: email,
      });
      return res.status(400).json({ error: "The reset code is invalid or expired." });
    }
    await logActivity(req, {
      action: "auth.reset.verified",
      category: "auth",
      summary: "Password reset code verified.",
      actor: user,
    });
    return res.json({ message: "Code verified." });
  } catch (error) {
    console.error("Password reset code verification error:", {
      name: error?.name,
      code: error?.code,
    });
    await logActivity(req, {
      action: "auth.reset.verified",
      category: "auth",
      summary: "Password reset code verification failed because of a server error.",
      status: "failure",
      identifier: email,
    });
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
    await logActivity(req, {
      action: "auth.reset.completed",
      category: "auth",
      summary: "Password reset failed because the input was invalid.",
      status: "failure",
      identifier: email,
    });
    return res.status(400).json({ error: "Enter a valid email and 6-digit code." });
  }
  if (newPassword.length < 8) {
    await logActivity(req, {
      action: "auth.reset.completed",
      category: "auth",
      summary: "Password reset failed because the new password was too short.",
      status: "failure",
      identifier: email,
    });
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  try {
    const user = await findPasswordResetUser(email, code);
    if (!user) {
      await logActivity(req, {
        action: "auth.reset.completed",
        category: "auth",
        summary: "Password reset failed because the code was invalid or expired.",
        status: "failure",
        identifier: email,
      });
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
      await logActivity(req, {
        action: "auth.reset.completed",
        category: "auth",
        summary: "Password reset failed because the code was invalid or expired.",
        status: "failure",
        actor: user,
      });
      return res.status(400).json({ error: "The reset code is invalid or expired." });
    }

    await logActivity(req, {
      action: "auth.reset.completed",
      category: "auth",
      summary: "Password reset completed.",
      actor: updatedUser,
    });
    return res.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Password reset error:", { name: error?.name, code: error?.code });
    await logActivity(req, {
      action: "auth.reset.completed",
      category: "auth",
      summary: "Password reset failed because of a server error.",
      status: "failure",
      identifier: email,
    });
    return res.status(500).json({ error: "Unable to reset your password." });
  }
}

// Verify the Google ID token before creating an application session.
export async function googleLogin(req, res) {
  let identifier = "";
  try {
    if (!(await requireIntegration("staffGoogleAuthEnabled", res, "Google sign-in"))) return;
    const { idToken } = req.body;
    if (!idToken) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because no credential was provided.",
        status: "failure",
      });
      return res.status(400).json({ error: "Google credential is required." });
    }
    const googleCredentials = await getIntegrationCredentials("googleAuth");
    if (!googleCredentials.clientId) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because it is not configured.",
        status: "failure",
      });
      return res.status(503).json({ error: "Google sign-in is not configured on the server." });
    }
    const googleClient = new OAuth2Client(googleCredentials.clientId);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleCredentials.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because the email was not verified.",
        status: "failure",
      });
      return res.status(401).json({ error: "Google email must be verified." });
    }

    const email = payload.email.toLowerCase();
    identifier = email;
    const user = await User.findOne({ email });
    if (!user) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because the account was not registered.",
        status: "failure",
        identifier,
      });
      return res.status(403).json({ error: "This Gmail account has not been added by an administrator." });
    }
    if (user.status !== "active") {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because the account is inactive.",
        status: "failure",
        identifier,
      });
      return res.status(403).json({ error: "This account is not active." });
    }
    const config = await AuthConfig.findOne({ key: "default" });
    if (config?.staffGoogleAuthEnabled === false) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because it is disabled.",
        status: "failure",
        identifier,
      });
      return res.status(403).json({
        error: "Google sign-in is disabled for all accounts. Please sign in with your email and password.",
      });
    }
    if (user.googleId && user.googleId !== payload.sub) {
      await logActivity(req, {
        action: "auth.google.rejected",
        category: "auth",
        summary: "Google sign-in was rejected because a different Google account is linked.",
        status: "failure",
        identifier,
      });
      return res.status(401).json({ error: "This account is linked to a different Google account." });
    }
    user.googleId = payload.sub;
    if (!user.name && payload.name) user.name = payload.name;
    await user.save();
    return await createSession(req, user, res, "auth.google.success");
  } catch (error) {
    console.error("Google auth error:", {
      name: error?.name,
      code: error?.code,
    });
    await logActivity(req, {
      action: "auth.google.rejected",
      category: "auth",
      summary: "Google sign-in was rejected because authentication failed.",
      status: "failure",
      identifier,
    });
    return res.status(401).json({ error: "Google authentication failed." });
  }
}

export async function updatePassword(req, res) {
  const currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 8) {
    await logActivity(req, {
      action: "auth.password.change",
      category: "auth",
      summary: "Password change failed because the new password was too short.",
      status: "failure",
    });
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      await logActivity(req, {
        action: "auth.password.change",
        category: "auth",
        summary: "Password change failed because the account was not found.",
        status: "failure",
      });
      return res.status(404).json({ error: "User not found." });
    }
    if (user.passwordHash && !(await comparePassword(currentPassword, user.passwordHash))) {
      await logActivity(req, {
        action: "auth.password.change",
        category: "auth",
        summary: "Password change failed because the current password was incorrect.",
        status: "failure",
      });
      return res.status(401).json({ error: "Current password is incorrect." });
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    await logActivity(req, {
      action: "auth.password.change",
      category: "auth",
      summary: "Password changed.",
    });
    return res.json({ message: "Password saved successfully." });
  } catch (error) {
    console.error("Password update error:", { name: error?.name, code: error?.code });
    await logActivity(req, {
      action: "auth.password.change",
      category: "auth",
      summary: "Password change failed because of a server error.",
      status: "failure",
    });
    return res.status(500).json({ error: "Unable to save your password." });
  }
}

export async function getPasswordStatus(req, res) {
  try {
    const user = await User.findById(req.user._id).select("passwordHash");
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({ hasPassword: Boolean(user.passwordHash) });
  } catch (error) {
    console.error("Password status lookup error:", { name: error?.name, code: error?.code });
    return res.status(500).json({ error: "Unable to load password settings." });
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user._id).select("name email phone");
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ profile: user });
  } catch (error) {
    console.error("Profile lookup error:", { name: error?.name, code: error?.code });
    return res.status(500).json({ error: "Unable to load your profile." });
  }
}

export async function updateProfile(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
  if (!name) {
    await logActivity(req, {
      action: "auth.profile.update",
      category: "auth",
      summary: "Profile update failed because the name was empty.",
      status: "failure",
    });
    return res.status(400).json({ error: "Enter your name." });
  }

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      await logActivity(req, {
        action: "auth.profile.update",
        category: "auth",
        summary: "Profile update failed because the account was not found.",
        status: "failure",
      });
      return res.status(404).json({ error: "Account not found." });
    }
    const before = { name: user.name, phone: user.phone };
    user.name = name;
    user.phone = phone;
    await user.save();
    await logActivity(req, {
      action: "auth.profile.update",
      category: "auth",
      summary: "Profile information updated.",
      details: { before, after: { name: user.name, phone: user.phone } },
      actor: user,
    });
    return res.json({
      profile: { id: user._id, name: user.name, email: user.email, phone: user.phone },
    });
  } catch (error) {
    console.error("Profile update error:", { name: error?.name, code: error?.code });
    await logActivity(req, {
      action: "auth.profile.update",
      category: "auth",
      summary: "Profile update failed because of a server error.",
      status: "failure",
    });
    return res.status(500).json({ error: "Unable to save your profile." });
  }
}

export async function logout(req, res) {
  const browserId = req.body?.browserId;
  if (
    typeof browserId === "string" &&
    /^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(browserId)
  ) {
    try {
      await PushRegistration.deleteOne({ browserId, userId: req.user._id });
    } catch (error) {
      console.error("Logout push registration cleanup error:", {
        name: error?.name,
        code: error?.code,
      });
    }
  }

  try {
    req.session.revoked = true;
    await req.session.save();
    await logActivity(req, {
      action: "auth.logout",
      category: "auth",
      summary: "Signed out.",
    });
    return res.json({ message: "Signed out successfully." });
  } catch (error) {
    console.error("Logout error:", { name: error?.name, code: error?.code });
    await logActivity(req, {
      action: "auth.logout",
      category: "auth",
      summary: "Sign-out failed because the session could not be revoked.",
      status: "failure",
    });
    return res.status(500).json({ error: "Unable to end this session." });
  }
}
