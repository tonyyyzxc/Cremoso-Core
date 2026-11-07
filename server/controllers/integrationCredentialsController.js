import { randomInt } from "node:crypto";
import IntegrationCredentialChallenge from "../models/integrationCredentialChallenge.js";
import User from "../models/user.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { isSuperAdminAccount, getSuperAdminEmail } from "../utils/superAdmin.js";
import { logActivity } from "../utils/activityLog.js";
import { sendIntegrationCredentialCode } from "../utils/mailer.js";
import {
  getIntegrationCredentialStatuses,
  integrationCredentialFields,
  isCredentialEncryptionConfigured,
  saveIntegrationCredentials,
  removeIntegrationCredentialOverride,
} from "../utils/integrationCredentials.js";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const CODE_RESEND_DELAY_MS = 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

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
    return res.status(503).json({ error: "Unable to send the verification code. Check the Gmail integration configuration." });
  }
}

async function consumeVerifiedChallenge(req, res) {
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

  const challenge = await IntegrationCredentialChallenge.findOne({
    _id: challengeId,
    userId: req.user._id,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_CODE_ATTEMPTS },
  }).select("+codeHash");
  if (!challenge) {
    res.status(400).json({ error: "The verification code is invalid or expired. Request a new code." });
    return null;
  }

  if (!(await comparePassword(code, challenge.codeHash))) {
    challenge.attempts += 1;
    await challenge.save();
    res.status(400).json({ error: "The verification code is incorrect." });
    return null;
  }

  await IntegrationCredentialChallenge.findByIdAndDelete(challenge._id);
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

export async function replaceIntegrationCredentials(req, res) {
  const { integration } = req.params;
  if (!validIntegration(integration)) {
    return res.status(404).json({ error: "Unknown integration credential set." });
  }

  const credentials = validateCredentials(integration, req.body?.credentials);
  if (!credentials) {
    return res.status(400).json({ error: "Provide every required credential field with a valid value." });
  }

  try {
    if (!(await consumeVerifiedChallenge(req, res))) return;
    await saveIntegrationCredentials(integration, credentials);
    await logActivity(req, {
      action: "integration.credentials.replaced",
      category: "config",
      summary: `Credentials for ${integration} were replaced.`,
      details: { integration },
      force: true,
    });
    return res.json({ message: "Integration credentials saved." });
  } catch (error) {
    console.error("Integration credential save error:", error);
    return res.status(500).json({ error: "Unable to save integration credentials. Confirm the encryption key is configured." });
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
