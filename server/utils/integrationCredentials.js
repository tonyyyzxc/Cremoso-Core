import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import IntegrationCredential from "../models/integrationCredential.js";

export const integrationCredentialFields = {
  googleAuth: ["clientId"],
  recaptcha: ["siteKey", "secretKey"],
  gmail: ["clientId", "clientSecret", "refreshToken", "sender"],
  googleDrive: ["clientId", "clientSecret", "redirectUri"],
  googleCalendar: ["clientId", "clientSecret", "redirectUri"],
  googleSheets: ["clientId", "clientSecret", "redirectUri"],
};

const environmentCredentials = {
  googleAuth: () => ({ clientId: process.env.GOOGLE_CLIENT_ID || "" }),
  recaptcha: () => ({
    siteKey: process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY || "",
    secretKey: process.env.RECAPTCHA_SECRET_KEY || "",
  }),
  gmail: () => ({
    clientId: process.env.GMAIL_CLIENT_ID || "",
    clientSecret: process.env.GMAIL_CLIENT_SECRET || "",
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || "",
    sender: process.env.GMAIL_SENDER || "",
  }),
  googleDrive: () => ({
    clientId: process.env.DRIVE_CLIENT_ID || "",
    clientSecret: process.env.DRIVE_CLIENT_SECRET || "",
    redirectUri: process.env.DRIVE_REDIRECT_URI || "",
  }),
  googleCalendar: () => ({
    clientId: process.env.CALENDAR_CLIENT_ID || "",
    clientSecret: process.env.CALENDAR_CLIENT_SECRET || "",
    redirectUri: process.env.CALENDAR_REDIRECT_URI || "",
  }),
  googleSheets: () => ({
    clientId: process.env.SHEETS_CLIENT_ID || "",
    clientSecret: process.env.SHEETS_CLIENT_SECRET || "",
    redirectUri: process.env.SHEETS_REDIRECT_URI || "",
  }),
};

function getEncryptionKey() {
  const encodedKey = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY || "";
  if (!/^[a-f\d]{64}$/i.test(encodedKey)) {
    throw new Error("Integration credential encryption is not configured.");
  }
  return Buffer.from(encodedKey, "hex");
}

export function isCredentialEncryptionConfigured() {
  return /^[a-f\d]{64}$/i.test(
    process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY || "",
  );
}

function encryptCredentials(credentials) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decryptCredentials(encryptedPayload) {
  const [encodedIv, encodedTag, encodedCiphertext] = encryptedPayload.split(".");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext);
}

export async function getIntegrationCredentials(integration) {
  const fallback = environmentCredentials[integration];
  if (!fallback) throw new Error("Unknown integration credential set.");

  const stored = await IntegrationCredential.findOne({ integration })
    .select("+encryptedPayload");
  return stored ? decryptCredentials(stored.encryptedPayload) : fallback();
}

export async function getIntegrationCredentialStatuses() {
  const storedIntegrations = await IntegrationCredential.find().select("integration");
  const overrides = new Set(storedIntegrations.map(({ integration }) => integration));
  const statuses = {};

  for (const integration of Object.keys(integrationCredentialFields)) {
    if (overrides.has(integration) && !isCredentialEncryptionConfigured()) {
      statuses[integration] = { hasOverride: true, configured: null };
      continue;
    }
    const credentials = await getIntegrationCredentials(integration);
    statuses[integration] = {
      hasOverride: overrides.has(integration),
      configured: integrationCredentialFields[integration].every(
        (field) => Boolean(credentials[field]?.trim()),
      ),
    };
  }
  return statuses;
}

export async function saveIntegrationCredentials(integration, credentials) {
  const encryptedPayload = encryptCredentials(credentials);
  await IntegrationCredential.findOneAndUpdate(
    { integration },
    { $set: { encryptedPayload } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

export async function removeIntegrationCredentialOverride(integration) {
  await IntegrationCredential.deleteOne({ integration });
}
