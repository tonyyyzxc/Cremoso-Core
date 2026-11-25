// Utilities for Google Drive OAuth clients and API error responses.
import { google } from "googleapis";
import User from "../models/user.js";
import { isIntegrationEnabled } from "./integrationConfig.js";
import { getIntegrationCredentials } from "./integrationCredentials.js";

export async function createOAuthClient() {
  const { clientId, clientSecret, redirectUri } =
    await getIntegrationCredentials("googleDrive");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Drive OAuth is not fully configured.");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
}

// Build a Google Drive API client using this user's saved OAuth refresh token.
export async function getDriveClient(userId, { requireDriveEnabled = true } = {}) {
  if (requireDriveEnabled && !(await isIntegrationEnabled("googleDriveEnabled"))) {
    return { error: "Google Drive is disabled by an administrator.", status: 503 };
  }
  const user = await User.findById(userId).select("+driveRefreshToken");
  if (!user?.driveRefreshToken) {
    return { error: "Google Drive is not connected.", status: 409 };
  }
  const auth = await createOAuthClient();
  auth.setCredentials({ refresh_token: user.driveRefreshToken });
  return { auth, drive: google.drive({ version: "v3", auth }) };
}

export function isInvalidGrant(error) {
  return error?.response?.data?.error === "invalid_grant"
    || error?.code === "invalid_grant"
    || error?.message?.includes("invalid_grant");
}

export async function sendDriveError(error, req, res) {
  if (isInvalidGrant(error)) {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { driveRefreshToken: "" } },
    );
    return res.status(401).json({
      code: "DRIVE_RECONNECT_REQUIRED",
      error: "Your Google Drive connection expired or was revoked. Reconnect required.",
    });
  }

  console.error("Google Drive request error:", error);
  return res.status(500).json({ error: "Unable to complete the Google Drive request." });
}
