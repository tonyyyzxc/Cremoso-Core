import { randomInt } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import IntegrationCredentialChallenge from "../models/integrationCredentialChallenge.js";
import IntegrationCredentialValidation from "../models/integrationCredentialValidation.js";
import User from "../models/user.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { isSuperAdminAccount, getSuperAdminEmail } from "../utils/superAdmin.js";
import { logActivity } from "../utils/activityLog.js";
import {
  sendIntegrationCredentialCode,
  sendIntegrationCredentialTestEmail,
} from "../utils/mailer.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import {
  decryptIntegrationCredentialBundle,
  encryptIntegrationCredentialBundle,
  getIntegrationCredentialStatuses,
  integrationCredentialFields,
  isCredentialEncryptionConfigured,
  saveIntegrationCredentials,
  removeIntegrationCredentialOverride,
} from "../utils/integrationCredentials.js";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const CODE_RESEND_DELAY_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const OAUTH_VALIDATION_STATE_PURPOSE = "integration-credential-validation";
const oauthValidationScopes = {
  googleDrive: "https://www.googleapis.com/auth/drive",
  googleCalendar: "https://www.googleapis.com/auth/calendar.events",
  googleSheets: "https://www.googleapis.com/auth/spreadsheets",
};
const oauthValidationCallbackPaths = {
  googleDrive: "/api/drive/callback",
  googleCalendar: "/api/calendar/callback",
  googleSheets: "/api/sheets/callback",
};

function validIntegration(integration) {
  return Object.hasOwn(integrationCredentialFields, integration);
}

export async function getIntegrationCredentialStatus(_req, res) {
  try {
    return res.json({
      integrations: await getIntegrationCredentialStatuses(),
      encryptionConfigured: isCredentialEncryptionConfigured(),
    });
  } catch (error) {
    console.error("Integration credential status error:", error);
    return res.status(500).json({ error: "Unable to load integration credential status." });
  }
}

export async function requestIntegrationCredentialCode(req, res) {
  const identifier = typeof req.body?.identifier === "string"
    ? req.body.identifier.trim().toLowerCase()
    : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const superAdminEmail = getSuperAdminEmail();

  if (!identifier || !password) {
    return res.status(400).json({ error: "Enter your username or email and password." });
  }
  if (!superAdminEmail || !isSuperAdminAccount(req.user)) {
    return res.status(403).json({ error: "Only the configured Super Admin can manage integration credentials." });
  }

  try {
    const user = await User.findById(req.user._id).select("username email passwordHash");
    const validIdentifier = [user?.username, user?.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase() === identifier);
    if (!user?.passwordHash || !validIdentifier || !(await comparePassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "The username/email or password is incorrect." });
    }

    const latestChallenge = await IntegrationCredentialChallenge.findOne({ userId: user._id })
      .sort({ sentAt: -1 });
    if (latestChallenge && Date.now() - latestChallenge.sentAt.getTime() < CODE_RESEND_DELAY_MS) {
      return res.status(429).json({ error: "Wait one minute before requesting another verification code." });
    }
    await IntegrationCredentialChallenge.deleteMany({ userId: user._id });

    const email = user.email.toLowerCase();
    if (email !== superAdminEmail) {
      return res.status(403).json({ error: "The Super Admin email configuration does not match this account." });
    }

    const code = String(randomInt(100000, 1000000));
    const challenge = await IntegrationCredentialChallenge.create({
      userId: user._id,
      codeHash: await hashPassword(code),
      expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      sentAt: new Date(),
    });

    try {
      await sendIntegrationCredentialCode(email, code);
    } catch (error) {
      await IntegrationCredentialChallenge.findByIdAndDelete(challenge._id);
      throw error;
    }

    return res.json({ challengeId: challenge._id, expiresInSeconds: CODE_EXPIRY_MS / 1000 });
  } catch (error) {
    console.error("Integration credential code delivery error:", error);
    return res.status(503).json({ error: "Unable to send the verification code. Check the Brevo email configuration." });
  }
}

