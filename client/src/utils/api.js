const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const MAINTENANCE_BYPASS_COOKIE = "maintenance_bypass";

function getMaintenanceBypassKey() {
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MAINTENANCE_BYPASS_COOKIE}=`));

  return cookie
    ? decodeURIComponent(cookie.slice(MAINTENANCE_BYPASS_COOKIE.length + 1))
    : "";
}

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const maintenanceBypassKey = getMaintenanceBypassKey();
  if (maintenanceBypassKey) {
    headers.set("X-Maintenance-Bypass", maintenanceBypassKey);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (response.status === 503 && data.maintenance === true) {
    window.location.replace("/maintenance.html");
    return new Promise(() => {});
  }
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
