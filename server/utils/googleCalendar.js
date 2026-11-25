// Utilities for Google Calendar OAuth clients and API error responses.
import { google } from "googleapis";
import User from "../models/user.js";
import { isIntegrationEnabled } from "./integrationConfig.js";
import { getIntegrationCredentials } from "./integrationCredentials.js";

export async function createCalendarOAuthClient() {
  const { clientId, clientSecret, redirectUri } =
    await getIntegrationCredentials("googleCalendar");
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google Calendar OAuth is not fully configured.");
  }
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri,
  );
}

export async function getCalendarClient(userId) {
  if (!(await isIntegrationEnabled("googleCalendarEnabled"))) {
    return { error: "Google Calendar is disabled by an administrator.", status: 503 };
  }
  const user = await User.findById(userId).select("+googleCalendarRefreshToken");
  if (!user?.googleCalendarRefreshToken) {
    return {
      error: "Connect Google Calendar before syncing shifts.",
      status: 409,
      code: "CALENDAR_RECONNECT_REQUIRED",
    };
  }

  const auth = await createCalendarOAuthClient();
  auth.setCredentials({ refresh_token: user.googleCalendarRefreshToken });
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
      { $unset: { googleCalendarRefreshToken: "" } },
    );
    return res.status(401).json({
      code: "GOOGLE_RECONNECT_REQUIRED",
      error: "Your Google Calendar connection expired or was revoked. Reconnect Google Calendar.",
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
        { $unset: { googleCalendarRefreshToken: "" } },
      );
    }
    return res.status(apiDisabled ? 503 : 409).json({
      code: apiDisabled ? "GOOGLE_CALENDAR_API_DISABLED" : "CALENDAR_RECONNECT_REQUIRED",
      error: apiDisabled
        ? "Google Calendar API is disabled for this Google Cloud project."
        : "Reconnect Google Calendar to grant event access.",
    });
  }

  console.error("Google Calendar request error:", error);
  return res.status(500).json({ error: "Unable to sync the shift with Google Calendar." });
}
