import express from "express";
import MenuItem from "../models/menuItem.js";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const items = await MenuItem.find().sort({ displayOrder: 1, name: 1 });
    return res.json(items);
  } catch (error) {
    console.error("Menu list error:", error);
    return res.status(500).json({ error: "Unable to load menu items." });
  }
});

router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid menu item." });
  }
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  try {
    const allowed = ["name", "description", "category", "price", "active", "archived", "displayOrder", "variants", "addons"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key)),
    );
    const item = await MenuItem.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ error: "Menu item not found." });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update menu item." });
  }
});

export default router;
