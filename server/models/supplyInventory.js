import mongoose from "mongoose";

const supplyInventorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    supplyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supply",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
  },
  // Reject document saves when another write has advanced this record's __v.
  { timestamps: true, optimisticConcurrency: true },
);

supplyInventorySchema.index({ branchId: 1, supplyId: 1 }, { unique: true });

export default mongoose.model("SupplyInventory", supplyInventorySchema);
