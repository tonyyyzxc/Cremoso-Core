import mongoose from "mongoose";

const branchApplicationSchema = new mongoose.Schema(
  {
    branchName: { type: String, required: true, trim: true },
    branchAddress: { type: String, trim: true, default: "" },
    branchPhone: { type: String, trim: true, default: "" },
    managerName: { type: String, required: true, trim: true },
    managerPhone: { type: String, trim: true, default: "" },
    managerEmail: { type: String, required: true, lowercase: true, trim: true },
    managerPasswordHash: { type: String, default: null, select: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    hiddenAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

const BranchApplication = mongoose.model("BranchApplication", branchApplicationSchema);

export default BranchApplication;
