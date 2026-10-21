import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", default: null },
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "" },
    variant: {
      name: { type: String, trim: true, default: "" },
      price: { type: Number, min: 0, default: 0 },
    },
    addons: {
      type: [{
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", default: null },
        name: { type: String, required: true },
        category: { type: String, trim: true, default: "" },
        price: { type: Number, min: 0, default: 0 },
        quantity: { type: Number, min: 1, default: 1 },
        chargedQuantity: { type: Number, min: 0, default: 1 },
      }],
      default: [],
    },
    supplyUsage: {
      type: [{
        supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supply", required: true },
        name: { type: String, required: true },
        unit: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
      }],
      default: [],
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderAuditSchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["void", "refund"], required: true },
    reason: { type: String, required: true, trim: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    performedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    customer: { type: String, trim: true, default: "Walk-in" },
    channel: { type: String, required: true, trim: true },
    paymentMethod: { type: String, trim: true, default: "" },
    items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["pending", "completed", "voided", "refunded"], default: "pending", index: true },
    archivedAt: { type: Date, default: null, index: true },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    auditTrail: { type: [orderAuditSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Order", orderSchema);
