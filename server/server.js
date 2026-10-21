import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRouter from "./routes/auth.js";
import authConfigRouter from "./routes/authConfig.js";
import branchesRouter from "./routes/branches.js";
import branchApplicationsRouter from "./routes/branchApplications.js";
import inventoryRouter from "./routes/inventory.js";
import menuRouter from "./routes/menu.js";
import ordersRouter from "./routes/orders.js";
import reportsRouter from "./routes/reports.js";
import reconciliationRouter from "./routes/reconciliation.js";
import staffRouter from "./routes/staff.js";
import storeConfigRouter from "./routes/storeConfig.js";
import supplyInventoryRouter from "./routes/supplyInventory.js";
import usersRouter from "./routes/users.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/auth-settings", authConfigRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/branch-applications", branchApplicationsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/reconciliation", reconciliationRouter);
app.use("/api/staff", staffRouter);
app.use("/api/store-config", storeConfigRouter);
app.use("/api/supply-inventory", supplyInventoryRouter);
app.use("/api/users", usersRouter);

const PORT = 5000;
const MONGODB_URL = process.env.MONGODB_URL;

mongoose.connect(MONGODB_URL).then(() => {
  console.log("MONGODB ONLINE!");
});

app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
