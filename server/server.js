import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

const PORT = 5000;
const MONGODB_URL = process.env.MONGODB_URL;

mongoose.connect(MONGODB_URL).then(() => {
  console.log("MONGODB ONLINE!");
});

app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
