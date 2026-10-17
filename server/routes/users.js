import express from "express";
import User from "../models/user.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

router.post("/", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const role = req.body.role;
  if (!/^[^\s@]+@gmail\.com$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid Gmail address." });
  }
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or staff." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this Gmail address already exists." });
    }

    const user = await User.create({ email, role, status: "active" });
    return res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (error) {
    console.error("Staff account creation error:", error);
    return res.status(400).json({ error: "Unable to add this staff account." });
  }
});

router.get("/", async (_req, res) => {
  try {
    const users = await User.find().select("name username email role status office createdAt").sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    console.error("User list error:", error);
    return res.status(500).json({ error: "Unable to load users." });
  }
});

router.patch("/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!["admin", "staff"].includes(role)) {
    return res.status(400).json({ error: "Role must be admin or staff." });
  }
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    if (target.role === "admin" && role !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (target.status === "active" && adminCount <= 1) {
        return res.status(400).json({ error: "At least one active admin account must remain." });
      }
    }

    target.role = role;
    await target.save();
    return res.json({ id: target._id, name: target.name, email: target.email, role: target.role });
  } catch (error) {
    console.error("User role update error:", error);
    return res.status(400).json({ error: "Unable to update user role." });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  if (!["active", "disabled"].includes(status)) {
    return res.status(400).json({ error: "Status must be active or disabled." });
  }

  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    if (target.role === "admin" && target.status === "active" && status === "disabled") {
      const activeAdminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "At least one active admin account must remain." });
      }
    }

    target.status = status;
    await target.save();
    return res.json({ id: target._id, email: target.email, role: target.role, status: target.status });
  } catch (error) {
    console.error("User status update error:", error);
    return res.status(400).json({ error: "Unable to update user status." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    if (target.role === "admin" && target.status === "active") {
      const activeAdminCount = await User.countDocuments({ role: "admin", status: "active" });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "At least one active admin account must remain." });
      }
    }

    await target.deleteOne();
    return res.json({ id: target._id, message: "Account deleted." });
  } catch (error) {
    console.error("User deletion error:", error);
    return res.status(400).json({ error: "Unable to delete this account." });
  }
});

export default router;
