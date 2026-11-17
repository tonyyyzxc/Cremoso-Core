import mongoose from "mongoose";

const shiftScheduleSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    assignedStaffIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    notes: { type: String, trim: true, default: "", maxlength: 1000 },
    status: {
      type: String,
      enum: ["scheduled", "cancelled"],
      default: "scheduled",
    },
    calendarCreatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    calendarEventId: { type: String, default: "" },
    calendarSyncStatus: {
      type: String,
      enum: ["pending", "synced"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

shiftScheduleSchema.index({ branchId: 1, startsAt: 1 });

export default mongoose.model("ShiftSchedule", shiftScheduleSchema);
