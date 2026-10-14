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
app.use("/api/menu", menuRouter);
app.use("/api/store-config", storeConfigRouter);
app.use("/api/users", usersRouter);

const PORT = 5000;

app.get("/", (req, res) => {
  res.send("Server is running");
});

async function startServer() {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required in server/.env");
  }
  await mongoose.connect(process.env.MONGODB_URL);
  console.log("MONGO DB CONNECTED");

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (bootstrapEmail && bootstrapPassword) {
    let admin = await User.findOne({ email: bootstrapEmail });
    if (!admin) {
      admin = await User.create({
        name: "Administrator",
        email: bootstrapEmail,
        passwordHash: await hashPassword(bootstrapPassword),
        role: "admin",
        status: "active",
      });
    } else if (admin.role !== "admin" || admin.status !== "active") {
      admin.role = "admin";
      admin.status = "active";
      await admin.save();
    }
    if (!admin.passwordHash) {
      admin.passwordHash = await hashPassword(bootstrapPassword);
      await admin.save();
    }
    console.log(`Bootstrap admin ready: ${bootstrapEmail}`);
  }

  app.listen(PORT, () => {
    console.log(`Server is running at port: ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
