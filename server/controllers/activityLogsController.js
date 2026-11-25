// API handlers for filtering and returning activity logs.
import mongoose from "mongoose";
import ActivityLog from "../models/activityLog.js";
import User from "../models/user.js";
import { getSuperAdminEmail, isSuperAdminAccount } from "../utils/superAdmin.js";

const categories = new Set([
  "auth",
  "order",
  "menu",
  "user",
  "inventory",
  "branch",
  "drive",
  "config",
  "security",
]);
const statuses = new Set(["success", "failure"]);

function isDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function manilaDayStart(value) {
  return new Date(`${value}T00:00:00+08:00`);
}

function readPositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function isValidObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

export async function listActivityLogs(req, res) {
  const page = readPositiveInteger(req.query.page, 1);
  const requestedLimit = readPositiveInteger(req.query.limit, 25);
  if (page === null || requestedLimit === null) {
    return res.status(400).json({ error: "Choose a valid page and limit." });
  }
  const limit = Math.min(requestedLimit, 100);
  if (!Number.isSafeInteger((page - 1) * limit)) {
    return res.status(400).json({ error: "Choose a valid page and limit." });
  }

  const filter = {};
  if (req.user.role === "staff") {
    filter.actor = req.user._id;
  } else if (req.user.role === "branch") {
    if (!req.user.branchId) {
      return res.status(400).json({ error: "Your account is not assigned to a branch." });
    }
    filter.branchId = req.user.branchId;
  } else if (req.user.role !== "admin") {
    return res.status(403).json({ error: "You do not have permission to view activity logs." });
  }

  if (req.user.role !== "staff") {
    const { accountId, branchId, category, status, from, to } = req.query;

    if (req.user.role === "admin" && branchId !== undefined) {
      if (!isValidObjectId(branchId)) {
        return res.status(400).json({ error: "Choose a valid branch." });
      }
      filter.branchId = branchId;
    }
    if (accountId !== undefined) {
      if (!isValidObjectId(accountId)) {
        return res.status(400).json({ error: "Choose a valid account." });
      }
      filter.actor = accountId;
    }
    if (category !== undefined) {
      if (typeof category !== "string" || !categories.has(category)) {
        return res.status(400).json({ error: "Choose a valid activity category." });
      }
      filter.category = category;
    }
    if (status !== undefined) {
      if (typeof status !== "string" || !statuses.has(status)) {
        return res.status(400).json({ error: "Choose a valid activity status." });
      }
      filter.status = status;
    }
    if (from !== undefined && !isDateKey(from)) {
      return res.status(400).json({ error: "Choose a valid start date." });
    }
    if (to !== undefined && !isDateKey(to)) {
      return res.status(400).json({ error: "Choose a valid end date." });
    }
    if (from && to && from > to) {
      return res.status(400).json({ error: "The start date must not be after the end date." });
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = manilaDayStart(from);
      if (to) {
        filter.createdAt.$lt = new Date(
          manilaDayStart(to).getTime() + 24 * 60 * 60 * 1000,
        );
      }
    }
  }

  try {
    if (!isSuperAdminAccount(req.user)) {
      const superAdminEmail = getSuperAdminEmail();
      if (superAdminEmail) {
        const superAdmin = await User.findOne({
          email: superAdminEmail,
          role: "admin",
        }).select("_id").lean();
        const hiddenActorFilters = [{ actorEmail: { $ne: superAdminEmail } }];
        if (superAdmin) hiddenActorFilters.push({ actor: { $ne: superAdmin._id } });
        filter.$and = [...(filter.$and || []), ...hiddenActorFilters];
      }
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate("branchId", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);
    return res.json({ logs, total, page, limit });
  } catch (error) {
    console.error("Activity log list error:", error);
    return res.status(500).json({ error: "Unable to load activity logs." });
  }
}