export async function verifyIntegrationCredentialCode(req, res) {
  const { challengeId } = req.body || {};
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (
    typeof challengeId !== "string"
    || !/^[a-f\d]{24}$/i.test(challengeId)
    || !/^\d{6}$/.test(code)
  ) {
    res.status(400).json({ error: "A valid challenge ID and six-digit code are required." });
    return null;
  }

  try {
    const challenge = await IntegrationCredentialChallenge.findOne({
      _id: challengeId,
      userId: req.user._id,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_CODE_ATTEMPTS },
      verifiedAt: null,
    }).select("+codeHash");
    if (!challenge) {
      return res.status(400).json({ error: "The verification code is invalid or expired. Request a new code." });
    }

    if (!(await comparePassword(code, challenge.codeHash))) {
      challenge.attempts += 1;
      await challenge.save();
      return res.status(400).json({ error: "The verification code is incorrect." });
    }

    challenge.verifiedAt = new Date();
    await challenge.save();
    return res.json({ verified: true });
  } catch (error) {
    console.error("Integration credential code verification error:", error);
    return res.status(500).json({ error: "Unable to verify the code." });
  }
}

async function findVerifiedChallenge(userId, challengeId) {
  if (typeof challengeId !== "string" || !/^[a-f\d]{24}$/i.test(challengeId)) {
    return null;
  }

  return IntegrationCredentialChallenge.findOne({
    _id: challengeId,
    userId,
    expiresAt: { $gt: new Date() },
    verifiedAt: { $ne: null },
  });
}

async function consumeVerifiedChallenge(req, res) {
  const { challengeId } = req.body || {};
  if (typeof challengeId !== "string" || !/^[a-f\d]{24}$/i.test(challengeId)) {
    res.status(400).json({ error: "A valid verified challenge ID is required." });
    return null;
  }

  const challenge = await IntegrationCredentialChallenge.findOneAndDelete({
    _id: challengeId,
    userId: req.user._id,
    expiresAt: { $gt: new Date() },
    verifiedAt: { $ne: null },
  });
  if (!challenge) {
    res.status(400).json({ error: "The verification has expired. Request a new code." });
    return null;
  }

  return true;
}

function validateCredentials(integration, input) {
  const expectedFields = integrationCredentialFields[integration];
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== expectedFields.length || keys.some((key) => !expectedFields.includes(key))) {
    return null;
  }
  const credentials = {};
  for (const field of expectedFields) {
    if (
      typeof input[field] !== "string"
      || !input[field].trim()
      || input[field].length > 8192
      || /[\r\n\0]/.test(input[field])
    ) {
      return null;
    }
    credentials[field] = input[field].trim();
  }
  return credentials;
}

async function persistValidatedCredentials(req, res, integration, credentials) {
  if (!(await consumeVerifiedChallenge(req, res))) return false;
  await saveIntegrationCredentials(integration, credentials);
  await logActivity(req, {
    action: "integration.credentials.replaced",
    category: "config",
    summary: `Credentials for ${integration} were validated and replaced.`,
    details: { integration },
    force: true,
  });
  return true;
}

function getOAuthClient(credentials) {
  return new OAuth2Client(
    credentials.clientId,
    credentials.clientSecret,
    credentials.redirectUri,
  );
}

