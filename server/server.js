import "./config.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import sheetsRouter from "./routes/sheets.js";
import driveRouter from "./routes/drive.js";
import calendarRouter from "./routes/calendar.js";
import authRouter from "./routes/auth.js";
import authConfigRouter from "./routes/authConfig.js";
import activityLogsRouter from "./routes/activityLogs.js";
import branchesRouter from "./routes/branches.js";
import inventoryRouter from "./routes/inventory.js";
import menuRouter from "./routes/menu.js";
import ordersRouter from "./routes/orders.js";
import reportsRouter from "./routes/reports.js";
import reconciliationRouter from "./routes/reconciliation.js";
import staffRouter from "./routes/staff.js";
import storeConfigRouter from "./routes/storeConfig.js";
import supplyInventoryRouter from "./routes/supplyInventory.js";
import usersRouter from "./routes/users.js";
import integrationCredentialsRouter from "./routes/integrationCredentials.js";
import pushRouter from "./routes/push.js";
import editLocksRouter from "./routes/editLocks.js";
import maintenance from "./middleware/maintenance.js";

const app = express();

if (process.env.RENDER === "true") app.set("trust proxy", 1);

app.use(cors());
app.use(maintenance);
app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use(express.json({ limit: "10mb" }));
app.use("/api/sheets", sheetsRouter);
app.use("/api/drive", driveRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth-settings", authConfigRouter);
app.use("/api/integration-credentials", integrationCredentialsRouter);
app.use("/api/push", pushRouter);
app.use("/api/activity-logs", activityLogsRouter);
app.use("/api/edit-locks", editLocksRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/menu", menuRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/reconciliation", reconciliationRouter);
app.use("/api/staff", staffRouter);
app.use("/api/store-config", storeConfigRouter);
app.use("/api/supply-inventory", supplyInventoryRouter);
app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 5000;
const MONGODB_URL = process.env.MONGODB_URL;

mongoose
  .connect(MONGODB_URL)
  .then(() => {
    console.log("MONGODB ONLINE!");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.name, "-", err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
