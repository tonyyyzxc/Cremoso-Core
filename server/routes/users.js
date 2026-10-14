import express from "express";
import User from "../models/user.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(requireAuth, requireRole("admin"));

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

export default router;
