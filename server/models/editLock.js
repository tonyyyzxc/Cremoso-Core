import mongoose from "mongoose";

const editLockSchema = new mongoose.Schema(
  {
    resourceKey: { type: String, required: true, unique: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

editLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("EditLock", editLockSchema);
