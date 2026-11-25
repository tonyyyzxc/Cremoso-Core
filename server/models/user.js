// Mongoose model for authenticated users and account permissions.
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    office: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    showSidebarIcons: {
      type: Boolean,
      default: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    googleId: {
      type: String,
      default: null,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    driveRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    googleSheetsRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    googleCalendarRefreshToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetCodeHash: {
      type: String,
      default: null,
    },
    passwordResetCodeExpiresAt: {
      type: Date,
      default: null,
    },
    passwordResetCodeAttempts: {
      type: Number,
      default: 0,
    },
    passwordResetCodeSentAt: {
      type: Date,
      default: null,
    },
    role: {
      type: String,
      enum: ["admin", "branch", "staff"],
      default: "branch",
    },
    status: {
      type: String,
      enum: ["invited", "active", "disabled"],
      default: "invited",
    },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lastEditedByName: { type: String, trim: true, default: "" },
    lastEditedByRole: { type: String, trim: true, default: "" },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
