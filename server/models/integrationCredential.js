// Mongoose model for integration credential overrides.
import mongoose from "mongoose";

const integrationCredentialSchema = new mongoose.Schema(
  {
    integration: { type: String, required: true, unique: true },
    encryptedPayload: { type: String, required: true, select: false },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("IntegrationCredential", integrationCredentialSchema);
