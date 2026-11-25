// Mongoose model for active authenticated user sessions.
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  revoked: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });

export default mongoose.model("Session", sessionSchema);
