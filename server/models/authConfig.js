// Mongoose model for application authentication and integration settings.
import mongoose from "mongoose";

const authConfigSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    staffGoogleAuthEnabled: { type: Boolean, default: true },
    recaptchaEnabled: { type: Boolean, default: true },
    gmailEnabled: { type: Boolean, default: true },
    pdfEnabled: { type: Boolean, default: true },
    googleSheetsEnabled: { type: Boolean, default: true },
    googleCalendarEnabled: { type: Boolean, default: true },
    googleDriveEnabled: { type: Boolean, default: true },
    firebaseMessagingEnabled: { type: Boolean, default: true },
    activityLoggingEnabled: { type: Boolean, default: true },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.model("AuthConfig", authConfigSchema);
