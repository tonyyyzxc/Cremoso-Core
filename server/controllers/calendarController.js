// API handlers for Google Calendar OAuth and shift-schedule synchronization.
import mongoose from "mongoose";
import Branch from "../models/branch.js";
import ShiftSchedule from "../models/shiftSchedule.js";
import User from "../models/user.js";
import {
  createCalendarOAuthClient,
  getCalendarClient,
  sendCalendarError,
} from "../utils/googleCalendar.js";
import { isIntegrationEnabled, requireIntegration } from "../utils/integrationConfig.js";
import { signToken, verifyToken } from "../utils/jwt.js";
import { getSuperAdminEmail, isSuperAdminAccount } from "../utils/superAdmin.js";
import { getChangedFieldNames, getEditMetadata, logActivity } from "../utils/activityLog.js";
import { handleOAuthCredentialValidationCallback } from "./integrationCredentialsController.js";

const CALENDAR_TIME_ZONE = "Asia/Manila";
const CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CALENDAR_STATE_PURPOSE = "calendar-oauth";

function redirectAfterCalendarOAuth(res, status) {
  const destination = new URL(
    "/schedule",
    process.env.CLIENT_URL || "http://localhost:5173",
  );
  if (status) destination.searchParams.set("calendar", status);
  return res.redirect(destination.toString());
}

export async function getCalendarConnectUrl(req, res) {
  try {
    if (!(await requireIntegration("googleCalendarEnabled", res, "Google Calendar"))) return;
    const auth = await createCalendarOAuthClient();
    const state = signToken(
      { id: req.user._id.toString(), purpose: CALENDAR_STATE_PURPOSE },
      "10m",
    );
    const url = auth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [CALENDAR_EVENTS_SCOPE],
      state,
    });
    return res.json({ url });
  } catch (error) {
    console.error("Google Calendar connect error:", error);
    return res.status(500).json({ error: "Unable to start Google Calendar connection." });
  }
}

