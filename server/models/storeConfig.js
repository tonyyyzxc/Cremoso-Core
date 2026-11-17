import mongoose from "mongoose";

const storeConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    channels: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            name: { type: String, required: true },
            active: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [
        { key: "foodpanda", name: "Foodpanda", active: true },
        { key: "facebook", name: "Facebook", active: true },
        { key: "walk-in", name: "Walk-in", active: true },
      ],
    },
    paymentMethods: {
      type: [
        new mongoose.Schema(
          {
            key: { type: String, required: true },
            name: { type: String, required: true },
            active: { type: Boolean, default: true },
          },
          { _id: false },
        ),
      ],
      default: [
        { key: "cash", name: "Cash", active: true },
        { key: "gcash", name: "GCash", active: true },
        { key: "card", name: "Card", active: true },
      ],
    },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("StoreConfig", storeConfigSchema);
