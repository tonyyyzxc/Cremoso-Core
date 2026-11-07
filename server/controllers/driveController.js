import { Readable } from "stream";
import { google } from "googleapis";
import User from "../models/user.js";
import {
  createOAuthClient,
  getDriveClient,
  isInvalidGrant,
  sendDriveError,
} from "../utils/googleDrive.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { isIntegrationEnabled, requireIntegration } from "../utils/integrationConfig.js";
import { handleOAuthCredentialValidationCallback } from "./integrationCredentialsController.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_STATE_PURPOSE = "drive-oauth";
const GOOGLE_EXPORT_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
]);

function redirectAfterOAuth(res, status, returnTo = "/drive") {
  const destination = new URL(
    returnTo,
    process.env.CLIENT_URL || "http://localhost:5173",
  );
  if (status) destination.searchParams.set("drive", status);
  return res.redirect(destination.toString());
}

export async function getDriveStatus(req, res) {
  try {
    const enabled = await isIntegrationEnabled("googleDriveEnabled");
    const user = await User.findById(req.user._id).select("+driveRefreshToken");
    return res.json({ enabled, connected: enabled && Boolean(user?.driveRefreshToken) });
  } catch (error) {
    console.error("Google Drive status error:", error);
    return res.status(500).json({ error: "Unable to load Google Drive status." });
  }
}

export async function getDriveConnectUrl(req, res) {
  try {
    if (!(await requireIntegration("googleDriveEnabled", res, "Google Drive"))) return;
    const auth = await createOAuthClient();
    const state = signToken(
      {
        id: req.user._id.toString(),
        purpose: DRIVE_STATE_PURPOSE,
      },
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
    if (state.purpose === "integration-credential-validation") {
      return handleOAuthCredentialValidationCallback(req, res, state, "googleDrive");
    }
    if (
      state.purpose !== DRIVE_STATE_PURPOSE ||
      typeof state.id !== "string"
    ) {
      return res.status(400).send("Invalid Google Drive authorization state.");
    }
  } catch {
    return res.status(400).send("Google Drive authorization state is invalid or expired.");
  }

  if (!(await isIntegrationEnabled("googleDriveEnabled"))) {
    return redirectAfterOAuth(res, "disabled");
  }
  if (req.query.error) return redirectAfterOAuth(res, "connect_cancelled");
  if (typeof req.query.code !== "string") {
    return redirectAfterOAuth(res, "connect_failed");
  }

  try {
    const auth = await createOAuthClient();
    const { tokens } = await auth.getToken(req.query.code);
    if (!tokens.refresh_token) {
      return redirectAfterOAuth(res, "connect_failed");
    }

    const user = await User.findOne({ _id: state.id, status: "active" });
    if (!user) return redirectAfterOAuth(res, "connect_failed");
    user.driveRefreshToken = tokens.refresh_token;
    await user.save();
    return redirectAfterOAuth(res, "connected");
  } catch (error) {
    console.error("Google Drive callback error:", error);
    return redirectAfterOAuth(res, "connect_failed");
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

export async function disconnectDrive(req, res) {
  if (!(await requireIntegration("googleDriveEnabled", res, "Google Drive"))) return;
  try {
    const user = await User.findById(req.user._id).select("+driveRefreshToken");
    if (!user?.driveRefreshToken) {
      return res.json({ connected: false });
    }

    try {
      const auth = await createOAuthClient();
      await auth.revokeToken(user.driveRefreshToken);
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
