import mongoose from "mongoose";

const pushRegistrationSchema = new mongoose.Schema(
  {
    browserId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    token: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export default mongoose.model("PushRegistration", pushRegistrationSchema);
