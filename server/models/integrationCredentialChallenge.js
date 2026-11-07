import mongoose from "mongoose";

const integrationCredentialChallengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    codeHash: { type: String, required: true, select: false },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, required: true },
  },
  { timestamps: true },
);

integrationCredentialChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model(
  "IntegrationCredentialChallenge",
  integrationCredentialChallengeSchema,
);
