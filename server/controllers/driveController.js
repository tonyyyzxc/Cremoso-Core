import { Readable } from "stream";
import { google } from "googleapis";
import User from "../models/user.js";
import { signToken, verifyToken } from "../utils/jwt.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_STATE_PURPOSE = "drive-oauth";
const GOOGLE_EXPORT_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
]);

function createOAuthClient() {
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

function redirectToDrive(res, status) {
  const destination = new URL(
    "/drive",
    process.env.CLIENT_URL || "http://localhost:5173",
  );
  if (status) destination.searchParams.set("drive", status);
  return res.redirect(destination.toString());
}

function isInvalidGrant(error) {
  return error?.response?.data?.error === "invalid_grant"
    || error?.code === "invalid_grant"
    || error?.message?.includes("invalid_grant");
}

async function sendDriveError(error, req, res) {
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

async function getDriveClient(userId) {
  const user = await User.findById(userId).select("+driveRefreshToken");
  if (!user?.driveRefreshToken) {
    return { error: "Google Drive is not connected.", status: 409 };
  }
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: user.driveRefreshToken });
  return { auth, drive: google.drive({ version: "v3", auth }) };
}

export async function getDriveStatus(req, res) {
  try {
    const user = await User.findById(req.user._id).select("+driveRefreshToken");
    return res.json({ connected: Boolean(user?.driveRefreshToken) });
  } catch (error) {
    console.error("Google Drive status error:", error);
    return res.status(500).json({ error: "Unable to load Google Drive status." });
  }
}

export function getDriveConnectUrl(req, res) {
  try {
    const auth = createOAuthClient();
    const state = signToken(
      { id: req.user._id.toString(), purpose: DRIVE_STATE_PURPOSE },
      "10m",
    );
    const url = auth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [DRIVE_SCOPE],
      state,
    });
    return res.json({ url });
  } catch (error) {
    console.error("Google Drive connect error:", error);
    return res.status(500).json({ error: "Unable to start Google Drive connection." });
  }
}

export async function handleDriveCallback(req, res) {
  let state;
  try {
    state = verifyToken(req.query.state);
    if (
      state.purpose !== DRIVE_STATE_PURPOSE ||
      typeof state.id !== "string"
    ) {
      return res.status(400).send("Invalid Google Drive authorization state.");
    }
  } catch {
    return res.status(400).send("Google Drive authorization state is invalid or expired.");
  }

  if (req.query.error) return redirectToDrive(res, "connect_cancelled");
  if (typeof req.query.code !== "string") {
    return redirectToDrive(res, "connect_failed");
  }

  try {
    const { tokens } = await createOAuthClient().getToken(req.query.code);
    if (!tokens.refresh_token) {
      return redirectToDrive(res, "connect_failed");
    }

    const user = await User.findOne({ _id: state.id, status: "active" });
    if (!user) return redirectToDrive(res, "connect_failed");
    user.driveRefreshToken = tokens.refresh_token;
    await user.save();
    return redirectToDrive(res, "connected");
  } catch (error) {
    console.error("Google Drive callback error:", error);
    return redirectToDrive(res, "connect_failed");
  }
}

