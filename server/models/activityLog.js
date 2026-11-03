import mongoose from "mongoose";

const targetSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: "" },
    id: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, trim: true, default: "" },
    actorEmail: { type: String, trim: true, lowercase: true, default: "" },
    actorRole: { type: String, trim: true, default: "" },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    action: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      enum: ["auth", "order", "menu", "user", "inventory", "branch", "drive", "config", "security"],
      required: true,
    },
    summary: { type: String, required: true, trim: true },
    target: { type: targetSchema, default: undefined },
    details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    status: { type: String, enum: ["success", "failure"], default: "success", required: true },
    ip: { type: String, trim: true, default: "" },
    userAgent: { type: String, trim: true, maxlength: 255, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ branchId: 1, createdAt: -1 });

activityLogSchema.pre("save", function preventExistingLogChanges() {
  if (!this.isNew) throw new Error("Activity logs are append-only.");
});

for (const operation of [
  "update",
  "updateOne",
  "updateMany",
  "replaceOne",
  "findOneAndUpdate",
  "findOneAndReplace",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
  "findOneAndRemove",
]) {
  activityLogSchema.pre(operation, function preventLogMutation() {
    throw new Error("Activity logs are append-only.");
  });
}

activityLogSchema.pre(
  "deleteOne",
  { document: true, query: false },
  function preventDocumentLogDeletion() {
    throw new Error("Activity logs are append-only.");
  },
);

activityLogSchema.pre("bulkWrite", function preventBulkLogMutation() {
  throw new Error("Activity logs are append-only.");
});

export default mongoose.model("ActivityLog", activityLogSchema);
