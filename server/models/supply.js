import mongoose from "mongoose";

const supplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, required: true, trim: true },
    lowStockThreshold: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("Supply", supplySchema);
