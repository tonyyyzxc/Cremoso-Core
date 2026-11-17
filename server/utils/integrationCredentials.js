import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import IntegrationCredential from "../models/integrationCredential.js";
import { getEditMetadata } from "./activityLog.js";

export const integrationCredentialFields = {
  googleAuth: ["clientId"],
  recaptcha: ["siteKey", "secretKey"],
  gmail: ["apiKey", "sender"],
  googleDrive: ["clientId", "clientSecret", "redirectUri"],
  googleCalendar: ["clientId", "clientSecret", "redirectUri"],
  googleSheets: ["clientId", "clientSecret", "redirectUri"],
  firebaseMessaging: [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
    "measurementId",
    "vapidKey",
  ],
};

const environmentCredentials = {
  googleAuth: () => ({ clientId: process.env.GOOGLE_CLIENT_ID || "" }),
  recaptcha: () => ({
    siteKey: process.env.RECAPTCHA_SITE_KEY || process.env.VITE_RECAPTCHA_SITE_KEY || "",
    secretKey: process.env.RECAPTCHA_SECRET_KEY || "",
  }),
  gmail: () => ({
    apiKey: process.env.BREVO_API_KEY || "",
    sender: process.env.MAIL_FROM || "",
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
  firebaseMessaging: () => ({
    apiKey: "AIzaSyD_07muvmXKY0TWEVU7dY39qlt3hZWn1mA",
    authDomain: "cremoso-75651.firebaseapp.com",
    projectId: "cremoso-75651",
    storageBucket: "cremoso-75651.firebasestorage.app",
    messagingSenderId: "1067682465252",
    appId: "1:1067682465252:web:a82e1e80148a5278f033f1",
    measurementId: "G-2NE10Z11ZH",
    vapidKey: process.env.FIREBASE_VAPID_KEY
      || process.env.VITE_FIREBASE_VAPID_KEY
      || "",
  }),
};

const warnedLegacyMailOverrides = new Set();

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

export function encryptIntegrationCredentialBundle(credentials) {
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

export function decryptIntegrationCredentialBundle(encryptedPayload) {
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
  if (!stored) return fallback();

  const credentials = decryptIntegrationCredentialBundle(stored.encryptedPayload);
  if (integration === "gmail" && credentials.refreshToken) {
    if (!warnedLegacyMailOverrides.has(integration)) {
      console.warn(
        "Legacy Gmail credentials are ignored for mail delivery; using Brevo environment credentials until the override is updated or removed.",
      );
      warnedLegacyMailOverrides.add(integration);
    }
    return fallback();
  }
  return credentials;
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

export async function saveIntegrationCredentials(integration, credentials, actor) {
  const encryptedPayload = encryptIntegrationCredentialBundle(credentials);
  await IntegrationCredential.findOneAndUpdate(
    { integration },
    { $set: { encryptedPayload, ...getEditMetadata(actor) } },
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
}

export async function removeIntegrationCredentialOverride(integration) {
  await IntegrationCredential.deleteOne({ integration });
}
