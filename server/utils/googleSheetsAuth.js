// Utilities for Google Sheets OAuth and authenticated API clients.
import { google } from "googleapis";
import User from "../models/user.js";
import { isIntegrationEnabled } from "./integrationConfig.js";
import { getIntegrationCredentials } from "./integrationCredentials.js";

export async function createSheetsOAuthClient() {
  const { clientId, clientSecret, redirectUri } =
    await getIntegrationCredentials("googleSheets");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Sheets OAuth is not fully configured.");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
}

export async function getSheetsClient(userId) {
  if (!(await isIntegrationEnabled("googleSheetsEnabled"))) {
    return { error: "Google Sheets is disabled by an administrator.", status: 503 };
  }
  const user = await User.findById(userId).select("+googleSheetsRefreshToken");
  if (!user?.googleSheetsRefreshToken) {
    return { error: "Google Sheets is not connected.", status: 409 };
  }
  const auth = await createSheetsOAuthClient();
  auth.setCredentials({ refresh_token: user.googleSheetsRefreshToken });
  return { auth, sheets: google.sheets({ version: "v4", auth }) };
}

export async function sendSheetsError(error, req, res) {
  if (
    error?.response?.data?.error === "invalid_grant"
    || error?.code === "invalid_grant"
    || error?.message?.includes("invalid_grant")
  ) {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { googleSheetsRefreshToken: "" } },
    );
    return res.status(401).json({
      code: "SHEETS_RECONNECT_REQUIRED",
      error: "Your Google Sheets connection expired or was revoked. Reconnect Google Sheets.",
    });
  }

  console.error("Google Sheets request error:", error);
  return res.status(500).json({ error: "Unable to complete the Google Sheets request." });
}