export async function listDriveFiles(req, res) {
  try {
    const { drive, error, status } = await getDriveClient(req.user._id);
    if (!drive) return res.status(status).json({ error });

    const folderId = typeof req.query.folderId === "string"
      ? req.query.folderId
      : "root";
    const files = [];
    let pageToken;
    do {
      const result = await drive.files.list({
        q: `'${folderId.replaceAll("'", "\\'")}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)",
        orderBy: "folder,name",
        pageSize: 1000,
        pageToken,
      });
      files.push(...(result.data.files || []));
      pageToken = result.data.nextPageToken;
    } while (pageToken);
    files.sort((left, right) => {
      const leftFolder = left.mimeType === "application/vnd.google-apps.folder";
      const rightFolder = right.mimeType === "application/vnd.google-apps.folder";
      if (leftFolder !== rightFolder) return leftFolder ? -1 : 1;
      return (left.name || "").localeCompare(right.name || "");
    });
    return res.json({ files });
  } catch (error) {
    return sendDriveError(error, req, res);
  }
}

export async function uploadDriveFile(req, res) {
  if (!req.file) return res.status(400).json({ error: "Choose a file to upload." });

  try {
    const { drive, error, status } = await getDriveClient(req.user._id);
    if (!drive) return res.status(status).json({ error });

    const folderId = typeof req.body.folderId === "string"
      ? req.body.folderId
      : "root";
    const result = await drive.files.create({
      requestBody: {
        name: req.file.originalname,
        parents: [folderId],
      },
      media: {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer),
      },
      fields: "id,name,mimeType,size,modifiedTime,webViewLink",
    });
    return res.status(201).json(result.data);
  } catch (error) {
    return sendDriveError(error, req, res);
  }
}

export async function createDriveFolder(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  if (!name) return res.status(400).json({ error: "Enter a folder name." });

  try {
    const { drive, error, status } = await getDriveClient(req.user._id);
    if (!drive) return res.status(status).json({ error });

    const parentId = typeof req.body.folderId === "string"
      ? req.body.folderId
      : "root";
    const result = await drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      fields: "id,name,mimeType,modifiedTime,webViewLink",
    });
    return res.status(201).json(result.data);
  } catch (error) {
    return sendDriveError(error, req, res);
  }
}

export async function downloadDriveFile(req, res) {
  try {
    const { drive, error, status } = await getDriveClient(req.user._id);
    if (!drive) return res.status(status).json({ error });

    const { data: file } = await drive.files.get({
      fileId: req.params.id,
      fields: "name,mimeType",
    });
    const isGoogleDocument = GOOGLE_EXPORT_MIME_TYPES.has(file.mimeType);
    const filename = isGoogleDocument ? `${file.name}.pdf` : file.name;
    const exportResponse = isGoogleDocument
      ? await drive.files.export(
          { fileId: req.params.id, mimeType: "application/pdf" },
          { responseType: "stream" },
        )
      : await drive.files.get(
          { fileId: req.params.id, alt: "media" },
          { responseType: "stream" },
        );
    res.type(isGoogleDocument ? "application/pdf" : "application/octet-stream");
    res.attachment(filename);
    exportResponse.data.pipe(res);
    exportResponse.data.on("error", (error) => {
      console.error("Google Drive download stream error:", error);
      if (!res.headersSent) res.status(500).end();
      else res.destroy(error);
    });
  } catch (error) {
    return sendDriveError(error, req, res);
  }
}

export async function trashDriveFile(req, res) {
  try {
    const { drive, error, status } = await getDriveClient(req.user._id);
    if (!drive) return res.status(status).json({ error });

    const result = await drive.files.update({
      fileId: req.params.id,
      requestBody: { trashed: true },
      fields: "id,trashed",
    });
    return res.json(result.data);
  } catch (error) {
    return sendDriveError(error, req, res);
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

    const sheets = google.sheets({ version: "v4", auth });
    const created = await sheets.spreadsheets.create({
      requestBody: { properties: { title } },
      fields: "spreadsheetId,spreadsheetUrl",
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: created.data.spreadsheetId,
      range: "A1",
      valueInputOption: "RAW",
      requestBody: {
        values: rows.map((row) => row.map((value) => value ?? "")),
      },
    });
    return res.status(201).json({ spreadsheetUrl: created.data.spreadsheetUrl });
  } catch (error) {
    if (isSheetsApiDisabled(error)) {
      return res.status(503).json({
        error: "Google Sheets API is disabled for this Google Cloud project. Enable it in Google Cloud Console and try again.",
      });
    }
    return sendDriveError(error, req, res);
  }
}

export async function disconnectDrive(req, res) {
  try {
    const user = await User.findById(req.user._id).select("+driveRefreshToken");
    if (!user?.driveRefreshToken) {
      return res.json({ connected: false });
    }

    try {
      await createOAuthClient().revokeToken(user.driveRefreshToken);
    } catch (error) {
      if (isInvalidGrant(error)) return sendDriveError(error, req, res);
      console.error("Google Drive token revocation error:", error);
      return res.status(502).json({ error: "Unable to revoke the Google Drive connection." });
    }

    user.driveRefreshToken = undefined;
    await user.save();
    return res.json({ connected: false });
  } catch (error) {
    console.error("Google Drive disconnect error:", error);
    return res.status(500).json({ error: "Unable to disconnect Google Drive." });
  }
}
