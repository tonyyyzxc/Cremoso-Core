import mongoose from "mongoose";

const authConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    staffGoogleAuthEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model("AuthConfig", authConfigSchema);
