// Mongoose model for browser push-notification registrations.
import mongoose from "mongoose";

const pushRegistrationSchema = new mongoose.Schema(
  {
    browserId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    token: { type: String, required: true, unique: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("PushRegistration", pushRegistrationSchema);
