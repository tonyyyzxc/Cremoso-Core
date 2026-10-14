import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0, default: 0 },
  active: { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
});

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, required: true, trim: true, default: "Other" },
    price: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    variants: { type: [optionSchema], default: [] },
    addons: { type: [optionSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("MenuItem", menuItemSchema);
