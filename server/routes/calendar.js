import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
import { requireEditLock } from "../utils/editLock.js";
import {
  externalActionAccountRateLimit,
  externalActionIpRateLimit,
} from "../middleware/rateLimiters.js";
import {
  cancelShiftSchedule,
  createShiftSchedule,
  getCalendarConnectUrl,
  getCalendarStatus,
  handleCalendarCallback,
  listCalendarStaff,
  listShiftSchedules,
  syncShiftSchedule,
  updateShiftSchedule,
} from "../controllers/calendarController.js";

const router = express.Router();
// Calendar routes connect Google Calendar and manage shift schedules.
router.get("/callback", handleCalendarCallback);
router.use(requireAuth);

router.get("/status", getCalendarStatus);
router.get("/connect", getCalendarConnectUrl);
router.get("/staff", requireRole("branch", "admin"), listCalendarStaff);
router.get("/shifts", requireRole("staff", "branch", "admin"), listShiftSchedules);
router.post("/shifts", requireRole("branch", "admin"), createShiftSchedule);
router.patch(
  "/shifts/:id",
  requireRole("branch", "admin"),
  validateObjectId("id", "Invalid shift ID."),
  requireEditLock("ShiftSchedule", (req) => req.params.id),
  updateShiftSchedule,
);
router.post(
  "/shifts/:id/cancel",
  requireRole("branch", "admin"),
  validateObjectId("id", "Invalid shift ID."),
  requireEditLock("ShiftSchedule", (req) => req.params.id),
  cancelShiftSchedule,
);
router.post(
  "/shifts/:id/sync",
  requireRole("branch", "admin"),
  validateObjectId("id", "Invalid shift ID."),
  externalActionIpRateLimit,
  externalActionAccountRateLimit,
  requireEditLock("ShiftSchedule", (req) => req.params.id),
  syncShiftSchedule,
);

export default router;
