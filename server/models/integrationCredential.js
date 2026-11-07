import mongoose from "mongoose";

const integrationCredentialSchema = new mongoose.Schema(
  {
    integration: { type: String, required: true, unique: true },
    encryptedPayload: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

export default mongoose.model("IntegrationCredential", integrationCredentialSchema);
