// Mongoose model for ingredients and supply catalog records.
import mongoose from "mongoose";

const supplySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    unit: { type: String, required: true, trim: true },
    lowStockThreshold: { type: Number, required: true, min: 0, validate: Number.isInteger, default: 0 },
    active: { type: Boolean, default: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("Supply", supplySchema);
