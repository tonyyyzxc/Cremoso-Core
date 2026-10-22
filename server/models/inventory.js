import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
  },
  { timestamps: true },
);

inventorySchema.index({ branchId: 1, menuItemId: 1 }, { unique: true });

export default mongoose.model("Inventory", inventorySchema);