export async function validateAndSaveIntegrationCredentials(req, res) {
  const { integration } = req.params;
  if (!validIntegration(integration)) {
    return res.status(404).json({ error: "Unknown integration credential set." });
  }

  const credentials = validateCredentials(integration, req.body?.credentials);
  if (!credentials) {
    return res.status(400).json({ error: "Provide every required credential field with a valid value." });
  }

  try {
    const challenge = await findVerifiedChallenge(req.user._id, req.body?.challengeId);
    if (!challenge) {
      return res.status(400).json({ error: "Complete the account and OTP verification first." });
    }
    if (!isCredentialEncryptionConfigured()) {
      return res.status(503).json({ error: "Credential encryption is not configured." });
    }

    if (integration === "googleAuth") {
      if (typeof req.body?.idToken !== "string" || !req.body.idToken) {
        return res.status(400).json({ error: "Complete the Google sign-in test first." });
      }
      const ticket = await new OAuth2Client(credentials.clientId).verifyIdToken({
        idToken: req.body.idToken,
        audience: credentials.clientId,
      });
      const payload = ticket.getPayload();
      if (
        !payload?.email_verified
        || payload.email?.toLowerCase() !== getSuperAdminEmail()
      ) {
        return res.status(422).json({ error: "Google sign-in validation failed." });
      }
    } else if (integration === "recaptcha") {
      const responseToken = typeof req.body?.responseToken === "string"
        ? req.body.responseToken
        : "";
      if (!responseToken) {
        return res.status(400).json({ error: "Complete the reCAPTCHA test first." });
      }
      const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: credentials.secretKey, response: responseToken }),
      });
      const result = await response.json();
      const expectedHostname = new URL(
        process.env.CLIENT_URL || "http://localhost:5173",
      ).hostname;
      if (
        !response.ok
        || result.success !== true
        || (result.hostname && result.hostname !== expectedHostname)
      ) {
        return res.status(422).json({
          error: "reCAPTCHA validation failed. Check that the site key and secret match.",
        });
      }
    } else if (integration === "gmail") {
      await sendIntegrationCredentialTestEmail(getSuperAdminEmail(), credentials);
    } else if (integration === "firebaseMessaging") {
      if (
        !/^[a-z0-9-]+$/.test(credentials.projectId)
        || !/^[A-Za-z0-9_-]{20,}$/.test(credentials.vapidKey)
        || !credentials.authDomain.includes(".")
        || !credentials.appId.startsWith("1:")
      ) {
        return res.status(422).json({
          error: "Check the Firebase project values and VAPID public key.",
        });
      }
    } else if (oauthValidationScopes[integration]) {
      let redirectUrl;
      try {
        redirectUrl = new URL(credentials.redirectUri);
      } catch {
        return res.status(422).json({ error: "Enter a valid Google OAuth redirect URI." });
      }
      if (!redirectUrl.pathname.endsWith(oauthValidationCallbackPaths[integration])) {
        return res.status(422).json({
          error: `Use this integration's callback path: ${oauthValidationCallbackPaths[integration]}`,
        });
      }
      await IntegrationCredentialValidation.deleteMany({
        integration,
        userId: req.user._id,
      });
      const validation = await IntegrationCredentialValidation.create({
        integration,
        userId: req.user._id,
        challengeId: challenge._id,
        encryptedPayload: encryptIntegrationCredentialBundle(credentials),
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      });
      const auth = getOAuthClient(credentials);
      const state = signToken({
        id: req.user._id.toString(),
        purpose: OAUTH_VALIDATION_STATE_PURPOSE,
        integration,
        validationId: validation._id.toString(),
      }, "10m");
      const authorizationUrl = auth.generateAuthUrl({
        access_type: "online",
        prompt: "consent",
        scope: [oauthValidationScopes[integration], "openid", "email"],
        login_hint: getSuperAdminEmail(),
        state,
      });
      return res.json({ authorizationUrl });
    } else {
      return res.status(400).json({ error: "Credential validation is not supported for this integration." });
    }

    if (!(await persistValidatedCredentials(req, res, integration, credentials))) return;
    return res.json({ message: "Credentials validated and saved." });
  } catch (error) {
    console.error(`Integration credential validation failed for ${integration}:`, {
      code: error?.code || error?.response?.data?.error,
      status: error?.response?.status,
    });
    return res.status(422).json({
      error: `Unable to validate ${integration} credentials. The previous credentials remain active.`,
    });
  }
}

function redirectAfterOAuthValidation(res, integration, status, reason = "") {
  const destination = new URL(
    "/settings",
    process.env.CLIENT_URL || "http://localhost:5173",
  );
  destination.searchParams.set("credentialValidation", status);
  destination.searchParams.set("integration", integration);
  if (reason) destination.searchParams.set("reason", reason);
  return res.redirect(destination.toString());
}

