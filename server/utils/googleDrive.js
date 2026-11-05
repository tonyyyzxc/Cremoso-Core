import { google } from "googleapis";
import User from "../models/user.js";

export function createOAuthClient() {
  const { DRIVE_CLIENT_ID, DRIVE_CLIENT_SECRET, DRIVE_REDIRECT_URI } =
    process.env;
  if (!DRIVE_CLIENT_ID || !DRIVE_CLIENT_SECRET || !DRIVE_REDIRECT_URI) {
    throw new Error("Google Drive OAuth is not fully configured.");
  }
  return new google.auth.OAuth2(
    DRIVE_CLIENT_ID,
    DRIVE_CLIENT_SECRET,
    DRIVE_REDIRECT_URI,
  );
}

// Build a Google Drive API client using this user's saved OAuth refresh token.
export async function getDriveClient(userId) {
  const user = await User.findById(userId).select("+driveRefreshToken");
  if (!user?.driveRefreshToken) {
    return { error: "Google Drive is not connected.", status: 409 };
  }
  const auth = createOAuthClient();
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
