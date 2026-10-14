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
    role: {
      type: String,
      enum: ["admin", "staff"],
      default: "staff",
    },
    status: {
      type: String,
      enum: ["invited", "active"],
      default: "invited",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;
