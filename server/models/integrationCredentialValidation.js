import mongoose from "mongoose";

const integrationCredentialValidationSchema = new mongoose.Schema(
  {
    integration: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "IntegrationCredentialChallenge", required: true },
    encryptedPayload: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

integrationCredentialValidationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model(
  "IntegrationCredentialValidation",
  integrationCredentialValidationSchema,
);
