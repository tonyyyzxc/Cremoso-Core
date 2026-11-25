// Mongoose model for menu products, variants, addons, and supply usage.
import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  active: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
  supplyUsage: { type: [{
    supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supply", required: true },
    quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  }], default: [] },
});

const menuItemSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    itemType: { type: String, enum: ["product", "addon"], default: "product", index: true },
    category: { type: String, required: true, trim: true, default: "Other" },
    price: { type: Number, required: true, min: 0 },
    lowStockThreshold: { type: Number, min: 0, validate: Number.isInteger, default: 0 },
    includedFruitPortions: { type: Number, min: 0, default: 0 },
    includedToppingPortions: { type: Number, min: 0, default: 0 },
    includedSaucePortions: { type: Number, min: 0, default: 0 },
    active: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    supplyUsage: { type: [{
      supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supply", required: true },
      quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    }], default: [] },
    variants: { type: [optionSchema], default: [] },
    addons: { type: [optionSchema], default: [] },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("MenuItem", menuItemSchema);
