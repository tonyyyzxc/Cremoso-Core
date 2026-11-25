// Mongoose model for completed staff sales and sold items.
import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", default: null },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    variant: {
      name: { type: String, trim: true, default: "" },
      price: { type: Number, min: 0, default: 0 },
    },
    addons: { type: [{
      menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", default: null },
      name: { type: String, required: true },
      category: { type: String, trim: true, default: "" },
      price: { type: Number, min: 0, default: 0 },
      quantity: { type: Number, min: 1, default: 1 },
      chargedQuantity: { type: Number, min: 0, default: 1 },
    }], default: [] },
    supplyUsage: { type: [{
      supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supply", required: true },
      name: { type: String, required: true },
      unit: { type: String, required: true },
      quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    }], default: [] },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const saleSchema = new mongoose.Schema(
  {
    saleNumber: { type: String, required: true, unique: true, trim: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    businessDate: { type: String, required: true, index: true },
    paymentMethod: { type: String, required: true, trim: true },
    items: { type: [saleItemSchema], required: true, validate: (items) => items.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

saleSchema.index({ branchId: 1, businessDate: 1 });

export default mongoose.model("Sale", saleSchema);