export async function handleCalendarCallback(req, res) {
  let state;
  try {
    state = verifyToken(req.query.state);
    if (state.purpose === "integration-credential-validation") {
      return handleOAuthCredentialValidationCallback(req, res, state, "googleCalendar");
    }
    if (state.purpose !== CALENDAR_STATE_PURPOSE || typeof state.id !== "string") {
      return res.status(400).send("Invalid Google Calendar authorization state.");
    }
  } catch {
    return res.status(400).send("Google Calendar authorization state is invalid or expired.");
  }

  if (req.query.error) return redirectAfterCalendarOAuth(res, "connect_cancelled");
  if (typeof req.query.code !== "string") return redirectAfterCalendarOAuth(res, "connect_failed");
  if (!(await isIntegrationEnabled("googleCalendarEnabled"))) {
    return redirectAfterCalendarOAuth(res, "disabled");
  }

  try {
    const auth = await createCalendarOAuthClient();
    const { tokens } = await auth.getToken(req.query.code);
    if (!tokens.refresh_token) return redirectAfterCalendarOAuth(res, "connect_failed");
    const user = await User.findOne({ _id: state.id, status: "active" });
    if (!user) return redirectAfterCalendarOAuth(res, "connect_failed");
    user.googleCalendarRefreshToken = tokens.refresh_token;
    await user.save();
    return redirectAfterCalendarOAuth(res, "connected");
  } catch (error) {
    console.error("Google Calendar callback error:", error);
    return redirectAfterCalendarOAuth(res, "connect_failed");
  }
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseDateTime(value) {
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function getListRange(query) {
  const today = getManilaDateKey();
  const defaultEnd = new Date(`${today}T00:00:00Z`);
  defaultEnd.setUTCDate(defaultEnd.getUTCDate() + 30);
  const from = query.from || today;
  const to = query.to || defaultEnd.toISOString().slice(0, 10);
  if (!isValidDateKey(from) || !isValidDateKey(to) || from > to) return null;
  return { from: dayRange(from).start, to: dayRange(to).end };
}

function normalizeAssignedStaffIds(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) return null;
  const ids = value.map((id) => String(id));
  if (
    ids.some((id) => !mongoose.Types.ObjectId.isValid(id))
    || new Set(ids).size !== ids.length
  ) return null;
  return ids;
}

function buildEventBody(shift, branch, staff) {
  const description = [
    shift.notes,
    `Assigned staff: ${staff.map((member) => member.name).join(", ")}`,
  ].filter(Boolean).join("\n\n");
  return {
    summary: `${branch.name} shift`,
    description,
    location: branch.address || undefined,
    start: {
      dateTime: shift.startsAt.toISOString(),
      timeZone: CALENDAR_TIME_ZONE,
    },
    end: {
      dateTime: shift.endsAt.toISOString(),
      timeZone: CALENDAR_TIME_ZONE,
    },
    attendees: staff.map((member) => ({
      email: member.email,
      displayName: member.name,
    })),
  };
}

async function getShiftCalendarData(shift) {
  const [branch, staff] = await Promise.all([
    Branch.findById(shift.branchId).select("name address"),
    User.find({
      _id: { $in: shift.assignedStaffIds },
      branchId: shift.branchId,
      role: "staff",
      status: "active",
    }).select("name email"),
  ]);
  if (!branch || staff.length !== shift.assignedStaffIds.length) {
    throw Object.assign(new Error("The branch or an assigned staff account is no longer available."), {
      statusCode: 409,
    });
  }
  return { branch, staff };
}

async function syncCalendarEvent(shift, calendar) {
  if (shift.status === "cancelled") {
    if (shift.calendarEventId) {
      try {
        await calendar.events.delete({
          calendarId: "primary",
          eventId: shift.calendarEventId,
          sendUpdates: "all",
        });
      } catch (error) {
        if (error?.response?.status !== 404) throw error;
      }
    }
    shift.calendarSyncStatus = "synced";
    await shift.save();
    return;
  }

  const { branch, staff } = await getShiftCalendarData(shift);
  const request = {
    calendarId: "primary",
    requestBody: buildEventBody(shift, branch, staff),
    sendUpdates: "all",
  };
  const result = shift.calendarEventId
    ? await calendar.events.patch({
      ...request,
      eventId: shift.calendarEventId,
    })
    : await calendar.events.insert(request);

  shift.calendarEventId = result.data.id;
  shift.calendarSyncStatus = "synced";
  await shift.save();
}

function canManageBranch(req, branchId) {
  return req.user.role === "admin"
    || req.user.branchId?.toString() === branchId;
}

function populateShift(query) {
  return query
    .populate("branchId", "name address")
    .populate("assignedStaffIds", "name email")
    .populate("calendarCreatorId", "name email");
}

async function hideSuperAdminShiftIdentity(shifts, requester) {
  if (isSuperAdminAccount(requester)) return shifts;
  const superAdminEmail = getSuperAdminEmail();
  if (!superAdminEmail) return shifts;
  const superAdmin = await User.findOne({ email: superAdminEmail, role: "admin" })
    .select("_id")
    .lean();
  if (!superAdmin) return shifts;

  const records = Array.isArray(shifts) ? shifts : [shifts];
  const sanitized = records.map((shift) => {
    if (!shift) return shift;
    const record = typeof shift.toObject === "function" ? shift.toObject() : { ...shift };
    const lastEditorId = record.lastEditedBy?._id?.toString()
      || record.lastEditedBy?.toString();
    for (const field of ["calendarCreatorId", "createdBy", "updatedBy", "lastEditedBy"]) {
      const reference = record[field];
      const referenceId = reference?._id?.toString() || reference?.toString();
      if (referenceId === superAdmin._id.toString()) record[field] = null;
    }
    if (lastEditorId === superAdmin._id.toString()) {
      record.lastEditedByName = "";
      record.lastEditedByRole = "";
    }
    return record;
  });

  return Array.isArray(shifts) ? sanitized : sanitized[0];
}

export async function getCalendarStatus(req, res) {
  try {
    const enabled = await isIntegrationEnabled("googleCalendarEnabled");
    const user = await User.findById(req.user._id).select("+googleCalendarRefreshToken");
    return res.json({
      enabled,
      connected: enabled && Boolean(user?.googleCalendarRefreshToken),
      calendarConnected: enabled && Boolean(user?.googleCalendarRefreshToken),
    });
  } catch (error) {
    console.error("Google Calendar status error:", error);
    return res.status(500).json({ error: "Unable to load Google Calendar connection status." });
  }
}

export async function listCalendarStaff(req, res) {
  let branchId = req.user.branchId?.toString();
  if (req.user.role === "admin") {
    branchId = typeof req.query.branchId === "string" ? req.query.branchId : "";
  }
  if (!mongoose.Types.ObjectId.isValid(branchId || "")) {
    return res.status(400).json({ error: "Select a valid branch." });
  }
  try {
    const staff = await User.find({
      branchId,
      role: "staff",
      status: "active",
    }).select("_id name email").sort({ name: 1 });
    return res.json(staff);
  } catch (error) {
    console.error("Calendar staff list error:", error);
    return res.status(500).json({ error: "Unable to load staff for this branch." });
  }
}

export async function listShiftSchedules(req, res) {
  const range = getListRange(req.query);
  if (!range) return res.status(400).json({ error: "Choose a valid shift date range." });

  const filter = {
    startsAt: { $lt: range.to },
    endsAt: { $gte: range.from },
  };
  if (req.user.role === "admin") {
    if (req.query.branchId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.branchId)) {
        return res.status(400).json({ error: "Choose a valid branch." });
      }
      filter.branchId = req.query.branchId;
    }
  } else {
    const branchId = req.user.branchId?.toString();
    if (!mongoose.Types.ObjectId.isValid(branchId || "")) {
      return res.status(400).json({ error: "Your account is not assigned to a branch." });
    }
    filter.branchId = branchId;
  }

  try {
    const shifts = await populateShift(
      ShiftSchedule.find(filter).sort({ startsAt: 1 }).limit(500),
    );
    return res.json(await hideSuperAdminShiftIdentity(shifts, req.user));
  } catch (error) {
    console.error("Shift schedule list error:", error);
    return res.status(500).json({ error: "Unable to load the shift schedule." });
  }
}

