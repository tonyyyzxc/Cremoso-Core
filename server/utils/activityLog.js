import AuthConfig from "../models/authConfig.js";
import ActivityLog from "../models/activityLog.js";

const sensitiveKeyPattern =
  /password|token|secret|resetcode|recaptcha|authorization/i;
const configCacheDuration = 30_000;
let cachedLoggingEnabled;
let configCacheExpiresAt = 0;

function comparableValue(value) {
  const serializable = typeof value?.toObject === "function" ? value.toObject() : value;
  return JSON.stringify(serializable);
}

export function getEditMetadata(user) {
  return {
    lastEditedBy: user?._id || null,
    lastEditedByName: user?.name || "",
    lastEditedByRole: user?.role || "",
    lastEditedAt: new Date(),
  };
}

export function getChangedFieldNames(before, after, fields) {
  return [...new Set(fields)].filter((field) => (
    typeof field === "string"
    && comparableValue(before?.[field]) !== comparableValue(after?.[field])
  ));
}

async function isActivityLoggingEnabled() {
  if (cachedLoggingEnabled !== undefined && Date.now() < configCacheExpiresAt) {
    return cachedLoggingEnabled;
  }

  const config = await AuthConfig.findOne({ key: "default" })
    .select("activityLoggingEnabled")
    .lean();
  cachedLoggingEnabled = config?.activityLoggingEnabled !== false;
  configCacheExpiresAt = Date.now() + configCacheDuration;
  return cachedLoggingEnabled;
}

export function updateActivityLoggingCache(enabled) {
  cachedLoggingEnabled = enabled;
  configCacheExpiresAt = Date.now() + configCacheDuration;
}

function redactSensitiveValues(value) {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (!value || typeof value !== "object" || value instanceof Date) return value;
  if (value._bsontype === "ObjectId") return value.toString();

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactSensitiveValues(entry),
    ]),
  );
}

export async function logActivity(req, options = {}) {
  try {
    const {
      action,
      category,
      summary,
      target,
      details = {},
      status = "success",
      identifier,
      actor: actorOverride,
      force = false,
    } = options || {};
    if (!force && !(await isActivityLoggingEnabled())) return;

    const user = actorOverride || req?.user;
    const userAgent = req?.get?.("user-agent") || req?.headers?.["user-agent"] || "";
    const log = {
      actor: user?._id || null,
      actorName: user?.name || "",
      actorEmail: user?.email || identifier || "",
      actorRole: user?.role || "",
      branchId: user?.branchId || null,
      action,
      category,
      summary,
      details: redactSensitiveValues(details),
      status,
      ip: req?.ip || "",
      userAgent: String(userAgent).slice(0, 255),
    };

    if (target) {
      log.target = {
        type: target.type || "",
        id: target.id == null ? "" : String(target.id),
        label: target.label || "",
      };
    }

    await ActivityLog.create(log);
  } catch (error) {
    console.error("Activity log write failed.", {
      name: error?.name,
      code: error?.code,
    });
  }
}
