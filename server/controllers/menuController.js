import MenuItem from "../models/menuItem.js";

export async function listMenuItems(_req, res) {
  try {
    const items = await MenuItem.find().sort({ displayOrder: 1, name: 1 });
    return res.json(items);
  } catch (error) {
    console.error("Menu list error:", error);
    return res.status(500).json({ error: "Unable to load menu items." });
  }
}

export async function createMenuItem(req, res) {
  try {
    const item = await MenuItem.create(req.body);
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Invalid menu item." });
  }
}

export async function updateMenuItem(req, res) {
  try {
    const allowed = ["name", "description", "category", "price", "active", "archived", "displayOrder", "variants", "addons"];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    const item = await MenuItem.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ error: "Menu item not found." });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to update menu item." });
  }
}

export async function deleteMenuItem(req, res) {
  try {
    const item = await MenuItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Menu item not found." });
    return res.json({ message: "Menu item deleted." });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Unable to delete menu item." });
  }
}