export async function createShiftSchedule(req, res) {
  const branchId = req.user.role === "admin"
    ? String(req.body.branchId || "")
    : req.user.branchId?.toString();
  if (!mongoose.Types.ObjectId.isValid(branchId || "")) {
    return res.status(400).json({ error: "Select a valid branch." });
  }
  const startsAt = parseDateTime(req.body.startsAt);
  const endsAt = parseDateTime(req.body.endsAt);
  const assignedStaffIds = normalizeAssignedStaffIds(req.body.assignedStaffIds);
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
  if (!startsAt || !endsAt || startsAt >= endsAt) {
    return res.status(400).json({ error: "Choose valid shift start and end times." });
  }
  if (!assignedStaffIds) {
    return res.status(400).json({ error: "Assign between 1 and 30 active staff members." });
  }
  if (notes.length > 1000) {
    return res.status(400).json({ error: "Shift notes must be 1,000 characters or fewer." });
  }

  try {
    const [branch, staff] = await Promise.all([
      Branch.findById(branchId),
      User.find({
        _id: { $in: assignedStaffIds },
        branchId,
        role: "staff",
        status: "active",
      }).select("_id"),
    ]);
    if (!branch) return res.status(404).json({ error: "Branch not found." });
    if (staff.length !== assignedStaffIds.length) {
      return res.status(400).json({ error: "Choose active staff members assigned to this branch." });
    }
    const calendarEnabled = await isIntegrationEnabled("googleCalendarEnabled");
    const connection = calendarEnabled ? await getCalendarClient(req.user._id) : null;
    if (calendarEnabled && !connection.calendar) {
      return res.status(connection.status).json({
        code: connection.code,
        error: connection.error,
      });
    }

    const shift = await ShiftSchedule.create({
      branchId,
      startsAt,
      endsAt,
      assignedStaffIds,
      notes,
      calendarCreatorId: req.user._id,
      createdBy: req.user._id,
      updatedBy: req.user._id,
      ...getEditMetadata(req.user),
    });
    if (connection?.calendar) await syncCalendarEvent(shift, connection.calendar);
    else shift.calendarSyncStatus = "pending";
    await shift.save();
    await logActivity(req, {
      action: "create",
      category: "branch",
      summary: "Created a shift schedule.",
      target: { type: "ShiftSchedule", id: shift._id },
      details: { changedFields: ["branchId", "startsAt", "endsAt", "assignedStaffIds", "notes"] },
    });
    const populatedShift = await hideSuperAdminShiftIdentity(
      await populateShift(ShiftSchedule.findById(shift._id)),
      req.user,
    );
    return res.status(201).json(populatedShift);
  } catch (error) {
    if (error?.response || error?.code === "invalid_grant") {
      return sendCalendarError(error, req, res);
    }
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("Shift schedule creation error:", error);
    return res.status(500).json({ error: "Unable to create the shift." });
  }
}

