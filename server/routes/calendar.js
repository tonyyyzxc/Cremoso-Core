import express from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { validateObjectId } from "../middleware/validateObjectId.js";
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
  updateShiftSchedule,
);
router.post(
  "/shifts/:id/cancel",
  requireRole("branch", "admin"),
  validateObjectId("id", "Invalid shift ID."),
  cancelShiftSchedule,
);
router.post(
  "/shifts/:id/sync",
  requireRole("branch", "admin"),
  validateObjectId("id", "Invalid shift ID."),
  syncShiftSchedule,
);

export default router;