export async function handleOAuthCredentialValidationCallback(req, res, state, integration) {
  if (
    state?.purpose !== OAUTH_VALIDATION_STATE_PURPOSE
    || state.integration !== integration
    || typeof state.validationId !== "string"
    || typeof state.id !== "string"
  ) {
    return res.status(400).send("Invalid integration credential validation state.");
  }

  let validation;
  try {
    validation = await IntegrationCredentialValidation.findOne({
      _id: state.validationId,
      integration,
      userId: state.id,
      expiresAt: { $gt: new Date() },
    }).select("+encryptedPayload");
    if (!validation) return redirectAfterOAuthValidation(res, integration, "failed", "expired");
    if (req.query.error || typeof req.query.code !== "string") {
      await IntegrationCredentialValidation.findByIdAndDelete(validation._id);
      return redirectAfterOAuthValidation(res, integration, "failed", "authorization");
    }

    const user = await User.findOne({ _id: state.id, status: "active" });
    if (!isSuperAdminAccount(user)) {
      await IntegrationCredentialValidation.findByIdAndDelete(validation._id);
      return redirectAfterOAuthValidation(res, integration, "failed", "account");
    }

    const credentials = decryptIntegrationCredentialBundle(validation.encryptedPayload);
    const auth = getOAuthClient(credentials);
    const { tokens } = await auth.getToken(req.query.code);
    if (!tokens.access_token) throw new Error("No OAuth access token was returned.");
    if (!tokens.id_token) throw new Error("The provider did not return an identity token.");
    const identityTicket = await new OAuth2Client(credentials.clientId).verifyIdToken({
      idToken: tokens.id_token,
      audience: credentials.clientId,
    });
    if (identityTicket.getPayload()?.email?.toLowerCase() !== getSuperAdminEmail()) {
      throw new Error("OAuth test must use the configured Super Admin account.");
    }
    auth.setCredentials(tokens);

    if (integration === "googleDrive") {
      const result = await google.drive({ version: "v3", auth }).about.get({
        fields: "user(emailAddress)",
      });
      if (result.data.user?.emailAddress?.toLowerCase() !== getSuperAdminEmail()) {
        throw new Error("Drive test was not authorized for the Super Admin account.");
      }
    } else if (integration === "googleCalendar") {
      await google.calendar({ version: "v3", auth }).events.list({
        calendarId: "primary",
        maxResults: 1,
      });
    } else if (integration === "googleSheets") {
      const grantedScopes = (tokens.scope || "").split(" ");
      if (!grantedScopes.includes(oauthValidationScopes.googleSheets)) {
        throw new Error("The required Google Sheets scope was not granted.");
      }
    }

    const challenge = await IntegrationCredentialChallenge.findOneAndDelete({
      _id: validation.challengeId,
      userId: user._id,
      expiresAt: { $gt: new Date() },
      verifiedAt: { $ne: null },
    });
    if (!challenge) throw new Error("The verification challenge expired.");

    await saveIntegrationCredentials(integration, credentials);
    await IntegrationCredentialValidation.findByIdAndDelete(validation._id);
    await logActivity(req, {
      actor: user,
      action: "integration.credentials.replaced",
      category: "config",
      summary: `Credentials for ${integration} were validated and replaced.`,
      details: { integration },
      force: true,
    });
    return redirectAfterOAuthValidation(res, integration, "success");
  } catch (error) {
    if (validation) await IntegrationCredentialValidation.findByIdAndDelete(validation._id);
    console.error(`Integration OAuth validation failed for ${integration}:`, {
      code: error?.code || error?.response?.data?.error,
      status: error?.response?.status,
    });
    const issue = error?.response?.status === 403 ? "api_access" : "credentials";
    return redirectAfterOAuthValidation(res, integration, "failed", issue);
  }
}

export async function removeIntegrationCredentials(req, res) {
  const { integration } = req.params;
  if (!validIntegration(integration)) {
    return res.status(404).json({ error: "Unknown integration credential set." });
  }

  try {
    if (!(await consumeVerifiedChallenge(req, res))) return;
    await removeIntegrationCredentialOverride(integration);
    await logActivity(req, {
      action: "integration.credentials.override_removed",
      category: "config",
      summary: `The credential override for ${integration} was removed.`,
      details: { integration },
      force: true,
    });
    return res.json({ message: "Credential override removed. Environment credentials are active." });
  } catch (error) {
    console.error("Integration credential removal error:", error);
    return res.status(500).json({ error: "Unable to remove the integration credential override." });
  }
}