export async function updateShiftSchedule(req, res) {
  const assignedStaffIds = normalizeAssignedStaffIds(req.body.assignedStaffIds);
  const startsAt = parseDateTime(req.body.startsAt);
  const endsAt = parseDateTime(req.body.endsAt);
  const notes = typeof req.body.notes === "string" ? req.body.notes.trim() : "";
  if (!startsAt || !endsAt || startsAt >= endsAt) {
    return res.status(400).json({ error: "Choose valid shift start and end times." });
  }
  if (!assignedStaffIds) {
    return res.status(400).json({ error: "Assign between 1 and 30 active staff members." });
  }
  if (notes.length > 1000) {
    return res.status(400).json({ error: "Shift notes must be 1,000 characters or fewer." });
  }

  try {
    const shift = await ShiftSchedule.findById(req.params.id);
    if (!shift) return res.status(404).json({ error: "Shift not found." });
    const branchId = shift.branchId.toString();
    if (!canManageBranch(req, branchId)) {
      return res.status(403).json({ error: "You cannot manage shifts for this branch." });
    }
    if (shift.status === "cancelled") {
      return res.status(409).json({ error: "Cancelled shifts cannot be edited." });
    }
    const before = shift.toObject();
    const staff = await User.find({
      _id: { $in: assignedStaffIds },
      branchId,
      role: "staff",
      status: "active",
    }).select("_id");
    if (staff.length !== assignedStaffIds.length) {
      return res.status(400).json({ error: "Choose active staff members assigned to this branch." });
    }

    shift.startsAt = startsAt;
    shift.endsAt = endsAt;
    shift.assignedStaffIds = assignedStaffIds;
    shift.notes = notes;
    shift.updatedBy = req.user._id;
    Object.assign(shift, getEditMetadata(req.user));
    shift.calendarSyncStatus = "pending";
    await shift.save();
    const changedFields = getChangedFieldNames(
      before,
      shift,
      ["startsAt", "endsAt", "assignedStaffIds", "notes", "updatedBy", "calendarSyncStatus"],
    );
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "branch",
        summary: "Updated a shift schedule.",
        target: { type: "ShiftSchedule", id: shift._id },
        details: { changedFields },
      });
    }

    if (shift.calendarCreatorId.toString() === req.user._id.toString()
      && await isIntegrationEnabled("googleCalendarEnabled")) {
      const connection = await getCalendarClient(req.user._id);
      if (!connection.calendar) {
        return res.status(connection.status).json({
          code: connection.code,
          error: connection.error,
        });
      }
      try {
        await syncCalendarEvent(shift, connection.calendar);
      } catch (error) {
        return sendCalendarError(error, req, res);
      }
    }
    const populatedShift = await hideSuperAdminShiftIdentity(
      await populateShift(ShiftSchedule.findById(shift._id)),
      req.user,
    );
    return res.json(populatedShift);
  } catch (error) {
    console.error("Shift schedule update error:", error);
    return res.status(500).json({ error: "Unable to update the shift." });
  }
}

