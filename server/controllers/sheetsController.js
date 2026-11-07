import User from "../models/user.js";
import { createGoogleSheet } from "../utils/googleSheets.js";
import {
  createSheetsOAuthClient,
  getSheetsClient,
  sendSheetsError,
} from "../utils/googleSheetsAuth.js";
import { isIntegrationEnabled, requireIntegration } from "../utils/integrationConfig.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { handleOAuthCredentialValidationCallback } from "./integrationCredentialsController.js";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_STATE_PURPOSE = "sheets-oauth";

function redirectAfterOAuth(res, status) {
  const destination = new URL(
    "/reports",
    process.env.CLIENT_URL || "http://localhost:5173",
  );
  if (status) destination.searchParams.set("sheet", status);
  return res.redirect(destination.toString());
}

export async function getSheetsStatus(req, res) {
  try {
    const enabled = await isIntegrationEnabled("googleSheetsEnabled");
    const user = await User.findById(req.user._id).select("+googleSheetsRefreshToken");
    return res.json({
      enabled,
      connected: enabled && Boolean(user?.googleSheetsRefreshToken),
    });
  } catch (error) {
    console.error("Google Sheets status error:", error);
    return res.status(500).json({ error: "Unable to load Google Sheets connection status." });
  }
}

export async function getSheetsConnectUrl(req, res) {
  try {
    if (!(await requireIntegration("googleSheetsEnabled", res, "Google Sheets"))) return;
    const auth = await createSheetsOAuthClient();
    const state = signToken(
      { id: req.user._id.toString(), purpose: SHEETS_STATE_PURPOSE },
      "10m",
    );
    const url = auth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [SHEETS_SCOPE],
      state,
    });
    return res.json({ url });
  } catch (error) {
    console.error("Google Sheets connect error:", error);
    return res.status(500).json({ error: "Unable to start Google Sheets connection." });
  }
}

export async function handleSheetsCallback(req, res) {
  let state;
  try {
    state = verifyToken(req.query.state);
    if (state.purpose === "integration-credential-validation") {
      return handleOAuthCredentialValidationCallback(req, res, state, "googleSheets");
    }
    if (state.purpose !== SHEETS_STATE_PURPOSE || typeof state.id !== "string") {
      return res.status(400).send("Invalid Google Sheets authorization state.");
    }
  } catch {
    return res.status(400).send("Google Sheets authorization state is invalid or expired.");
  }

  if (req.query.error) return redirectAfterOAuth(res, "connect_cancelled");
  if (typeof req.query.code !== "string") return redirectAfterOAuth(res, "connect_failed");
  if (!(await isIntegrationEnabled("googleSheetsEnabled"))) return redirectAfterOAuth(res, "disabled");

  try {
    const auth = await createSheetsOAuthClient();
    const { tokens } = await auth.getToken(req.query.code);
    if (!tokens.refresh_token) return redirectAfterOAuth(res, "connect_failed");
    const user = await User.findOne({ _id: state.id, status: "active" });
    if (!user) return redirectAfterOAuth(res, "connect_failed");
    user.googleSheetsRefreshToken = tokens.refresh_token;
    await user.save();
    return redirectAfterOAuth(res, "connected");
  } catch (error) {
    console.error("Google Sheets callback error:", error);
    return redirectAfterOAuth(res, "connect_failed");
  }
}

export async function disconnectSheets(req, res) {
  if (!(await requireIntegration("googleSheetsEnabled", res, "Google Sheets"))) return;
  try {
    const user = await User.findById(req.user._id).select("+googleSheetsRefreshToken");
    if (user?.googleSheetsRefreshToken) {
      try {
        const auth = await createSheetsOAuthClient();
        await auth.revokeToken(user.googleSheetsRefreshToken);
      } catch (error) {
        console.warn("Google Sheets token revocation failed:", error?.message);
      }
      user.googleSheetsRefreshToken = undefined;
      await user.save();
    }
    return res.json({ connected: false });
  } catch (error) {
    console.error("Google Sheets disconnect error:", error);
    return res.status(500).json({ error: "Unable to disconnect Google Sheets." });
  }
}

function isSheetsApiDisabled(error) {
  const googleError = error?.response?.data?.error;
  const reasons = googleError?.errors?.map((entry) => entry.reason) || [];
  const details = `${googleError?.status || ""} ${googleError?.message || ""} ${reasons.join(" ")}`.toLowerCase();
  return error?.response?.status === 403 && (
    details.includes("service_disabled")
    || details.includes("accessnotconfigured")
    || details.includes("has not been used in project")
    || details.includes("google sheets api has not been enabled")
  );
}

export async function exportGoogleSheet(req, res) {
  if (!(await requireIntegration("googleSheetsEnabled", res, "Google Sheets export"))) return;
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const rows = req.body.rows;
  if (!title || !Array.isArray(rows) || !rows.length || rows.some((row) => !Array.isArray(row))) {
    return res.status(400).json({ error: "A report title and rows are required." });
  }

  try {
    const { auth, sheets, error, status } = await getSheetsClient(req.user._id);
    if (!sheets) {
      return res.status(status).json({
        code: "SHEETS_RECONNECT_REQUIRED",
        error: error || "Connect Google Sheets before exporting.",
      });
    }
    const spreadsheetUrl = await createGoogleSheet(auth, title, rows);
    return res.status(201).json({ spreadsheetUrl });
  } catch (error) {
    if (isSheetsApiDisabled(error)) {
      return res.status(503).json({
        error: "Google Sheets API is disabled for this Google Cloud project. Enable it in Google Cloud Console and try again.",
      });
    }
    return sendSheetsError(error, req, res);
  }
}
