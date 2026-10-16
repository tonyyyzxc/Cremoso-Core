import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import User from "./models/user.js";
import { hashPassword } from "./utils/password.js";
import authRouter from "./routes/auth.js";
import menuRouter from "./routes/menu.js";
import storeConfigRouter from "./routes/storeConfig.js";
import usersRouter from "./routes/users.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
// app.use("/api/menu", menuRouter);
// app.use("/api/store-config", storeConfigRouter);
app.use("/api/users", usersRouter);

const PORT = 5000;

async function seedAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password) return;

  const admin = await User.findOne({ email });
  const passwordHash = await hashPassword(password);
  if (admin) {
    admin.passwordHash = passwordHash;
    admin.role = "admin";
    admin.status = "active";
    await admin.save();
    return;
  }

  await User.create({
    email,
    name: "Administrator",
    passwordHash,
    role: "admin",
    status: "active",
  });
}

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected");

    await seedAdmin();

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }
}

start();