export async function cancelShiftSchedule(req, res) {
  try {
    const shift = await ShiftSchedule.findById(req.params.id);
    if (!shift) return res.status(404).json({ error: "Shift not found." });
    if (!canManageBranch(req, shift.branchId.toString())) {
      return res.status(403).json({ error: "You cannot manage shifts for this branch." });
    }
    if (shift.status === "cancelled") {
      return res.status(409).json({ error: "This shift is already cancelled." });
    }

    const before = shift.toObject();
    shift.status = "cancelled";
    shift.updatedBy = req.user._id;
    Object.assign(shift, getEditMetadata(req.user));
    shift.calendarSyncStatus = "pending";
    await shift.save();
    const changedFields = getChangedFieldNames(
      before,
      shift,
      ["status", "updatedBy", "calendarSyncStatus"],
    );
    await logActivity(req, {
      action: "update",
      category: "branch",
      summary: "Cancelled a shift schedule.",
      target: { type: "ShiftSchedule", id: shift._id },
      details: { changedFields },
    });

    if (shift.calendarCreatorId.toString() === req.user._id.toString()
      && await isIntegrationEnabled("googleCalendarEnabled")) {
      const connection = await getCalendarClient(req.user._id);
      if (!connection.calendar) {
        return res.status(connection.status).json({
          code: connection.code,
          error: connection.error,
        });
      }
      try {
        await syncCalendarEvent(shift, connection.calendar);
      } catch (error) {
        return sendCalendarError(error, req, res);
      }
    }
    const populatedShift = await hideSuperAdminShiftIdentity(
      await populateShift(ShiftSchedule.findById(shift._id)),
      req.user,
    );
    return res.json(populatedShift);
  } catch (error) {
    console.error("Shift cancellation error:", error);
    return res.status(500).json({ error: "Unable to cancel the shift." });
  }
}

export async function syncShiftSchedule(req, res) {
  try {
    const shift = await ShiftSchedule.findById(req.params.id);
    if (!shift) return res.status(404).json({ error: "Shift not found." });
    if (!canManageBranch(req, shift.branchId.toString())) {
      return res.status(403).json({ error: "You cannot manage shifts for this branch." });
    }
    if (shift.calendarCreatorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: "Only the account that created this Calendar event can sync its changes.",
      });
    }
    const connection = await getCalendarClient(req.user._id);
    if (!connection.calendar) {
      return res.status(connection.status).json({
        code: connection.code,
        error: connection.error,
      });
    }

    const before = shift.toObject();
    Object.assign(shift, getEditMetadata(req.user));
    await syncCalendarEvent(shift, connection.calendar);
    const changedFields = getChangedFieldNames(
      before,
      shift,
      ["calendarEventId", "calendarSyncStatus"],
    );
    if (changedFields.length) {
      await logActivity(req, {
        action: "update",
        category: "branch",
        summary: "Synced a shift schedule to Google Calendar.",
        target: { type: "ShiftSchedule", id: shift._id },
        details: { changedFields },
      });
    }
    const populatedShift = await hideSuperAdminShiftIdentity(
      await populateShift(ShiftSchedule.findById(shift._id)),
      req.user,
    );
    return res.json(populatedShift);
  } catch (error) {
    if (error?.response || error?.code === "invalid_grant") {
      return sendCalendarError(error, req, res);
    }
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    console.error("Shift Calendar sync error:", error);
    return res.status(500).json({ error: "Unable to sync the shift with Google Calendar." });
  }
}
