import mongoose from "mongoose";

const shiftReconciliationSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    businessDate: { type: String, required: true },
    openingFloat: { type: Number, required: true, min: 0 },
    cashSales: { type: Number, required: true, min: 0 },
    expectedCash: { type: Number, required: true, min: 0 },
    countedCash: { type: Number, required: true, min: 0 },
    variance: { type: Number, required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

shiftReconciliationSchema.index({ branchId: 1, businessDate: 1 }, { unique: true });

export default mongoose.model("ShiftReconciliation", shiftReconciliationSchema);
