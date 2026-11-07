import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  Download,
  File,
  Folder,
  FolderPlus,
  HardDrive,
  Trash2,
  Unplug,
  Upload,
} from "lucide-react";
import { apiRequest } from "../utils/api.js";
import { useToast } from "../hooks/UseToast.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const cardClass =
  "rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A8B8E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#097578] disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0A3B3D] transition hover:bg-[#FBF6EF] disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:hover:bg-neutral-800";
const rootFolder = { id: "root", name: "My Drive" };
const GOOGLE_EXPORT_MIME_TYPES = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
]);

function isReconnectError(error) {
  return error.message.toLowerCase().includes("reconnect required");
}

function formatFileSize(size) {
  if (!size) return "—";
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DrivePage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [driveEnabled, setDriveEnabled] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [busy, setBusy] = useState("");
  const [files, setFiles] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([rootFolder]);
  const [error, setError] = useState("");

  const loadFiles = useCallback(async (folderId) => {
    setLoadingFiles(true);
    setError("");
    try {
      const params = new URLSearchParams({ folderId });
      const data = await apiRequest(`/api/drive/files?${params}`);
      setFiles(data.files || []);
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) {
        setConnected(false);
        setFiles([]);
      }
      toast.error(requestError.message);
    } finally {
      setLoadingFiles(false);
    }
  }, [toast]);

  useEffect(() => {
    const callbackStatus = new URLSearchParams(window.location.search).get("drive");
    if (callbackStatus) {
      if (callbackStatus === "connected") toast.success("Google Drive connected.");
      if (callbackStatus === "connect_failed") {
        toast.error("Unable to connect Google Drive. Please try again.");
      }
      if (callbackStatus === "connect_cancelled") {
        toast.error("Google Drive connection was cancelled.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    apiRequest("/api/drive/status")
      .then((data) => {
        setDriveEnabled(data.enabled !== false);
        setConnected(data.connected);
        if (data.connected) return loadFiles(rootFolder.id);
        return undefined;
      })
      .catch((requestError) => {
        setError(requestError.message);
        toast.error(requestError.message);
      })
      .finally(() => setLoadingStatus(false));
  }, [loadFiles, toast]);

  const openFolder = (folder) => {
    setBreadcrumbs((current) => [...current, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id);
  };

  const openBreadcrumb = (index) => {
    const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(nextBreadcrumbs);
    loadFiles(nextBreadcrumbs[index].id);
  };

  const connectDrive = async () => {
    setBusy("connect");
    try {
      const data = await apiRequest("/api/drive/connect");
      window.location.assign(data.url);
    } catch (requestError) {
      setError(requestError.message);
      toast.error(requestError.message);
      setBusy("");
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy("upload");
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folderId", breadcrumbs[breadcrumbs.length - 1].id);
      await apiRequest("/api/drive/upload", { method: "POST", body });
      toast.success("File uploaded.");
      await loadFiles(breadcrumbs[breadcrumbs.length - 1].id);
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) setConnected(false);
      toast.error(requestError.message);
    } finally {
      setBusy("");
      event.target.value = "";
    }
  };

  const createFolder = async () => {
    const name = window.prompt("New folder name");
    if (!name?.trim()) return;

    setBusy("folder");
    setError("");
    try {
      await apiRequest("/api/drive/folder", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          folderId: breadcrumbs[breadcrumbs.length - 1].id,
        }),
      });
      toast.success("Folder created.");
      await loadFiles(breadcrumbs[breadcrumbs.length - 1].id);
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) setConnected(false);
      toast.error(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const downloadFile = async (file) => {
    setBusy(file.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/drive/download/${encodeURIComponent(file.id)}`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to download this file.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const isGoogleDoc = GOOGLE_EXPORT_MIME_TYPES.has(file.mimeType);
      anchor.href = objectUrl;
      anchor.download = isGoogleDoc ? `${file.name}.pdf` : file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) setConnected(false);
      toast.error(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const deleteFile = async (file) => {
    if (!window.confirm(`Move "${file.name}" to Google Drive trash?`)) return;

    setBusy(file.id);
    setError("");
    try {
      await apiRequest(`/api/drive/files/${encodeURIComponent(file.id)}`, {
        method: "DELETE",
      });
      setFiles((current) => current.filter((item) => item.id !== file.id));
      toast.success("Moved to Google Drive trash.");
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) setConnected(false);
      toast.error(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const disconnectDrive = async () => {
    if (!window.confirm("Disconnect your Google Drive account?")) return;

    setBusy("disconnect");
    setError("");
    try {
      await apiRequest("/api/drive/disconnect", { method: "POST" });
      setConnected(false);
      setFiles([]);
      setBreadcrumbs([rootFolder]);
      toast.success("Google Drive disconnected.");
    } catch (requestError) {
      setError(requestError.message);
      if (isReconnectError(requestError)) {
        setConnected(false);
        setFiles([]);
        setBreadcrumbs([rootFolder]);
      }
      toast.error(requestError.message);
    } finally {
      setBusy("");
    }
  };

  if (loadingStatus) {
    return (
      <div className={`${cardClass} p-6 text-sm text-gray-500 dark:text-gray-400`}>
        Loading Google Drive...
      </div>
    );
  }

  if (!connected) {
    if (!driveEnabled) {
      return (
        <section className={`${cardClass} mx-auto max-w-2xl p-8 text-center`}>
          <HardDrive className="mx-auto text-gray-400" size={40} />
          <h1 className="mt-4 text-xl font-semibold text-[#0A3B3D] dark:text-white">Google Drive is disabled</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">An administrator has disabled Google Drive for all accounts.</p>
        </section>
      );
    }
    return (
      <section className={`${cardClass} mx-auto max-w-2xl p-8 text-center`}>
        <HardDrive className="mx-auto text-[#0A8B8E]" size={40} />
        <h1 className="mt-4 text-xl font-semibold text-[#0A3B3D] dark:text-white">
          Connect your Google Drive
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500 dark:text-gray-400">
          Connect your Google account to manage Drive files and sync scheduled shifts with Google Calendar.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={connectDrive}
          disabled={busy === "connect"}
          className={`${buttonClass} mt-6`}
        >
          <HardDrive size={17} />
          {busy === "connect" ? "Connecting..." : "Connect Google Drive"}
        </button>
      </section>
    );
  }

  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold text-[#0A3B3D] dark:text-white">
            YourDrive
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Your personal Google Drive and shift calendar connection
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={uploadFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(busy)}
            className={buttonClass}
          >
            <Upload size={16} />
            {busy === "upload" ? "Uploading..." : "Upload"}
          </button>
          <button
            type="button"
            onClick={createFolder}
            disabled={Boolean(busy)}
            className={secondaryButtonClass}
          >
            <FolderPlus size={16} />
            New Folder
          </button>
          <button
            type="button"
            onClick={disconnectDrive}
            disabled={Boolean(busy)}
            className={secondaryButtonClass}
          >
            <Unplug size={16} />
            Disconnect
          </button>
        </div>
      </div>

      <nav
        aria-label="Drive breadcrumbs"
        className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-5 py-3 text-sm dark:border-neutral-800"
      >
        {breadcrumbs.map((folder, index) => (
          <span key={folder.id} className="inline-flex items-center gap-1">
            {index > 0 && <ChevronRight size={15} className="text-gray-400" />}
            <button
              type="button"
              onClick={() => openBreadcrumb(index)}
              className={`rounded px-1 py-0.5 hover:text-[#0A8B8E] ${
                index === breadcrumbs.length - 1
                  ? "font-semibold text-[#0A3B3D] dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      {error && (
        <p role="alert" className="mx-5 mt-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-[#FBF6EF] text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-950 dark:text-gray-400">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Modified</th>
              <th className="px-5 py-3 font-medium">Size</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
            {loadingFiles ? (
              <tr>
                <td colSpan="4" className="px-5 py-10 text-center text-gray-500">
                  Loading files...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-5 py-10 text-center text-gray-500">
                  This folder is empty.
                </td>
              </tr>
            ) : files.map((file) => {
              const isFolder = file.mimeType === "application/vnd.google-apps.folder";
              const isBusy = busy === file.id;
              return (
                <tr key={file.id} className="text-[#0A3B3D] dark:text-gray-200">
                  <td className="max-w-0 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {isFolder ? (
                        <Folder size={18} className="shrink-0 text-[#0A8B8E]" />
                      ) : (
                        <File size={18} className="shrink-0 text-gray-400" />
                      )}
                      {isFolder ? (
                        <button
                          type="button"
                          onClick={() => openFolder(file)}
                          className="truncate font-medium hover:text-[#0A8B8E]"
                          title={file.name}
                        >
                          {file.name}
                        </button>
                      ) : file.webViewLink ? (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate font-medium hover:text-[#0A8B8E]"
                          title={file.name}
                        >
                          {file.name}
                        </a>
                      ) : (
                        <span className="truncate font-medium" title={file.name}>
                          {file.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400">
                    {file.modifiedTime
                      ? new Date(file.modifiedTime).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-500 dark:text-gray-400">
                    {isFolder ? "—" : formatFileSize(file.size)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {!isFolder && (
                        <button
                          type="button"
                          onClick={() => downloadFile(file)}
                          disabled={Boolean(busy)}
                          title="Download"
                          aria-label={`Download ${file.name}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-[#0A8B8E] disabled:opacity-50 dark:hover:bg-neutral-800"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteFile(file)}
                        disabled={Boolean(busy)}
                        title="Move to trash"
                        aria-label={`Move ${file.name} to trash`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isBusy && (
                        <span className="sr-only" aria-live="polite">
                          Processing {file.name}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
