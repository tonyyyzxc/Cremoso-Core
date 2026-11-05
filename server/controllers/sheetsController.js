import {
  getDriveClient,
  sendDriveError,
} from "../utils/googleDrive.js";
import { createGoogleSheet } from "../utils/googleSheets.js";

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

// Create a spreadsheet and write the supplied report rows through Google Sheets API.
export async function exportDriveSheet(req, res) {
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const rows = req.body.rows;
  if (!title || !Array.isArray(rows) || !rows.length || rows.some((row) => !Array.isArray(row))) {
    return res.status(400).json({ error: "A report title and rows are required." });
  }

  try {
    const { auth, drive, status } = await getDriveClient(req.user._id);
    if (!drive) {
      return res.status(status).json({
        code: "DRIVE_RECONNECT_REQUIRED",
        error: "Google Drive is not connected. Connect it from YourDrive to continue.",
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
    return sendDriveError(error, req, res);
  }
}
