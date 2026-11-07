import { google } from "googleapis";
import User from "../models/user.js";
import { createOAuthClient } from "./googleDrive.js";

export async function getCalendarClient(userId) {
  const user = await User.findById(userId).select("+driveRefreshToken");
  if (!user?.driveRefreshToken) {
    return {
      error: "Connect Google Drive and Calendar before syncing shifts.",
      status: 409,
      code: "GOOGLE_CONNECTION_REQUIRED",
    };
  }
  if (!user.googleCalendarConnected) {
    return {
      error: "Reconnect Google from YourDrive to grant Calendar event access.",
      status: 409,
      code: "CALENDAR_RECONNECT_REQUIRED",
    };
  }

  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: user.driveRefreshToken });
  return { calendar: google.calendar({ version: "v3", auth }) };
}

export async function sendCalendarError(error, req, res) {
  if (
    error?.response?.data?.error === "invalid_grant"
    || error?.code === "invalid_grant"
    || error?.message?.includes("invalid_grant")
  ) {
    await User.updateOne(
      { _id: req.user._id },
      {
        $unset: { driveRefreshToken: "" },
        $set: { googleCalendarConnected: false },
      },
    );
    return res.status(401).json({
      code: "GOOGLE_RECONNECT_REQUIRED",
      error: "Your Google connection expired or was revoked. Reconnect from YourDrive.",
    });
  }

  const googleError = error?.response?.data?.error;
  const reasons = googleError?.errors?.map((entry) => entry.reason) || [];
  const details = `${googleError?.status || ""} ${googleError?.message || ""} ${reasons.join(" ")}`.toLowerCase();
  if (
    error?.response?.status === 403
    && (
      details.includes("insufficient")
      || details.includes("scope")
      || details.includes("service_disabled")
      || details.includes("accessnotconfigured")
      || details.includes("has not been used in project")
    )
  ) {
    const apiDisabled = details.includes("service_disabled")
      || details.includes("accessnotconfigured")
      || details.includes("has not been used in project");
    if (!apiDisabled) {
      await User.updateOne(
        { _id: req.user._id },
        { $set: { googleCalendarConnected: false } },
      );
    }
    return res.status(apiDisabled ? 503 : 409).json({
      code: apiDisabled ? "GOOGLE_CALENDAR_API_DISABLED" : "CALENDAR_RECONNECT_REQUIRED",
      error: apiDisabled
        ? "Google Calendar API is disabled for this Google Cloud project."
        : "Reconnect Google from YourDrive to grant Calendar event access.",
    });
  }

  console.error("Google Calendar request error:", error);
  return res.status(500).json({ error: "Unable to sync the shift with Google Calendar." });
}
